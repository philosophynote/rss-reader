import axios, { AxiosInstance, AxiosError, AxiosResponse } from "axios";

/**
 * APIエラーレスポンスのデータ型
 */
export interface ApiErrorData {
  error?: {
    code?: string;
    message?: string;
    details?: string;
  };
  message?: string;
  [key: string]: unknown;
}

/**
 * API認証エラー
 */
export class ApiAuthError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiAuthError";
  }
}

/**
 * API通信エラー
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: ApiErrorData
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * API設定
 */
interface ApiConfig {
  baseURL: string;
  apiKey: string;
  timeout?: number;
}

/**
 * 認証対応APIクライアント
 */
class ApiClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: ApiConfig) {
    this.apiKey = config.apiKey;

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // リクエストインターセプター: API Key認証ヘッダーの自動追加
    this.client.interceptors.request.use(
      (config) => {
        if (this.apiKey) {
          config.headers.Authorization = `Bearer ${this.apiKey}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    );

    // レスポンスインターセプター: 認証エラーハンドリング
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          // 認証エラー
          throw new ApiAuthError(
            "認証に失敗しました。API Keyを確認してください。",
            error.response.status
          );
        }

        if (error.response?.status === 429) {
          // レート制限エラー
          throw new ApiError(
            "リクエストが多すぎます。しばらく待ってから再試行してください。",
            error.response.status,
            error.response.data as ApiErrorData
          );
        }

        if (error.response) {
          // サーバーエラー
          const data = error.response.data as ApiErrorData;
          let message = `サーバーエラーが発生しました (${error.response.status})`;

          if (data && typeof data === 'object') {
            if (data.error && typeof data.error === 'object') {
              if (data.error.message && typeof data.error.message === 'string') {
                message = data.error.message;
              }
            } else if (data.message && typeof data.message === 'string') {
              message = data.message;
            }
          }

          throw new ApiError(
            message,
            error.response.status,
            data
          );
        }

        if (error.request) {
          // ネットワークエラー
          throw new ApiError(
            "ネットワークエラーが発生しました。接続を確認してください。"
          );
        }

        // その他のエラー
        throw new ApiError(error.message ?? "予期しないエラーが発生しました。");
      }
    );
  }

  /**
   * API Keyを更新
   */
  updateApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * GETリクエスト
   */
  async get<T = unknown>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  /**
   * POSTリクエスト
   */
  async post<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  /**
   * PUTリクエスト
   */
  async put<T = unknown>(url: string, data?: unknown): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  /**
   * DELETEリクエスト
   */
  async delete<T = unknown>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }
}

/**
 * 環境変数からAPI設定を取得
 */
function getApiConfig(): ApiConfig {
  const env = import.meta.env as Record<string, unknown>;
  const baseURL = env.VITE_API_BASE_URL as string | undefined;
  const apiKey = env.VITE_API_KEY as string | undefined;

  if (!baseURL) {
    throw new Error("VITE_API_BASE_URL環境変数が設定されていません");
  }

  if (!apiKey) {
    throw new Error("VITE_API_KEY環境変数が設定されていません");
  }

  return {
    baseURL,
    apiKey,
    timeout: 30000,
  };
}

/**
 * デフォルトAPIクライアントインスタンス
 */
export const apiClient = new ApiClient(getApiConfig());

export { ApiClient };
export type { ApiConfig };
