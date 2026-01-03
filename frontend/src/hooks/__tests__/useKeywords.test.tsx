import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useKeywords,
  useCreateKeyword,
  useUpdateKeyword,
  useDeleteKeyword,
  useToggleKeywordActive,
  useRecalculateScores,
} from "../useKeywords";
import { keywordsApi } from "../../api/keywords";
import type {
  Keyword,
  CreateKeywordRequest,
  UpdateKeywordRequest,
} from "../../api";

// APIをモック
vi.mock("../../api/keywords", () => ({
  keywordsApi: {
    getKeywords: vi.fn(),
    createKeyword: vi.fn(),
    updateKeyword: vi.fn(),
    deleteKeyword: vi.fn(),
    recalculateScores: vi.fn(),
  },
}));

const mockedKeywordsApi = vi.mocked(keywordsApi);

const mockKeyword: Keyword = {
  keyword_id: "1",
  text: "Python",
  weight: 1.5,
  is_active: true,
  created_at: "2024-01-01T10:00:00Z",
};

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

describe("useKeywords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch keywords successfully", async () => {
    const mockKeywords = [mockKeyword];
    mockedKeywordsApi.getKeywords.mockResolvedValue(mockKeywords);

    const { result } = renderHook(() => useKeywords(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockKeywords);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedKeywordsApi.getKeywords).toHaveBeenCalled();
  });

  it("should handle keywords fetch error", { timeout: 3000 }, async () => {
    const error = new Error("Fetch failed");
    mockedKeywordsApi.getKeywords.mockRejectedValue(error);

    const { result } = renderHook(() => useKeywords(), {
      wrapper: createWrapper(),
    });

    // ローディングが完了するまで待つ（リトライは無効）
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 }
    );

    // エラー状態を確認
    expect(result.current.isError).toBe(true);
    expect(result.current.error).toEqual(error);
  });
});

describe("useCreateKeyword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create keyword successfully", async () => {
    mockedKeywordsApi.createKeyword.mockResolvedValue(mockKeyword);

    const { result } = renderHook(() => useCreateKeyword(), {
      wrapper: createWrapper(),
    });

    const createData: CreateKeywordRequest = {
      text: "Python",
      weight: 1.5,
    };

    await result.current.mutateAsync(createData);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedKeywordsApi.createKeyword).toHaveBeenCalledWith(createData);
  });

  it("should handle create keyword error", async () => {
    const error = new Error("Create failed");
    mockedKeywordsApi.createKeyword.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateKeyword(), {
      wrapper: createWrapper(),
    });

    const createData: CreateKeywordRequest = {
      text: "Python",
      weight: 1.5,
    };

    await expect(result.current.mutateAsync(createData)).rejects.toThrow(
      "Create failed"
    );
  });
});

describe("useUpdateKeyword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update keyword successfully", async () => {
    const updatedKeyword = { ...mockKeyword, weight: 2.0 };
    mockedKeywordsApi.updateKeyword.mockResolvedValue(updatedKeyword);

    const { result } = renderHook(() => useUpdateKeyword(), {
      wrapper: createWrapper(),
    });

    const updateData: UpdateKeywordRequest = {
      weight: 2.0,
    };

    await result.current.mutateAsync({
      keywordId: "1",
      data: updateData,
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedKeywordsApi.updateKeyword).toHaveBeenCalledWith(
      "1",
      updateData
    );
  });

  it("should handle update keyword error", async () => {
    const error = new Error("Update failed");
    mockedKeywordsApi.updateKeyword.mockRejectedValue(error);

    const { result } = renderHook(() => useUpdateKeyword(), {
      wrapper: createWrapper(),
    });

    const updateData: UpdateKeywordRequest = {
      weight: 2.0,
    };

    await expect(
      result.current.mutateAsync({
        keywordId: "1",
        data: updateData,
      })
    ).rejects.toThrow("Update failed");
  });
});

describe("useDeleteKeyword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete keyword successfully", async () => {
    mockedKeywordsApi.deleteKeyword.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteKeyword(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("1");

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedKeywordsApi.deleteKeyword).toHaveBeenCalledWith("1");
  });

  it("should handle delete keyword error", async () => {
    const error = new Error("Delete failed");
    mockedKeywordsApi.deleteKeyword.mockRejectedValue(error);

    const { result } = renderHook(() => useDeleteKeyword(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync("1")).rejects.toThrow(
      "Delete failed"
    );
  });
});

describe("useToggleKeywordActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should toggle keyword active status successfully", async () => {
    const updatedKeyword = { ...mockKeyword, is_active: false };
    mockedKeywordsApi.updateKeyword.mockResolvedValue(updatedKeyword);

    const { result } = renderHook(() => useToggleKeywordActive(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      keywordId: "1",
      data: { is_active: false },
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedKeywordsApi.updateKeyword).toHaveBeenCalledWith("1", {
      is_active: false,
    });
  });

  it("should handle toggle active error", async () => {
    const error = new Error("Toggle failed");
    mockedKeywordsApi.updateKeyword.mockRejectedValue(error);

    const { result } = renderHook(() => useToggleKeywordActive(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        keywordId: "1",
        data: { is_active: false },
      })
    ).rejects.toThrow("Toggle failed");
  });
});

describe("useRecalculateScores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should recalculate scores successfully", async () => {
    mockedKeywordsApi.recalculateScores.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRecalculateScores(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockedKeywordsApi.recalculateScores).toHaveBeenCalled();
  });

  it("should handle recalculate scores error", async () => {
    const error = new Error("Recalculation failed");
    mockedKeywordsApi.recalculateScores.mockRejectedValue(error);

    const { result } = renderHook(() => useRecalculateScores(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync()).rejects.toThrow(
      "Recalculation failed"
    );
  });
});
