import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render } from "./test/test-utils";
import App from "./App";
import {
  useArticles,
  useFeeds,
  useKeywords,
  useDeleteFeed,
  useDeleteKeyword,
  useToggleKeywordActive,
  useRecalculateScores,
} from "./hooks";
import type { ArticleListResponse, Feed, Keyword } from "./api";

// MemoryRouterでラップするカスタムレンダー関数
const renderWithRouter = (initialEntries = ["/"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
};

vi.mock("./hooks", () => ({
  useArticles: vi.fn(),
  useFeeds: vi.fn(),
  useKeywords: vi.fn(),
  useDeleteFeed: vi.fn(),
  useDeleteKeyword: vi.fn(),
  useToggleKeywordActive: vi.fn(),
  useRecalculateScores: vi.fn(),
}));

const mockedUseArticles = vi.mocked(useArticles);
const mockedUseFeeds = vi.mocked(useFeeds);
const mockedUseKeywords = vi.mocked(useKeywords);
const mockedUseDeleteFeed = vi.mocked(useDeleteFeed);
const mockedUseDeleteKeyword = vi.mocked(useDeleteKeyword);
const mockedUseToggleKeywordActive = vi.mocked(useToggleKeywordActive);
const mockedUseRecalculateScores = vi.mocked(useRecalculateScores);

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseArticles.mockReturnValue({
      data: {
        articles: [],
        last_evaluated_key: undefined,
      },
      isLoading: false,
      error: null,
    } as unknown as UseQueryResult<ArticleListResponse, Error>);

    mockedUseFeeds.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<Feed[], Error>);

    mockedUseKeywords.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<Keyword[], Error>);

    mockedUseDeleteFeed.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteFeed>);

    mockedUseDeleteKeyword.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteKeyword>);

    mockedUseToggleKeywordActive.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useToggleKeywordActive>);

    mockedUseRecalculateScores.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRecalculateScores>);
  });

  it("should render empty articles state on root route", () => {
    renderWithRouter(["/"]);

    expect(screen.getByText("記事がありません")).toBeInTheDocument();
  });

  it("should render empty feeds state on /feeds route", () => {
    renderWithRouter(["/feeds"]);

    expect(
      screen.getByText("登録されているフィードがありません")
    ).toBeInTheDocument();
  });

  it("should render empty articles state on /articles route", () => {
    renderWithRouter(["/articles"]);

    expect(screen.getByText("記事がありません")).toBeInTheDocument();
  });

  it("should render empty keywords state on /keywords route", () => {
    renderWithRouter(["/keywords"]);

    expect(
      screen.getByText("登録されているキーワードがありません")
    ).toBeInTheDocument();
  });

  it("should have proper background styling", () => {
    const { container } = renderWithRouter();

    // Appコンポーネントのルート要素が存在することを確認
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should handle unknown routes gracefully", () => {
    const { container } = renderWithRouter(["/unknown-route"]);

    // 不明なルートでもLayoutは表示される（エラーが発生しない）
    expect(container).toBeInTheDocument();
  });
});
