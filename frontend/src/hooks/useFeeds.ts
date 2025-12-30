import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedsApi, ApiAuthError } from "../api";
import type { Feed, CreateFeedRequest, UpdateFeedRequest } from "../api";

/**
 * フィード関連のクエリキー
 */
export const feedsKeys = {
  all: ["feeds"] as const,
  lists: () => [...feedsKeys.all, "list"] as const,
  list: (filters: Record<string, any> = {}) =>
    [...feedsKeys.lists(), filters] as const,
  details: () => [...feedsKeys.all, "detail"] as const,
  detail: (id: string) => [...feedsKeys.details(), id] as const,
};

/**
 * フィード一覧を取得するフック
 */
export function useFeeds() {
  return useQuery({
    queryKey: feedsKeys.list(),
    queryFn: feedsApi.getFeeds,
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
 * フィード作成のミューテーション
 */
export function useCreateFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFeedRequest) => feedsApi.createFeed(data),
    onSuccess: (newFeed) => {
      // キャッシュを更新
      queryClient.setQueryData<Feed[]>(feedsKeys.list(), (old) => {
        return old ? [...old, newFeed] : [newFeed];
      });

      // フィード一覧を再取得
      queryClient.invalidateQueries({ queryKey: feedsKeys.lists() });
    },
    onError: (error) => {
      console.error("フィード作成エラー:", error);
    },
  });
}

/**
 * フィード更新のミューテーション
 */
export function useUpdateFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      feedId,
      data,
    }: {
      feedId: string;
      data: UpdateFeedRequest;
    }) => feedsApi.updateFeed(feedId, data),
    onSuccess: (updatedFeed) => {
      // キャッシュを更新
      queryClient.setQueryData<Feed[]>(feedsKeys.list(), (old) => {
        return old?.map((feed) =>
          feed.feed_id === updatedFeed.feed_id ? updatedFeed : feed
        );
      });

      // 詳細キャッシュも更新
      queryClient.setQueryData(
        feedsKeys.detail(updatedFeed.feed_id),
        updatedFeed
      );
    },
    onError: (error) => {
      console.error("フィード更新エラー:", error);
    },
  });
}

/**
 * フィード削除のミューテーション
 */
export function useDeleteFeed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedId: string) => feedsApi.deleteFeed(feedId),
    onSuccess: (_, feedId) => {
      // キャッシュから削除
      queryClient.setQueryData<Feed[]>(feedsKeys.list(), (old) => {
        return old?.filter((feed) => feed.feed_id !== feedId);
      });

      // 詳細キャッシュも削除
      queryClient.removeQueries({ queryKey: feedsKeys.detail(feedId) });

      // 関連する記事キャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error) => {
      console.error("フィード削除エラー:", error);
    },
  });
}
