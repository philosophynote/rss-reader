import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { articlesApi, ApiAuthError } from "../api";
import type {
  Article,
  ArticleListParams,
  UpdateArticleReadRequest,
  UpdateArticleSaveRequest,
} from "../api";

/**
 * 記事関連のクエリキー
 */
export const articlesKeys = {
  all: ["articles"] as const,
  lists: () => [...articlesKeys.all, "list"] as const,
  list: (params: ArticleListParams = {}) =>
    [...articlesKeys.lists(), params] as const,
  details: () => [...articlesKeys.all, "detail"] as const,
  detail: (id: string) => [...articlesKeys.details(), id] as const,
  reasons: (id: string) => [...articlesKeys.detail(id), "reasons"] as const,
};

/**
 * 記事一覧を取得するフック
 */
export function useArticles(params?: ArticleListParams) {
  const defaultParams: ArticleListParams = {
    sort_by: "published_at",
    limit: 50,
    ...params,
  };

  return useQuery({
    queryKey: articlesKeys.list(defaultParams),
    queryFn: () => articlesApi.getArticles(defaultParams),
    retry: (failureCount, error) => {
      // テスト環境ではリトライしない
      if (import.meta.env.MODE === "test") {
        return false;
      }
      
      // 認証エラーの場合はリトライしない
      if (error instanceof ApiAuthError) {
        return false;
      }
      // その他のエラーは最大3回リトライ
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 2 * 60 * 1000, // 2分間はキャッシュを使用
    gcTime: 5 * 60 * 1000, // 5分間キャッシュを保持
  });
}

/**
 * 記事詳細を取得するフック
 */
export function useArticle(articleId: string) {
  return useQuery({
    queryKey: articlesKeys.detail(articleId),
    queryFn: () => articlesApi.getArticle(articleId),
    enabled: !!articleId,
    retry: (failureCount, error) => {
      // テスト環境ではリトライしない
      if (import.meta.env.MODE === "test") {
        return false;
      }
      
      if (error instanceof ApiAuthError) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
  });
}

/**
 * 記事の重要度理由を取得するフック
 */
export function useArticleReasons(articleId: string) {
  return useQuery({
    queryKey: articlesKeys.reasons(articleId),
    queryFn: () => articlesApi.getArticleReasons(articleId),
    enabled: !!articleId,
    retry: (failureCount, error) => {
      if (error instanceof ApiAuthError) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 10 * 60 * 1000, // 10分間はキャッシュを使用
    gcTime: 30 * 60 * 1000, // 30分間キャッシュを保持
  });
}

/**
 * 記事の既読状態更新のミューテーション
 */
export function useUpdateArticleRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      articleId,
      data,
    }: {
      articleId: string;
      data: UpdateArticleReadRequest;
    }) => articlesApi.updateArticleRead(articleId, data),
    onSuccess: (updatedArticle) => {
      // 詳細キャッシュを更新
      queryClient.setQueryData(
        articlesKeys.detail(updatedArticle.article_id),
        updatedArticle
      );

      // 一覧キャッシュを無効化（フィルタリングに影響するため）
      void queryClient.invalidateQueries({ queryKey: articlesKeys.lists() });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error("記事既読状態更新エラー:", error);
    },
  });
}

/**
 * 記事の保存状態更新のミューテーション
 */
export function useUpdateArticleSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      articleId,
      data,
    }: {
      articleId: string;
      data: UpdateArticleSaveRequest;
    }) => articlesApi.updateArticleSave(articleId, data),
    onSuccess: (updatedArticle) => {
      // 詳細キャッシュを更新
      queryClient.setQueryData(
        articlesKeys.detail(updatedArticle.article_id),
        updatedArticle
      );

      // 一覧キャッシュを無効化（フィルタリングに影響するため）
      void queryClient.invalidateQueries({ queryKey: articlesKeys.lists() });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error("記事保存状態更新エラー:", error);
    },
  });
}

/**
 * 記事の既読/未読を切り替えるヘルパーフック
 */
export function useToggleArticleRead() {
  const updateRead = useUpdateArticleRead();

  return {
    ...updateRead,
    toggleRead: (article: Article) => {
      updateRead.mutate({
        articleId: article.article_id,
        data: { is_read: !article.is_read },
      });
    },
  };
}

/**
 * 記事の保存/解除を切り替えるヘルパーフック
 */
export function useToggleArticleSave() {
  const updateSave = useUpdateArticleSave();

  return {
    ...updateSave,
    toggleSave: (article: Article) => {
      updateSave.mutate({
        articleId: article.article_id,
        data: { is_saved: !article.is_saved },
      });
    },
  };
}
