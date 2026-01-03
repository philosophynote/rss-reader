import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "../api";

/**
 * フィード取得ジョブ実行のミューテーション
 */
export function useFetchFeedsJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => jobsApi.fetchFeeds(),
    onSuccess: (result) => {
      // eslint-disable-next-line no-console
      console.log("フィード取得ジョブ完了:", result);

      // 新しい記事が取得された場合、記事キャッシュを無効化
      if (result.new_articles > 0) {
        void queryClient.invalidateQueries({ queryKey: ["articles"] });
      }

      // フィードの最終取得日時が更新されるため、フィードキャッシュも無効化
      void queryClient.invalidateQueries({ queryKey: ["feeds"] });
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error("フィード取得ジョブエラー:", error);
    },
  });
}

/**
 * 記事削除ジョブ実行のミューテーション
 */
export function useCleanupArticlesJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => jobsApi.cleanupArticles(),
    onSuccess: (result) => {
      // eslint-disable-next-line no-console
      console.log("記事削除ジョブ完了:", result);

      // 記事が削除された場合は記事キャッシュを無効化
      if (result.deleted_articles > 0) {
        void queryClient.invalidateQueries({ queryKey: ["articles"] });
      }
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error("記事削除ジョブエラー:", error);
    },
  });
}

// エイリアスエクスポート（テストとの互換性のため）
export { useFetchFeedsJob as useFetchFeeds };
export { useCleanupArticlesJob as useCleanupArticles };
