import { apiClient } from "./client";
import type {
  Feed,
  CreateFeedRequest,
  UpdateFeedRequest,
  ApiResponse,
} from "./types";

/**
 * フィード管理API
 */
export const feedsApi = {
  /**
   * フィード一覧を取得
   */
  async getFeeds(): Promise<Feed[]> {
    const response = await apiClient.get<ApiResponse<Feed[]>>("/api/feeds");
    return response.data || [];
  },

  /**
   * フィードを作成
   */
  async createFeed(data: CreateFeedRequest): Promise<Feed> {
    const response = await apiClient.post<ApiResponse<Feed>>(
      "/api/feeds",
      data
    );
    if (!response.data) {
      throw new Error("フィードの作成に失敗しました");
    }
    return response.data;
  },

  /**
   * フィードを更新
   */
  async updateFeed(feedId: string, data: UpdateFeedRequest): Promise<Feed> {
    const response = await apiClient.put<ApiResponse<Feed>>(
      `/api/feeds/${feedId}`,
      data
    );
    if (!response.data) {
      throw new Error("フィードの更新に失敗しました");
    }
    return response.data;
  },

  /**
   * フィードを削除
   */
  async deleteFeed(feedId: string): Promise<void> {
    await apiClient.delete(`/api/feeds/${feedId}`);
  },
};
