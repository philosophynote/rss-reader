# RSS Reader Infrastructure

AWS CDKを使用したRSSリーダーのインフラストラクチャ定義

## 技術スタック

- AWS CDK (TypeScript)
- DynamoDB
- Lambda (Container)
- EventBridge
- S3 + CloudFront
- IAM

## 前提条件

- Node.js 18以上
- AWS CLI設定済み
- AWS CDK CLI (`npm install -g aws-cdk`)

## セットアップ

```bash
# 依存関係をインストール
npm install

# TypeScriptをコンパイル
npm run build

# CDKをブートストラップ（初回のみ）
npm run bootstrap
```

## デプロイ

### 環境変数の設定

デプロイ前に必要な環境変数を設定してください：

```bash
# API認証キーを設定（必須）
export RSS_READER_API_KEY=your-secure-api-key-here

# 環境を設定（development または production）
export ENVIRONMENT=development

# AWSアカウント情報（オプション、AWS CLIから自動取得）
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=ap-northeast-1

# CORS許可オリジン（オプション、デフォルト値あり）
export CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

**セキュリティ注意事項:**
- `RSS_READER_API_KEY`は強力なランダム文字列を使用してください
- 本番環境では、AWS Secrets ManagerやParameter Storeの使用を推奨します
- API Keyは絶対にGitにコミットしないでください

### 環境別デプロイ

```bash
# 開発環境
./scripts/deploy.sh development
# または
npm run deploy:dev

# 本番環境
./scripts/deploy.sh production
# または
npm run deploy:prod
```

### 手動デプロイ

```bash
# 変更内容を確認
npm run diff

# スタックをデプロイ
npm run deploy

# スタックを削除
npm run destroy
```

### 環境別削除

```bash
# 開発環境
./scripts/destroy.sh development
# または
npm run destroy:dev

# 本番環境
./scripts/destroy.sh production
# または
npm run destroy:prod
```

## 開発

```bash
# TypeScriptをウォッチモードでコンパイル
npm run watch

# CloudFormationテンプレートを生成
npm run synth

# 環境別テンプレート生成
npm run synth:dev
npm run synth:prod

# テストを実行
npm run test
```

## スタック構成

- **RssReaderStack**: メインスタック
  - DynamoDB テーブル（シングルテーブル設計、GSI1-5、TTL設定）
  - Lambda 関数（API + フィード取得、Docker Image Function）
  - EventBridge ルール（フィード取得、記事削除）
  - S3 バケット（フロントエンド）
  - CloudFront ディストリビューション
  - IAM ロール・ポリシー（DynamoDB、Bedrock権限）

## 環境設定

### 環境変数

- `CDK_DEFAULT_ACCOUNT`: AWSアカウントID
- `CDK_DEFAULT_REGION`: AWSリージョン（デフォルト: ap-northeast-1）
- `ENVIRONMENT`: 環境名（development/production）
- `RSS_READER_API_KEY`: API認証キー（本番環境では必須）
- `CORS_ORIGINS`: CORS許可オリジン

### 環境別設定

- **開発環境**: `RssReaderStack-Dev`
- **本番環境**: `RssReaderStack-Prod`

## 出力

デプロイ後、以下の情報が出力されます：

- `ApiUrl`: Lambda Function URL
- `FrontendUrl`: CloudFront Distribution URL
- `TableName`: DynamoDB Table Name
- `FeedFetchRuleName`: EventBridge Rule Name (Feed Fetching)
- `CleanupRuleName`: EventBridge Rule Name (Article Cleanup)
- `FrontendBucketName`: S3 Bucket Name
- `DistributionId`: CloudFront Distribution ID

## トラブルシューティング

### よくある問題

1. **Bootstrap エラー**
   ```bash
   # CDKをブートストラップ
   npm run bootstrap:dev
   ```

2. **権限エラー**
   - AWS CLIの認証情報を確認
   - IAMユーザーに適切な権限があることを確認

3. **リージョンエラー**
   - `CDK_DEFAULT_REGION`環境変数を設定
   - Bedrockが利用可能なリージョンを使用

### ログ確認

```bash
# CloudFormationスタックの状態を確認
aws cloudformation describe-stacks --stack-name RssReaderStack-Dev

# Lambda関数のログを確認
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/rss-reader-api
```