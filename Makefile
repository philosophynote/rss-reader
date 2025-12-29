# RSS Reader Project Makefile
# Python 3.14 + TypeScript 5系 + uv前提

.PHONY: help install lint format type-check test test-coverage clean setup-dev

# デフォルトターゲット
help:
	@echo "RSS Reader Project - 利用可能なコマンド:"
	@echo ""
	@echo "セットアップ:"
	@echo "  setup-dev     開発環境のセットアップ（依存関係インストール + pre-commit）"
	@echo "  install       全プロジェクトの依存関係をインストール"
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
	@echo "Backend (Ruff):"
	@cd backend && uv run ruff format .
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
	@find . -type d -name "node_modules" -prune -o -type d -name ".vite" -exec rm -rf {} + 2>/dev/null || true
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
	@cd backend && uv run ruff format .

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