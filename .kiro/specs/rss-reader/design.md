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
│  S3 + CloudFront│
└────────┬────────┘
         │ HTTPS
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
         ↑
         │
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

3. **フロントエンド（React + TypeScript + Chakra UI）**
   - フィード管理画面
   - 記事一覧画面（時系列・重要度順）
   - キーワード管理画面
   - S3 + CloudFrontでホスティング

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
- GSI1: `GSI1PK` (パーティションキー), `GSI1SK` (ソートキー) - 時系列順ソート用
- GSI2: `GSI2PK` (パーティションキー), `GSI2SK` (ソートキー) - 重要度順ソート用
- GSI3: `GSI3PK` (パーティションキー), `GSI3SK` (ソートキー) - 作成日時順ソート用（削除クエリ用）
- GSI4: `GSI4PK` (パーティションキー), `GSI4SK` (ソートキー) - 既読記事削除用
- GSI5: `GSI5PK` (パーティションキー), `GSI5SK` (ソートキー) - フィード別記事クエリ用（カスケード削除用）

**TTL設定**:
- `ttl` 属性を使用してアイテムの自動削除を設定

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
    "ttl": 1704758700,  # Unix timestamp for automatic deletion (7 days from created_at)
    "GSI1PK": "ARTICLE",
    "GSI1SK": "2024-01-01T10:00:00Z",  # published_at for time-based sorting
    "GSI2PK": "ARTICLE",
    "GSI2SK": "150000.000000",  # 逆順ソート用: (1000000 - score * 1000000) をゼロパディング
    "GSI3PK": "ARTICLE",
    "GSI3SK": "2024-01-01T10:05:00Z",  # created_at for deletion queries
    "GSI4PK": "ARTICLE_READ",  # 既読記事削除用（is_readがtrueの場合のみ設定）
    "GSI4SK": "true#2024-01-01T12:00:00Z",  # "is_read#read_at" format（is_readがtrueの場合のみ設定）
    "GSI5PK": "FEED#{feed_id}",  # フィード別記事クエリ用（カスケード削除用）
    "GSI5SK": "ARTICLE#{article_id}"  # 記事ID
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
    def invoke_bedrock_embeddings(text: str, dimension: int = 1024) -> List[float]
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
# 1. GSI5を使用して関連記事を効率的に検索
Query GSI5:
  GSI5PK = "FEED#{feed_id}"
  # すべての関連記事を取得

# 2. 関連記事とその重要度理由を削除
for article in articles:
    # 記事本体を削除
    DeleteItem: PK = article['PK'], SK = article['SK']
    
    # 重要度理由も削除（カスケード）
    Query: PK = article['PK'], SK begins_with "REASON#"
    BatchWriteItem: 各理由を削除

# 3. フィード本体を削除
DeleteItem: PK = "FEED#{feed_id}", SK = "METADATA"
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
ScanIndexForward = True  # 昇順（逆順ソートキーのため、昇順で高スコア順になる）
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

**古い記事の削除（効率的なクエリ使用）**:
```python
# Query GSI3 for articles older than 7 days
GSI3PK = "ARTICLE"
GSI3SK < (now - 7 days)  # 例: "2024-01-01T10:05:00Z"
Limit = 100  # バッチサイズ
# BatchWriteItem: 削除対象の記事を一括削除
```

**既読記事の削除（GSI4を使用）**:
```python
# 既読記事用の複合ソートキーを使用
# GSI4: 既読状態と読了日時の複合キー
GSI4PK = "ARTICLE_READ"
GSI4SK < f"true#{(now - 1 day)}"  # 例: "true#2024-01-01T10:05:00Z"
Limit = 100
# BatchWriteItem: 削除対象の記事を一括削除
```

**TTL（Time To Live）による自動削除**:
```python
# 記事作成時にTTLを設定（推奨）
ttl_timestamp = int((datetime.now() + timedelta(days=7)).timestamp())
article_data["ttl"] = ttl_timestamp
# DynamoDBが自動的に期限切れアイテムを削除（24-48時間以内）
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

### 効率的なフィード削除（カスケード）の実装

```python
import boto3
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class FeedService:
    def __init__(self, table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
    
    def delete_feed_cascade(self, feed_id: str) -> Dict[str, int]:
        """
        フィードとその関連記事を効率的にカスケード削除
        
        Args:
            feed_id: 削除対象のフィードID
        
        Returns:
            削除結果の統計
        """
        deleted_articles = 0
        deleted_reasons = 0
        
        try:
            # 1. GSI5を使用して関連記事を効率的に検索
            articles = self._get_articles_by_feed(feed_id)
            
            # 2. 各記事とその重要度理由を削除
            for article in articles:
                # 重要度理由を削除
                reasons_deleted = self._delete_article_reasons(article['article_id'])
                deleted_reasons += reasons_deleted
                
                # 記事本体を削除
                self.table.delete_item(
                    Key={
                        'PK': article['PK'],
                        'SK': article['SK']
                    }
                )
                deleted_articles += 1
            
            # 3. フィード本体を削除
            self.table.delete_item(
                Key={
                    'PK': f"FEED#{feed_id}",
                    'SK': "METADATA"
                }
            )
            
            logger.info(f"Deleted feed {feed_id} with {deleted_articles} articles and {deleted_reasons} reasons")
            
            return {
                'deleted_feed': 1,
                'deleted_articles': deleted_articles,
                'deleted_reasons': deleted_reasons
            }
            
        except Exception as e:
            logger.error(f"Error deleting feed {feed_id}: {e}")
            raise
    
    def _get_articles_by_feed(self, feed_id: str) -> List[Dict]:
        """
        GSI5を使用してフィードの全記事を取得
        
        Args:
            feed_id: フィードID
        
        Returns:
            記事のリスト
        """
        articles = []
        last_evaluated_key = None
        
        while True:
            query_params = {
                'IndexName': 'GSI5',
                'KeyConditionExpression': 'GSI5PK = :feed_pk',
                'ExpressionAttributeValues': {
                    ':feed_pk': f'FEED#{feed_id}'
                },
                'Limit': 100  # バッチサイズ
            }
            
            if last_evaluated_key:
                query_params['ExclusiveStartKey'] = last_evaluated_key
            
            response = self.table.query(**query_params)
            articles.extend(response.get('Items', []))
            
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break
        
        return articles
    
    def _delete_article_reasons(self, article_id: str) -> int:
        """
        記事の重要度理由を削除
        
        Args:
            article_id: 記事ID
        
        Returns:
            削除した理由の数
        """
        deleted_count = 0
        
        try:
            # 重要度理由を検索
            response = self.table.query(
                KeyConditionExpression='PK = :article_pk AND begins_with(SK, :reason_prefix)',
                ExpressionAttributeValues={
                    ':article_pk': f'ARTICLE#{article_id}',
                    ':reason_prefix': 'REASON#'
                }
            )
            
            # バッチ削除
            if response['Items']:
                with self.table.batch_writer() as batch:
                    for reason in response['Items']:
                        batch.delete_item(
                            Key={
                                'PK': reason['PK'],
                                'SK': reason['SK']
                            }
                        )
                        deleted_count += 1
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error deleting reasons for article {article_id}: {e}")
            return 0

# 使用例
feed_service = FeedService('rss-reader')

# フィードをカスケード削除（効率的なGSI5クエリ使用）
result = feed_service.delete_feed_cascade('feed-uuid-123')
print(f"Deleted: {result['deleted_feed']} feed, {result['deleted_articles']} articles, {result['deleted_reasons']} reasons")
```

### カスケード削除のパフォーマンス比較

| 方式 | 検索方法 | パフォーマンス | コスト効率 |
|------|----------|----------------|------------|
| **従来（誤った方式）** | `Query: PK = "FEED#{feed_id}"` | ❌ 動作しない | ❌ N/A |
| **修正後（GSI5使用）** | `Query GSI5: GSI5PK = "FEED#{feed_id}"` | ✅ 高速 | ✅ 効率的 |
| **代替案（Scan使用）** | `Scan + FilterExpression` | ❌ 低速 | ❌ 高コスト |

### データ整合性の保証

1. **トランザクション使用（推奨）**:
```python
# DynamoDB Transactionsを使用した原子的削除
with self.table.batch_writer() as batch:
    # すべての削除操作を一括実行
    pass
```

2. **エラー時のロールバック**:
```python
try:
    # 削除処理
    pass
except Exception as e:
    # 部分的に削除された場合の復旧処理
    logger.error("Rollback required")
    raise
```

```python
import boto3
from datetime import datetime, timedelta
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class CleanupService:
    def __init__(self, table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
    
    def cleanup_old_articles(self, days: int = 7) -> Dict[str, int]:
        """
        古い記事を効率的に削除（GSI3を使用したクエリ）
        
        Args:
            days: 削除対象の日数（デフォルト: 7日）
        
        Returns:
            削除結果の統計
        """
        cutoff_date = (datetime.now() - timedelta(days=days)).isoformat() + "Z"
        deleted_count = 0
        
        try:
            # GSI3を使用して効率的にクエリ
            response = self.table.query(
                IndexName='GSI3',
                KeyConditionExpression='GSI3PK = :pk AND GSI3SK < :cutoff',
                ExpressionAttributeValues={
                    ':pk': 'ARTICLE',
                    ':cutoff': cutoff_date
                },
                Limit=100  # バッチサイズ
            )
            
            # バッチ削除
            if response['Items']:
                with self.table.batch_writer() as batch:
                    for item in response['Items']:
                        batch.delete_item(
                            Key={
                                'PK': item['PK'],
                                'SK': item['SK']
                            }
                        )
                        deleted_count += 1
                
                logger.info(f"Deleted {deleted_count} old articles")
            
            return {
                'deleted_articles': deleted_count,
                'cutoff_date': cutoff_date
            }
            
        except Exception as e:
            logger.error(f"Error deleting old articles: {e}")
            raise
    
    def cleanup_read_articles(self, hours: int = 24) -> Dict[str, int]:
        """
        既読記事を効率的に削除（GSI4を使用したクエリ）
        
        Args:
            hours: 既読後の削除対象時間（デフォルト: 24時間）
        
        Returns:
            削除結果の統計
        """
        cutoff_datetime = (datetime.now() - timedelta(hours=hours)).isoformat() + "Z"
        deleted_count = 0
        
        try:
            # GSI4を使用して既読記事を効率的にクエリ
            response = self.table.query(
                IndexName='GSI4',
                KeyConditionExpression='GSI4PK = :pk AND GSI4SK < :cutoff',
                ExpressionAttributeValues={
                    ':pk': 'ARTICLE_READ',
                    ':cutoff': f'true#{cutoff_datetime}'
                },
                Limit=100  # バッチサイズ
            )
            
            # バッチ削除
            if response['Items']:
                with self.table.batch_writer() as batch:
                    for item in response['Items']:
                        batch.delete_item(
                            Key={
                                'PK': item['PK'],
                                'SK': item['SK']
                            }
                        )
                        deleted_count += 1
                
                logger.info(f"Deleted {deleted_count} read articles")
            
            return {
                'deleted_read_articles': deleted_count,
                'cutoff_datetime': cutoff_datetime
            }
            
        except Exception as e:
            logger.error(f"Error deleting read articles: {e}")
            raise
    
    def set_article_ttl(self, article_data: Dict, days: int = 7) -> Dict:
        """
        記事にTTLを設定（作成時に呼び出し）
        
        Args:
            article_data: 記事データ
            days: TTL日数（デフォルト: 7日）
        
        Returns:
            TTLが設定された記事データ
        """
        ttl_timestamp = int((datetime.now() + timedelta(days=days)).timestamp())
        article_data['ttl'] = ttl_timestamp
        return article_data

# 使用例
cleanup_service = CleanupService('rss-reader')

# 古い記事を削除（効率的なクエリ使用）
result = cleanup_service.cleanup_old_articles(days=7)
print(f"Deleted {result['deleted_articles']} articles")

# 既読記事を削除（効率的なクエリ使用）
result = cleanup_service.cleanup_read_articles(hours=24)
print(f"Deleted {result['deleted_read_articles']} read articles")
```

### TTL vs 手動削除の比較

| 方式 | メリット | デメリット | 推奨用途 |
|------|----------|------------|----------|
| **TTL自動削除** | - コスト効率的<br>- 運用不要<br>- 正確な削除 | - 削除タイミングが不正確（24-48時間の遅延）<br>- 削除通知なし | 基本的な記事削除 |
| **GSI3/4クエリ削除** | - 即座に削除<br>- 削除統計取得可能<br>- 柔軟な条件設定 | - Lambda実行コスト<br>- 実装が必要 | 即座の削除が必要な場合 |

**推奨アプローチ**:
1. **基本削除**: TTLを使用（7日後自動削除）
2. **即座削除**: 手動削除ジョブでGSI3/4クエリを使用
3. **ハイブリッド**: TTL + 定期的なクリーンアップジョブ

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

### プロパティ27: CI/CDパイプラインの品質ゲート

*任意の*コード変更に対して、テストが失敗した場合、デプロイメントは実行されない

**検証: 要件 13.3**

### プロパティ28: 自動デプロイメントの実行

*任意の*mainブランチへのマージに対して、すべてのテストが成功した場合、自動的に本番環境へのデプロイメントが実行される

**検証: 要件 13.6**

### プロパティ29: テストカバレッジの維持

*任意の*コードベースに対して、テストカバレッジは80%以上を維持する

**検証: 要件 13.5**

### プロパティ30: デプロイメント失敗時の通知

*任意の*デプロイメント失敗に対して、開発者への通知が送信される

**検証: 要件 13.10**

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

### プロジェクト構造

```
rss-reader/
├── backend/                 # Python (FastAPI + Lambda)
│   ├── app/
│   │   ├── main.py         # FastAPI アプリケーション
│   │   ├── services/       # ビジネスロジック
│   │   ├── models/         # データモデル
│   │   └── utils/          # ユーティリティ
│   ├── tests/              # Python テスト
│   ├── pyproject.toml      # uv 依存関係管理
│   ├── uv.lock            # 依存関係ロックファイル
│   └── Dockerfile          # Lambda コンテナ
├── frontend/               # TypeScript (React + Chakra UI)
│   ├── src/
│   │   ├── components/     # React コンポーネント
│   │   ├── hooks/          # TanStack Query フック
│   │   ├── api/           # API クライアント
│   │   └── theme/         # Chakra UI テーマ
│   ├── package.json
│   └── vite.config.ts
├── infrastructure/         # TypeScript (AWS CDK)
│   ├── lib/
│   │   ├── rss-reader-stack.ts    # メインスタック
│   │   ├── database-stack.ts      # DynamoDB
│   │   ├── compute-stack.ts       # Lambda
│   │   └── frontend-stack.ts      # S3 + CloudFront
│   ├── bin/
│   │   └── app.ts         # CDK アプリケーション
│   ├── package.json
│   └── cdk.json
└── README.md
```

### AWS CDK実装例

```typescript
// infrastructure/lib/rss-reader-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class RssReaderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB テーブル
    const table = new dynamodb.Table(this, 'RssReaderTable', {
      tableName: 'rss-reader',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
    });

    // GSI1: 時系列順ソート用
    table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI2: 重要度順ソート用（逆順ソートキーで高スコア順を実現）
    table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI3: 作成日時順ソート用（効率的な削除クエリ用）
    table.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI4: 既読記事削除用
    table.addGlobalSecondaryIndex({
      indexName: 'GSI4',
      partitionKey: { name: 'GSI4PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI4SK', type: dynamodb.AttributeType.STRING },
    });

    // GSI5: フィード別記事クエリ用（カスケード削除用）
    table.addGlobalSecondaryIndex({
      indexName: 'GSI5',
      partitionKey: { name: 'GSI5PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI5SK', type: dynamodb.AttributeType.STRING },
    });

    // TTL設定（自動削除用）
    table.addTimeToLiveAttribute('ttl');

    // Lambda 関数（Python + FastAPI）
    const apiFunction = new lambda.DockerImageFunction(this, 'ApiFunction', {
      code: lambda.DockerImageCode.fromImageAsset('../backend', {
        file: 'Dockerfile',
      }),
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
        BEDROCK_REGION: 'us-east-1',
        BEDROCK_MODEL_ID: 'amazon.nova-2-multimodal-embeddings-v1:0',
        EMBEDDING_DIMENSION: '1024',
      },
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      architecture: lambda.Architecture.X86_64,
    });

    // Lambda 関数 URL
    const functionUrl = apiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      cors: {
        allowedOrigins: ['*'],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
      },
    });

    // EventBridge ルール: フィード取得（1時間ごと）
    const fetchRule = new events.Rule(this, 'FeedFetchRule', {
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      targets: [new targets.LambdaFunction(apiFunction, {
        event: events.RuleTargetInput.fromObject({
          action: 'fetch_feeds'
        })
      })],
    });

    // EventBridge ルール: 記事削除（1日1回、深夜2時）
    const cleanupRule = new events.Rule(this, 'CleanupRule', {
      schedule: events.Schedule.cron({
        hour: '2',
        minute: '0',
      }),
      targets: [new targets.LambdaFunction(apiFunction, {
        event: events.RuleTargetInput.fromObject({
          action: 'cleanup_articles'
        })
      })],
    });

    // DynamoDB 権限
    table.grantReadWriteData(apiFunction);

    // Bedrock 権限
    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // S3 バケット（フロントエンド）
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `rss-reader-frontend-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront ディストリビューション
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // 出力
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: functionUrl.url,
      description: 'Lambda Function URL for API',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
      description: 'DynamoDB Table Name',
    });
  }
}
```

### セマンティック検索の実装

セマンティック検索には、AWS Bedrockの埋め込みモデルを使用します。

**モデル選択**:
- Amazon Nova Multimodal Embeddings (`amazon.nova-2-multimodal-embeddings-v1:0`)
  - 多言語対応
  - テキスト、画像、動画、音声に対応
  - 埋め込み次元: 1024（コストと精度のバランス）
  - 最大コンテキスト長: 8K トークン

**代替モデル**:
- Amazon Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`)
  - テキスト専用
  - 埋め込み次元: 256, 512, 1024（選択可能）
  - 最大コンテキスト長: 8,192 トークン
  - より低コスト

**実装例**:
```python
import boto3
import json
from typing import List, Tuple, Dict
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)

class ImportanceScoreService:
    def __init__(self, region_name: str = "us-east-1"):
        self.bedrock_runtime = boto3.client(
            service_name="bedrock-runtime",
            region_name=region_name
        )
        self.model_id = "amazon.nova-2-multimodal-embeddings-v1:0"
        self.embedding_dimension = 1024
        # キーワード埋め込みのキャッシュ
        self.keyword_embeddings_cache = {}
    
    def invoke_bedrock_embeddings(self, text: str, dimension: int = 1024) -> List[float]:
        """AWS Bedrockを使用してテキストの埋め込みを生成
        
        公式ドキュメント準拠のAPIフォーマット:
        https://docs.aws.amazon.com/nova/latest/userguide/embeddings-schema.html
        """
        request_body = {
            "taskType": "SINGLE_EMBEDDING",
            "singleEmbeddingParams": {
                "embeddingPurpose": "GENERIC_INDEX",
                "embeddingDimension": dimension,
                "text": {
                    "truncationMode": "END",
                    "value": text
                }
            }
        }
        
        try:
            response = self.bedrock_runtime.invoke_model(
                body=json.dumps(request_body),
                modelId=self.model_id,
                accept="application/json",
                contentType="application/json"
            )
            
            response_body = json.loads(response.get("body").read())
            # レスポンス形式: {"embeddings": [{"embeddingType": "TEXT", "embedding": [...]}]}
            embedding = response_body["embeddings"][0]["embedding"]
            return embedding
            
        except Exception as e:
            logger.error(f"Bedrock embedding error: {e}")
            # エラー時はゼロベクトルを返す
            return [0.0] * dimension
    
    def get_embedding(self, text: str) -> np.ndarray:
        """テキストの埋め込みを取得（キャッシュ対応）"""
        embedding = self.invoke_bedrock_embeddings(text, self.embedding_dimension)
        return np.array(embedding)
    
    def get_keyword_embedding(self, keyword_text: str) -> np.ndarray:
        """キーワードの埋め込みを取得（キャッシュ使用）"""
        if keyword_text not in self.keyword_embeddings_cache:
            self.keyword_embeddings_cache[keyword_text] = self.get_embedding(keyword_text)
        return self.keyword_embeddings_cache[keyword_text]
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """コサイン類似度を計算"""
        similarity = cosine_similarity([embedding1], [embedding2])[0][0]
        return float(similarity)
    
    def calculate_score(
        self, 
        article: Dict, 
        keywords: List[Dict]
    ) -> Tuple[float, List[Dict]]:
        """記事の重要度スコアを計算"""
        # 記事のテキストを結合
        article_text = f"{article['title']} {article.get('content', '')}"
        article_embedding = self.get_embedding(article_text)
        
        total_score = 0.0
        reasons = []
        
        for keyword in keywords:
            if not keyword.get('is_active', True):
                continue
            
            # キーワードの埋め込みを取得（キャッシュから）
            keyword_embedding = self.get_keyword_embedding(keyword['text'])
            
            # 類似度を計算
            similarity = self.calculate_similarity(article_embedding, keyword_embedding)
            
            # 重みを適用
            weight = keyword.get('weight', 1.0)
            contribution = similarity * weight
            total_score += contribution
            
            # 理由を記録
            reasons.append({
                'PK': f"ARTICLE#{article['article_id']}",
                'SK': f"REASON#{keyword['keyword_id']}",
                'EntityType': 'ImportanceReason',
                'article_id': article['article_id'],
                'keyword_id': keyword['keyword_id'],
                'keyword_text': keyword['text'],
                'similarity_score': similarity,
                'contribution': contribution
            })
        
        return total_score, reasons
    
    def recalculate_score(self, article_id: str) -> None:
        """記事の重要度スコアを再計算"""
        # 記事とキーワードを取得
        article = self.article_service.get_article(article_id)
        keywords = self.keyword_service.get_keywords()
        
        # スコアを再計算
        score, reasons = self.calculate_score(article, keywords)
        
        # 記事を更新
        self.article_service.update_article(
            article_id,
            importance_score=score
        )
        
        # 既存の理由を削除
        self.dynamodb_client.delete_reasons_for_article(article_id)
        
        # 新しい理由を保存
        for reason in reasons:
            self.dynamodb_client.put_item(reason)

# 使用例とテスト用のサンプルコード
def test_bedrock_embeddings():
    """Bedrock Embeddings APIのテスト用サンプル"""
    import boto3
    import json
    
    # Bedrockクライアントを作成
    bedrock_runtime = boto3.client(
        service_name="bedrock-runtime",
        region_name="us-east-1"
    )
    
    # リクエストボディ（公式ドキュメント準拠）
    request_body = {
        "taskType": "SINGLE_EMBEDDING",
        "singleEmbeddingParams": {
            "embeddingPurpose": "GENERIC_INDEX",
            "embeddingDimension": 1024,
            "text": {
                "truncationMode": "END",
                "value": "Hello, World!"
            }
        }
    }
    
    try:
        # Nova Embeddings モデルを呼び出し
        response = bedrock_runtime.invoke_model(
            body=json.dumps(request_body),
            modelId="amazon.nova-2-multimodal-embeddings-v1:0",
            accept="application/json",
            contentType="application/json"
        )
        
        # レスポンスを解析
        response_body = json.loads(response.get("body").read())
        print("Request ID:", response.get("ResponseMetadata").get("RequestId"))
        print("Embedding dimension:", len(response_body["embeddings"][0]["embedding"]))
        print("Embedding type:", response_body["embeddings"][0]["embeddingType"])
        
        return response_body["embeddings"][0]["embedding"]
        
    except Exception as e:
        print(f"Error: {e}")
        return None
```

**コスト最適化**:
1. **キャッシュの活用**: キーワードの埋め込みをメモリにキャッシュし、API呼び出しを削減
2. **バッチ処理**: 複数記事を一度に処理する場合は、バッチAPIを検討
3. **次元数の選択**: 1024次元を使用してコストと精度のバランスを取る
4. **代替モデル**: コスト重視の場合はTitan Text Embeddings V2を使用

**実装前の検証手順**:
1. **APIフォーマット確認**: 
   - AWS Bedrockの公式ドキュメントで最新のAPIフォーマットを確認
   - 上記のtest_bedrock_embeddings()関数を使用してAPIの動作を検証
2. **boto3バージョン確認**: 
   - boto3の最新バージョン（1.35.0以降推奨）を使用
   - Nova Multimodal Embeddingsがサポートされていることを確認
3. **リージョン確認**: 
   - Nova Multimodal Embeddingsが利用可能なリージョン（us-east-1等）を使用
4. **権限確認**: 
   - IAMロールにbedrock:InvokeModel権限が付与されていることを確認
5. **レスポンス構造確認**: 
   - 実際のレスポンス形式が期待通りであることを確認
   - エラーハンドリングの動作を検証

**利用可能な埋め込み次元**:
- 256: 最小サイズ、低コスト
- 384: バランス型
- 1024: 推奨サイズ（コストと精度のバランス）
- 3072: 最高精度、高コスト

**埋め込み目的の選択**:
- `GENERIC_INDEX`: インデックス作成時（記事とキーワードの埋め込み生成）
- `TEXT_RETRIEVAL`: テキスト検索時（類似記事検索）
- `CLASSIFICATION`: 分類タスク
- `CLUSTERING`: クラスタリングタスク

### AWS Lambda デプロイメント

**Dockerfile**:
```dockerfile
FROM public.ecr.aws/lambda/python:3.14

# AWS Lambda Web Adapter をインストール（最新版: v0.9.x）
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.0 /lambda-adapter /opt/extensions/lambda-adapter

# uvをインストール
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# 依存関係をインストール
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

# アプリケーションコードをコピー
COPY app/ /var/task/app/

# FastAPI を起動
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**環境変数**:
- `AWS_LAMBDA_EXEC_WRAPPER=/opt/bootstrap`
- `PORT=8080`
- `DYNAMODB_TABLE_NAME=rss-reader`
- `AWS_REGION=ap-northeast-1`
- `BEDROCK_REGION=us-east-1`  # Bedrockが利用可能なリージョン
- `BEDROCK_MODEL_ID=amazon.nova-2-multimodal-embeddings-v1:0`
- `EMBEDDING_DIMENSION=1024`

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

### デプロイメント

**ホスティング**: Amazon S3 + CloudFront

**構成**:
- S3バケット: 静的ファイル（HTML、CSS、JS）を格納
- CloudFront: グローバルCDNでコンテンツを配信
- HTTPS: CloudFrontでSSL/TLS証明書を設定

**メリット**:
- 低コスト: 月額$1未満で運用可能（低トラフィック時）
- 高可用性: AWSのグローバルインフラを活用
- スケーラビリティ: トラフィック増加に自動対応
- セキュリティ: CloudFrontでHTTPS通信を強制

**デプロイフロー**:
```
1. npm run build → ビルド成果物を生成
2. aws s3 sync dist/ s3://bucket-name/ → S3にアップロード
3. aws cloudfront create-invalidation → キャッシュを無効化
```

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

### Chakra UI の使用

```typescript
import { 
  Box, 
  Button, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td,
  Badge,
  VStack,
  HStack,
  Text,
  Input,
  FormControl,
  FormLabel,
  Select,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Divider,
  IconButton,
  useToast
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, EditIcon } from '@chakra-ui/icons';

export function ArticleList() {
  const toast = useToast();
  
  return (
    <Box p={6}>
      <VStack spacing={4} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">記事一覧</Heading>
          <HStack>
            <Select placeholder="フィルタ">
              <option value="unread">未読</option>
              <option value="read">既読</option>
              <option value="saved">保存済み</option>
            </Select>
            <Select placeholder="ソート">
              <option value="published_at">時系列順</option>
              <option value="importance_score">重要度順</option>
            </Select>
          </HStack>
        </HStack>
        
        <Card>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>タイトル</Th>
                  <Th>フィード</Th>
                  <Th>公開日時</Th>
                  <Th>重要度</Th>
                  <Th>状態</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {/* 記事データをマップ */}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}

export function FeedForm() {
  return (
    <Card>
      <CardHeader>
        <Heading size="md">新しいフィードを追加</Heading>
      </CardHeader>
      <CardBody>
        <VStack spacing={4}>
          <FormControl>
            <FormLabel>フィードURL</FormLabel>
            <Input placeholder="https://example.com/feed.xml" />
          </FormControl>
          <FormControl>
            <FormLabel>フォルダ</FormLabel>
            <Input placeholder="テクノロジー" />
          </FormControl>
          <Button colorScheme="blue" leftIcon={<AddIcon />}>
            フィードを追加
          </Button>
        </VStack>
      </CardBody>
    </Card>
  );
}
```

## CI/CD パイプライン

### GitHub Actions による自動化

本システムでは、GitHub Actionsを使用してCI/CDパイプラインを構築し、コードの品質保証と自動デプロイメントを実現します。

#### ワークフロー構成

```
.github/workflows/
├── ci.yml              # 継続的インテグレーション
├── deploy-backend.yml  # バックエンドデプロイメント
├── deploy-frontend.yml # フロントエンドデプロイメント
└── deploy-infra.yml    # インフラストラクチャデプロイメント
```

#### CI ワークフロー (ci.yml)

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install uv
        uses: astral-sh/setup-uv@v4
        with:
          version: "latest"
      
      - name: Set up Python
        run: uv python install 3.14
      
      - name: Install dependencies
        run: |
          cd backend
          uv sync
      
      - name: Run linting
        run: |
          cd backend
          uv run ruff check .
          uv run ruff format --check .
      
      - name: Run type checking
        run: |
          cd backend
          uv run mypy app/
      
      - name: Run unit tests
        run: |
          cd backend
          uv run pytest tests/unit/ -v --cov=app --cov-report=xml
      
      - name: Run property-based tests
        run: |
          cd backend
          uv run pytest tests/property/ -v --tb=short
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./backend/coverage.xml

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Run linting
        run: |
          cd frontend
          npm run lint
      
      - name: Run type checking
        run: |
          cd frontend
          npm run type-check
      
      - name: Run unit tests
        run: |
          cd frontend
          npm run test:coverage
      
      - name: Build application
        run: |
          cd frontend
          npm run build

  test-infrastructure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: infrastructure/package-lock.json
      
      - name: Install dependencies
        run: |
          cd infrastructure
          npm ci
      
      - name: Run CDK synth
        run: |
          cd infrastructure
          npm run synth
      
      - name: Run CDK diff
        run: |
          cd infrastructure
          npm run diff
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_DEFAULT_REGION: ap-northeast-1
```

#### バックエンドデプロイメント (deploy-backend.yml)

```yaml
name: Deploy Backend

on:
  push:
    branches: [ main ]
    paths: [ 'backend/**' ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: rss-reader-backend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest
      
      - name: Update Lambda function
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: rss-reader-backend
          IMAGE_TAG: ${{ github.sha }}
        run: |
          aws lambda update-function-code \
            --function-name rss-reader-api \
            --image-uri $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          
          aws lambda wait function-updated \
            --function-name rss-reader-api
      
      - name: Run integration tests
        run: |
          cd backend
          npm install -g newman
          newman run tests/integration/api-tests.postman_collection.json \
            --environment tests/integration/production.postman_environment.json
```

#### フロントエンドデプロイメント (deploy-frontend.yml)

```yaml
name: Deploy Frontend

on:
  push:
    branches: [ main ]
    paths: [ 'frontend/**' ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build application
        run: |
          cd frontend
          npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: Deploy to S3
        run: |
          cd frontend
          aws s3 sync dist/ s3://${{ secrets.S3_BUCKET_NAME }}/ --delete
      
      - name: Invalidate CloudFront
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

#### インフラストラクチャデプロイメント (deploy-infra.yml)

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [ main ]
    paths: [ 'infrastructure/**' ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: infrastructure/package-lock.json
      
      - name: Install dependencies
        run: |
          cd infrastructure
          npm ci
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ap-northeast-1
      
      - name: CDK Bootstrap (if needed)
        run: |
          cd infrastructure
          npx cdk bootstrap
      
      - name: CDK Deploy
        run: |
          cd infrastructure
          npx cdk deploy --all --require-approval never
```

### デプロイメント戦略

#### 環境構成

1. **開発環境 (develop ブランチ)**
   - 自動デプロイメント
   - 開発者向けテスト環境
   - AWS アカウント: 開発用

2. **本番環境 (main ブランチ)**
   - 手動承認が必要
   - GitHub Environments を使用した保護
   - AWS アカウント: 本番用

#### ブランチ戦略

```
main (本番)
├── develop (開発)
├── feature/xxx (機能開発)
└── hotfix/xxx (緊急修正)
```

**フロー**:
1. `feature/xxx` → `develop` (PR + レビュー)
2. `develop` → `main` (PR + レビュー + 承認)
3. `main` → 本番デプロイメント

#### セキュリティ設定

**GitHub Secrets**:
```
AWS_ACCESS_KEY_ID          # AWS アクセスキー
AWS_SECRET_ACCESS_KEY      # AWS シークレットキー
S3_BUCKET_NAME            # S3 バケット名
CLOUDFRONT_DISTRIBUTION_ID # CloudFront ディストリビューション ID
VITE_API_URL              # フロントエンド用 API URL
```

**IAM ポリシー** (GitHub Actions 用):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction",
        "lambda:WaitUntilFunctionUpdated",
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "cloudfront:CreateInvalidation",
        "cloudformation:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

### 品質ゲート

#### 必須チェック項目

1. **コード品質**
   - Linting (ruff, ESLint)
   - フォーマット (ruff format, Prettier)
   - 型チェック (mypy, TypeScript)

2. **テスト**
   - ユニットテスト (pytest, Jest)
   - プロパティベーステスト (hypothesis)
   - カバレッジ 80% 以上

3. **セキュリティ**
   - 依存関係の脆弱性チェック (npm audit, safety)
   - シークレットスキャン (GitGuardian)

4. **パフォーマンス**
   - バンドルサイズチェック
   - Lighthouse スコア

#### 自動化されたテスト

**統合テスト**:
- Postman/Newman を使用した API テスト
- DynamoDB Local を使用したデータベーステスト

**E2E テスト**:
- Playwright を使用したブラウザテスト
- 主要なユーザーフローの自動テスト

### モニタリングとアラート

#### CloudWatch 統合

```yaml
# .github/workflows/monitoring.yml
name: Deploy Monitoring

on:
  push:
    branches: [ main ]
    paths: [ 'monitoring/**' ]

jobs:
  deploy-dashboards:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy CloudWatch Dashboard
        run: |
          aws cloudwatch put-dashboard \
            --dashboard-name "RSS-Reader-Production" \
            --dashboard-body file://monitoring/dashboard.json
      
      - name: Create CloudWatch Alarms
        run: |
          aws cloudwatch put-metric-alarm \
            --alarm-name "RSS-Reader-Lambda-Errors" \
            --alarm-description "Lambda function errors" \
            --metric-name Errors \
            --namespace AWS/Lambda \
            --statistic Sum \
            --period 300 \
            --threshold 5 \
            --comparison-operator GreaterThanThreshold \
            --evaluation-periods 2
```

#### デプロイメント通知

```yaml
- name: Notify deployment success
  if: success()
  uses: 8398a7/action-slack@v3
  with:
    status: success
    text: "🚀 RSS Reader deployment successful!"
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

- name: Notify deployment failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: "❌ RSS Reader deployment failed!"
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## パフォーマンス考慮事項

### DynamoDBの最適化

1. **シングルテーブル設計**: すべてのエンティティを1つのテーブルに格納し、結合操作を削減
2. **GSIの活用**: 時系列順と重要度順のソートにGSIを使用
3. **バッチ操作**: BatchGetItemとBatchWriteItemを使用して複数アイテムを効率的に処理
4. **オンデマンド課金**: 予測不可能なトラフィックに対応し、コストを最適化

### セマンティック検索の最適化

1. **埋め込みのキャッシュ**: キーワードの埋め込みをメモリにキャッシュしてAPI呼び出しを削減
2. **次元数の選択**: 1024次元を使用してコストと精度のバランスを取る
3. **エラーハンドリング**: Bedrock APIエラー時はゼロベクトルを返してシステムを継続
4. **代替モデル**: コスト重視の場合はTitan Text Embeddings V2を使用

### Lambda コールドスタート対策

1. **プロビジョニング済み同時実行**: 必要に応じて設定
2. **依存関係の最小化**: 必要なライブラリのみをインストール
3. **Bedrockクライアントの再利用**: Lambda関数の外でクライアントを初期化
