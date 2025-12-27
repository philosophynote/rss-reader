# RSS Reader Backend

Feedly風RSSリーダーのバックエンドAPI

## 技術スタック

- Python 3.11+
- FastAPI
- AWS Lambda Web Adapter
- DynamoDB
- AWS Bedrock (セマンティック検索)

## 開発環境のセットアップ

### 前提条件

- Python 3.11以上
- uv (Python パッケージマネージャー)

### インストール

```bash
# uvをインストール（まだの場合）
curl -LsSf https://astral.sh/uv/install.sh | sh

# 依存関係をインストール
uv sync

# 開発用依存関係も含めてインストール
uv sync --dev
```

### 開発サーバーの起動

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### テストの実行

```bash
# 全テストを実行
uv run pytest

# カバレッジ付きでテストを実行
uv run pytest --cov=app --cov-report=html

# 特定のテストファイルを実行
uv run pytest tests/test_specific.py
```

### コード品質チェック

```bash
# フォーマット
uv run black app/ tests/
uv run isort app/ tests/

# リンティング
uv run flake8 app/ tests/

# 型チェック
uv run mypy app/
```

## API エンドポイント

- `GET /` - ヘルスチェック
- `GET /health` - ヘルスチェック
- `POST /api/feeds` - フィード登録
- `GET /api/feeds` - フィード一覧取得
- `GET /api/articles` - 記事一覧取得
- `POST /api/keywords` - キーワード登録

## 環境変数

- `DYNAMODB_TABLE_NAME` - DynamoDBテーブル名
- `BEDROCK_REGION` - AWS Bedrockリージョン
- `BEDROCK_MODEL_ID` - Bedrockモデル ID
- `API_KEY` - API認証キー
- `CORS_ORIGINS` - CORS許可オリジン（カンマ区切り）

## デプロイ

AWS Lambda関数としてコンテナイメージでデプロイされます。
詳細は `infrastructure/` ディレクトリのCDKコードを参照してください。