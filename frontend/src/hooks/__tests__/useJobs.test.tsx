import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
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

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useFetchFeeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch feeds successfully", async () => {
    const mockResponse = {
      total_feeds: 5,
      successful_feeds: 5,
      failed_feeds: 0,
      new_articles: 10,
      errors: [],
    };

    mockedJobsApi.fetchFeeds.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useFetchFeeds(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    // eslint-disable-next-line @typescript-eslint/unbound-method
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
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                total_feeds: 1,
                successful_feeds: 1,
                failed_feeds: 0,
                new_articles: 1,
                errors: [],
              }),
            100
          )
        )
    );

    const { result } = renderHook(() => useFetchFeeds(), {
      wrapper: createWrapper(),
    });

    const promise = result.current.mutateAsync();

    // 実行中はpendingになる
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
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
      deleted_articles: 15,
      deleted_reasons: 30,
    };

    mockedJobsApi.cleanupArticles.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCleanupArticles(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    // eslint-disable-next-line @typescript-eslint/unbound-method
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
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                deleted_articles: 1,
                deleted_reasons: 1,
              }),
            100
          )
        )
    );

    const { result } = renderHook(() => useCleanupArticles(), {
      wrapper: createWrapper(),
    });

    const promise = result.current.mutateAsync();

    // 実行中はpendingになる
    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await promise;

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it("should handle successful response with zero deletions", async () => {
    const mockResponse = {
      deleted_articles: 0,
      deleted_reasons: 0,
    };

    mockedJobsApi.cleanupArticles.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCleanupArticles(), {
      wrapper: createWrapper(),
    });

    const response = await result.current.mutateAsync();

    expect(response).toEqual(mockResponse);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedJobsApi.cleanupArticles).toHaveBeenCalled();
  });
});
