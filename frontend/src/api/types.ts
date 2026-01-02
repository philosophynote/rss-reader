/**
 * フィード関連の型定義
 */
export interface Feed {
  feed_id: string;
  url: string;
  title: string;
  folder?: string;
  created_at: string;
  last_fetched_at?: string;
  is_active: boolean;
}

export interface CreateFeedRequest {
  url: string;
  folder?: string;
}

export interface UpdateFeedRequest {
  title?: string;
  folder?: string;
  is_active?: boolean;
}

/**
 * 記事関連の型定義
 */
export interface Article {
  article_id: string;
  feed_id: string;
  link: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
  is_read: boolean;
  is_saved: boolean;
  importance_score: number;
  read_at?: string;
}

export interface ArticleListParams {
  sort_by?: "published_at" | "importance_score";
  filter_by?: "unread" | "read" | "saved";
  limit?: number;
  last_evaluated_key?: Record<string, unknown>;
}

export interface ArticleListResponse {
  articles: Article[];
  last_evaluated_key?: Record<string, unknown>;
  total_count?: number;
}

export interface UpdateArticleReadRequest {
  is_read: boolean;
}

export interface UpdateArticleSaveRequest {
  is_saved: boolean;
}

/**
 * キーワード関連の型定義
 */
export interface Keyword {
  keyword_id: string;
  text: string;
  weight: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateKeywordRequest {
  text: string;
  weight?: number;
}

export interface UpdateKeywordRequest {
  text?: string;
  weight?: number;
  is_active?: boolean;
}

/**
 * 重要度理由の型定義
 */
export interface ImportanceReason {
  keyword_id: string;
  keyword_text: string;
  similarity_score: number;
  contribution: number;
}

/**
 * ジョブ実行結果の型定義
 */
export interface FetchFeedsJobResult {
  total_feeds: number;
  successful_feeds: number;
  failed_feeds: number;
  new_articles: number;
  errors: string[];
}

export interface CleanupJobResult {
  deleted_articles: number;
  deleted_reasons: number;
}

/**
 * エラーレスポンスの型定義
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

/**
 * 共通レスポンス型
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  success: boolean;
}
