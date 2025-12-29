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

## AWS認証情報の設定

### 必要なIAM権限

このアプリケーションは以下のAWS権限が必要です：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/rss-reader-*",
        "arn:aws:dynamodb:*:*:table/rss-reader-*/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/amazon.nova-2-multimodal-embeddings-v1:0"
      ]
    }
  ]
}
```

### ローカル開発環境での認証設定

#### 方法1: AWS CLI認証情報を使用

```bash
# AWS CLIで認証情報を設定
aws configure

# または環境変数で設定
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_DEFAULT_REGION=us-east-1
```

#### 方法2: IAMロールを使用（推奨）

```bash
# IAMロールを引き受ける
aws sts assume-role --role-arn arn:aws:iam::123456789012:role/RSSReaderDeveloperRole --role-session-name dev-session

# 返された認証情報を環境変数に設定
export AWS_ACCESS_KEY_ID=returned-access-key
export AWS_SECRET_ACCESS_KEY=returned-secret-key
export AWS_SESSION_TOKEN=returned-session-token
```

#### 方法3: .envファイルを使用

プロジェクトルートに`.env`ファイルを作成：

```bash
# .env ファイルの例
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1
DYNAMODB_TABLE_NAME=rss-reader-dev
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-2-multimodal-embeddings-v1:0
EMBEDDING_DIMENSION=1024
API_KEY=dev-api-key-for-testing
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

**注意:** `.env`ファイルは`.gitignore`に含まれており、リポジトリにコミットされません。

### Lambda環境での認証

本番環境（AWS Lambda）では、Lambda実行ロールを使用して認証が行われます。
CDKデプロイ時に適切なIAM権限が自動的に設定されます。

## 環境変数

- `DYNAMODB_TABLE_NAME` - DynamoDBテーブル名
- `BEDROCK_REGION` - AWS Bedrockリージョン
- `BEDROCK_MODEL_ID` - Bedrockモデル ID
- `EMBEDDING_DIMENSION` - 埋め込みベクトルの次元数（デフォルト: 1024）
- `API_KEY` - API認証キー
- `CORS_ORIGINS` - CORS許可オリジン（カンマ区切り）
- `AWS_ACCESS_KEY_ID` - AWS アクセスキー（ローカル開発時のみ）
- `AWS_SECRET_ACCESS_KEY` - AWS シークレットキー（ローカル開発時のみ）
- `AWS_SESSION_TOKEN` - AWS セッショントークン（IAMロール使用時）
- `AWS_DEFAULT_REGION` - AWSデフォルトリージョン

## デプロイ

AWS Lambda関数としてコンテナイメージでデプロイされます。
詳細は `infrastructure/` ディレクトリのCDKコードを参照してください。

### Dockerイメージのビルド

```bash
# Dockerイメージをビルド
docker build -t rss-reader-backend:latest .

# ローカルでDockerコンテナを起動（テスト用）
docker run -p 8000:8000 \
  -e DYNAMODB_TABLE_NAME=rss-reader-dev \
  -e API_KEY=test-api-key \
  -e CORS_ORIGINS=http://localhost:3000 \
  -e AWS_REGION=us-east-1 \
  -e BEDROCK_REGION=us-east-1 \
  -e BEDROCK_MODEL_ID=amazon.nova-2-multimodal-embeddings-v1:0 \
  -e EMBEDDING_DIMENSION=1024 \
  rss-reader-backend:latest
```

### Lambda Web Adapterの設定

このプロジェクトは[AWS Lambda Web Adapter](https://github.com/awslabs/aws-lambda-web-adapter)を使用しています。

**主な設定:**
- `AWS_LWA_ENABLE_COMPRESSION=true`: レスポンス圧縮を有効化
- `AWS_LWA_INVOKE_MODE=response_stream`: ストリーミングレスポンスモード
- `AWS_LWA_READINESS_CHECK_PATH=/health`: ヘルスチェックパス
- `AWS_LWA_READINESS_CHECK_PORT=8000`: ヘルスチェックポート
- `PORT=8000`: アプリケーションポート

### セキュリティ設定

**認証:**
- API Key認証を使用（`Authorization: Bearer <API_KEY>`ヘッダー）
- 環境変数`API_KEY`で設定

**CORS:**
- 特定のオリジンのみ許可
- 環境変数`CORS_ORIGINS`で設定（カンマ区切り）

**セキュリティヘッダー:**
- `SECURITY_HEADERS_ENABLED=true`で有効化
- X-Content-Type-Options、X-Frame-Options、X-XSS-Protectionなどを設定

### CDKデプロイ

```bash
# インフラストラクチャディレクトリに移動
cd ../infrastructure

# 環境変数を設定
export RSS_READER_API_KEY=your-secure-api-key
export ENVIRONMENT=development

# CDKデプロイ
npm run deploy
```