# フロントエンド型エラー修正計画

## 概要

TypeScript型チェック時に発生している73件のエラーを修正します。エラーは主に以下のカテゴリに分類されます：

1. Chakra UI v3マイグレーション関連のプロパティエラー
2. 型定義の不整合（`null` vs `undefined`）
3. テストのモック型アサーションエラー
4. `import.meta.env`の型エラー
5. オプショナルプロパティの`undefined`チェック不足

---

## カテゴリ1: Chakra UI v3マイグレーション関連 (25件)

### 1.1 `spacing` propの削除 (15件)

Chakra UI v3では`spacing` propが削除され、`gap`を使用するように変更されました。

**影響ファイル:**
- `src/components/articles/ArticleFilterControls.tsx` (3箇所)
- `src/components/articles/ArticleList.tsx` (6箇所)
- `src/components/articles/ArticleSortControls.tsx` (1箇所)
- `src/components/feeds/FeedEditForm.tsx` (2箇所)
- `src/components/keywords/KeywordEditForm.tsx` (2箇所)

**修正方法:**
```tsx
// Before
<HStack spacing={4}>

// After
<HStack gap={4}>
```

### 1.2 `noOfLines` propの変更 (1件)

**影響ファイル:**
- `src/components/articles/ArticleList.tsx:123`

**修正方法:**
```tsx
// Before
<Text noOfLines={2}>

// After
<Text lineClamp={2}>
```

### 1.3 `isExternal` propの変更 (1件)

**影響ファイル:**
- `src/components/articles/ArticleList.tsx:129`

**修正方法:**
```tsx
// Before
<Link href={article.link} isExternal>

// After
<Link href={article.link} external>
```

### 1.4 `isAttached` propの変更 (1件)

**影響ファイル:**
- `src/components/articles/ArticleSortControls.tsx:24`

**修正方法:**
```tsx
// Before
<ButtonGroup isAttached variant="outline">

// After
<ButtonGroup attached variant="outline">
```

### 1.5 TableRoot `variant="simple"`の削除 (1件)

**影響ファイル:**
- `src/components/articles/ArticleList.tsx:233`

**修正方法:**
```tsx
// Before
<TableRoot variant="simple" bg="white">

// After
<TableRoot variant="outline" bg="white">
// または variant propを削除
<TableRoot bg="white">
```

### 1.6 未使用のReactインポートの削除 (3件)

**影響ファイル:**
- `src/components/articles/ArticleFilterControls.tsx:1`
- `src/components/articles/ArticleList.tsx:1`
- `src/components/articles/ArticleSortControls.tsx:1`

**修正方法:**
```tsx
// Before
import React from "react";

// After
// 行を削除（React 19ではJSX transformが自動）
```

---

## カテゴリ2: 型定義の不整合 (18件)

### 2.1 `ArticleListParams`のインデックスシグネチャ (1件)

**影響ファイル:**
- `src/api/articles.ts:22`

**修正方法:**
```typescript
// src/api/types.ts
export interface ArticleListParams {
  feed_id?: string;
  is_read?: boolean;
  is_saved?: boolean;
  sort_by?: "importance" | "created_at";
  limit?: number;
  last_evaluated_key?: Record<string, unknown>;
  [key: string]: unknown; // インデックスシグネチャを追加
}
```

### 2.2 `last_evaluated_key`の型（`null` → `undefined`） (10件)

**影響ファイル:**
- `src/hooks/__tests__/useArticles.test.tsx` (3箇所)
- `src/components/articles/__tests__/ArticleList.test.tsx` (5箇所)

**修正方法:**
```typescript
// Before
const mockResponse = {
  articles: [],
  last_evaluated_key: null,
};

// After
const mockResponse = {
  articles: [],
  last_evaluated_key: undefined,
};
```

### 2.3 `read_at`と`folder`の型（`null` → `undefined`） (2件)

**影響ファイル:**
- `src/components/articles/__tests__/ArticleDetail.test.tsx:38`
- `src/components/feeds/__tests__/FeedList.test.tsx:50`

**修正方法:**
```typescript
// Before
const mockArticle: Article = {
  read_at: null,
};

// After
const mockArticle: Article = {
  read_at: undefined,
};
```

### 2.4 `ImportanceReason`の`article_id`プロパティ削除 (2件)

**影響ファイル:**
- `src/components/articles/__tests__/ArticleDetail.test.tsx` (2箇所: 43, 50)

**修正方法:**
```typescript
// Before
const mockReason: ImportanceReason = {
  article_id: "1",
  keyword_id: "kw1",
  ...
};

// After
const mockReason: ImportanceReason = {
  keyword_id: "kw1",
  ...
};
```

### 2.5 ジョブAPIのレスポンス型 (3件)

**影響ファイル:**
- `src/hooks/__tests__/useJobs.test.tsx` (3箇所)

**修正方法:**
```typescript
// Before
const mockResponse = {
  message: "Success",
  feeds_processed: 5,
  articles_added: 10,
};

// After (FetchFeedsJobResultに準拠)
const mockResponse: FetchFeedsJobResult = {
  total_feeds: 5,
  successful_feeds: 5,
  failed_feeds: 0,
  new_articles: 10,
  errors: [],
};

// CleanupJobResultの場合
const mockResponse: CleanupJobResult = {
  deleted_count: 10,
};
```

---

## カテゴリ3: `import.meta.env`の型エラー (3件)

**影響ファイル:**
- `src/api/client.ts:184`
- `src/hooks/useArticles.ts` (2箇所: 32, 60)

**修正方法:**

Viteの環境変数型定義を追加します。

```typescript
// src/vite-env.d.ts（新規作成または既存ファイルに追加）
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // 他の環境変数もここに定義
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

その後、各ファイルで型アサーションを削除：

```typescript
// Before
const env = import.meta.env as Record<string, unknown>;

// After
const env = import.meta.env;
```

---

## カテゴリ4: オプショナルプロパティの`undefined`チェック (2件)

### 4.1 `formData.folder`の型チェック (1件)

**影響ファイル:**
- `src/components/feeds/FeedForm.tsx:66`

**修正方法:**
```typescript
// Before
folder: formData.folder.trim() || undefined,

// After
folder: formData.folder?.trim() || undefined,
```

### 4.2 `formData.weight`の型チェック (1件)

**影響ファイル:**
- `src/components/keywords/KeywordForm.tsx:144`

**修正方法:**
```typescript
// Before
? formData.weight.toString()

// After
? formData.weight?.toString()
```

---

## カテゴリ5: テストモックの型アサーション (34件)

テストファイルでのモック型アサーションエラー。型アサーションを`as unknown as`パターンに変更するか、モックオブジェクトを完全な型に準拠させます。

**影響ファイル:**
- `src/components/articles/__tests__/ArticleActionButtons.test.tsx` (4件)
- `src/components/articles/__tests__/ArticleDetail.test.tsx` (4件)
- `src/components/articles/__tests__/ArticleList.test.tsx` (5件)
- `src/components/feeds/__tests__/FeedForm.test.tsx` (2件)
- `src/components/feeds/__tests__/FeedList.test.tsx` (6件)
- `src/components/keywords/__tests__/KeywordForm.test.tsx` (2件)
- `src/components/keywords/__tests__/KeywordList.test.tsx` (10件)

**修正方法（例）:**

```typescript
// Before
mockedUseArticle.mockReturnValue({
  data: null,
  isLoading: true,
  error: null,
} as UseQueryResult<Article, Error>);

// After (パターン1: unknown経由)
mockedUseArticle.mockReturnValue({
  data: null,
  isLoading: true,
  error: null,
} as unknown as UseQueryResult<Article, Error>);

// After (パターン2: 完全な型を提供)
mockedUseArticle.mockReturnValue({
  data: null,
  isLoading: true,
  error: null,
  isError: false,
  isPending: true,
  isLoadingError: false,
  isRefetchError: false,
  isSuccess: false,
  status: 'pending',
  // ...その他必要なプロパティ
} as UseQueryResult<Article, Error>);
```

**推奨**: パターン1（`as unknown as`）を使用して最小限の変更で修正します。

---

## 修正の優先順位

### 優先度: 高
1. **Chakra UI v3マイグレーション** (カテゴリ1): プロダクションコードの実行時エラーを防ぐ
2. **`import.meta.env`の型定義** (カテゴリ3): ビルドとランタイムの両方に影響
3. **型定義の不整合** (カテゴリ2): データフローの型安全性

### 優先度: 中
4. **オプショナルプロパティの`undefined`チェック** (カテゴリ4): ランタイムエラーの可能性

### 優先度: 低
5. **テストモックの型アサーション** (カテゴリ5): テストのみに影響、実行時の動作には影響なし

---

## 実装手順

### ステップ1: 型定義ファイルの修正
1. `src/vite-env.d.ts`を作成/更新
2. `src/api/types.ts`の`ArticleListParams`にインデックスシグネチャを追加

### ステップ2: プロダクションコードの修正
1. Chakra UIのpropを一括置換（`spacing` → `gap`など）
2. 未使用のReactインポートを削除
3. `import.meta.env`の型アサーションを削除
4. オプショナルチェーン演算子を追加

### ステップ3: テストコードの修正
1. `null` → `undefined`に変更
2. 不要なプロパティ（`article_id`など）を削除
3. ジョブAPIのモックレスポンスを正しい型に修正
4. モック型アサーションを`as unknown as`パターンに変更

### ステップ4: 検証
```bash
npm run type-check
npm run test
npm run lint
```

---

## 注意事項

- **Chakra UI v3**: `docs/chakra_ui.md`を参照して正しいマイグレーションパターンを確認
- **破壊的変更**: `null`から`undefined`への変更はAPIレスポンスの型にも影響する可能性があるため、バックエンドとの整合性を確認
- **テストカバレッジ**: 修正後もテストが正しく動作することを確認
