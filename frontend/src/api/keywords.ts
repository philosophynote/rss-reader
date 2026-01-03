import { apiClient } from "./client";
import type {
  Keyword,
  CreateKeywordRequest,
  UpdateKeywordRequest,
} from "./types";

interface KeywordListApiResponse {
  items: Keyword[];
}

/**
 * キーワード管理API
 */
export const keywordsApi = {
  /**
   * キーワード一覧を取得
   */
  async getKeywords(this: void): Promise<Keyword[]> {
    const response = await apiClient.get<KeywordListApiResponse>(
      "/api/keywords"
    );
    return response.items ?? [];
  },

  /**
   * キーワードを作成
   */
  async createKeyword(data: CreateKeywordRequest): Promise<Keyword> {
    return apiClient.post<Keyword>("/api/keywords", data);
  },

  /**
   * キーワードを更新
   */
  async updateKeyword(
    keywordId: string,
    data: UpdateKeywordRequest
  ): Promise<Keyword> {
    return apiClient.put<Keyword>(`/api/keywords/${keywordId}`, data);
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
