import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFetchFeeds, useCleanupArticles } from "../useJobs";
import { jobsApi } from "../../api/jobs";

// APIをモック
vi.mock("../../api/jobs", () => ({
  jobsApi: {
    fetchFeeds: vi.fn(),
    cleanupArticles: vi.fn(),
  },
}));

const mockedJobsApi = vi.mocked(jobsApi);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useFetchFeeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch feeds successfully", async () => {
    const mockResponse = {
      message: "Feed fetch job started",
      feeds_processed: 5,
      articles_added: 10,
    };

    mockedJobsApi.fetchFeeds.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useFetchFeeds(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    expect(mockedJobsApi.fetchFeeds).toHaveBeenCalled();
  });

  it("should handle fetch feeds error", async () => {
    const error = new Error("Fetch feeds failed");
    mockedJobsApi.fetchFeeds.mockRejectedValue(error);

    const { result } = renderHook(() => useFetchFeeds(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(
      "Fetch feeds failed"
    );
  });

  it("should be in pending state during execution", async () => {
    // 長時間かかるPromiseをモック
    mockedJobsApi.fetchFeeds.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const { result } = renderHook(() => useFetchFeeds(), {
      wrapper: createWrapper(),
    });

    const promise = result.current.mutateAsync();

    // 実行中はpendingになる
    expect(result.current.isPending).toBe(true);

    // Promiseを解決
    mockedJobsApi.fetchFeeds.mockResolvedValue({
      message: "Success",
      feeds_processed: 1,
      articles_added: 1,
    });

    await promise;

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});

describe("useCleanupArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should cleanup articles successfully", async () => {
    const mockResponse = {
      message: "Cleanup job completed",
      deleted_articles: 15,
      deleted_reasons: 30,
    };

    mockedJobsApi.cleanupArticles.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCleanupArticles(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    expect(mockedJobsApi.cleanupArticles).toHaveBeenCalled();
  });

  it("should handle cleanup articles error", async () => {
    const error = new Error("Cleanup failed");
    mockedJobsApi.cleanupArticles.mockRejectedValue(error);

    const { result } = renderHook(() => useCleanupArticles(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(
      "Cleanup failed"
    );
  });

  it("should be in pending state during execution", async () => {
    // 長時間かかるPromiseをモック
    mockedJobsApi.cleanupArticles.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    const { result } = renderHook(() => useCleanupArticles(), {
      wrapper: createWrapper(),
    });

    const promise = result.current.mutateAsync();

    // 実行中はpendingになる
    expect(result.current.isPending).toBe(true);

    // Promiseを解決
    mockedJobsApi.cleanupArticles.mockResolvedValue({
      message: "Success",
      deleted_articles: 1,
      deleted_reasons: 1,
    });

    await promise;

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it("should handle successful response with zero deletions", async () => {
    const mockResponse = {
      message: "No articles to cleanup",
      deleted_articles: 0,
      deleted_reasons: 0,
    };

    mockedJobsApi.cleanupArticles.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCleanupArticles(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync();

    expect(response).toEqual(mockResponse);
    expect(mockedJobsApi.cleanupArticles).toHaveBeenCalled();
  });
});
