import { apiClient } from "./client";
import type {
  Feed,
  CreateFeedRequest,
  UpdateFeedRequest,
} from "./types";

interface FeedListApiResponse {
  items: Feed[];
}

/**
 * フィード管理API
 */
export const feedsApi = {
  /**
   * フィード一覧を取得
   */
  async getFeeds(): Promise<Feed[]> {
    const response = await apiClient.get<FeedListApiResponse>("/api/feeds");
    return response.items ?? [];
  },

  /**
   * フィードを作成
   */
  async createFeed(data: CreateFeedRequest): Promise<Feed> {
    return apiClient.post<Feed>("/api/feeds", data);
  },

  /**
   * フィードを更新
   */
  async updateFeed(feedId: string, data: UpdateFeedRequest): Promise<Feed> {
    return apiClient.put<Feed>(`/api/feeds/${feedId}`, data);
  },

  /**
   * フィードを削除
   */
  async deleteFeed(feedId: string): Promise<void> {
    await apiClient.delete(`/api/feeds/${feedId}`);
  },
};
