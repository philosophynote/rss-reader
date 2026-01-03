# ESLint エラー修正 - 残作業ドキュメント

## 修正状況サマリー

### 完了済み修正（2026-01-02時点）

- ✅ `src/api/types.ts`: `Record<string, any>` → `Record<string, unknown>`
- ✅ `src/api/client.ts`: ApiErrorData型追加、ジェネリック型改善、エラーハンドリング型ガード
- ✅ `src/api/*.ts`: `||` → `??` への一括置換
- ✅ 初期エラー数: **206個** → 現在: **約70-80個**（約60%削減）

---

## 残りの修正内容

### 優先度1: Critical（必須修正）

#### 1.1 Hooks層のPromise未処理（約15個）

**エラータイプ**: `@typescript-eslint/no-floating-promises`

**対象ファイル**:
- `src/hooks/useArticles.ts`
- `src/hooks/useFeeds.ts`
- `src/hooks/useKeywords.ts`

**修正パターン**:
```typescript
// ❌ 修正前
queryClient.invalidateQueries({ queryKey: articlesKeys.lists() });

// ✅ 修正後
void queryClient.invalidateQueries({ queryKey: articlesKeys.lists() });
```

**具体的な修正箇所**:

**src/hooks/useArticles.ts**:
- Line ~122: `queryClient.invalidateQueries` に `void` を追加
- Line ~125: `console.error` の前に `// eslint-disable-next-line no-console` を追加（オプション）

**src/hooks/useFeeds.ts**:
- onSuccess内の `invalidateQueries` に `void` を追加
- onError内の `console.error` に eslint-disable コメント追加

**src/hooks/useKeywords.ts**:
- Line 57: `queryClient.invalidateQueries({ queryKey: keywordsKeys.lists() });`
- Line 96: `queryClient.invalidateQueries({ queryKey: ["articles"] });`
- Line 122: `queryClient.invalidateQueries({ queryKey: ["articles"] });`
- Line 140: `queryClient.invalidateQueries({ queryKey: ["articles"] });`

上記すべてに `void` を先頭に追加：
```typescript
void queryClient.invalidateQueries({ queryKey: ["articles"] });
```

---

#### 1.2 process.env → import.meta.env の変更（2個）

**エラータイプ**: `no-undef`

**対象ファイル**: `src/hooks/useArticles.ts`

**修正箇所**:
- Line 38
- Line 65（もし存在すれば）

```typescript
// ❌ 修正前
if (process.env.NODE_ENV === 'test') {
  return false;
}

// ✅ 修正後
if (import.meta.env.MODE === 'test') {
  return false;
}
```

---

#### 1.3 Reactインポート追加（2個）

**エラータイプ**: `no-undef`

**対象ファイル**: `src/components/keywords/KeywordEditForm.tsx`

**修正箇所**: Line 88, 131 で `React` が未定義

```typescript
// ファイル先頭に追加
import React from 'react';
```

---

### 優先度2: High（重要な修正）

#### 2.1 イベントハンドラーのasync削除（約15個）

**エラータイプ**: `@typescript-eslint/no-misused-promises`

**原因**: onClickやonChangeなどのイベントハンドラーは `void` を返す必要があるが、`async`関数は `Promise` を返す

**対象ファイル**:
- `src/components/articles/ArticleActionButtons.tsx` (Line 131, 152)
- `src/components/feeds/FeedList.tsx`
- `src/components/feeds/FeedForm.tsx`
- `src/components/feeds/FeedEditForm.tsx`
- `src/components/keywords/KeywordList.tsx`
- `src/components/keywords/KeywordForm.tsx`
- `src/components/keywords/KeywordEditForm.tsx`

**修正パターン**:

```typescript
// ❌ 修正前
const handleToggleRead = async (e: React.MouseEvent) => {
  e.stopPropagation();
  await toggleRead.mutateAsync({ articleId: article.article_id, data: { is_read: !article.is_read } });
};

<IconButton onClick={handleToggleRead} />  // エラー発生

// ✅ 修正後（方法1: asyncを削除してvoidを使用）
const handleToggleRead = (e: React.MouseEvent) => {
  e.stopPropagation();
  void toggleRead.mutateAsync({ articleId: article.article_id, data: { is_read: !article.is_read } });
};

<IconButton onClick={handleToggleRead} />

// ✅ 修正後（方法2: イベントハンドラーでラップ）
const handleToggleRead = (e: React.MouseEvent) => {
  e.stopPropagation();
  toggleRead.mutateAsync({ articleId: article.article_id, data: { is_read: !article.is_read } })
    .catch((error) => {
      console.error("エラー:", error);
    });
};
```

**推奨**: 方法1（voidを使用）の方がシンプル

**src/components/articles/ArticleActionButtons.tsx の具体例**:

Line 131:
```typescript
// 修正前
const handleToggleRead = async (e: React.MouseEvent) => {
  // ...
};

// 修正後
const handleToggleRead = (e: React.MouseEvent) => {
  e.stopPropagation();
  void toggleRead.mutateAsync({
    articleId: article.article_id,
    data: { is_read: !article.is_read },
  });
};
```

Line 152も同様のパターンで修正。

---

#### 2.2 unbound-method の修正（約20個）

**エラータイプ**: `@typescript-eslint/unbound-method`

**対象ファイル**: すべてのhooksファイル

**修正パターン**:

```typescript
// ❌ 修正前
export function useFeeds() {
  return useQuery({
    queryKey: feedsKeys.list(),
    queryFn: feedsApi.getFeeds,  // thisバインディング問題
  });
}

// ✅ 修正後
export function useFeeds() {
  return useQuery({
    queryKey: feedsKeys.list(),
    queryFn: () => feedsApi.getFeeds(),  // アロー関数でラップ
  });
}
```

**対象箇所**:
- `src/hooks/useFeeds.ts`: Line 23 の `queryFn`
- `src/hooks/useArticles.ts`: 各クエリの `queryFn`
- `src/hooks/useKeywords.ts`: Line 27 の `queryFn`

すべて `queryFn: () => apiMethod()` の形式に変更。

---

#### 2.3 src/api/client.ts の残りエラー（5個）

**src/api/client.ts Line 76**:
```typescript
// ❌ 修正前
return Promise.reject(error);

// ✅ 修正後
return Promise.reject(error instanceof Error ? error : new Error(String(error)));
```

**src/api/client.ts Line 182-195**:
```typescript
// ❌ 修正前
const baseURL = import.meta.env.VITE_API_BASE_URL;
const apiKey = import.meta.env.VITE_API_KEY;

// ✅ 修正後
const baseURL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const apiKey = import.meta.env.VITE_API_KEY as string | undefined;
```

---

### 優先度3: Medium（テスト層の修正）

#### 3.1 テストファイルのmock型修正（約30個）

**エラータイプ**: `@typescript-eslint/no-unsafe-argument`, `@typescript-eslint/no-unsafe-assignment`

**対象ファイル**:
- `src/api/__tests__/client.test.ts`
- `src/components/articles/__tests__/ArticleActionButtons.test.tsx`
- `src/components/articles/__tests__/ArticleDetail.test.tsx`
- `src/components/articles/__tests__/ArticleList.test.tsx`
- その他テストファイル

**修正パターン**:

```typescript
// ❌ 修正前
mockedUseToggleArticleRead.mockReturnValue({
  mutateAsync: mockToggleReadMutateAsync,
  isPending: false,
} as any);

// ✅ 修正後
mockedUseToggleArticleRead.mockReturnValue({
  mutateAsync: mockToggleReadMutateAsync,
  isPending: false,
} as ReturnType<typeof useToggleArticleRead>);
```

**別パターン**:
```typescript
// ❌ 修正前
mockedUseArticle.mockReturnValue({
  data: mockArticle,
  isLoading: false,
  error: null,
} as any);

// ✅ 修正後
mockedUseArticle.mockReturnValue({
  data: mockArticle,
  isLoading: false,
  error: null,
} as UseQueryResult<Article, Error>);
```

**対象ファイル別の修正箇所**:

**src/components/articles/__tests__/ArticleActionButtons.test.tsx**:
- Line 40: `as any` → `as ReturnType<typeof useToggleArticleRead>`
- Line 45: `as any` → `as ReturnType<typeof useToggleArticleSave>`
- Line 158, 170: 同様

**src/components/articles/__tests__/ArticleDetail.test.tsx**:
- Line 63: `as any` → `as UseQueryResult<Article, Error>`
- Line 69: `as any` → `as UseQueryResult<ImportanceReason[], Error>`
- Line 87, 101, 189, 207, 219, 232, 246: 同様

**src/api/__tests__/client.test.ts**:
- Line 2: 未使用の `AxiosInstance` import を削除
- Line 56: mock の型アサーションを改善
  ```typescript
  const mockAxiosInstance = mockedAxios.create.mock.results[0]?.value as AxiosInstance;
  ```

---

#### 3.2 vitest globals の設定確認（2個）

**エラータイプ**: `no-undef` (`beforeEach` is not defined)

**対象ファイル**:
- `src/components/articles/__tests__/ArticleFilterControls.test.tsx` (Line 16)
- `src/components/articles/__tests__/ArticleSortControls.test.tsx`

**原因**: `vitest.config.ts` で `globals: true` が設定されていない可能性

**修正方法1**: `vitest.config.ts` を確認
```typescript
export default defineConfig({
  test: {
    globals: true,  // これが true であることを確認
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

**修正方法2**: または、テストファイルで明示的にimport
```typescript
import { beforeEach, describe, it, expect } from 'vitest';
```

---

### 優先度4: Low（警告・スタイル）

#### 4.1 未使用変数の削除（約10個）

**エラータイプ**: `@typescript-eslint/no-unused-vars`

**対象箇所**:

**src/components/articles/ArticleDetail.tsx**:
- Line 21: `import { format } from "date-fns";` → 削除（使用していない）
- Line 26: `import type { Article } from "../../api";` → 削除
- Line 38: `onClose` パラメータ → `_onClose` にリネーム（未使用を明示）

**src/components/articles/__tests__/ArticleActionButtons.test.tsx**:
- Line 2: `fireEvent` → 削除
- Line 144: `container` → 削除

**src/components/articles/__tests__/ArticleDetail.test.tsx**:
- Line 58: `mockOnClose` → 削除

**src/components/articles/__tests__/ArticleList.test.tsx**:
- Line 2: `waitFor` → 削除

---

#### 4.2 console.log 警告の処理（27個）

**エラータイプ**: `no-console`（警告のみ）

**対象ファイル**:
- `src/components/ErrorBoundary.tsx` (Line 47)
- `src/components/articles/ArticleActionButtons.tsx` (Line 63, 98)
- `src/hooks/useArticles.ts` (Line 125)
- その他多数

**修正パターン**:

```typescript
// エラーログは残す（本番環境でも重要）
// eslint-disable-next-line no-console
console.error("既読状態更新エラー:", error);

// デバッグログは削除
// console.log("submit::", formData);  ← コメントアウトまたは削除
```

---

#### 4.3 prefer-nullish-coalescing（残り数個）

**対象ファイル**:
- `src/components/articles/ArticleDetail.tsx` (Line 197)
- `src/components/articles/ArticleFilterControls.tsx` (Line 68)
- `src/components/articles/ArticleList.tsx` (Line 164)

**修正パターン**:
```typescript
// ❌ 修正前
const value = data || defaultValue;

// ✅ 修正後
const value = data ?? defaultValue;
```

---

#### 4.4 その他の軽微なエラー

**src/components/articles/ArticleDetail.tsx Line 206**:
```typescript
// ❌ 修正前
return [...response.data, ...data];

// ✅ 修正後（型アサーション）
return [...(response.data as ImportanceReason[]), ...data];
```

**src/components/articles/ArticleList.tsx Line 180**:
同様に型アサーションを追加。

**src/components/articles/ArticleList.tsx Line 160**:
```typescript
// React Hook useMemo の依存配列に handleRowClick を追加
const columns = useMemo(() => [
  // ...
], [handleRowClick]);  // ← 依存配列に追加
```

---

## 修正の実行順序（推奨）

### ステップ1: Critical修正（必須）
1. `src/hooks/useArticles.ts`, `useFeeds.ts`, `useKeywords.ts` の Promise処理（void追加）
2. `src/hooks/useArticles.ts` の `process.env` → `import.meta.env`
3. `src/components/keywords/KeywordEditForm.tsx` の React import
4. `src/hooks/*.ts` の queryFn をアロー関数でラップ
5. `src/api/client.ts` の残りエラー（Promise.reject, import.meta.env型）

### ステップ2: High修正（重要）
6. すべてのコンポーネントのイベントハンドラーから async を削除（void使用）

### ステップ3: Medium修正（テスト）
7. テストファイルの `as any` を適切な型に変更
8. vitest.config.ts の globals 設定確認

### ステップ4: Low修正（スタイル）
9. 未使用変数の削除
10. console.log に eslint-disable コメント追加
11. 残りの `||` → `??` 置換

---

## 検証コマンド

各ステップ完了後に実行：

```bash
# Lintチェック
npm run lint

# 型チェック
npm run type-check

# テスト実行
npm test

# ビルド確認
npm run build
```

---

## 完了基準

- [ ] `npm run lint` でエラー 0 件、警告 0 件
- [ ] `npm run type-check` で型エラー 0 件
- [ ] `npm test` で全テスト通過
- [ ] `npm run build` でビルド成功

---

## 参考情報

### ESLintルールの説明

- **no-floating-promises**: 処理されていないPromiseを検出
- **no-misused-promises**: イベントハンドラーなど、void を期待する場所に Promise を返す関数を渡すことを検出
- **unbound-method**: オブジェクトメソッドを別の関数に渡す際の this バインディング問題
- **no-explicit-any**: 明示的な any 型の使用を検出
- **prefer-nullish-coalescing**: `||` の代わりに `??` の使用を推奨

### 型アサーションのベストプラクティス

```typescript
// ❌ 避けるべき
value as any

// ✅ 推奨
value as SpecificType
value as ReturnType<typeof someFunction>
value as UseQueryResult<DataType, ErrorType>
```

---

## 作業者への注意事項

1. **段階的な修正を推奨**: 一度に全てを修正せず、ステップごとに検証
2. **テストを実行**: 各修正後に `npm test` でテストが通ることを確認
3. **型の理解**: `any` を単に `unknown` に置き換えるだけでなく、適切な型を考慮
4. **エラーハンドリングの保持**: async を削除する際、エラーハンドリングが失われないよう注意

---

## 質問・相談先

修正中に不明点があれば、以下を確認：
- ESLintルールの詳細: https://typescript-eslint.io/rules/
- React Query型定義: https://tanstack.com/query/latest/docs/react/typescript
- Vitest設定: https://vitest.dev/config/

---

**作成日**: 2026-01-02
**最終更新**: 2026-01-02
**作成者**: Claude Code Assistant
