# AGENTS.md

このファイルは、コーディングエージェント（例: Claude Code / Devin / Codex など）がこのリポジトリで作業する際に必要な **コンテキスト** と **指示** をまとめたものです。

## 作業言語

* 返答・生成物・コメントは **日本語** で作成してください。

## プロジェクト概要

Feedly 風の RSS リーダーアプリです。セマンティック検索（意味検索）と重要度スコアリングを備え、サーバーレス運用を前提とします。認証なしの **単一ユーザー** 利用を想定します。

### 主要機能

* フォルダ分類つきの複数 RSS フィード管理
* 定期的な記事取得（冪等な保存）
* AWS Bedrock によるセマンティック検索を使った記事重要度スコアリング
* 既読/未読、保存/未保存の管理
* 自動クリーンアップ（作成から1週間、または既読から1日で削除）

## 技術スタック

### Backend

* 言語: Python 3.14
* フレームワーク: FastAPI
* デプロイ: AWS Lambda（Lambda Web Adapter 経由のコンテナ）
* HTTP: Lambda Function URL
* スケジューラ: EventBridge
* DB: DynamoDB
* AI/ML: AWS Bedrock（埋め込みベクトル）

### Frontend

* 言語: TypeScript
* フレームワーク: React 19.2.3
* データ取得: TanStack Query
* テーブル: TanStack Table
* UI: Chakra UI
* ホスティング: S3 + CloudFront

### Infrastructure

* IaC: AWS CDK（TypeScript）
* CI/CD: GitHub Actions

## リポジトリ構成

```text
.
├── .kiro/                      # Kiro spec-driven development
│   ├── specs/rss-reader/        # 機能仕様
│   │   ├── requirements.md      # 要件
│   │   ├── design.md            # 技術設計
│   │   └── tasks.md             # 実装タスク
│   └── steering/                # (任意) プロジェクト全体のAI向けガイダンス
├── docs/                        # コーディング規約
│   ├── python_coding_conventions.md
│   ├── ts_coding_conventions.md
│   └── react_coding_conventions.md
├── backend/                     # (作成予定) Python + FastAPI
├── frontend/                    # React 19 + TypeScript
├── infrastructure/              # (作成予定) AWS CDK
└── AGENTS.md                    # このファイル
```

## セットアップ/実行コマンド

### 開発環境のセットアップ

```bash
# 1. 開発環境のセットアップ（全プロジェクト）
make setup-dev

# 2. 各サービスの起動
# バックエンド
cd backend && uv run uvicorn app.main:app --reload

# フロントエンド
cd frontend && npm run dev

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

### コード品質ツール

#### Python (Backend)
- **Linter/Formatter**: Ruff（Python 3.14対応）
- **Type Checker**: Pyright（Python 3.14対応）
- **Test Framework**: pytest + Hypothesis (Property-based testing)

#### TypeScript (Frontend)
- **Linter**: ESLint 9系 + typescript-eslint（型情報を活用したlint）
- **Type Checker**: TypeScript Compiler（noEmit）
- **Test Framework**: Vitest + Testing Library

#### 個別プロジェクト用コマンド

```bash
# Backend
make backend-lint        # Ruff lint
make backend-format      # Ruff format
make backend-type-check  # Pyright
make backend-test        # pytest with coverage

# Frontend
make frontend-lint       # ESLint
make frontend-format     # ESLint --fix
make frontend-type-check # tsc --noEmit
make frontend-test       # Vitest with coverage

# Infrastructure
make infra-type-check    # tsc --noEmit
make infra-synth         # cdk synth
```

以下を参照してください：

* `.kiro/specs/rss-reader/tasks.md`（最新の実装チェックリスト）
* `.kiro/specs/rss-reader/design.md`（設計判断）
* `docs/*_coding_conventions.md`（言語/フレームワーク別の規約）

## コード規約

このリポジトリでコードを書く際は、**必ず** それぞれの規約ドキュメントを参照してください。

### Python（`docs/python_coding_conventions.md`）

* PEP 8 準拠、型ヒント必須
* 全関数に docstring（PEP 257）
* 単体テスト + プロパティベーステスト

### TypeScript（`docs/ts_coding_conventions.md`）

* TypeScript 5.x / ES2022
* ESM のみ（CommonJS 不可）
* `any` は避け、`unknown` + 型の絞り込みを優先
* 状態機械は判別可能ユニオンを優先

### React（`docs/react_coding_conventions.md`）

* React 19.2.3 / 関数コンポーネント + Hooks のみ
* コンポーネントは TypeScript 前提
* サーバ状態は TanStack Query
* Chakra UI を使用

## 開発ワークフロー（Kiro Spec-Driven Development）

このプロジェクトは、Kiro 風の spec-driven development をカスタム slash command で進めます。

### 対象仕様

* Feature: `rss-reader`
* Location: `.kiro/specs/rss-reader/`
* Status check: `/kiro:spec-status rss-reader`

### フェーズ

#### Phase 1: 仕様作成（Specification Creation）

1. `/kiro:spec-init [description]` - 新規 spec 初期化
2. `/kiro:spec-requirements [feature]` - 要件生成
3. `/kiro:spec-design [feature]` - 技術設計（要件レビュー承認が必要）
4. `/kiro:spec-tasks [feature]` - タスク生成（設計レビュー承認が必要）

#### Phase 2: 実装（Implementation）

* `/kiro:spec-impl [feature] [task-numbers]` - TDD 前提でタスク実行
* タスクは順番に完了し、必要なテストカバレッジを満たすこと

#### Phase 3: 検証（Validation）

* `/kiro:validate-design [feature]` - 設計品質レビュー
* `/kiro:validate-gap [feature]` - 要件と実装のギャップ分析

#### Optional: Steering

* `/kiro:steering` - プロジェクト全体の指針作成/更新
* `/kiro:steering-custom` - 特定コンテキスト向けの指針作成

### 重要ルール

1. 各フェーズは **人間の承認** が必要（承認なしに次へ進まない）
2. フェーズを飛ばさない（design は requirements 承認後、tasks は design 承認後）
3. 作業に合わせて `tasks.md` のステータスを更新する
4. **TDD を徹底**（実装前にテストを書く）
5. テストカバレッジは **80% 以上** を維持する

## テスト指針

### Python

* pytest による **単体テスト**（重要経路は必須）
* Hypothesis による **プロパティベーステスト**（不変条件の検証）
* カバレッジ: 最低 80%
* エッジケース: 空入力、無効型、境界値

### TypeScript/React

* Vitest による **単体テスト**
* React Testing Library による **コンポーネントテスト**
* 実装詳細ではなく「振る舞い」をテストする
* 外部 API は適切にモックする

### テスト実行

```bash
# 全プロジェクトのテスト
make test

# カバレッジ付きテスト
make test-coverage

# Backend
cd backend
uv run pytest --cov=app --cov-report=term-missing

# Frontend
cd frontend
npm run test:coverage

# Infrastructure
cd infrastructure
npm test
```

## AWS アーキテクチャ

### Lambda Functions

1. **API Handler**（FastAPI）

   * Lambda Function URL で HTTP 提供
   * Lambda Web Adapter 経由のコンテナデプロイ

2. **Feed Fetcher**（EventBridge トリガ）

   * スケジュール: 1時間ごと
   * 登録済みフィードから新着記事を取得

3. **Article Cleanup**（EventBridge トリガ）

   * スケジュール: 毎日
   * 作成から 1 週間超、または既読から 1 日超の記事を削除

### DynamoDB Tables

* 単一テーブル設計（GSI 利用）
* Entities: Feeds, Articles, Keywords, ImportanceScores
* アクセスパターンは `design.md` に定義

### デプロイ（実装後）

```bash
cd infrastructure
cdk deploy --all
```

```bash
cd frontend
npm run build
# CDK 経由で S3 にアップロード
```

## CI/CD（GitHub Actions）

### CI環境

- **Python**: 3.14 + uv
- **Node.js**: 18
- **自動デプロイ**: mainブランチのみ

### Triggers

* 任意ブランチへの push
* Pull request 作成

### Pipeline steps

1. **Lint / Format**: Ruff (Python) + ESLint (TypeScript)
2. **Type Check**: Pyright (Python) + TypeScript Compiler
3. **Test**: pytest (Python) + Vitest (TypeScript)
4. **Coverage**: 80%以上を要求
5. **Security**: Trivy脆弱性スキャン
6. **結合テスト**
7. **本番デプロイ**（main ブランチのみ）

### Required checks

* 全テストが成功
* Coverage ≥ 80%
* 既知の脆弱性なし
* 型チェック成功

### 開発者向けツール

- **pre-commit**: コミット前の自動チェック
- **VSCode設定**: 推奨拡張機能と設定
- **detect-secrets**: 機密情報の誤コミット防止

## 実装上の注意

### AWS Bedrock を使ったセマンティック検索

* Bedrock の埋め込みを使って「キーワード ↔ 記事」の類似度を算出
* 重要度スコアは「キーワード重み × セマンティック類似度」などで設計
* Bedrock API コール削減のため、キーワード埋め込みはキャッシュする
* スコアに寄与したキーワードの説明（explanation）を保存する

### 冪等な記事保存

* 記事の link URL を一意キーとして扱う
* フィード取得を繰り返しても重複保存しない
* パースエラーはリトライを含めて安全に扱う

### 単一ユーザー前提

* 認証は不要
* データモデルに user_id を持たない
* 権限は単純化（Lambda が DynamoDB にフルアクセス）

### RSS サポート

* RSS 2.0 と Atom のみ
* パースには `feedparser` を使用
* Web スクレイピングや独自 RSS 生成はしない

## 制約

### Must have

* フォルダ分類つきの複数 RSS フィード登録
* 定期取得と、失敗時の安全なリトライ
* link URL による冪等保存
* 記事一覧: 時系列 / 重要度順
* 既読/未読、保存/未保存の管理
* 重み付け可能なキーワード登録
* 説明つき重要度スコアリング

### Must NOT implement

* 非 RSS 対応（スクレイピング / RSS ビルダー等）
* 認証 / マルチユーザー対応
* 常時稼働サーバ（サーバーレスのみ）

## 参照

* 要件: `.kiro/specs/rss-reader/requirements.md`
* 技術設計: `.kiro/specs/rss-reader/design.md`
* 実装タスク: `.kiro/specs/rss-reader/tasks.md`
* 元のプロジェクト説明: `README.md`

## 開発上の注意点

* ユーザーからは`.kiro/specs/rss-reader/tasks.md`のタスク名を実装する指示が出されます。タスクに記載された内容に忠実に沿って実装を進めてください。タスクに記載された内容以外の作業は絶対にしないでください
* ex: 7. RSSフィード取得機能の実装の場合、FeedFetcherServiceクラスを実装だけ行い、フロントエンドやインフラの実装は行わないでください
* ブランチ名も同様にタスク番号を含めてください（例: `feature/7-rss-feed-fetcher`）
* プルリクエストを作成する際は、必ず対応するタスク番号をタイトルに含めてください（例: `#7: RSSフィード取得機能の実装`）
