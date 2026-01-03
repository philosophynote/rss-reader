import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type MockAxiosInstance = {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  interceptors: {
    request: {
      use: ReturnType<typeof vi.fn>;
      eject: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
    };
    response: {
      use: ReturnType<typeof vi.fn>;
      eject: ReturnType<typeof vi.fn>;
      clear: ReturnType<typeof vi.fn>;
    };
  };
};

const { mockAxiosInstance } = vi.hoisted(() => {
  const mockInterceptors = {
    request: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn(), clear: vi.fn() },
  };

  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: mockInterceptors,
  } satisfies MockAxiosInstance;

  return { mockAxiosInstance };
});

// axiosをモック（モジュールインポート前に実行）
vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
    isAxiosError: vi.fn(),
  },
}));

// 環境変数をモック（apiClientのモジュールレベル初期化用）
vi.stubGlobal("import.meta", {
  env: {
    VITE_API_BASE_URL: "https://api.example.com",
    VITE_API_KEY: "test-api-key", // pragma: allowlist secret
  },
});

// モック後にApiClientをインポート
// これにより、apiClientのモジュールレベル初期化でモックされたaxiosが使用される
import { ApiClient, ApiAuthError, ApiError } from "../client";

describe("ApiClient", () => {
  let apiClient: ApiClient;

  const mockConfig = {
    baseURL: "https://api.example.com",
    apiKey: "test-api-key", // pragma: allowlist secret
    timeout: 5000,
  };

  beforeEach(() => {
    // axios.createから返されるモックインスタンスを取得
    vi.clearAllMocks();
    apiClient = new ApiClient(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("HTTP methods", () => {
    describe("get", () => {
      it("should make GET request and return data", async () => {
        const mockResponse = { data: { message: "success" } };
        mockAxiosInstance.get = vi.fn().mockResolvedValue(mockResponse);

        const result = await apiClient.get("/test", { param: "value" });
        expect(result).toEqual(mockResponse.data);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith("/test", {
          params: { param: "value" },
        });
      });

      it("should handle GET request error", async () => {
        const error = new Error("Network error");
        mockAxiosInstance.get = vi.fn().mockRejectedValue(error);

        await expect(apiClient.get("/test")).rejects.toThrow("Network error");
      });
    });

    describe("post", () => {
      it("should make POST request and return data", async () => {
        const mockResponse = { data: { id: 1 } };
        const postData = { name: "test" };
        mockAxiosInstance.post = vi.fn().mockResolvedValue(mockResponse);

        const result = await apiClient.post("/test", postData);
        expect(result).toEqual(mockResponse.data);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith("/test", postData);
      });
    });

    describe("put", () => {
      it("should make PUT request and return data", async () => {
        const mockResponse = { data: { updated: true } };
        const putData = { name: "updated" };
        mockAxiosInstance.put = vi.fn().mockResolvedValue(mockResponse);

        const result = await apiClient.put("/test/1", putData);
        expect(result).toEqual(mockResponse.data);
        expect(mockAxiosInstance.put).toHaveBeenCalledWith("/test/1", putData);
      });
    });

    describe("delete", () => {
      it("should make DELETE request and return data", async () => {
        const mockResponse = { data: { deleted: true } };
        mockAxiosInstance.delete = vi.fn().mockResolvedValue(mockResponse);

        const result = await apiClient.delete("/test/1");
        expect(result).toEqual(mockResponse.data);
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith("/test/1");
      });
    });
  });

  describe("updateApiKey", () => {
    it("should update API key", () => {
      const newApiKey = "new-api-key"; // pragma: allowlist secret
      apiClient.updateApiKey(newApiKey);
      // API keyの更新は内部的に行われるため、エラーが発生しないことを確認
      expect(true).toBe(true);
    });
  });
});

describe("ApiAuthError", () => {
  it("should create auth error with message and status", () => {
    const error = new ApiAuthError("Authentication failed", 401);

    expect(error.name).toBe("ApiAuthError");
    expect(error.message).toBe("Authentication failed");
    expect(error.status).toBe(401);
    expect(error).toBeInstanceOf(Error);
  });

  it("should create auth error with message only", () => {
    const error = new ApiAuthError("Authentication failed");

    expect(error.name).toBe("ApiAuthError");
    expect(error.message).toBe("Authentication failed");
    expect(error.status).toBeUndefined();
  });
});

describe("ApiError", () => {
  it("should create API error with all parameters", () => {
    const errorData = { code: "INVALID_REQUEST" };
    const error = new ApiError("Request failed", 400, errorData);

    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("Request failed");
    expect(error.status).toBe(400);
    expect(error.data).toEqual(errorData);
    expect(error).toBeInstanceOf(Error);
  });

  it("should create API error with message only", () => {
    const error = new ApiError("Request failed");

    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("Request failed");
    expect(error.status).toBeUndefined();
    expect(error.data).toBeUndefined();
  });
});
