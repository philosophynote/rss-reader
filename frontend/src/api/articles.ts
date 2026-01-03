import { apiClient } from "./client";
import type {
  Article,
  ArticleListParams,
  ArticleListResponse,
  UpdateArticleReadRequest,
  UpdateArticleSaveRequest,
  ImportanceReason,
  ApiResponse,
} from "./types";

/**
 * 記事管理API
 */
export const articlesApi = {
  /**
   * 記事一覧を取得
   */
  async getArticles(params?: ArticleListParams): Promise<ArticleListResponse> {
    const response = await apiClient.get<ApiResponse<ArticleListResponse>>(
      "/api/articles",
      params
    );
    return response.data ?? { articles: [] };
  },

  /**
   * 記事詳細を取得
   */
  async getArticle(articleId: string): Promise<Article> {
    const response = await apiClient.get<ApiResponse<Article>>(
      `/api/articles/${articleId}`
    );
    if (!response.data) {
      throw new Error("記事が見つかりません");
    }
    return response.data;
  },

  /**
   * 記事の既読/未読状態を更新
   */
  async updateArticleRead(
    articleId: string,
    data: UpdateArticleReadRequest
  ): Promise<Article> {
    const response = await apiClient.put<ApiResponse<Article>>(
      `/api/articles/${articleId}/read`,
      data
    );
    if (!response.data) {
      throw new Error("記事の既読状態の更新に失敗しました");
    }
    return response.data;
  },

  /**
   * 記事の保存状態を更新
   */
  async updateArticleSave(
    articleId: string,
    data: UpdateArticleSaveRequest
  ): Promise<Article> {
    const response = await apiClient.put<ApiResponse<Article>>(
      `/api/articles/${articleId}/save`,
      data
    );
    if (!response.data) {
      throw new Error("記事の保存状態の更新に失敗しました");
    }
    return response.data;
  },

  /**
   * 記事の重要度理由を取得
   */
  async getArticleReasons(articleId: string): Promise<ImportanceReason[]> {
    const response = await apiClient.get<ApiResponse<ImportanceReason[]>>(
      `/api/articles/${articleId}/reasons`
    );
    return response.data ?? [];
  },
};
