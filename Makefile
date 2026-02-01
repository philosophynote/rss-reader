# RSS Reader Project Makefile
# Python 3.14 + TypeScript 5系 + uv前提

.PHONY: help install lint format type-check test test-coverage clean setup-dev dev backend-dev backend-dev-local dynamodb-local dynamodb-local-create-table infra-deploy-dev infra-deploy-prod infra-diff-dev infra-diff-prod logs-dev logs-prod frontend-build frontend-deploy-dev frontend-deploy-prod

# デフォルトターゲット
help:
	@echo "RSS Reader Project - 利用可能なコマンド:"
	@echo ""
	@echo "セットアップ:"
	@echo "  setup-dev     開発環境のセットアップ（依存関係インストール + pre-commit）"
	@echo "  install       全プロジェクトの依存関係をインストール"
	@echo ""
	@echo "開発サーバー:"
	@echo "  dev           フロントエンド開発サーバーを起動 (http://localhost:5173)"
	@echo "  backend-dev   バックエンド開発サーバーを起動 (http://localhost:8000)"
	@echo "  backend-dev-local  .env.local を読み込んでバックエンドを起動 (http://localhost:8000)"
	@echo ""
	@echo "ローカルDynamoDB:"
	@echo "  dynamodb-local             DynamoDB Local を起動 (http://localhost:8001)"
	@echo "  dynamodb-local-create-table ローカルDynamoDB用テーブルを作成"
	@echo ""
	@echo "コード品質:"
	@echo "  lint          全プロジェクトのlint実行"
	@echo "  format        全プロジェクトのフォーマット実行"
	@echo "  type-check    全プロジェクトの型チェック実行"
	@echo ""
	@echo "テスト:"
	@echo "  test          全プロジェクトのテスト実行"
	@echo "  test-coverage 全プロジェクトのカバレッジ付きテスト実行"
	@echo ""
	@echo "その他:"
	@echo "  clean         ビルド成果物とキャッシュを削除"
	@echo ""
	@echo "インフラ:"
	@echo "  infra-deploy-dev  開発環境にCDKデプロイ"
	@echo "  infra-deploy-prod 本番環境にCDKデプロイ"
	@echo "  infra-diff-dev    開発環境の差分を表示"
	@echo "  infra-diff-prod   本番環境の差分を表示"
	@echo "  logs-dev          開発環境のCloudWatch Logsをtail"
	@echo "  logs-prod         本番環境のCloudWatch Logsをtail"
	@echo "  frontend-build    フロントエンドをビルド"
	@echo "  frontend-deploy-dev  フロントエンドをビルドして開発環境へデプロイ"
	@echo "  frontend-deploy-prod フロントエンドをビルドして本番環境へデプロイ"

# =========================
# セットアップ
# =========================

setup-dev: install
	@echo "🔧 開発環境をセットアップ中..."
	@if command -v pre-commit >/dev/null 2>&1; then \
		pre-commit install; \
		echo "✅ pre-commit hooks をインストールしました"; \
	else \
		echo "⚠️  pre-commit がインストールされていません。pipx install pre-commit を実行してください"; \
	fi

install:
	@echo "📦 依存関係をインストール中..."
	@echo "Backend (Python 3.14 + uv):"
	@cd backend && uv sync --dev
	@echo "Frontend (Node.js):"
	@cd frontend && npm ci
	@echo "Infrastructure (CDK):"
	@cd infrastructure && npm ci
	@echo "✅ 全ての依存関係をインストールしました"

# =========================
# 開発サーバー
# =========================

dev:
	@echo "🚀 フロントエンド開発サーバーを起動中..."
	@echo "📱 ブラウザで http://localhost:5173 にアクセスしてください"
	@echo ""
	@cd frontend && npm run dev

backend-dev:
	@echo "🚀 バックエンド開発サーバーを起動中..."
	@echo "📡 API: http://localhost:8000"
	@echo "📚 API Docs: http://localhost:8000/docs"
	@echo ""
	@cd backend && uv run uvicorn app.main:app --reload

backend-dev-local:
	@echo "🚀 ローカル環境変数でバックエンドを起動中..."
	@echo "📡 API: http://localhost:8000"
	@echo "📚 API Docs: http://localhost:8000/docs"
	@echo ""
	@set -a; . ./.env.local; set +a; cd backend && uv run uvicorn app.main:app --reload

# =========================
# ローカルDynamoDB
# =========================

AWS_PAGER ?= ""
DYNAMODB_ENDPOINT_URL ?= http://localhost:8001
DYNAMODB_TABLE_NAME ?= rss-reader-local
AWS_REGION ?= ap-northeast-1
AWS_ACCESS_KEY_ID ?= local
AWS_SECRET_ACCESS_KEY ?= local
LOG_TAIL_SINCE ?= 10m

dynamodb-local:
	@echo "🧪 DynamoDB Local を起動中..."
	@echo "📦 http://localhost:8001"
	@docker run --rm -p 8001:8000 amazon/dynamodb-local -jar DynamoDBLocal.jar -sharedDb

dynamodb-local-create-table:
	@echo "🧪 ローカルDynamoDBにテーブルを作成中..."
	@AWS_PAGER=$(AWS_PAGER) AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) AWS_REGION=$(AWS_REGION) \
	aws dynamodb create-table \
		--table-name $(DYNAMODB_TABLE_NAME) \
		--attribute-definitions \
			AttributeName=PK,AttributeType=S \
			AttributeName=SK,AttributeType=S \
			AttributeName=GSI1PK,AttributeType=S \
			AttributeName=GSI1SK,AttributeType=S \
			AttributeName=GSI2PK,AttributeType=S \
			AttributeName=GSI2SK,AttributeType=S \
			AttributeName=GSI3PK,AttributeType=S \
			AttributeName=GSI3SK,AttributeType=S \
			AttributeName=GSI4PK,AttributeType=S \
			AttributeName=GSI4SK,AttributeType=S \
			AttributeName=GSI5PK,AttributeType=S \
			AttributeName=GSI5SK,AttributeType=S \
		--key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
		--billing-mode PAY_PER_REQUEST \
		--global-secondary-indexes '[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"GSI2","KeySchema":[{"AttributeName":"GSI2PK","KeyType":"HASH"},{"AttributeName":"GSI2SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"GSI3","KeySchema":[{"AttributeName":"GSI3PK","KeyType":"HASH"},{"AttributeName":"GSI3SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"GSI4","KeySchema":[{"AttributeName":"GSI4PK","KeyType":"HASH"},{"AttributeName":"GSI4SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},{"IndexName":"GSI5","KeySchema":[{"AttributeName":"GSI5PK","KeyType":"HASH"},{"AttributeName":"GSI5SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
		--endpoint-url $(DYNAMODB_ENDPOINT_URL)

# =========================
# コード品質
# =========================

lint:
	@echo "🔍 Lint実行中..."
	@echo "Backend (Ruff):"
	@cd backend && uv run ruff check .
	@echo "Frontend (ESLint):"
	@cd frontend && npm run lint
	@echo "✅ Lint完了"

format:
	@echo "🎨 フォーマット実行中..."
	@echo "Backend (Ruff check --fix + format):"
	@cd backend && uv run ruff check --fix . && uv run ruff format .
	@echo "Frontend (ESLint --fix):"
	@cd frontend && npm run lint:fix
	@echo "✅ フォーマット完了"

type-check:
	@echo "🔍 型チェック実行中..."
	@echo "Backend (Pyright):"
	@cd backend && uv run pyright
	@echo "Frontend (TypeScript):"
	@cd frontend && npm run type-check
	@echo "Infrastructure (TypeScript):"
	@cd infrastructure && npx tsc --noEmit
	@echo "✅ 型チェック完了"

# =========================
# テスト
# =========================

test:
	@echo "🧪 テスト実行中..."
	@echo "Backend (pytest):"
	@cd backend && uv run pytest
	@echo "Frontend (vitest):"
	@cd frontend && npm run test
	@echo "✅ テスト完了"

test-coverage:
	@echo "🧪 カバレッジ付きテスト実行中..."
	@echo "Backend (pytest + coverage):"
	@cd backend && uv run pytest --cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=80
	@echo "Frontend (vitest + coverage):"
	@cd frontend && npm run test:coverage
	@echo "✅ カバレッジ付きテスト完了"
	@echo ""
	@echo "📊 カバレッジレポート:"
	@echo "  Backend:  backend/htmlcov/index.html"
	@echo "  Frontend: frontend/coverage/index.html"

# =========================
# その他
# =========================

clean:
	@echo "🧹 クリーンアップ中..."
	@echo "Python キャッシュ:"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@echo "Node.js キャッシュ:"
	@find . -path './node_modules' -prune -o -type d -name ".vite" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "build" -exec rm -rf {} + 2>/dev/null || true
	@echo "カバレッジレポート:"
	@rm -rf backend/htmlcov backend/.coverage
	@rm -rf frontend/coverage
	@echo "CDK出力:"
	@rm -rf infrastructure/cdk.out
	@echo "✅ クリーンアップ完了"

# =========================
# 個別プロジェクト用ショートカット
# =========================

# Backend
backend-lint:
	@cd backend && uv run ruff check .

backend-format:
	@cd backend && uv run ruff check --fix . && uv run ruff format .

backend-type-check:
	@cd backend && uv run pyright

backend-test:
	@cd backend && uv run pytest --cov=app --cov-report=term-missing

# Frontend
frontend-lint:
	@cd frontend && npm run lint

frontend-format:
	@cd frontend && npm run lint:fix

frontend-type-check:
	@cd frontend && npm run type-check

frontend-test:
	@cd frontend && npm run test:coverage

# Infrastructure
infra-type-check:
	@cd infrastructure && npx tsc --noEmit

infra-synth:
	@cd infrastructure && npx cdk synth

infra-deploy-dev:
	@cd infrastructure && RSS_READER_API_KEY_PARAMETER_NAME="$$RSS_READER_API_KEY_PARAMETER_NAME" npx cdk deploy --context environment=development --verbose

infra-deploy-prod:
	@cd infrastructure && RSS_READER_API_KEY_PARAMETER_NAME="$$RSS_READER_API_KEY_PARAMETER_NAME" npx cdk deploy --context environment=production --verbose

infra-diff-dev:
	@cd infrastructure && npx cdk diff --context environment=development

infra-diff-prod:
	@cd infrastructure && npx cdk diff --context environment=production

frontend-build:
	@echo "🧱 フロントエンドをビルド中..."
	@cd frontend && npm run build

frontend-deploy-dev: frontend-build
	@echo "🚀 フロントエンドを開発環境へデプロイ中..."
	@cd infrastructure && RSS_READER_API_KEY_PARAMETER_NAME="$$RSS_READER_API_KEY_PARAMETER_NAME" npx cdk deploy --context environment=development --verbose

frontend-deploy-prod: frontend-build
	@echo "🚀 フロントエンドを本番環境へデプロイ中..."
	@cd infrastructure && RSS_READER_API_KEY_PARAMETER_NAME="$$RSS_READER_API_KEY_PARAMETER_NAME" npx cdk deploy --context environment=production --verbose

logs-dev:
	@echo "🪵 CloudWatch Logs (development) をtail中... (since: $(LOG_TAIL_SINCE))"
	@AWS_PAGER=$(AWS_PAGER) aws logs tail /aws/lambda/rss-reader-api-development --since $(LOG_TAIL_SINCE)

logs-prod:
	@echo "🪵 CloudWatch Logs (production) をtail中... (since: $(LOG_TAIL_SINCE))"
	@AWS_PAGER=$(AWS_PAGER) aws logs tail /aws/lambda/rss-reader-api-production --since $(LOG_TAIL_SINCE)
