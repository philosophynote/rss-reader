# 要件定義書

## はじめに

本システムは、複数のRSSフィードを管理し、記事を取得・保存・閲覧できるFeedly風のRSSリーダーです。ユーザーが登録したキーワードに基づいて記事の重要度をスコア化し、重要度順にランキング表示する機能を提供します。

## 用語集

- **System**: RSSリーダーシステム全体
- **Feed**: RSSフィード（XMLフォーマットのニュース配信）
- **Article**: フィードから取得した個別の記事
- **Keyword**: ユーザーが登録する重要度判定用のキーワード
- **Importance_Score**: キーワードとの関連性に基づいて算出される記事の重要度スコア
- **User**: システムを利用する単一ユーザー

## 要件

### 要件1: RSSフィード管理

**ユーザーストーリー:** ユーザーとして、複数のRSSフィードを登録・管理したい。これにより、様々な情報源から記事を収集できる。

#### 受入基準

1. WHEN ユーザーがフィードURLを提供する THEN THE System SHALL そのフィードを登録し永続化する
2. WHEN ユーザーがフィードを削除する THEN THE System SHALL そのフィードと関連する記事を削除する
3. WHERE フォルダ分類機能が有効な場合 THE System SHALL フィードをフォルダに分類して管理できる
4. THE System SHALL 登録されたすべてのフィードの一覧を表示する

### 要件2: 記事の定期取得

**ユーザーストーリー:** システム管理者として、登録されたRSSフィードから定期的に記事を取得したい。これにより、最新の記事を自動的に収集できる。

#### 受入基準

1. THE System SHALL 定期的に登録されたすべてのフィードから記事を取得する
2. IF フィード取得が失敗した場合 THEN THE System SHALL エラーをログに記録し、次回の取得時に再試行する
3. WHEN 記事を取得する THEN THE System SHALL 記事のリンクURLに基づいて重複を検出する
4. WHEN 既に存在する記事を検出した場合 THEN THE System SHALL その記事を再度保存しない
5. WHEN 新しい記事を取得した場合 THEN THE System SHALL その記事を未読状態で保存する

### 要件3: 記事の一覧表示

**ユーザーストーリー:** ユーザーとして、保存された記事を時系列または重要度順で閲覧したい。これにより、効率的に情報を確認できる。

#### 受入基準

1. THE System SHALL 記事を時系列順（公開日時の降順）で表示できる
2. THE System SHALL 記事を重要度スコアの降順で表示できる
3. WHEN 記事一覧を表示する THEN THE System SHALL 各記事のタイトル、公開日時、フィード名、未読/既読状態、重要度スコアを表示する
4. THE System SHALL ユーザーが表示順序を切り替えられる

### 要件4: 未読/既読管理

**ユーザーストーリー:** ユーザーとして、記事の未読/既読状態を管理したい。これにより、読んだ記事と読んでいない記事を区別できる。

#### 受入基準

1. WHEN ユーザーが記事を既読にする THEN THE System SHALL その記事の状態を既読に更新する
2. WHEN ユーザーが記事を未読に戻す THEN THE System SHALL その記事の状態を未読に更新する
3. THE System SHALL 未読記事のみをフィルタ表示できる
4. THE System SHALL 既読記事のみをフィルタ表示できる

### 要件5: 記事の保存機能

**ユーザーストーリー:** ユーザーとして、後で読みたい記事を保存したい。これにより、重要な記事を見失わずに管理できる。

#### 受入基準

1. WHEN ユーザーが記事を保存する THEN THE System SHALL その記事に保存フラグを設定する
2. WHEN ユーザーが保存を解除する THEN THE System SHALL その記事の保存フラグを削除する
3. THE System SHALL 保存された記事のみをフィルタ表示できる

### 要件6: キーワード管理

**ユーザーストーリー:** ユーザーとして、重要度判定に使用するキーワードを登録・管理したい。これにより、自分の興味に合わせた記事の重要度判定ができる。

#### 受入基準

1. WHEN ユーザーがキーワードを登録する THEN THE System SHALL そのキーワードを保存する
2. WHERE 重み付けが指定された場合 THE System SHALL キーワードに重みを設定する
3. WHERE 重み付けが指定されない場合 THE System SHALL デフォルトの重み（1.0）を設定する
4. WHEN ユーザーがキーワードを無効化する THEN THE System SHALL そのキーワードを重要度計算から除外する
5. WHEN ユーザーがキーワードを有効化する THEN THE System SHALL そのキーワードを重要度計算に含める
6. THE System SHALL 登録されたすべてのキーワードと状態を表示する

### 要件7: 重要度スコアリング

**ユーザーストーリー:** ユーザーとして、記事の重要度を自動的に判定してほしい。これにより、自分にとって重要な記事を優先的に読める。

#### 受入基準

1. WHEN 新しい記事を保存する THEN THE System SHALL セマンティック検索を使用して有効なキーワードとの関連性に基づいて重要度スコアを計算する
2. WHEN 記事のタイトルまたは本文とキーワードの意味的な類似度を計算する THEN THE System SHALL そのキーワードの重みと類似度を掛け合わせてスコアに加算する
3. WHEN 重要度スコアを計算する THEN THE System SHALL どのキーワードがどのように寄与したかの理由を記録する
4. THE System SHALL 記事ごとに重要度スコアと理由を保持する
5. WHEN キーワードが更新された場合 THE System SHALL 既存記事の重要度スコアを再計算できる

### 要件8: システムアーキテクチャ

**ユーザーストーリー:** システム管理者として、低コストで運用できるサーバーレスアーキテクチャを採用したい。これにより、運用コストを最小限に抑えられる。

#### 受入基準

1. THE System SHALL PythonとFastAPIを使用してバックエンドを実装する
2. THE System SHALL AWS Lambda Web Adapterを使用してコンテナとしてデプロイする
3. THE System SHALL Lambda関数URLを通じてアクセスできる
4. THE System SHALL EventBridgeを使用して定期的なフィード取得を実行する
5. THE System SHALL DynamoDBを使用してデータを永続化する
6. THE System SHALL AWS CDK（TypeScript）を使用してインフラストラクチャを定義・管理する
7. THE System SHALL TypeScriptとReactを使用してフロントエンドを実装する
8. THE System SHALL Chakra UIを使用してUIコンポーネントを実装する
9. THE System SHALL TanStack QueryとTanStack Tableを使用してデータ管理とテーブル表示を行う

### 要件9: セキュリティとアクセス制御

**ユーザーストーリー:** システム管理者として、単一ユーザー向けの適切なセキュリティ対策を実装したい。これにより、不正アクセスを防ぎながらシンプルな運用を維持できる。

#### 受入基準

1. THE System SHALL API Key認証を使用してAPIアクセスを制御する
2. THE System SHALL 認証失敗時に適切なエラーレスポンスを返す
3. THE System SHALL レート制限を実装して過度なリクエストを防ぐ
4. THE System SHALL 特定のオリジンからのアクセスのみを許可するCORS設定を実装する
5. THE System SHALL セキュリティヘッダーを設定してセキュリティを強化する
6. THE System SHALL 機密情報をログから除外する
7. THE System SHALL セキュリティアラートと監視を設定する

### 要件10: RSS専用

**ユーザーストーリー:** システム管理者として、標準的なRSSフィードのみをサポートしたい。これにより、システムの複雑さを抑えられる。

#### 受入基準

1. THE System SHALL 標準的なRSSフィード（RSS 2.0、Atom）のみをサポートする
2. THE System SHALL Webスクレイピング機能を実装しない
3. THE System SHALL RSS Builder機能を実装しない

### 要件11: 記事の自動削除

**ユーザーストーリー:** システム管理者として、データベースの容量を削減するために古い記事を自動削除したい。これにより、ストレージコストを最小限に抑えられる。

#### 受入基準

1. WHEN 記事がデータベースに保存されてから1週間が経過した場合 THEN THE System SHALL その記事を削除する
2. WHEN 記事が既読になってから1日が経過した場合 THEN THE System SHALL その記事を削除する
3. THE System SHALL 定期的に削除対象の記事をチェックし削除を実行する
4. WHEN 記事を削除する THEN THE System SHALL 関連する重要度スコアと理由も削除する

### 要件12: インフラストラクチャ管理

**ユーザーストーリー:** システム管理者として、インフラストラクチャをコードで管理したい。これにより、環境の再現性と保守性を確保できる。

#### 受入基準

1. THE System SHALL AWS CDK（TypeScript）を使用してすべてのAWSリソースを定義する
2. THE System SHALL DynamoDBテーブル、Lambda関数、EventBridgeルール、S3バケット、CloudFrontディストリビューションをCDKで管理する
3. THE System SHALL IAMロールと権限をCDKで適切に設定する
4. THE System SHALL 環境ごと（開発、本番）にスタックを分離できる
5. THE System SHALL CDKを使用してリソースのデプロイと削除を自動化する

### 要件13: CI/CD パイプライン

**ユーザーストーリー:** 開発者として、コードの品質を保証し、自動的にデプロイメントを行いたい。これにより、開発効率を向上させ、本番環境への安全なリリースを実現できる。

#### 受入基準

1. THE System SHALL GitHub Actionsを使用して継続的インテグレーション（CI）を実行する
2. WHEN コードがプッシュまたはプルリクエストが作成された場合 THEN THE System SHALL 自動的にリンティング、型チェック、テストを実行する
3. WHEN テストが失敗した場合 THEN THE System SHALL デプロイメントを停止し、開発者に通知する
4. THE System SHALL ユニットテストとプロパティベーステストの両方を実行する
5. THE System SHALL テストカバレッジを測定し、80%以上を維持する
6. WHEN mainブランチにコードがマージされた場合 THEN THE System SHALL 自動的に本番環境にデプロイする
7. THE System SHALL バックエンド、フロントエンド、インフラストラクチャを独立してデプロイできる
8. THE System SHALL デプロイメント前に統合テストを実行する
9. THE System SHALL デプロイメント後にヘルスチェックを実行する
10. IF デプロイメントが失敗した場合 THEN THE System SHALL 開発者に通知し、ロールバック手順を提供する
11. THE System SHALL セキュリティスキャンを実行し、脆弱性を検出する
12. THE System SHALL デプロイメント状況をSlackまたは他の通知システムに送信する