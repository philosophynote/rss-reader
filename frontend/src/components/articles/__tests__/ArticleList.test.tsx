import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../../test/test-utils";
import { ArticleList } from "../ArticleList";
import { useArticles } from "../../../hooks";
import type { Article } from "../../../api";

// フックをモック
vi.mock("../../../hooks", () => ({
  useArticles: vi.fn(),
  useToggleArticleRead: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useToggleArticleSave: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

const mockedUseArticles = vi.mocked(useArticles);

const mockArticles: Article[] = [
  {
    article_id: "1",
    feed_id: "feed-1",
    link: "https://example.com/article1",
    title: "Test Article 1",
    content: "Test content 1",
    published_at: "2024-01-01T10:00:00Z",
    created_at: "2024-01-01T10:05:00Z",
    is_read: false,
    is_saved: false,
    importance_score: 0.8,
  },
  {
    article_id: "2",
    feed_id: "feed-2",
    link: "https://example.com/article2",
    title: "Test Article 2",
    content: "Test content 2",
    published_at: "2024-01-01T11:00:00Z",
    created_at: "2024-01-01T11:05:00Z",
    is_read: true,
    is_saved: true,
    importance_score: 0.6,
  },
];

describe("ArticleList", () => {
  const mockOnArticleClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseArticles.mockReturnValue({
      data: {
        articles: mockArticles,
        last_evaluated_key: null,
      },
      isLoading: false,
      error: null,
    } as any);
  });

  it("should render article list correctly", () => {
    render(<ArticleList />);

    expect(screen.getByText("Test Article 1")).toBeInTheDocument();
    expect(screen.getByText("Test Article 2")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    mockedUseArticles.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);

    render(<ArticleList />);

    // Skeletonが表示されることを確認
    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show error state", () => {
    mockedUseArticles.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Test error"),
    } as any);

    render(<ArticleList />);

    expect(
      screen.getByText("記事一覧の取得に失敗しました")
    ).toBeInTheDocument();
  });

  it("should show empty state when no articles", () => {
    mockedUseArticles.mockReturnValue({
      data: {
        articles: [],
        last_evaluated_key: null,
      },
      isLoading: false,
      error: null,
    } as any);

    render(<ArticleList />);

    expect(screen.getByText("記事がありません")).toBeInTheDocument();
  });

  it("should call onArticleClick when article title is clicked", async () => {
    const user = userEvent.setup();

    render(<ArticleList onArticleClick={mockOnArticleClick} />);

    const articleTitle = screen.getByText("Test Article 1");
    await user.click(articleTitle);

    expect(mockOnArticleClick).toHaveBeenCalledWith(mockArticles[0]);
  });

  it("should show sort controls", () => {
    render(<ArticleList />);

    expect(screen.getByText("並び順:")).toBeInTheDocument();
    expect(screen.getByText("時系列順")).toBeInTheDocument();
    expect(screen.getByText("重要度順")).toBeInTheDocument();
  });

  it("should show filter controls", () => {
    render(<ArticleList />);

    expect(screen.getByText("フィルタ:")).toBeInTheDocument();

    // フィルターボタンが4つ存在することを確認（すべて、未読、既読、保存済み）
    const allButtons = screen.getAllByRole("button");
    expect(allButtons.length).toBeGreaterThanOrEqual(4);
  });

  it("should show article counts in filter buttons", () => {
    render(<ArticleList />);

    // 記事数のバッジが表示されることを確認
    const totalBadges = screen.getAllByText("2");
    expect(totalBadges.length).toBeGreaterThan(0);

    const singleBadges = screen.getAllByText("1");
    expect(singleBadges.length).toBeGreaterThanOrEqual(3);
  });

  it("should show external link for each article", () => {
    render(<ArticleList />);

    const externalLinks = screen.getAllByText("元記事");
    expect(externalLinks).toHaveLength(2);
  });

  it("should show article status badges", () => {
    render(<ArticleList />);

    const unreadBadges = screen.getAllByText("未読");
    expect(unreadBadges.length).toBeGreaterThan(0);

    const readBadges = screen.getAllByText("既読");
    expect(readBadges.length).toBeGreaterThan(0);

    const savedBadges = screen.getAllByText("保存済み");
    expect(savedBadges.length).toBeGreaterThan(0);
  });

  it("should show importance scores", () => {
    render(<ArticleList />);

    expect(screen.getByText("0.80")).toBeInTheDocument();
    expect(screen.getByText("0.60")).toBeInTheDocument();
  });

  it("should format dates correctly", () => {
    render(<ArticleList />);

    // 日付フォーマットの確認（MM/dd HH:mm形式）
    const dateElements = screen.getAllByText(/\d{2}\/\d{2} \d{2}:\d{2}/);
    expect(dateElements.length).toBeGreaterThanOrEqual(2);
  });

  it("should show load more button when has more data", () => {
    mockedUseArticles.mockReturnValue({
      data: {
        articles: mockArticles,
        last_evaluated_key: { PK: "test", SK: "test" },
      },
      isLoading: false,
      error: null,
    } as any);

    render(<ArticleList />);

    expect(screen.getByText("さらに読み込む")).toBeInTheDocument();
  });

  it("should not show load more button when no more data", () => {
    render(<ArticleList />);

    expect(screen.queryByText("さらに読み込む")).not.toBeInTheDocument();
  });
});
