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

```bash
# 変更内容を確認
npm run diff

# スタックをデプロイ
npm run deploy

# スタックを削除
npm run destroy
```

## 開発

```bash
# TypeScriptをウォッチモードでコンパイル
npm run watch

# CloudFormationテンプレートを生成
npm run synth

# テストを実行
npm run test
```

## スタック構成

- **RssReaderStack**: メインスタック
  - DynamoDB テーブル
  - Lambda 関数（API + フィード取得）
  - EventBridge ルール
  - S3 バケット（フロントエンド）
  - CloudFront ディストリビューション
  - IAM ロール・ポリシー

## 環境変数

- `CDK_DEFAULT_ACCOUNT`: AWSアカウントID
- `CDK_DEFAULT_REGION`: AWSリージョン（デフォルト: ap-northeast-1）
- `ENVIRONMENT`: 環境名（dev/prod）

## 出力

デプロイ後、以下の情報が出力されます：

- Lambda Function URL
- CloudFront Distribution URL
- DynamoDB Table Name