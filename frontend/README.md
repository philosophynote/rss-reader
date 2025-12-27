# RSS Reader Frontend

Feedly風RSSリーダーのフロントエンド

## 技術スタック

- React 19
- TypeScript
- Chakra UI
- TanStack Query (React Query)
- TanStack Table
- React Router
- Vite

## 開発環境のセットアップ

### 前提条件

- Node.js 18以上
- npm または yarn

### インストール

```bash
# 依存関係をインストール
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

### ビルド

```bash
npm run build
```

### テストの実行

```bash
# 全テストを実行
npm run test

# テストをウォッチモードで実行
npm run test:watch

# カバレッジ付きでテストを実行
npm run test:coverage
```

### コード品質チェック

```bash
# リンティング
npm run lint

# リンティング（自動修正）
npm run lint:fix

# 型チェック
npm run type-check
```

## プロジェクト構造

```
src/
├── components/     # 再利用可能なUIコンポーネント
├── hooks/          # カスタムフック（TanStack Query等）
├── api/           # APIクライアント
├── theme/         # Chakra UIテーマ設定
├── test/          # テスト設定
├── App.tsx        # メインアプリケーションコンポーネント
└── main.tsx       # エントリーポイント
```

## 環境変数

- `VITE_API_URL` - バックエンドAPI URL
- `VITE_API_KEY` - API認証キー

## デプロイ

S3 + CloudFrontでホスティングされます。
詳細は `infrastructure/` ディレクトリのCDKコードを参照してください。