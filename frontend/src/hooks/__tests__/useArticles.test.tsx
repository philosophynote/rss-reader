import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useArticles,
  useArticle,
  useToggleArticleRead,
  useToggleArticleSave,
} from "../useArticles";
import * as articlesApi from "../../api/articles";
import type { Article, ArticleListParams } from "../../api";

// APIをモック
vi.mock("../../api/articles");

const mockedArticlesApi = vi.mocked(articlesApi);

const mockArticle: Article = {
  article_id: "1",
  feed_id: "feed-1",
  link: "https://example.com/article",
  title: "Test Article",
  content: "Test content",
  published_at: "2024-01-01T10:00:00Z",
  created_at: "2024-01-01T10:05:00Z",
  is_read: false,
  is_saved: false,
  importance_score: 0.5,
};

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

describe("useArticles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch articles successfully", async () => {
    const mockResponse = {
      articles: [mockArticle],
      last_evaluated_key: null,
    };

    mockedArticlesApi.getArticles.mockResolvedValue(mockResponse);

    const { result } = renderHook(
      () => useArticles({ sort_by: "published_at", limit: 50 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(mockedArticlesApi.getArticles).toHaveBeenCalledWith({
      sort_by: "published_at",
      limit: 50,
    });
  });

  it("should handle articles fetch error", async () => {
    const error = new Error("Fetch failed");
    mockedArticlesApi.getArticles.mockRejectedValue(error);

    const { result } = renderHook(
      () => useArticles({ sort_by: "published_at", limit: 50 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it("should use default params when none provided", async () => {
    const mockResponse = {
      articles: [],
      last_evaluated_key: null,
    };

    mockedArticlesApi.getArticles.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useArticles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedArticlesApi.getArticles).toHaveBeenCalledWith({
      sort_by: "published_at",
      limit: 50,
    });
  });

  it("should pass all params to API", async () => {
    const params: ArticleListParams = {
      sort_by: "importance_score",
      filter_by: "unread",
      limit: 100,
      last_evaluated_key: { PK: "test", SK: "test" },
    };

    const mockResponse = {
      articles: [mockArticle],
      last_evaluated_key: null,
    };

    mockedArticlesApi.getArticles.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useArticles(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockedArticlesApi.getArticles).toHaveBeenCalledWith(params);
  });
});

describe("useArticle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch single article successfully", async () => {
    mockedArticlesApi.getArticle.mockResolvedValue(mockArticle);

    const { result } = renderHook(() => useArticle("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockArticle);
    expect(mockedArticlesApi.getArticle).toHaveBeenCalledWith("1");
  });

  it("should handle single article fetch error", async () => {
    const error = new Error("Article not found");
    mockedArticlesApi.getArticle.mockRejectedValue(error);

    const { result } = renderHook(() => useArticle("1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});

describe("useToggleArticleRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should toggle article read status successfully", async () => {
    const updatedArticle = { ...mockArticle, is_read: true };
    mockedArticlesApi.updateArticleRead.mockResolvedValue(updatedArticle);

    const { result } = renderHook(() => useToggleArticleRead(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      articleId: "1",
      data: { is_read: true },
    });

    expect(mockedArticlesApi.updateArticleRead).toHaveBeenCalledWith("1", {
      is_read: true,
    });
  });

  it("should handle toggle read error", async () => {
    const error = new Error("Update failed");
    mockedArticlesApi.updateArticleRead.mockRejectedValue(error);

    const { result } = renderHook(() => useToggleArticleRead(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        articleId: "1",
        data: { is_read: true },
      })
    ).rejects.toThrow("Update failed");
  });
});

describe("useToggleArticleSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should toggle article save status successfully", async () => {
    const updatedArticle = { ...mockArticle, is_saved: true };
    mockedArticlesApi.updateArticleSave.mockResolvedValue(updatedArticle);

    const { result } = renderHook(() => useToggleArticleSave(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      articleId: "1",
      data: { is_saved: true },
    });

    expect(mockedArticlesApi.updateArticleSave).toHaveBeenCalledWith("1", {
      is_saved: true,
    });
  });

  it("should handle toggle save error", async () => {
    const error = new Error("Update failed");
    mockedArticlesApi.updateArticleSave.mockRejectedValue(error);

    const { result } = renderHook(() => useToggleArticleSave(), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({
        articleId: "1",
        data: { is_saved: true },
      })
    ).rejects.toThrow("Update failed");
  });
});
