import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { render } from "../../../test/test-utils";
import { ArticleDetail } from "../ArticleDetail";
import { useArticle, useArticleReasons } from "../../../hooks";
import type { Article, ImportanceReason } from "../../../api";

// フックをモック
vi.mock("../../../hooks", () => ({
  useArticle: vi.fn(),
  useArticleReasons: vi.fn(),
  useToggleArticleRead: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useToggleArticleSave: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

const mockedUseArticle = vi.mocked(useArticle);
const mockedUseArticleReasons = vi.mocked(useArticleReasons);

const mockArticle: Article = {
  article_id: "1",
  feed_id: "feed-1",
  link: "https://example.com/article",
  title: "Test Article Title",
  content:
    "This is test article content with multiple lines.\n\nSecond paragraph here.",
  published_at: "2024-01-01T10:00:00Z",
  created_at: "2024-01-01T10:05:00Z",
  is_read: false,
  is_saved: true,
  importance_score: 0.856,
  read_at: null,
};

const mockReasons: ImportanceReason[] = [
  {
    article_id: "1",
    keyword_id: "keyword-1",
    keyword_text: "Python",
    similarity_score: 0.8,
    contribution: 1.2,
  },
  {
    article_id: "1",
    keyword_id: "keyword-2",
    keyword_text: "JavaScript",
    similarity_score: 0.6,
    contribution: 0.9,
  },
];

describe("ArticleDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseArticle.mockReturnValue({
      data: mockArticle,
      isLoading: false,
      error: null,
    } as UseQueryResult<Article, Error>);

    mockedUseArticleReasons.mockReturnValue({
      data: mockReasons,
      isLoading: false,
      error: null,
    } as UseQueryResult<ImportanceReason[], Error>);
  });

  it("should render article details correctly", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("Test Article Title")).toBeInTheDocument();
    expect(
      screen.getByText(/This is test article content/)
    ).toBeInTheDocument();
    expect(screen.getByText("重要度: 0.856")).toBeInTheDocument();
  });

  it("should show loading state for article", () => {
    mockedUseArticle.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as UseQueryResult<Article, Error>);

    render(<ArticleDetail articleId="1" />);

    // Skeletonが表示されることを確認
    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show error state for article", () => {
    mockedUseArticle.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Test error"),
    } as UseQueryResult<Article, Error>);

    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("記事の取得に失敗しました")).toBeInTheDocument();
  });

  it("should show article status badge", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("未読")).toBeInTheDocument();
    expect(screen.getByText("保存済み")).toBeInTheDocument();
  });

  it("should show article action buttons", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByLabelText("既読にする")).toBeInTheDocument();
    expect(screen.getByLabelText("保存を解除")).toBeInTheDocument();
    expect(screen.getByLabelText("元記事を開く")).toBeInTheDocument();
  });

  it("should show external link", () => {
    render(<ArticleDetail articleId="1" />);

    const externalLink = screen.getByText("元記事を開く");
    expect(externalLink.closest("a")).toHaveAttribute("href", mockArticle.link);
    expect(externalLink.closest("a")).toHaveAttribute("target", "_blank");
  });

  it("should format published date correctly", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("公開: 2024年01月01日 10:00")).toBeInTheDocument();
  });

  it("should format created date correctly", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("作成日時:")).toBeInTheDocument();
    expect(screen.getByText("2024年01月01日 10:05")).toBeInTheDocument();
  });

  it("should show importance reasons when available", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("重要度の理由")).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("+1.200")).toBeInTheDocument();
    expect(screen.getByText("+0.900")).toBeInTheDocument();
  });

  it("should show similarity scores in reasons", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("類似度: 0.800")).toBeInTheDocument();
    expect(screen.getByText("類似度: 0.600")).toBeInTheDocument();
  });

  it("should show total importance score", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("合計重要度スコア")).toBeInTheDocument();
    expect(screen.getByText("0.856")).toBeInTheDocument();
  });

  it("should show article metadata", () => {
    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("記事情報")).toBeInTheDocument();
    expect(screen.getByText("記事ID:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("フィードID:")).toBeInTheDocument();
    expect(screen.getByText("feed-1")).toBeInTheDocument();
  });

  it("should show read_at when article is read", () => {
    const readArticle = {
      ...mockArticle,
      is_read: true,
      read_at: "2024-01-01T12:00:00Z",
    };

    mockedUseArticle.mockReturnValue({
      data: readArticle,
      isLoading: false,
      error: null,
    } as UseQueryResult<Article, Error>);

    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("既読日時:")).toBeInTheDocument();
    expect(screen.getByText("2024年01月01日 12:00")).toBeInTheDocument();
  });

  it("should handle empty content", () => {
    const articleWithoutContent = {
      ...mockArticle,
      content: "",
    };

    mockedUseArticle.mockReturnValue({
      data: articleWithoutContent,
      isLoading: false,
      error: null,
    } as UseQueryResult<Article, Error>);

    render(<ArticleDetail articleId="1" />);

    expect(screen.getByText("記事の内容がありません。")).toBeInTheDocument();
  });

  it("should handle reasons loading state", () => {
    mockedUseArticleReasons.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as UseQueryResult<ImportanceReason[], Error>);

    render(<ArticleDetail articleId="1" />);

    // 重要度理由のスケルトンが表示されることを確認
    expect(screen.getByText("重要度の理由")).toBeInTheDocument();
  });

  it("should handle reasons error state", () => {
    mockedUseArticleReasons.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Reasons error"),
    } as UseQueryResult<ImportanceReason[], Error>);

    render(<ArticleDetail articleId="1" />);

    expect(
      screen.getByText("重要度理由の取得に失敗しました")
    ).toBeInTheDocument();
  });

  it("should not show reasons section when no reasons", () => {
    mockedUseArticleReasons.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as UseQueryResult<ImportanceReason[], Error>);

    render(<ArticleDetail articleId="1" />);

    expect(screen.queryByText("重要度の理由")).not.toBeInTheDocument();
  });
});
