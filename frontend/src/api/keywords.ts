import { apiClient } from "./client";
import type {
  Keyword,
  CreateKeywordRequest,
  UpdateKeywordRequest,
  ApiResponse,
} from "./types";

/**
 * キーワード管理API
 */
export const keywordsApi = {
  /**
   * キーワード一覧を取得
   */
  async getKeywords(this: void): Promise<Keyword[]> {
    const response = await apiClient.get<ApiResponse<Keyword[]>>(
      "/api/keywords"
    );
    return response.data ?? [];
  },

  /**
   * キーワードを作成
   */
  async createKeyword(data: CreateKeywordRequest): Promise<Keyword> {
    const response = await apiClient.post<ApiResponse<Keyword>>(
      "/api/keywords",
      data
    );
    if (!response.data) {
      throw new Error("キーワードの作成に失敗しました");
    }
    return response.data;
  },

  /**
   * キーワードを更新
   */
  async updateKeyword(
    keywordId: string,
    data: UpdateKeywordRequest
  ): Promise<Keyword> {
    const response = await apiClient.put<ApiResponse<Keyword>>(
      `/api/keywords/${keywordId}`,
      data
    );
    if (!response.data) {
      throw new Error("キーワードの更新に失敗しました");
    }
    return response.data;
  },

  /**
   * キーワードを削除
   */
  async deleteKeyword(keywordId: string): Promise<void> {
    await apiClient.delete(`/api/keywords/${keywordId}`);
  },

  /**
   * 重要度スコアを再計算
   */
  async recalculateScores(): Promise<void> {
    await apiClient.post("/api/keywords/recalculate");
  },
};
