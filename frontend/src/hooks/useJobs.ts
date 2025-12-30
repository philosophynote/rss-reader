import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "../api";

/**
 * フィード取得ジョブ実行のミューテーション
 */
export function useFetchFeedsJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: jobsApi.fetchFeeds,
    onSuccess: (result) => {
      console.log("フィード取得ジョブ完了:", result);

      // 新しい記事が取得された場合、記事キャッシュを無効化
      if (result.new_articles > 0) {
        queryClient.invalidateQueries({ queryKey: ["articles"] });
      }

      // フィードの最終取得日時が更新されるため、フィードキャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["feeds"] });
    },
    onError: (error) => {
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
    mutationFn: jobsApi.cleanupArticles,
    onSuccess: (result) => {
      console.log("記事削除ジョブ完了:", result);

      // 記事が削除された場合、記事キャッシュを無効化
      if (result.deleted_articles > 0) {
        queryClient.invalidateQueries({ queryKey: ["articles"] });
      }
    },
    onError: (error) => {
      console.error("記事削除ジョブエラー:", error);
    },
  });
}
