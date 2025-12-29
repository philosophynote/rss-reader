# RSS Reader

Feedly風のRSSリーダーアプリケーション

## 概要

このプロジェクトは、複数のRSSフィードを管理し、記事を取得・保存・閲覧できるRSSリーダーです。セマンティック検索を用いて記事の重要度をスコア化し、ユーザーにとって重要な記事を優先的に表示します。

## 技術スタック

### バックエンド
- Python 3.14+ / FastAPI
- AWS Lambda Web Adapter
- DynamoDB
- AWS Bedrock (セマンティック検索)

### フロントエンド
- React 19.2.3 / TypeScript 5.9.3
- Chakra UI
- TanStack Query / TanStack Table
- React Router

### インフラストラクチャ
- AWS CDK (TypeScript)
- AWS Lambda
- EventBridge
- S3 + CloudFront

## プロジェクト構造

```plaintext
rss-reader/
├── backend/                 # Python (FastAPI + Lambda)
│   ├── app/                # アプリケーションコード
│   ├── tests/              # テスト
│   ├── pyproject.toml      # Python依存関係
│   └── Dockerfile          # Lambda コンテナ
├── frontend/               # TypeScript (React + Chakra UI)
│   ├── src/                # ソースコード
│   ├── package.json        # Node.js依存関係
│   └── vite.config.ts      # Vite設定
├── infrastructure/         # TypeScript (AWS CDK)
│   ├── lib/                # CDKスタック定義
│   ├── bin/                # CDKアプリケーション
│   └── package.json        # CDK依存関係
└── README.md
```

## 開発環境のセットアップ

### 前提条件

- Python 3.14以上
- Node.js 18以上
- AWS CLI設定済み
- uv (Python パッケージマネージャー)

### AWS認証情報と権限

ローカル開発では、AWS CLIの認証情報または`AWS_ACCESS_KEY_ID`などの
環境変数で認証します。Bedrockの埋め込み生成を利用するため、最低限
以下のIAM権限が必要です。

- `bedrock:InvokeModel`

#### ローカル開発用の環境変数例

```bash
# backend/.env 例
AWS_REGION=us-east-1
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-2-multimodal-embeddings-v1:0
EMBEDDING_DIMENSION=1024
DYNAMODB_TABLE_NAME=rss-reader
KEYWORD_EMBEDDING_CACHE_SIZE=100
```

### バックエンド

```bash
cd backend
uv sync --dev
uv run uvicorn app.main:app --reload
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev
```

### インフラストラクチャ

```bash
cd infrastructure
npm install
npm run build
npm run deploy
```

## 機能

- [x] プロジェクト構造のセットアップ
- [ ] RSSフィード管理
- [ ] 記事の定期取得
- [ ] 記事の一覧表示（時系列・重要度順）
- [ ] 未読/既読管理
- [ ] 記事の保存機能
- [ ] キーワード管理
- [ ] 重要度スコアリング（セマンティック検索）
- [ ] 記事の自動削除
- [ ] API認証
- [ ] CI/CDパイプライン

## ライセンス

MIT License

## 開発者向け情報

詳細な開発情報は各ディレクトリのREADME.mdを参照してください。

### バックエンド

[バックエンド](./backend/README.md) - FastAPIとLambdaの開発手順

### フロントエンド

[フロントエンド](./frontend/README.md) - ViteとReactの開発手順

### インフラストラクチャ

[インフラストラクチャ](./infrastructure/README.md) - CDKの構築とデプロイ手順
