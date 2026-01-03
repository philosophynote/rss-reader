# 通知システム設定ガイド

RSS ReaderプロジェクトのCI/CDパイプラインでは、デプロイメントの成功・失敗、セキュリティアラート、パフォーマンス問題などを自動的に通知するシステムを提供しています。

## 通知の種類

### 1. デプロイメント通知
- **成功通知**: デプロイメントが正常に完了した場合
- **失敗通知**: デプロイメントが失敗した場合
- **キャンセル通知**: デプロイメントがキャンセルされた場合

### 2. セキュリティアラート
- **脆弱性検出**: Trivyスキャンで脆弱性が検出された場合
- **認証失敗**: 不正なアクセス試行が検出された場合
- **セキュリティテスト失敗**: セキュリティ関連のテストが失敗した場合

### 3. パフォーマンスアラート
- **レスポンス時間超過**: APIのレスポンス時間が閾値を超えた場合
- **リソース使用量超過**: CPU・メモリ使用量が閾値を超えた場合

## 通知チャンネル

### Slack通知

#### 設定手順

1. **Slack Appの作成**
```bash
# Slack Workspace で新しいAppを作成
# https://api.slack.com/apps にアクセス
```

2. **Incoming Webhookの設定**
```bash
# App設定 → Incoming Webhooks → Activate Incoming Webhooks
# Add New Webhook to Workspace → チャンネル選択
```

3. **GitHub Secretsの設定**
```bash
# 通常の通知用
SLACK_WEBHOOK_URL=<your_slack_incoming_webhook_url>

# セキュリティアラート用（別チャンネル推奨）
SECURITY_SLACK_WEBHOOK_URL=<your_security_slack_incoming_webhook_url>
```

#### メッセージ例
```
✅ RSS Reader - Deploy Backend 成功

ブランチ: main
実行者: developer
コミット: abc1234
詳細: ワークフロー実行結果を見る
```

### Discord通知

#### 設定手順

1. **Discord Webhookの作成**
```bash
# Discord サーバー → チャンネル設定 → 連携サービス → ウェブフック
# 新しいウェブフック → 名前とアバターを設定 → ウェブフックURLをコピー
```

2. **GitHub Secretsの設定**
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz
```

### メール通知

#### 設定手順

1. **SMTP設定**
```bash
# Gmail の場合
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # アプリパスワードを使用

# 送信者・受信者設定
EMAIL_FROM=rss-reader-ci@your-domain.com
EMAIL_TO=team@your-domain.com,admin@your-domain.com
```

2. **Gmailアプリパスワードの作成**
```bash
# Google アカウント → セキュリティ → 2段階認証プロセス → アプリパスワード
# アプリを選択: メール
# デバイスを選択: その他（カスタム名）→ "RSS Reader CI"
# 生成されたパスワードをSMTP_PASSWORDに設定
```

## GitHub Issues自動作成

### 失敗時のIssue作成

メインブランチでのワークフロー失敗時に、自動的にGitHub Issueが作成されます。

#### Issue内容
- **タイトル**: `🚨 [ワークフロー名] failed on [ブランチ名]`
- **ラベル**: `ci-failure`, `bug`, `priority-high`
- **内容**: 失敗詳細、対応チェックリスト

#### 重複防止
同じワークフローとブランチの組み合わせで既にIssueが存在する場合、新しいIssueは作成されません。

## デプロイメントステータス

### GitHub Deployments API

デプロイメントワークフローの実行結果は、GitHub Deployments APIを通じて記録されます。

```bash
# デプロイメント環境
- development
- production

# ステータス
- success: デプロイメント成功
- failure: デプロイメント失敗
- pending: デプロイメント実行中
```

## セキュリティアラート

### 高優先度アラート

以下の場合には即座にセキュリティチームに通知されます：

1. **脆弱性スキャン失敗**
   - Trivyで高・重要度の脆弱性検出
   - 依存関係の既知の脆弱性

2. **認証関連の問題**
   - API Key認証の異常
   - 不正アクセス試行の検出

3. **セキュリティテスト失敗**
   - セキュリティ関連のプロパティテスト失敗
   - 権限昇格テストの失敗

### アラート設定例

```yaml
# .github/workflows/security-monitoring.yml
name: Security Monitoring

on:
  schedule:
    - cron: '0 */6 * * *'  # 6時間ごと

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
    - name: Run security scan
      # セキュリティスキャンの実行

    - name: Alert on high severity
      if: steps.scan.outputs.high-severity > 0
      # 高重要度の脆弱性が見つかった場合のアラート
```

## パフォーマンス監視

### CloudWatch連携

デプロイ後のパフォーマンス監視は、AWS CloudWatchと連携して行われます。

#### 監視メトリクス
- **Lambda関数**
  - 実行時間
  - エラー率
  - 同時実行数

- **DynamoDB**
  - 読み取り/書き込みキャパシティ使用率
  - スロットリング発生回数

- **API Gateway**
  - レスポンス時間
  - 4xx/5xx エラー率

#### アラート閾値
```yaml
Metrics:
  LambdaDuration:
    Threshold: 10000ms  # 10秒
    ComparisonOperator: GreaterThanThreshold

  APIGateway4xxError:
    Threshold: 5%
    ComparisonOperator: GreaterThanThreshold

  DynamoDBThrottling:
    Threshold: 1
    ComparisonOperator: GreaterThanOrEqualToThreshold
```

## 通知のカスタマイズ

### 環境別通知設定

```yaml
# 開発環境: Slack通知のみ
development:
  notifications:
    - slack

# 本番環境: 全通知チャンネル
production:
  notifications:
    - slack
    - discord
    - email
    - github-issues
```

### 通知フィルタリング

```yaml
# 特定の条件でのみ通知
notification_filters:
  - condition: "branch == 'main'"
    channels: ["slack", "email"]

  - condition: "severity == 'high'"
    channels: ["slack", "discord", "email", "github-issues"]

  - condition: "workflow == 'Deploy Backend'"
    channels: ["slack"]
```

## トラブルシューティング

### よくある問題

#### 1. Slack通知が届かない

**確認項目**:
- Webhook URLが正しく設定されているか
- Slack Appの権限が適切か
- チャンネルにAppが追加されているか

**解決方法**:
```bash
# Webhook URLのテスト
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message"}' \
  YOUR_WEBHOOK_URL
```

#### 2. メール通知が送信されない

**確認項目**:
- SMTP設定が正しいか
- アプリパスワードが有効か
- 送信者メールアドレスが認証されているか

**解決方法**:
```bash
# SMTP接続テスト
telnet smtp.gmail.com 587
```

#### 3. GitHub Issues が作成されない

**確認項目**:
- GitHub Tokenの権限が適切か
- リポジトリの設定でIssue作成が有効か

**解決方法**:
```bash
# GitHub API テスト
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/owner/repo/issues
```

## 監視ダッシュボード

### 推奨ツール

1. **GitHub Actions Dashboard**
   - ワークフロー実行状況の監視
   - 失敗率の追跡

2. **AWS CloudWatch Dashboard**
   - インフラストラクチャメトリクス
   - アプリケーションパフォーマンス

3. **Slack Dashboard**
   - 通知履歴の確認
   - チーム内での情報共有

### カスタムダッシュボード

```javascript
// Slack Bot での通知履歴表示
/rss-reader status
// → 最新のデプロイメント状況を表示

/rss-reader health
// → システムヘルスチェック結果を表示

/rss-reader alerts
// → 過去24時間のアラート履歴を表示
```

## ベストプラクティス

### 1. 通知の優先度設定

- **Critical**: 本番環境の障害、セキュリティインシデント
- **High**: デプロイメント失敗、パフォーマンス劣化
- **Medium**: テスト失敗、警告レベルの問題
- **Low**: 情報提供、成功通知

### 2. 通知疲れの防止

- 重複通知の排除
- 適切な通知頻度の設定
- 重要度に応じた通知チャンネルの分離

### 3. 対応フローの明確化

```text
1. アラート受信
2. 影響範囲の確認
3. 緊急度の判定
4. 対応チームへのエスカレーション
5. 対応完了の確認
6. 事後分析と改善
```

## 参考リンク

- [GitHub Actions Notifications](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Discord Webhooks](https://support.discord.com/hc/en-us/articles/228383668)
- [AWS CloudWatch Alarms](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html)
