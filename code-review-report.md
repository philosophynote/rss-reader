# Code Review Report

**レビュー日時:** 2025-12-27
**レビュー対象:** mainブランチとの差分（インフラストラクチャ実装）
**レビュアー:** Claude Code

---

## サマリー

| 観点 | Critical | High | Medium | Low |
|------|:--------:|:----:|:------:|:---:|
| セキュリティ | 2 | 2 | 1 | 0 |
| パフォーマンス | 0 | 0 | 1 | 0 |
| 可読性・保守性 | 0 | 0 | 2 | 0 |
| ベストプラクティス | 0 | 2 | 2 | 1 |

**総合評価:** ⚠️ **要改善** - Critical/High レベルの問題が複数あります。本番デプロイ前に必ず修正してください。

---

## 指摘事項

### セキュリティ

#### Critical

**1. ハードコードされたAPIキーのデフォルト値**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:99`
- **問題:**
  ```typescript
  API_KEY: process.env.RSS_READER_API_KEY || 'default-api-key-change-in-production',
  ```
  デフォルト値がハードコードされており、環境変数が設定されていない場合に脆弱なデフォルト値が使用されます。
- **リスク:** 本番環境でデフォルト値が使用された場合、認証が事実上無効化されます。
- **推奨対応:**
  ```typescript
  // 環境変数が必須であることを明示的にチェック
  if (!process.env.RSS_READER_API_KEY) {
    throw new Error('RSS_READER_API_KEY environment variable is required');
  }
  API_KEY: process.env.RSS_READER_API_KEY,
  ```

**2. Lambda Function URLで認証が無効**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:119`
- **問題:**
  ```typescript
  authType: lambda.FunctionUrlAuthType.NONE, // API Key認証をアプリケーションレベルで実装
  ```
  AWS IAM認証が無効化されており、アプリケーションレベルのAPI Key認証のみに依存しています。
- **リスク:** アプリケーションレベルの認証に脆弱性があった場合、API全体が露出します。
- **推奨対応:**
  - 開発環境ではNONEを許可し、本番環境では`AWS_IAM`認証を使用
  - または、AWS WAFを追加してレート制限と保護を実装

#### High

**3. Bedrock権限で過度に広いリソース指定**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:114`
- **問題:**
  ```typescript
  resources: ['*'],
  ```
  すべてのBedrockリソースへのアクセスを許可しています。
- **リスク:** 最小権限の原則に違反しており、必要以上の権限が付与されています。
- **推奨対応:**
  ```typescript
  resources: [
    `arn:aws:bedrock:us-east-1::foundation-model/${process.env.BEDROCK_MODEL_ID || 'amazon.nova-2-multimodal-embeddings-v1:0'}`
  ],
  ```

**4. CORS設定が環境を考慮していない**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:121-124`
- **問題:**
  ```typescript
  allowedOrigins: [
    'https://localhost:3000',  // 開発環境
    'https://localhost:5173',  // Vite開発サーバー
  ],
  ```
  本番環境でもlocalhostのみを許可しており、CloudFrontからのアクセスが拒否されます。
- **推奨対応:**
  - 環境変数からCORS_ORIGINSを読み込み、環境別に設定
  - 本番環境ではCloudFrontのドメインのみを許可

#### Medium

**5. デフォルトのCORS_ORIGINS値がHTTPSのlocalhost**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:100`
- **問題:**
  ```typescript
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'https://localhost:3000',
  ```
  localhostでHTTPSを使用するのは通常困難です。
- **推奨対応:** `http://localhost:3000,http://localhost:5173`に変更

---

### パフォーマンス

#### Medium

**6. Lambda関数のタイムアウトが過度に長い**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:89`
- **問題:**
  ```typescript
  timeout: cdk.Duration.minutes(15),
  ```
  15分のタイムアウトは、通常のAPI呼び出しには長すぎます。
- **リスク:**
  - コスト増加（Lambda実行時間課金）
  - ハングしたリクエストの検出が遅延
- **推奨対応:**
  - API呼び出しには3分程度
  - フィード取得ジョブには5-10分
  - 環境別または用途別に調整

---

### 可読性・保守性

#### Medium

**7. テーブル名とLambda関数名がハードコード**
- **ファイル:**
  - `infrastructure/lib/rss-reader-stack.ts:29` (テーブル名)
  - `infrastructure/lib/rss-reader-stack.ts:87` (Lambda関数名)
- **問題:**
  ```typescript
  tableName: 'rss-reader',
  functionName: 'rss-reader-api',
  ```
  環境別に異なる名前を使用すべきです（開発と本番で衝突を避けるため）。
- **推奨対応:**
  ```typescript
  tableName: `rss-reader-${environment}`,
  functionName: `rss-reader-api-${environment}`,
  ```

**8. 環境設定の型定義が欠如**
- **ファイル:** `infrastructure/bin/app.ts:17`
- **問題:**
  ```typescript
  const envConfig = {
    development: { ... },
    production: { ... },
  };
  ```
  型定義がないため、設定の誤りを検出できません。
- **推奨対応:**
  ```typescript
  interface EnvironmentConfig {
    account: string | undefined;
    region: string;
    stackName: string;
    tags: Record<string, string>;
  }

  const envConfig: Record<'development' | 'production', EnvironmentConfig> = {
    // ...
  };
  ```

---

### ベストプラクティス

#### High

**9. 環境変数の検証がない**
- **ファイル:** `infrastructure/bin/app.ts`、`infrastructure/lib/rss-reader-stack.ts`
- **問題:** 環境変数が未設定の場合の検証やエラーハンドリングがありません。
- **推奨対応:**
  - 必須環境変数のバリデーションを追加
  - デプロイ前チェックスクリプトの作成

**10. removalPolicyがDESTROYで固定**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:33, 166`
- **問題:**
  ```typescript
  removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
  ```
  本番環境でも同じ設定が適用され、データが失われる可能性があります。
- **推奨対応:**
  ```typescript
  removalPolicy: environment === 'production'
    ? cdk.RemovalPolicy.RETAIN
    : cdk.RemovalPolicy.DESTROY,
  ```

#### Medium

**11. S3バケット名に動的な値を使用**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:161`
- **問題:**
  ```typescript
  bucketName: `rss-reader-frontend-${this.account}-${this.region}`,
  ```
  accountやregionが未定義の場合、バケット名が不正になります。
- **推奨対応:**
  - バケット名を明示的に指定するか、CDKに自動生成させる
  - 環境別のプレフィックスを追加

**12. EventBridgeのターゲットイベントがハードコード**
- **ファイル:** `infrastructure/lib/rss-reader-stack.ts:138-140, 153-155`
- **問題:**
  ```typescript
  event: events.RuleTargetInput.fromObject({
    action: 'fetch_feeds'
  })
  ```
  イベントペイロードの形式がコード内にハードコードされており、変更が困難です。
- **推奨対応:**
  - イベントペイロードの型定義を作成
  - Lambda側との契約を明確化

#### Low

**13. 生成された.d.tsファイルがコミットされている**
- **ファイル:** `infrastructure/lib/rss-reader-stack.d.ts`, `infrastructure/lib/rss-reader-stack.js`
- **問題:** TypeScriptのコンパイル結果（.d.ts、.js）がgit管理されています。
- **推奨対応:**
  - `.gitignore`で除外（既に追加済み）
  - 既存のファイルを削除: `git rm infrastructure/**/*.d.ts infrastructure/**/*.js`

---

## 良い点

1. ✅ **シングルテーブル設計の適切な実装**
   - DynamoDBのシングルテーブル設計を正しく実装しており、GSIの使い分けが明確です。

2. ✅ **環境別設定の導入**
   - `infrastructure/bin/app.ts`で環境別設定を導入し、開発環境と本番環境の分離を実現しています。

3. ✅ **適切なコメント**
   - 各リソースの目的がコメントで明確に記載されており、コードの可読性が高いです。

4. ✅ **DynamoDBのバックアップ設定**
   - `pointInTimeRecovery: true`でバックアップを有効化しています。

5. ✅ **CloudFrontのエラーハンドリング**
   - SPA用の404/403エラーハンドリングが適切に設定されています。

6. ✅ **詳細なCfnOutput**
   - デプロイ後の各リソースの情報が適切に出力されています。

7. ✅ **READMEの充実**
   - `infrastructure/README.md`が詳細に更新され、環境別デプロイ手順が明確です。

8. ✅ **TTL設定の追加**
   - DynamoDBのTTL機能を使用して自動削除を実装しています。

---

## 推奨アクション

### 必須対応 (Critical/High)

1. **【最優先】API_KEYの環境変数を必須化**
   - `infrastructure/lib/rss-reader-stack.ts:99`
   - デフォルト値を削除し、環境変数が未設定の場合はエラーを発生させる

2. **Lambda Function URL認証の見直し**
   - `infrastructure/lib/rss-reader-stack.ts:119`
   - 本番環境ではAWS_IAM認証を使用するか、WAFを追加

3. **Bedrock権限の最小化**
   - `infrastructure/lib/rss-reader-stack.ts:114`
   - 特定のモデルARNのみを許可

4. **CORS設定の環境別対応**
   - `infrastructure/lib/rss-reader-stack.ts:121-124`
   - 環境変数からオリジンを読み込み、本番環境ではCloudFrontのみを許可

5. **removalPolicyの環境別設定**
   - `infrastructure/lib/rss-reader-stack.ts:33, 166`
   - 本番環境ではRETAINを使用

6. **環境変数の検証ロジック追加**
   - `infrastructure/bin/app.ts`
   - 必須環境変数のチェックを実装

### 推奨対応 (Medium)

7. **Lambda タイムアウトの調整**
   - `infrastructure/lib/rss-reader-stack.ts:89`
   - 3-5分程度に短縮

8. **リソース名の環境別対応**
   - `infrastructure/lib/rss-reader-stack.ts:29, 87`
   - テーブル名とLambda関数名に環境サフィックスを追加

9. **環境設定の型定義追加**
   - `infrastructure/bin/app.ts:17`
   - EnvironmentConfigインターフェースを定義

10. **生成ファイルの削除**
    - `git rm infrastructure/**/*.d.ts infrastructure/**/*.js`
    - ビルド成果物をバージョン管理から除外

### 検討事項 (Low)

11. **EventBridgeイベントペイロードの型定義**
    - 共有型定義ファイルを作成して、Lambda側との契約を明確化

12. **CDKのコンテキスト値の活用**
    - `cdk.json`でデフォルト値を定義し、コマンドライン引数での上書きを可能に

---

## 参照したプロジェクト規約

- `CLAUDE.md` - プロジェクト概要と開発ガイドライン
- `docs/ts_coding_conventions.md` - TypeScriptコーディング規約
- `.kiro/specs/rss-reader/design.md` - 技術設計書（DynamoDB設計、アーキテクチャ）

---

*このレポートはClaude Codeのcode-reviewスキルにより生成されました。*
