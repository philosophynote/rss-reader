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

### クイックスタート

```bash
# 1. 開発環境のセットアップ（全プロジェクト）
make setup-dev

# 2. 環境変数の設定
# .env.example をコピーして .env.local を作成
cp .env.example .env.local
# 必要に応じて .env.local を編集

# 3. 開発サーバーの起動
# フロントエンド
make dev
# または: cd frontend && npm run dev

# バックエンド（実装後）
make backend-dev
# または: cd backend && uv run uvicorn app.main:app --reload

# インフラストラクチャ（デプロイ）
cd infrastructure && npm run deploy
```

### 開発コマンド

```bash
# コード品質チェック
make lint          # 全プロジェクトのlint
make format        # 全プロジェクトのフォーマット
make type-check    # 全プロジェクトの型チェック

# テスト実行
make test          # 全プロジェクトのテスト
make test-coverage # カバレッジ付きテスト

# クリーンアップ
make clean         # ビルド成果物とキャッシュを削除
```

### 環境変数の設定

すべての環境変数はプロジェクトルートで一元管理します。

#### 基本設定

```bash
# .env.example をコピーして .env.local を作成
cp .env.example .env.local

# .env.local を編集して必要な値を設定
# フロントエンド開発時は最低限以下の2つが必要:
VITE_API_BASE_URL=http://localhost:8000
VITE_API_KEY=dev-api-key-placeholder
```

**注意:**
- バックエンドが未実装の場合でも、フロントエンド用の環境変数が必要です。ダミーの値を設定してください。
- `frontend/.env.local` はルートの `.env.local` へのシンボリックリンクです。

#### バックエンド開発時（実装後）

ルートの `.env.local` に以下を追加:

```bash
# バックエンド用環境変数
DYNAMODB_TABLE_NAME=rss-reader
BEDROCK_REGION=ap-northeast-1
BEDROCK_MODEL_ID=amazon.nova-2-multimodal-embeddings-v1:0
RSS_READER_API_KEY_PARAMETER_NAME=/rss-reader/development/api-key
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
```

#### インフラストラクチャデプロイ時

ルートの `.env.local` に以下を追加:

```bash
# AWS認証情報
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
CDK_DEFAULT_REGION=ap-northeast-1
ENVIRONMENT=dev
```

### CI/CD

このプロジェクトはGitHub Actionsを使用してCI/CDを実行します：

- **Lint & Format**: Ruff (Python) + ESLint (TypeScript)
- **Type Check**: Pyright (Python) + TypeScript Compiler
- **Test**: pytest (Python) + Vitest (TypeScript)
- **Coverage**: 80%以上を要求
- **Security**: Trivy脆弱性スキャン

#### CI環境

- Python 3.14 + uv
- Node.js 18
- 自動デプロイ（mainブランチ）

### コード品質ツール

#### Python (Backend)
- **Linter/Formatter**: Ruff
- **Type Checker**: Pyright (basic mode)
- **Test Framework**: pytest + Hypothesis (Property-based testing)

#### TypeScript (Frontend)
- **Linter**: ESLint + typescript-eslint
- **Type Checker**: TypeScript Compiler
- **Test Framework**: Vitest + Testing Library

### AWS認証情報と権限

ローカル開発では、AWS CLIの認証情報または`AWS_ACCESS_KEY_ID`などの
環境変数で認証します。Bedrockの埋め込み生成を利用するため、最低限
以下のIAM権限が必要です。

- `bedrock:InvokeModel`

#### ローカル開発用の環境変数例

```bash
# backend/.env 例
AWS_REGION=ap-northeast-1
BEDROCK_REGION=us-east-1  # Nova 2 multimodal embeddings is only available in us-east-1
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
