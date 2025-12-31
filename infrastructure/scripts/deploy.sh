#!/bin/bash

# RSS Reader CDK デプロイスクリプト
# 使用方法: ./scripts/deploy.sh [development|production]

set -e

# 引数チェック
ENVIRONMENT=${1:-development}

if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    echo "エラー: 環境は 'development' または 'production' を指定してください"
    echo "使用方法: $0 [development|production]"
    exit 1
fi

echo "🚀 RSS Reader インフラストラクチャをデプロイしています..."
echo "環境: $ENVIRONMENT"

# 必要な環境変数をチェック
if [[ -z "$CDK_DEFAULT_ACCOUNT" ]]; then
    echo "警告: CDK_DEFAULT_ACCOUNT が設定されていません"
fi

if [[ -z "$CDK_DEFAULT_REGION" ]]; then
    echo "警告: CDK_DEFAULT_REGION が設定されていません（デフォルト: ap-northeast-1）"
fi

# TypeScriptをビルド
echo "📦 TypeScriptをビルドしています..."
npm run build

# CDK Bootstrap（初回のみ必要）
echo "🔧 CDK Bootstrapを実行しています..."
npm run bootstrap:$ENVIRONMENT

# CDK Synth（テンプレート生成）
echo "📋 CloudFormationテンプレートを生成しています..."
npm run synth:$ENVIRONMENT

# CDK Deploy
echo "🚀 デプロイを実行しています..."
npm run deploy:$ENVIRONMENT -- --require-approval never

echo "✅ デプロイが完了しました！"
echo ""
echo "📊 出力情報を確認してください:"
echo "- Lambda Function URL"
echo "- CloudFront Distribution URL"
echo "- DynamoDB Table Name"
