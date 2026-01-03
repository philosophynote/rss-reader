import { apiClient } from "./client";
import type {
  Article,
  ArticleListParams,
  ArticleListResponse,
  UpdateArticleReadRequest,
  UpdateArticleSaveRequest,
  ImportanceReason,
} from "./types";

interface ArticleListApiResponse {
  items: Article[];
  last_evaluated_key?: Record<string, unknown>;
}

/**
 * 記事管理API
 */
export const articlesApi = {
  /**
   * 記事一覧を取得
   */
  async getArticles(params?: ArticleListParams): Promise<ArticleListResponse> {
    const queryParams: Record<string, string | number | undefined> = {
      sort: params?.sort_by,
      filter: params?.filter_by,
      limit: params?.limit,
    };
    if (params?.last_evaluated_key) {
      queryParams.last_evaluated_key = JSON.stringify(
        params.last_evaluated_key
      );
    }

    const response = await apiClient.get<ArticleListApiResponse>(
      "/api/articles",
      queryParams
    );
    return {
      articles: response.items ?? [],
      last_evaluated_key: response.last_evaluated_key,
    };
  },

  /**
   * 記事詳細を取得
   */
  async getArticle(articleId: string): Promise<Article> {
    return apiClient.get<Article>(`/api/articles/${articleId}`);
  },

  /**
   * 記事の既読/未読状態を更新
   */
  async updateArticleRead(
    articleId: string,
    data: UpdateArticleReadRequest
  ): Promise<Article> {
    const response = await apiClient.put<Article>(
      `/api/articles/${articleId}/read`,
      data
    );
    return response;
  },

  /**
   * 記事の保存状態を更新
   */
  async updateArticleSave(
    articleId: string,
    data: UpdateArticleSaveRequest
  ): Promise<Article> {
    const response = await apiClient.put<Article>(
      `/api/articles/${articleId}/save`,
      data
    );
    return response;
  },

  /**
   * 記事の重要度理由を取得
   */
  async getArticleReasons(articleId: string): Promise<ImportanceReason[]> {
    return apiClient.get<ImportanceReason[]>(
      `/api/articles/${articleId}/reasons`
    );
  },
};
