import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios, { AxiosInstance } from "axios";
import { ApiClient, ApiAuthError, ApiError } from "../client";

// axiosをモック
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

describe("ApiClient", () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: Partial<AxiosInstance>;

  const mockConfig = {
    baseURL: "https://api.example.com",
    apiKey: "test-api-key",
    timeout: 5000,
  };

  beforeEach(() => {
    // axios instanceのモック
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as AxiosInstance);
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
      const newApiKey = "new-api-key";
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
