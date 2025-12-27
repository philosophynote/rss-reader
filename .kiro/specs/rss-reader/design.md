# 設計書

## 概要

本システムは、複数のRSSフィードを管理し、記事を取得・保存・閲覧できるFeedly風のRSSリーダーです。セマンティック検索を用いて記事の重要度をスコア化し、ユーザーにとって重要な記事を優先的に表示します。

システムはサーバーレスアーキテクチャを採用し、AWS Lambda、EventBridge、DynamoDBを使用して低コストで運用できるように設計されています。

## アーキテクチャ

### システム構成

```
┌─────────────────┐
│   Frontend      │
│  (React + TS)   │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│  Lambda Function│
│  URL (FastAPI)  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   DynamoDB      │
│   (NoSQL DB)    │
└─────────────────┘

┌─────────────────┐
│  EventBridge    │
│  (Scheduler)    │
└────────┬────────┘
         │ Trigger
         ↓
┌─────────────────┐
│  Lambda Function│
│  (Feed Fetcher) │
└─────────────────┘
```

### 主要コンポーネント

1. **バックエンドAPI（FastAPI）**
   - RSSフィード管理API
   - 記事取得・一覧表示API
   - 未読/既読・保存管理API
   - キーワード管理API
   - 重要度スコア計算API

2. **定期実行ジョブ（EventBridge + Lambda）**
   - RSSフィード取得ジョブ
   - 古い記事削除ジョブ

3. **フロントエンド（React + TypeScript）**
   - フィード管理画面
   - 記事一覧画面（時系列・重要度順）
   - キーワード管理画面

4. **データベース（DynamoDB）**
   - フィード情報
   - 記事情報
   - キーワード情報
   - 重要度スコア情報

## コンポーネントとインターフェース

### データモデル

DynamoDBのシングルテーブル設計を採用します。

#### テーブル構造

**テーブル名**: `rss-reader`

**主キー**:
- パーティションキー (PK): `string`
- ソートキー (SK): `string`

**グローバルセカンダリインデックス (GSI)**:
- GSI1: `GSI1PK` (パーティションキー), `GSI1SK` (ソートキー)
- GSI2: `GSI2PK` (パーティションキー), `GSI2SK` (ソートキー)

#### エンティティ設計

##### Feed（フィード）

```python
{
    "PK": "FEED#{feed_id}",
    "SK": "METADATA",
    "EntityType": "Feed",
    "feed_id": "uuid",
    "url": "https://example.com/feed.xml",
    "title": "Example Feed",
    "folder": "Tech",
    "created_at": "2024-01-01T00:00:00Z",
    "last_fetched_at": "2024-01-01T12:00:00Z",
    "is_active": true,
    "GSI1PK": "FEED",
    "GSI1SK": "FEED#{feed_id}"
}
```

##### Article（記事）

```python
{
    "PK": "ARTICLE#{article_id}",
    "SK": "METADATA",
    "EntityType": "Article",
    "article_id": "uuid",
    "feed_id": "uuid",
    "link": "https://example.com/article",
    "title": "Article Title",
    "content": "Article content...",
    "published_at": "2024-01-01T10:00:00Z",
    "created_at": "2024-01-01T10:05:00Z",
    "is_read": false,
    "is_saved": false,
    "importance_score": 0.85,
    "read_at": null,
    "GSI1PK": "ARTICLE",
    "GSI1SK": "2024-01-01T10:00:00Z",  # published_at for time-based sorting
    "GSI2PK": "ARTICLE",
    "GSI2SK": "0.85"  # importance_score for score-based sorting
}
```

##### Keyword（キーワード）

```python
{
    "PK": "KEYWORD#{keyword_id}",
    "SK": "METADATA",
    "EntityType": "Keyword",
    "keyword_id": "uuid",
    "text": "Python",
    "weight": 1.5,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z",
    "GSI1PK": "KEYWORD",
    "GSI1SK": "KEYWORD#{keyword_id}"
}
```

##### ImportanceReason（重要度理由）

```python
{
    "PK": "ARTICLE#{article_id}",
    "SK": "REASON#{keyword_id}",
    "EntityType": "ImportanceReason",
    "article_id": "uuid",
    "keyword_id": "uuid",
    "keyword_text": "Python",
    "similarity_score": 0.75,
    "contribution": 1.125  # weight * similarity_score
}
```

##### LinkIndex（リンク重複チェック用）

```python
{
    "PK": "LINK#{url_hash}",
    "SK": "METADATA",
    "EntityType": "LinkIndex",
    "link": "https://example.com/article",
    "article_id": "uuid"
}
```

### APIエンドポイント

#### フィード管理

- `POST /api/feeds` - フィード登録
- `GET /api/feeds` - フィード一覧取得
- `DELETE /api/feeds/{feed_id}` - フィード削除
- `PUT /api/feeds/{feed_id}` - フィード更新（フォルダ変更等）

#### 記事管理

- `GET /api/articles` - 記事一覧取得（クエリパラメータ: sort, filter）
- `GET /api/articles/{article_id}` - 記事詳細取得
- `PUT /api/articles/{article_id}/read` - 既読/未読切り替え
- `PUT /api/articles/{article_id}/save` - 保存/解除切り替え

#### キーワード管理

- `POST /api/keywords` - キーワード登録
- `GET /api/keywords` - キーワード一覧取得
- `PUT /api/keywords/{keyword_id}` - キーワード更新（重み、有効/無効）
- `DELETE /api/keywords/{keyword_id}` - キーワード削除
- `POST /api/keywords/recalculate` - 全記事の重要度再計算

#### ジョブ実行

- `POST /api/jobs/fetch-feeds` - フィード取得ジョブ手動実行
- `POST /api/jobs/cleanup-articles` - 記事削除ジョブ手動実行

### バックエンドサービス

#### FeedService

```python
class FeedService:
    def add_feed(url: str, folder: Optional[str]) -> Dict
    def get_feeds() -> List[Dict]
    def delete_feed(feed_id: str) -> None
    def update_feed(feed_id: str, **kwargs) -> Dict
```

#### ArticleService

```python
class ArticleService:
    def get_articles(
        sort_by: str = "published_at",  # "published_at" or "importance_score"
        filter_by: Optional[str] = None,  # "unread", "read", "saved"
        limit: int = 100,
        last_evaluated_key: Optional[Dict] = None
    ) -> Tuple[List[Dict], Optional[Dict]]
    
    def get_article(article_id: str) -> Dict
    def mark_as_read(article_id: str, is_read: bool) -> Dict
    def mark_as_saved(article_id: str, is_saved: bool) -> Dict
```

#### KeywordService

```python
class KeywordService:
    def add_keyword(text: str, weight: float = 1.0) -> Dict
    def get_keywords() -> List[Dict]
    def update_keyword(keyword_id: str, **kwargs) -> Dict
    def delete_keyword(keyword_id: str) -> None
    def recalculate_all_scores() -> None
```

#### FeedFetcherService

```python
class FeedFetcherService:
    def fetch_all_feeds() -> Dict[str, Any]
    def fetch_feed(feed: Dict) -> List[Dict]
    def parse_feed(feed_url: str) -> List[Dict]
    def save_articles(feed_id: str, articles: List[Dict]) -> List[Dict]
```

#### ImportanceScoreService

```python
class ImportanceScoreService:
    def calculate_score(article: Dict) -> Tuple[float, List[Dict]]
    def get_embedding(text: str) -> List[float]
    def calculate_similarity(embedding1: List[float], embedding2: List[float]) -> float
    def recalculate_score(article_id: str) -> None
```

#### CleanupService

```python
class CleanupService:
    def cleanup_old_articles() -> Dict[str, int]
    def delete_articles_by_age(days: int) -> int
    def delete_read_articles(hours: int) -> int
```

## データモデル詳細

### DynamoDBアクセスパターン

#### 1. フィード管理

**フィード一覧取得**:
```python
# Query GSI1
GSI1PK = "FEED"
```

**フィード詳細取得**:
```python
# GetItem
PK = "FEED#{feed_id}"
SK = "METADATA"
```

**フィード削除（カスケード）**:
```python
# 1. フィードを削除
DeleteItem: PK = "FEED#{feed_id}", SK = "METADATA"

# 2. 関連記事を検索して削除
Query: PK = "FEED#{feed_id}", SK begins_with "ARTICLE#"
BatchWriteItem: 各記事を削除
```

#### 2. 記事管理

**記事一覧取得（時系列順）**:
```python
# Query GSI1
GSI1PK = "ARTICLE"
ScanIndexForward = False  # 降順
Limit = 100
```

**記事一覧取得（重要度順）**:
```python
# Query GSI2
GSI2PK = "ARTICLE"
ScanIndexForward = False  # 降順
Limit = 100
```

**記事詳細取得**:
```python
# GetItem
PK = "ARTICLE#{article_id}"
SK = "METADATA"
```

**記事の重複チェック**:
```python
# GetItem
PK = "LINK#{hash(url)}"
SK = "METADATA"
```

**記事の重要度理由取得**:
```python
# Query
PK = "ARTICLE#{article_id}"
SK begins_with "REASON#"
```

#### 3. キーワード管理

**キーワード一覧取得**:
```python
# Query GSI1
GSI1PK = "KEYWORD"
```

**キーワード詳細取得**:
```python
# GetItem
PK = "KEYWORD#{keyword_id}"
SK = "METADATA"
```

#### 4. 記事削除

**古い記事の削除**:
```python
# Scan with FilterExpression
FilterExpression: created_at < (now - 7 days)
BatchWriteItem: 削除対象の記事を一括削除
```

**既読記事の削除**:
```python
# Scan with FilterExpression
FilterExpression: is_read = true AND read_at < (now - 1 day)
BatchWriteItem: 削除対象の記事を一括削除
```

### データフロー

1. **フィード登録フロー**
   ```
   User → Frontend → POST /api/feeds → FeedService.add_feed() → DB
   ```

2. **記事取得フロー**
   ```
   EventBridge → Lambda → FeedFetcherService.fetch_all_feeds()
   → feedparser.parse() → FeedFetcherService.save_articles()
   → ImportanceScoreService.calculate_score() → DynamoDB
   ```

3. **重要度計算フロー**
   ```
   Article + Keywords → ImportanceScoreService.get_embedding()
   → sentence-transformers → calculate_similarity()
   → ImportanceReason → DynamoDB
   ```

4. **記事削除フロー**
   ```
   EventBridge → Lambda → CleanupService.cleanup_old_articles()
   → delete_articles_by_age() + delete_read_articles() → DynamoDB
   ```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や振る舞いのことです。これは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*


### プロパティ1: フィード登録の永続化

*任意の*有効なフィードURLに対して、フィードを登録した後、データベースから同じURLのフィードを取得できる

**検証: 要件 1.1**

### プロパティ2: フィード削除時のカスケード削除

*任意の*フィードに対して、そのフィードに関連する記事を追加した後、フィードを削除すると、関連する記事もすべて削除される

**検証: 要件 1.2**

### プロパティ3: フォルダ分類の保持

*任意の*フォルダ名に対して、フォルダを指定してフィードを登録した後、取得したフィードに同じフォルダ名が設定されている

**検証: 要件 1.3**

### プロパティ4: フィード一覧の完全性

*任意の*フィードのリストに対して、すべてのフィードを登録した後、フィード一覧を取得すると、登録したすべてのフィードが含まれている

**検証: 要件 1.4**

### プロパティ5: フィード取得エラーのハンドリング

*任意の*無効なフィードURLまたは到達不可能なURLに対して、フィード取得を試みると、エラーがログに記録され、システムは正常に動作し続ける

**検証: 要件 2.2**

### プロパティ6: 記事の冪等性

*任意の*記事に対して、同じリンクURLを持つ記事を2回保存しようとしても、データベースには1つの記事のみが保存される

**検証: 要件 2.3, 2.4**

### プロパティ7: 新規記事の未読状態

*任意の*新しい記事に対して、記事を保存すると、その記事は未読状態（is_read=False）で保存される

**検証: 要件 2.5**

### プロパティ8: 時系列順ソート

*任意の*記事のリストに対して、時系列順（公開日時の降順）でソートすると、すべての記事が公開日時の降順に並んでいる

**検証: 要件 3.1**

### プロパティ9: 重要度順ソート

*任意の*記事のリストに対して、重要度スコアの降順でソートすると、すべての記事が重要度スコアの降順に並んでいる

**検証: 要件 3.2**

### プロパティ10: 記事一覧の必須情報

*任意の*記事に対して、記事一覧のレンダリング結果には、タイトル、公開日時、フィード名、未読/既読状態、重要度スコアが含まれている

**検証: 要件 3.3**

### プロパティ11: 既読/未読の切り替え

*任意の*記事に対して、記事を既読にした後、未読に戻すと、記事の状態は元の未読状態に戻る（ラウンドトリップ）

**検証: 要件 4.1, 4.2**

### プロパティ12: 未読記事フィルタ

*任意の*未読と既読の記事が混在するリストに対して、未読フィルタを適用すると、結果には未読記事のみが含まれる

**検証: 要件 4.3**

### プロパティ13: 既読記事フィルタ

*任意の*未読と既読の記事が混在するリストに対して、既読フィルタを適用すると、結果には既読記事のみが含まれる

**検証: 要件 4.4**

### プロパティ14: 記事保存の切り替え

*任意の*記事に対して、記事を保存した後、保存を解除すると、記事の保存フラグは元の状態に戻る（ラウンドトリップ）

**検証: 要件 5.1, 5.2**

### プロパティ15: 保存記事フィルタ

*任意の*保存済みと未保存の記事が混在するリストに対して、保存フィルタを適用すると、結果には保存済み記事のみが含まれる

**検証: 要件 5.3**

### プロパティ16: キーワード登録の永続化

*任意の*キーワードテキストに対して、キーワードを登録した後、データベースから同じテキストのキーワードを取得できる

**検証: 要件 6.1**

### プロパティ17: キーワードの重み設定

*任意の*重み値に対して、重みを指定してキーワードを登録すると、取得したキーワードに同じ重み値が設定されている

**検証: 要件 6.2**

### プロパティ18: キーワードの有効化/無効化

*任意の*キーワードに対して、キーワードを無効化した後、有効化すると、キーワードは重要度計算に再び含まれる（ラウンドトリップ）

**検証: 要件 6.4, 6.5**

### プロパティ19: キーワード一覧の完全性

*任意の*キーワードのリストに対して、すべてのキーワードを登録した後、キーワード一覧を取得すると、登録したすべてのキーワードが含まれている

**検証: 要件 6.6**

### プロパティ20: 重要度スコアの計算

*任意の*記事と有効なキーワードのリストに対して、重要度スコアを計算すると、スコアは0以上であり、各キーワードの寄与度の合計と等しい

**検証: 要件 7.1**

### プロパティ21: スコア計算の加算性

*任意の*記事、キーワード、類似度、重みに対して、そのキーワードのスコアへの寄与度は、類似度と重みの積に等しい

**検証: 要件 7.2**

### プロパティ22: 重要度理由の記録

*任意の*記事に対して、重要度スコアを計算した後、各キーワードの寄与度が ImportanceReason として記録されている

**検証: 要件 7.3, 7.4**

### プロパティ23: 重要度スコアの再計算

*任意の*記事とキーワードに対して、キーワードの重みを変更して再計算すると、記事の重要度スコアが更新される

**検証: 要件 7.5**

### プロパティ24: 古い記事の削除

*任意の*記事に対して、記事の作成日時から1週間以上経過している場合、削除ジョブを実行すると、その記事は削除される

**検証: 要件 11.1**

### プロパティ25: 既読記事の削除

*任意の*既読記事に対して、既読になってから1日以上経過している場合、削除ジョブを実行すると、その記事は削除される

**検証: 要件 11.2**

### プロパティ26: 記事削除時のカスケード削除

*任意の*記事に対して、その記事に関連する重要度理由を追加した後、記事を削除すると、関連する重要度理由もすべて削除される

**検証: 要件 11.4**

## エラーハンドリング

### エラーの種類

1. **フィード取得エラー**
   - 無効なURL
   - ネットワークエラー
   - タイムアウト
   - パースエラー

2. **データベースエラー**
   - 接続エラー
   - スロットリングエラー
   - 条件付き書き込みの失敗

3. **セマンティック検索エラー**
   - 埋め込みモデルのロードエラー
   - 埋め込み生成エラー

### エラーハンドリング戦略

1. **フィード取得エラー**
   ```python
   try:
       feed_data = feedparser.parse(feed_url)
       if feed_data.bozo:  # パースエラー
           logger.error(f"Feed parse error: {feed_url}, {feed_data.bozo_exception}")
           return []
   except Exception as e:
       logger.error(f"Feed fetch error: {feed_url}, {e}")
       return []
   ```

2. **データベースエラー**
   ```python
   try:
       table.put_item(Item=article)
   except ClientError as e:
       if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
           logger.warning(f"Duplicate article: {article['link']}")
       elif e.response['Error']['Code'] == 'ProvisionedThroughputExceededException':
           logger.error(f"Throttling error, retrying...")
           time.sleep(1)
           # リトライロジック
       else:
           logger.error(f"DynamoDB error: {e}")
           raise
   ```

3. **セマンティック検索エラー**
   ```python
   try:
       embedding = model.encode(text)
   except Exception as e:
       logger.error(f"Embedding generation error: {e}")
       return [0.0] * 384  # デフォルトの埋め込み次元
   ```

### エラーレスポンス

APIエラーレスポンスは以下の形式で返します：

```json
{
  "error": {
    "code": "FEED_FETCH_ERROR",
    "message": "Failed to fetch feed",
    "details": "Connection timeout"
  }
}
```

## テスト戦略

### デュアルテストアプローチ

本システムでは、ユニットテストとプロパティベーステストの両方を使用します。これらは補完的であり、両方が必要です。

- **ユニットテスト**: 特定の例、エッジケース、エラー条件を検証
- **プロパティテスト**: すべての入力にわたる普遍的なプロパティを検証
- **統合**: ユニットテストは具体的なバグを捕捉し、プロパティテストは一般的な正確性を検証

### プロパティベーステスト

プロパティベーステストには、Pythonの`hypothesis`ライブラリを使用します。

**設定**:
- 各プロパティテストは最低100回の反復を実行
- 各テストは設計書のプロパティを参照
- タグ形式: `# Feature: rss-reader, Property {番号}: {プロパティテキスト}`

**例**:
```python
from hypothesis import given, strategies as st
import pytest

# Feature: rss-reader, Property 1: フィード登録の永続化
@given(url=st.text(min_size=10, max_size=200))
@pytest.mark.parametrize("iterations", [100])
def test_feed_registration_persistence(url):
    # テストロジック
    pass
```

### ユニットテスト

ユニットテストは以下に焦点を当てます：
- 特定の例（正常系の動作確認）
- コンポーネント間の統合ポイント
- エッジケースとエラー条件

**例**:
```python
def test_feed_registration_with_valid_url():
    feed = FeedService.add_feed("https://example.com/feed.xml")
    assert feed.url == "https://example.com/feed.xml"
    assert feed.is_active is True

def test_feed_registration_with_invalid_url():
    with pytest.raises(ValueError):
        FeedService.add_feed("invalid-url")
```

### テストカバレッジ

以下のコンポーネントをテストします：

1. **FeedService**: フィード管理機能（DynamoDB操作）
2. **ArticleService**: 記事管理機能（DynamoDB操作）
3. **KeywordService**: キーワード管理機能（DynamoDB操作）
4. **FeedFetcherService**: フィード取得機能
5. **ImportanceScoreService**: 重要度スコア計算機能
6. **CleanupService**: 記事削除機能（DynamoDB操作）

### 統合テスト

統合テストは以下をカバーします：
- API エンドポイントのエンドツーエンドテスト
- DynamoDBとの統合（DynamoDB Localを使用）
- セマンティック検索モデルとの統合

## 実装の詳細

### セマンティック検索の実装

セマンティック検索には、`sentence-transformers`ライブラリを使用します。

**モデル選択**:
- `paraphrase-multilingual-MiniLM-L12-v2`: 多言語対応、軽量、高速
- 埋め込み次元: 384

**実装例**:
```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class ImportanceScoreService:
    def __init__(self):
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
    
    def get_embedding(self, text: str) -> np.ndarray:
        return self.model.encode(text)
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        return cosine_similarity([embedding1], [embedding2])[0][0]
    
    def calculate_score(self, article: Article, keywords: List[Keyword]) -> Tuple[float, List[ImportanceReason]]:
        article_text = f"{article.title} {article.content or ''}"
        article_embedding = self.get_embedding(article_text)
        
        total_score = 0.0
        reasons = []
        
        for keyword in keywords:
            if not keyword.is_active:
                continue
            
            keyword_embedding = self.get_embedding(keyword.text)
            similarity = self.calculate_similarity(article_embedding, keyword_embedding)
            contribution = similarity * keyword.weight
            total_score += contribution
            
            reasons.append(ImportanceReason(
                article_id=article.id,
                keyword_id=keyword.id,
                similarity_score=similarity,
                contribution=contribution
            ))
        
        return total_score, reasons
```

### AWS Lambda デプロイメント

**Dockerfile**:
```dockerfile
FROM public.ecr.aws/lambda/python:3.11

# AWS Lambda Web Adapter をインストール
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.1 /lambda-adapter /opt/extensions/lambda-adapter

# 依存関係をインストール
COPY requirements.txt .
RUN pip install -r requirements.txt

# アプリケーションコードをコピー
COPY app/ /var/task/app/

# FastAPI を起動
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**環境変数**:
- `AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap`
- `PORT=8080`
- `DYNAMODB_TABLE_NAME=rss-reader`
- `AWS_REGION=ap-northeast-1`

### DynamoDB設定

**テーブル設定**:
```python
import boto3

dynamodb = boto3.resource('dynamodb', region_name='ap-northeast-1')
table = dynamodb.Table('rss-reader')

# テーブル作成（Terraformまたはaws-cdkで実施）
table_definition = {
    'TableName': 'rss-reader',
    'KeySchema': [
        {'AttributeName': 'PK', 'KeyType': 'HASH'},
        {'AttributeName': 'SK', 'KeyType': 'RANGE'}
    ],
    'AttributeDefinitions': [
        {'AttributeName': 'PK', 'AttributeType': 'S'},
        {'AttributeName': 'SK', 'AttributeType': 'S'},
        {'AttributeName': 'GSI1PK', 'AttributeType': 'S'},
        {'AttributeName': 'GSI1SK', 'AttributeType': 'S'},
        {'AttributeName': 'GSI2PK', 'AttributeType': 'S'},
        {'AttributeName': 'GSI2SK', 'AttributeType': 'S'}
    ],
    'GlobalSecondaryIndexes': [
        {
            'IndexName': 'GSI1',
            'KeySchema': [
                {'AttributeName': 'GSI1PK', 'KeyType': 'HASH'},
                {'AttributeName': 'GSI1SK', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        },
        {
            'IndexName': 'GSI2',
            'KeySchema': [
                {'AttributeName': 'GSI2PK', 'KeyType': 'HASH'},
                {'AttributeName': 'GSI2SK', 'KeyType': 'RANGE'}
            ],
            'Projection': {'ProjectionType': 'ALL'}
        }
    ],
    'BillingMode': 'PAY_PER_REQUEST'  # オンデマンド課金
}
```

**DynamoDBクライアント**:
```python
import boto3
from typing import Dict, List, Optional

class DynamoDBClient:
    def __init__(self, table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
    
    def put_item(self, item: Dict) -> None:
        self.table.put_item(Item=item)
    
    def get_item(self, pk: str, sk: str) -> Optional[Dict]:
        response = self.table.get_item(Key={'PK': pk, 'SK': sk})
        return response.get('Item')
    
    def query(self, key_condition_expression, **kwargs) -> List[Dict]:
        response = self.table.query(
            KeyConditionExpression=key_condition_expression,
            **kwargs
        )
        return response.get('Items', [])
    
    def delete_item(self, pk: str, sk: str) -> None:
        self.table.delete_item(Key={'PK': pk, 'SK': sk})
```

### EventBridge スケジュール

**フィード取得ジョブ**: 1時間ごと
```json
{
  "schedule": "rate(1 hour)",
  "target": {
    "arn": "arn:aws:lambda:region:account:function:rss-reader-fetcher",
    "input": "{\"action\": \"fetch_feeds\"}"
  }
}
```

**記事削除ジョブ**: 1日1回（深夜2時）
```json
{
  "schedule": "cron(0 2 * * ? *)",
  "target": {
    "arn": "arn:aws:lambda:region:account:function:rss-reader-cleanup",
    "input": "{\"action\": \"cleanup_articles\"}"
  }
}
```

## フロントエンド設計

### コンポーネント構成

```
src/
├── components/
│   ├── FeedList.tsx
│   ├── FeedForm.tsx
│   ├── ArticleList.tsx
│   ├── ArticleDetail.tsx
│   ├── KeywordList.tsx
│   └── KeywordForm.tsx
├── hooks/
│   ├── useFeed.ts
│   ├── useArticles.ts
│   └── useKeywords.ts
├── api/
│   └── client.ts
└── App.tsx
```

### TanStack Query の使用

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useArticles(sortBy: string, filterBy?: string) {
  return useQuery({
    queryKey: ['articles', sortBy, filterBy],
    queryFn: () => fetchArticles(sortBy, filterBy),
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (articleId: number) => markAsRead(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}
```

### TanStack Table の使用

```typescript
import { createColumnHelper, useReactTable, getCoreRowModel } from '@tanstack/react-table';

const columnHelper = createColumnHelper<Article>();

const columns = [
  columnHelper.accessor('title', {
    header: 'タイトル',
  }),
  columnHelper.accessor('published_at', {
    header: '公開日時',
  }),
  columnHelper.accessor('importance_score', {
    header: '重要度',
  }),
];

export function ArticleTable({ articles }: { articles: Article[] }) {
  const table = useReactTable({
    data: articles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  
  // テーブルのレンダリング
}
```

## パフォーマンス考慮事項

### DynamoDBの最適化

1. **シングルテーブル設計**: すべてのエンティティを1つのテーブルに格納し、結合操作を削減
2. **GSIの活用**: 時系列順と重要度順のソートにGSIを使用
3. **バッチ操作**: BatchGetItemとBatchWriteItemを使用して複数アイテムを効率的に処理
4. **オンデマンド課金**: 予測不可能なトラフィックに対応し、コストを最適化

### セマンティック検索の最適化

1. **埋め込みのキャッシュ**: キーワードの埋め込みをメモリにキャッシュ
2. **バッチ処理**: 複数記事の埋め込みを一度に生成
3. **軽量モデル**: MiniLMモデルを使用して高速化

### Lambda コールドスタート対策

1. **プロビジョニング済み同時実行**: 必要に応じて設定
2. **モデルの遅延ロード**: 初回リクエスト時にモデルをロード
3. **依存関係の最小化**: 必要なライブラリのみをインストール
