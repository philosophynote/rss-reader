# ESLint エラー修正箇所まとめ

このドキュメントは `make frontend-format` で検出された全55個のESLintエラーの修正方法をまとめたものです。

## 1. src/api/__tests__/client.test.ts

### エラー1: 57-58行目 - `@typescript-eslint/no-unsafe-member-access`

**現在のコード:**
```typescript
mockAxiosInstance = mockedAxios.create.mock.results[
  mockedAxios.create.mock.results.length - 1
]?.value as AxiosInstance;
```

**修正後:**
```typescript
const lastResult = mockedAxios.create.mock.results.at(-1);
mockAxiosInstance = lastResult?.value as AxiosInstance;
```

### エラー2: 74, 95, 107, 118行目 - `@typescript-eslint/unbound-method`

**現在のコード (74行目):**
```typescript
expect(mockAxiosInstance.get).toHaveBeenCalledWith("/test", {
  params: { param: "value" },
});
```

**修正後:**
```typescript
// eslint-disable-next-line @typescript-eslint/unbound-method
expect(mockAxiosInstance.get).toHaveBeenCalledWith("/test", {
  params: { param: "value" },
});
```

**同様の修正が必要な行:**
- 74行目: `mockAxiosInstance.get`
- 95行目: `mockAxiosInstance.post`
- 107行目: `mockAxiosInstance.put`
- 118行目: `mockAxiosInstance.delete`

---

## 2. src/api/client.ts

### エラー: 184-185行目 - `@typescript-eslint/no-unsafe-member-access`

**現在のコード:**
```typescript
const baseURL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const apiKey = import.meta.env.VITE_API_KEY as string | undefined;
```

**修正後:**
```typescript
const env = import.meta.env as Record<string, unknown>;
const baseURL = env.VITE_API_BASE_URL as string | undefined;
const apiKey = env.VITE_API_KEY as string | undefined;
```

---

## 3. src/hooks/useArticles.ts

### エラー: 38行目と65行目 - `@typescript-eslint/no-unsafe-member-access`

**現在のコード (38行目):**
```typescript
// テスト環境ではリトライしない
if (import.meta.env.MODE === "test") {
  return false;
}
```

**修正後:**
```typescript
// テスト環境ではリトライしない
const env = import.meta.env as Record<string, unknown>;
if (env.MODE === "test") {
  return false;
}
```

**注意:** 65行目も同様の修正が必要です。同じ変数 `env` を関数の先頭で定義して再利用します。

---

## 4. src/components/articles/ArticleDetail.tsx

### エラー1: 189行目 - `@typescript-eslint/prefer-optional-chain`

**現在のコード:**
```typescript
{article.content && article.content.trim()
  ? article.content
  : "記事の内容がありません。"}
```

**修正後:**
```typescript
{article.content?.trim()
  ? article.content
  : "記事の内容がありません。"}
```

### エラー2: 197行目 - `@typescript-eslint/prefer-nullish-coalescing`

**現在のコード:**
```typescript
{((reasons && reasons.length > 0) || reasonsLoading || reasonsError) && (
```

**修正後:**
```typescript
{(reasons && reasons.length > 0 ? true : (reasonsLoading ?? reasonsError)) && (
```

**注意:** この修正は論理演算の優先順位が変わる可能性があるため、以下のように分解することを推奨:
```typescript
{((reasons && reasons.length > 0) ? true : reasonsLoading ? true : reasonsError) && (
```

### エラー3: 206行目 - `@typescript-eslint/no-unsafe-assignment`

**現在のコード:**
```typescript
{[...Array(3)].map((_, i) => (
  <Skeleton key={i} height="40px" />
))}
```

**修正後:**
```typescript
{Array.from({ length: 3 }).map((_, i) => (
  <Skeleton key={i} height="40px" />
))}
```

---

## 5. src/components/articles/ArticleList.tsx

### エラー: 183行目 - `@typescript-eslint/no-unsafe-assignment`

**現在のコード:**
```typescript
{[...Array(5)].map((_, i) => (
  <Skeleton key={i} height="60px" borderRadius="md" data-testid="skeleton" />
))}
```

**修正後:**
```typescript
{Array.from({ length: 5 }).map((_, i) => (
  <Skeleton key={i} height="60px" borderRadius="md" data-testid="skeleton" />
))}
```

---

## 6. src/components/feeds/FeedEditForm.tsx

### エラー: 40, 51, 80, 149, 160行目 - `@typescript-eslint/prefer-nullish-coalescing`

**40行目 - 現在のコード:**
```typescript
folder: feed.folder || "",
```
**修正後:**
```typescript
folder: feed.folder ?? "",
```

**51行目 - 現在のコード:**
```typescript
folder: feed.folder || "",
```
**修正後:**
```typescript
folder: feed.folder ?? "",
```

**80行目 - 現在のコード:**
```typescript
folder: formData.folder?.trim() || undefined,
```
**修正後:**
```typescript
folder: formData.folder?.trim() ?? undefined,
```

**149行目 - 現在のコード:**
```typescript
value={formData.title || ""}
```
**修正後:**
```typescript
value={formData.title ?? ""}
```

**160行目 - 現在のコード:**
```typescript
value={formData.folder || ""}
```
**修正後:**
```typescript
value={formData.folder ?? ""}
```

---

## 7. src/components/feeds/FeedList.tsx

同様に `@typescript-eslint/prefer-nullish-coalescing` エラーがある箇所を `||` から `??` に変更します。

---

## 8. src/components/keywords/KeywordEditForm.tsx

同様に `@typescript-eslint/prefer-nullish-coalescing` エラーがある箇所を `||` から `??` に変更します。

---

## 9. src/hooks/__tests__/useArticles.test.tsx

### エラー: 48行目 - `no-undef` (React not defined)

**現在のコード (1行目):**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
```

**修正後:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
```

### その他のテストファイル

以下のファイルも同様に `import React from "react";` を追加:
- `src/hooks/__tests__/useFeeds.test.tsx`
- `src/hooks/__tests__/useKeywords.test.tsx`

---

## 10. src/hooks/__tests__/useFeeds.test.tsx

### エラー: 50, 122, 189行目 - `@typescript-eslint/unbound-method`

**修正方法:**
各 `expect` 文の直前に以下のコメントを追加:
```typescript
// eslint-disable-next-line @typescript-eslint/unbound-method
expect(mockedFeedsApi.getFeeds).toHaveBeenCalled();
```

---

## 11. src/hooks/__tests__/useKeywords.test.tsx

### エラー: 48行目 - `no-undef` (React not defined)

**修正:**
```typescript
import React from "react";
```

### エラー: 71, 115, 159, 200, 235, 272行目 - `@typescript-eslint/unbound-method`

各 `expect` 文の直前に以下のコメントを追加:
```typescript
// eslint-disable-next-line @typescript-eslint/unbound-method
```

---

## 12. src/pages/__tests__/DemoPage.test.tsx

### エラー: 11行目 - `no-undef` と `@typescript-eslint/no-unsafe-call`

**現在のコード:**
```typescript
import { describe, it, expect, vi } from "vitest";
```

**修正後:**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
```

---

## 13. src/test/test-utils.tsx

### 警告: 26, 44行目 - `react-refresh/only-export-components`

**26行目 - 現在のコード:**
```typescript
export function render(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  // ...
}
```

**修正後:**
このファイルの先頭に以下のコメントを追加:
```typescript
/* eslint-disable react-refresh/only-export-components */
```

---

## 修正の優先順位

### 高優先度 (エラー)
1. `no-unsafe-member-access` エラー (型安全性)
2. `no-undef` エラー (未定義変数)
3. `unbound-method` エラー (テスト用、eslint-disableで対応)

### 中優先度 (エラー)
4. `prefer-nullish-coalescing` (|| を ?? に変更)
5. `prefer-optional-chain` (optional chaining使用)
6. `no-unsafe-assignment` (Array生成方法の変更)

### 低優先度 (警告)
7. `react-refresh/only-export-components` (開発体験の改善)

---

## 修正後の確認

すべての修正を適用した後、以下のコマンドで確認してください:

```bash
make frontend-format
```

エラーがなくなれば修正完了です。
