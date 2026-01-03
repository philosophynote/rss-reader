# GitHub Secrets とセキュリティ設定ガイド

このドキュメントでは、RSS ReaderプロジェクトのCI/CDパイプラインに必要なGitHub Secretsとセキュリティ設定について説明します。

## 必要なGitHub Secrets

### AWS認証関連

#### `AWS_ROLE_ARN`
- **説明**: GitHub ActionsがAWSリソースにアクセスするためのIAMロールARN
- **形式**: `arn:aws:iam::123456789012:role/GitHubActionsRole`
- **設定方法**:
  1. AWSコンソールでIAMロールを作成
  2. GitHub ActionsのOIDCプロバイダーを信頼関係に追加
  3. 必要な権限ポリシーをアタッチ
  4. ロールのARNをGitHub Secretsに設定

### API Key関連

#### `RSS_READER_API_KEY_SECRET_ID`
- **説明**: Secrets Managerに保存したAPI KeyのシークレットIDまたはARN
- **形式**: `rss-reader/production/api-key` または `arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:rss-reader/production/api-key`
- **設定方法**: AWS Secrets Managerでシークレットを作成し、そのID/ARNをGitHub Secretsに登録
- **API Keyの生成方法**:
```bash
# 強力なAPI Keyを生成
openssl rand -hex 32
# または
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

#### `VITE_API_KEY`
- **説明**: フロントエンドからAPIアクセスに使用するAPI Key
- **形式**: Secrets Managerに保存したAPI Keyと同じ値
- **注意**: フロントエンドビルド時に環境変数として使用

#### `VITE_API_BASE_URL`
- **説明**: フロントエンドがアクセするAPIのベースURL
- **形式**: `https://your-lambda-function-url.lambda-url.ap-northeast-1.on.aws`
- **設定タイミング**: インフラストラクチャデプロイ後に設定

### CORS設定

#### `CORS_ALLOWED_ORIGINS`
- **説明**: APIがアクセスを許可するオリジンのリスト
- **形式**: `https://your-cloudfront-domain.cloudfront.net,http://localhost:5173`
- **例**: `https://d1234567890.cloudfront.net,http://localhost:5173`

## セキュリティ設定手順

### 1. AWS IAMロールの作成

```bash
# AWS CLIを使用してロールを作成
aws iam create-role \
  --role-name GitHubActionsRole \
  --assume-role-policy-document file://trust-policy.json

# 信頼ポリシー (trust-policy.json)
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:your-username/rss-reader:*"
        }
      }
    }
  ]
}
```

### 2. 必要なIAM権限ポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RssReaderCoreResources",
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "lambda:*",
        "ecr:*",
        "s3:*",
        "cloudfront:*",
        "events:*",
        "iam:PassRole",
        "cloudformation:*"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-northeast-1:123456789012:table/rss-reader-*",
        "arn:aws:dynamodb:ap-northeast-1:123456789012:table/rss-reader-*/index/*",
        "arn:aws:lambda:ap-northeast-1:123456789012:function:rss-reader-*",
        "arn:aws:ecr:ap-northeast-1:123456789012:repository/rss-reader-*",
        "arn:aws:s3:::rss-reader-*",
        "arn:aws:s3:::rss-reader-*/*",
        "arn:aws:cloudfront::123456789012:distribution/*",
        "arn:aws:events:ap-northeast-1:123456789012:rule/rss-reader-*",
        "arn:aws:cloudformation:ap-northeast-1:123456789012:stack/rss-reader-*/*",
        "arn:aws:iam::123456789012:role/rss-reader-*"
      ]
    },
    {
      "Sid": "StsCallerIdentity",
      "Effect": "Allow",
      "Action": "sts:GetCallerIdentity",
      "Resource": "*"
    },
    {
      "Sid": "SecretsManagerRead",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-northeast-1:123456789012:secret:rss-reader-*"
    },
    {
      "Sid": "BedrockInvoke",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*:*:foundation-model/*"
    }
  ]
}
```

### 3. GitHub OIDCプロバイダーの設定

```bash
# OIDCプロバイダーを作成（初回のみ）
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

### 4. GitHub Secretsの設定

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」に移動
2. 「New repository secret」をクリック
3. 以下のシークレットを順次追加:

| Secret名 | 値 | 説明 |
|----------|-----|------|
| `AWS_ROLE_ARN` | `arn:aws:iam::123456789012:role/GitHubActionsRole` | AWS IAMロールARN |
| `RSS_READER_API_KEY_SECRET_ID` | `Secrets ManagerのID/ARN` | バックエンドAPI Keyの参照ID |
| `VITE_API_KEY` | `Secrets ManagerのAPI Keyと同じ値` | フロントエンドAPI Key |
| `VITE_API_BASE_URL` | `Lambda Function URL` | APIベースURL |
| `CORS_ALLOWED_ORIGINS` | `CloudFront URL,localhost URL` | CORS許可オリジン |

## 環境別設定

### Development環境

```bash
# 開発環境用のAPI Key生成
DEVELOPMENT_API_KEY=$(openssl rand -hex 32)
echo "Development API Key: $DEVELOPMENT_API_KEY"

# GitHub Environmentsで環境別シークレットを設定
# Settings → Environments → development → Add secret
```

### Production環境

```bash
# 本番環境用のAPI Key生成（開発環境とは異なる値）
PRODUCTION_API_KEY=$(openssl rand -hex 32)
echo "Production API Key: $PRODUCTION_API_KEY"

# 本番環境では追加のセキュリティ設定を適用
# - IP制限
# - より厳格なCORS設定
# - ログ監視の強化
```

## セキュリティベストプラクティス

### 1. API Keyの管理

- **定期的なローテーション**: 3ヶ月ごとにAPI Keyを更新
- **最小権限の原則**: 必要最小限の権限のみ付与
- **監査ログ**: API Key使用状況の監視

### 2. AWS権限の最小化

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:*:table/rss-reader-*"
    }
  ]
}
```

### 3. 機密情報の暗号化

```bash
# AWS Secrets Managerを使用した機密情報の暗号化
aws secretsmanager create-secret \
  --name "rss-reader/development/api-key" \
  --secret-string "$RSS_READER_API_KEY"

# 既存シークレットの更新
aws secretsmanager put-secret-value \
  --secret-id "rss-reader/development/api-key" \
  --secret-string "$RSS_READER_API_KEY"
```

### 4. 監視とアラート

```yaml
# CloudWatch Alarms for security monitoring
SecurityAlarms:
  - UnauthorizedAPIAccess
  - SuspiciousTrafficPattern
  - FailedAuthenticationAttempts
  - UnusualDataAccess
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. AWS認証エラー

```
Error: Unable to assume role
```

**解決方法**:
- IAMロールの信頼関係を確認
- GitHub OIDCプロバイダーの設定を確認
- リポジトリ名とブランチ名の条件を確認

#### 2. API Key認証エラー

```
Error: Invalid API Key
```

**解決方法**:
- GitHub SecretsのAPI Key値を確認
- 環境変数の設定を確認
- Lambda関数の環境変数を確認

#### 3. CORS エラー

```
Error: CORS policy blocked
```

**解決方法**:
- `CORS_ALLOWED_ORIGINS`の設定を確認
- CloudFrontのURLを正確に設定
- 開発環境のlocalhostも含める

## セキュリティチェックリスト

- [ ] AWS IAMロールが適切に設定されている
- [ ] GitHub OIDCプロバイダーが設定されている
- [ ] 必要なGitHub Secretsがすべて設定されている
- [ ] API Keyが十分に強力（32文字以上）
- [ ] CORS設定が適切に制限されている
- [ ] 本番環境と開発環境で異なるAPI Keyを使用
- [ ] 定期的なAPI Keyローテーション計画がある
- [ ] 監査ログが有効になっている
- [ ] セキュリティアラートが設定されている

## 参考リンク

- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [AWS IAM Roles for GitHub Actions](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/)
- [API Key Security Best Practices](https://owasp.org/www-project-api-security/)
