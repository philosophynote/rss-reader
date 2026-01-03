import { apiClient } from "./client";
import type {
  FetchFeedsJobResult,
  CleanupJobResult,
} from "./types";

interface FeedFetchItem {
  feed_id: string;
  total_entries: number;
  created_articles: number;
  skipped_duplicates: number;
  skipped_invalid: number;
  error_message: string | null;
}

interface FetchFeedsJobResponse {
  items: FeedFetchItem[];
}

interface CleanupJobResponse {
  message: string;
  deleted_articles: number;
  deleted_reasons: number;
}

/**
 * ジョブ実行API
 */
export const jobsApi = {
  /**
   * フィード取得ジョブを手動実行
   */
  async fetchFeeds(): Promise<FetchFeedsJobResult> {
    const response = await apiClient.post<FetchFeedsJobResponse>(
      "/api/jobs/fetch-feeds"
    );
    const items = response.items ?? [];
    const failedFeeds = items.filter((item) => item.error_message).length;
    const newArticles = items.reduce(
      (total, item) => total + item.created_articles,
      0
    );
    const errors = items.flatMap((item) =>
      item.error_message ? [item.error_message] : []
    );

    return {
      total_feeds: items.length,
      successful_feeds: items.length - failedFeeds,
      failed_feeds: failedFeeds,
      new_articles: newArticles,
      errors,
    };
  },

  /**
   * 記事削除ジョブを手動実行
   */
  async cleanupArticles(): Promise<CleanupJobResult> {
    const response = await apiClient.post<CleanupJobResponse>(
      "/api/jobs/cleanup-articles"
    );
    return {
      deleted_articles: response.deleted_articles ?? 0,
      deleted_reasons: response.deleted_reasons ?? 0,
    };
  },
};
