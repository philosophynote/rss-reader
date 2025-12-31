import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { feedsApi, ApiAuthError, ApiError } from "../../api";
import {
  useFeeds,
  useCreateFeed,
  useUpdateFeed,
  useDeleteFeed,
} from "../useFeeds";
import type { Feed, CreateFeedRequest, UpdateFeedRequest } from "../../api";

// APIをモック
vi.mock("../../api", async () => {
  const actual = await vi.importActual("../../api");
  return {
    ...actual,
    feedsApi: {
      getFeeds: vi.fn(),
      createFeed: vi.fn(),
      updateFeed: vi.fn(),
      deleteFeed: vi.fn(),
    },
  };
});

const mockedFeedsApi = vi.mocked(feedsApi);

// テスト用のQueryClientプロバイダー
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useFeeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch feeds successfully", async () => {
    const mockFeeds: Feed[] = [
      {
        feed_id: "1",
        url: "https://example.com/feed.xml",
        title: "Test Feed",
        folder: "Tech",
        created_at: "2024-01-01T00:00:00Z",
        last_fetched_at: "2024-01-01T12:00:00Z",
        is_active: true,
      },
    ];

    mockedFeedsApi.getFeeds.mockResolvedValue(mockFeeds);

    const { result } = renderHook(() => useFeeds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockFeeds);
    expect(mockedFeedsApi.getFeeds).toHaveBeenCalledTimes(1);
  });

  it("should handle API auth error", async () => {
    const authError = new ApiAuthError("認証に失敗しました", 401);
    mockedFeedsApi.getFeeds.mockRejectedValue(authError);

    const { result } = renderHook(() => useFeeds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(authError);
    // 認証エラーの場合はリトライしない
    expect(mockedFeedsApi.getFeeds).toHaveBeenCalledTimes(1);
  });

  it("should retry on API error", async () => {
    const apiError = new ApiError("サーバーエラー", 500);
    mockedFeedsApi.getFeeds.mockRejectedValue(apiError);

    const { result } = renderHook(() => useFeeds(), {
      wrapper: createWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 10000 }
    );

    expect(result.current.error).toEqual(apiError);
    // API エラーの場合は最大3回リトライする（初回 + 3回リトライ = 4回）
    expect(mockedFeedsApi.getFeeds).toHaveBeenCalledTimes(4);
  });
});

describe("useCreateFeed", () => {
  it("should create feed successfully", async () => {
    const newFeed: Feed = {
      feed_id: "2",
      url: "https://example.com/new-feed.xml",
      title: "New Feed",
      folder: "News",
      created_at: "2024-01-02T00:00:00Z",
      is_active: true,
    };

    const createRequest: CreateFeedRequest = {
      url: "https://example.com/new-feed.xml",
      folder: "News",
    };

    mockedFeedsApi.createFeed.mockResolvedValue(newFeed);

    const { result } = renderHook(() => useCreateFeed(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(createRequest);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(newFeed);
    expect(mockedFeedsApi.createFeed).toHaveBeenCalledWith(createRequest);
  });

  it("should handle create feed error", async () => {
    const createRequest: CreateFeedRequest = {
      url: "invalid-url",
    };

    const apiError = new ApiError("無効なURL", 400);
    mockedFeedsApi.createFeed.mockRejectedValue(apiError);

    const { result } = renderHook(() => useCreateFeed(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(createRequest);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(apiError);
  });
});

describe("useUpdateFeed", () => {
  it("should update feed successfully", async () => {
    const updatedFeed: Feed = {
      feed_id: "1",
      url: "https://example.com/feed.xml",
      title: "Updated Feed",
      folder: "Updated Tech",
      created_at: "2024-01-01T00:00:00Z",
      is_active: false,
    };

    const updateRequest: UpdateFeedRequest = {
      title: "Updated Feed",
      folder: "Updated Tech",
      is_active: false,
    };

    mockedFeedsApi.updateFeed.mockResolvedValue(updatedFeed);

    const { result } = renderHook(() => useUpdateFeed(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ feedId: "1", data: updateRequest });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(updatedFeed);
    expect(mockedFeedsApi.updateFeed).toHaveBeenCalledWith("1", updateRequest);
  });
});

describe("useDeleteFeed", () => {
  it("should delete feed successfully", async () => {
    mockedFeedsApi.deleteFeed.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteFeed(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("1");

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedFeedsApi.deleteFeed).toHaveBeenCalledWith("1");
  });

  it("should handle delete feed error", async () => {
    const apiError = new ApiError("フィードが見つかりません", 404);
    mockedFeedsApi.deleteFeed.mockRejectedValue(apiError);

    const { result } = renderHook(() => useDeleteFeed(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("1");

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(apiError);
  });
});
