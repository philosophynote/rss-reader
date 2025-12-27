#!/bin/bash

# RSS Reader CDK 削除スクリプト
# 使用方法: ./scripts/destroy.sh [development|production]

set -e

# 引数チェック
ENVIRONMENT=${1:-development}

if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    echo "エラー: 環境は 'development' または 'production' を指定してください"
    echo "使用方法: $0 [development|production]"
    exit 1
fi

echo "🗑️  RSS Reader インフラストラクチャを削除しています..."
echo "環境: $ENVIRONMENT"

# 確認プロンプト
read -p "本当に $ENVIRONMENT 環境のリソースを削除しますか？ (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "削除をキャンセルしました"
    exit 0
fi

# TypeScriptをビルド
echo "📦 TypeScriptをビルドしています..."
npm run build

# CDK Destroy
echo "🗑️  リソースを削除しています..."
npm run destroy:$ENVIRONMENT -- --force

echo "✅ 削除が完了しました！"