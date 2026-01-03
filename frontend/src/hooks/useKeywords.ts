import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { keywordsApi, ApiAuthError } from "../api";
import type {
  Keyword,
  CreateKeywordRequest,
  UpdateKeywordRequest,
} from "../api";

/**
 * キーワード関連のクエリキー
 */
export const keywordsKeys = {
  all: ["keywords"] as const,
  lists: () => [...keywordsKeys.all, "list"] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...keywordsKeys.lists(), filters] as const,
  details: () => [...keywordsKeys.all, "detail"] as const,
  detail: (id: string) => [...keywordsKeys.details(), id] as const,
};

/**
 * キーワード一覧を取得するフック
 */
export function useKeywords() {
  return useQuery({
    queryKey: keywordsKeys.list(),
    queryFn: keywordsApi.getKeywords,
    retry: (failureCount, error) => {
      // 認証エラーの場合はリトライしない
      if (error instanceof ApiAuthError) {
        return false;
      }
      // その他のエラーは最大3回リトライ
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間キャッシュを保持
  });
}

/**
 * キーワード作成のミューテーション
 */
export function useCreateKeyword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateKeywordRequest) => keywordsApi.createKeyword(data),
    onSuccess: (newKeyword) => {
      // キャッシュを更新
      queryClient.setQueryData<Keyword[]>(keywordsKeys.list(), (old) => {
        return old ? [...old, newKeyword] : [newKeyword];
      });

      // キーワード一覧を再取得
      void queryClient.invalidateQueries({ queryKey: keywordsKeys.lists() });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error("キーワード作成エラー:", error);
    },
  });
}

/**
 * キーワード更新のミューテーション
 */
export function useUpdateKeyword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      keywordId,
      data,
    }: {
      keywordId: string;
      data: UpdateKeywordRequest;
    }) => keywordsApi.updateKeyword(keywordId, data),
    onSuccess: (updatedKeyword) => {
      // キャッシュを更新
      queryClient.setQueryData<Keyword[]>(keywordsKeys.list(), (old) => {
        return old?.map((keyword) =>
          keyword.keyword_id === updatedKeyword.keyword_id
            ? updatedKeyword
            : keyword
        );
      });

      // 詳細キャッシュも更新
      queryClient.setQueryData(
        keywordsKeys.detail(updatedKeyword.keyword_id),
        updatedKeyword
      );

      // キーワード更新時は記事の重要度スコアに影響するため、記事キャッシュを無効化
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error("キーワード更新エラー:", error);
    },
  });
}

/**
 * キーワード削除のミューテーション
 */
export function useDeleteKeyword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keywordId: string) => keywordsApi.deleteKeyword(keywordId),
    onSuccess: (_, keywordId) => {
      // キャッシュから削除
      queryClient.setQueryData<Keyword[]>(keywordsKeys.list(), (old) => {
        return old?.filter((keyword) => keyword.keyword_id !== keywordId);
      });

      // 詳細キャッシュも削除
      queryClient.removeQueries({ queryKey: keywordsKeys.detail(keywordId) });

      // キーワード削除時は記事の重要度スコアに影響するため、記事キャッシュを無効化
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error("キーワード削除エラー:", error);
    },
  });
}

/**
 * 重要度スコア再計算のミューテーション
 */
export function useRecalculateScores() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => keywordsApi.recalculateScores(),
    onSuccess: () => {
      // 記事キャッシュを無効化（重要度スコアが変更されるため）
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error("重要度スコア再計算エラー:", error);
    },
  });
}

/**
 * キーワードの有効/無効を切り替えるヘルパーフック
 */
export function useToggleKeywordActive() {
  const updateKeyword = useUpdateKeyword();

  return {
    ...updateKeyword,
    toggleActive: (keyword: Keyword) => {
      updateKeyword.mutate({
        keywordId: keyword.keyword_id,
        data: { is_active: !keyword.is_active },
      });
    },
  };
}
