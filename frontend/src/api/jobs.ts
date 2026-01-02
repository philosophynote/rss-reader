import { apiClient } from "./client";
import type {
  FetchFeedsJobResult,
  CleanupJobResult,
  ApiResponse,
} from "./types";

/**
 * ジョブ実行API
 */
export const jobsApi = {
  /**
   * フィード取得ジョブを手動実行
   */
  async fetchFeeds(): Promise<FetchFeedsJobResult> {
    const response = await apiClient.post<ApiResponse<FetchFeedsJobResult>>(
      "/api/jobs/fetch-feeds"
    );
    return (
      response.data ?? {
        total_feeds: 0,
        successful_feeds: 0,
        failed_feeds: 0,
        new_articles: 0,
        errors: [],
      }
    );
  },

  /**
   * 記事削除ジョブを手動実行
   */
  async cleanupArticles(): Promise<CleanupJobResult> {
    const response = await apiClient.post<ApiResponse<CleanupJobResult>>(
      "/api/jobs/cleanup-articles"
    );
    return (
      response.data ?? {
        deleted_articles: 0,
        deleted_reasons: 0,
      }
    );
  },
};
