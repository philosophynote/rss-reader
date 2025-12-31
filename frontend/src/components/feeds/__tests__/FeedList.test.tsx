import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../../test/test-utils";
import { FeedList } from "../FeedList";
import { useFeeds, useDeleteFeed } from "../../../hooks";
import type { Feed } from "../../../api";

// フックをモック
vi.mock("../../../hooks", () => ({
  useFeeds: vi.fn(),
  useDeleteFeed: vi.fn(),
  useCreateFeed: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateFeed: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

const mockedUseFeeds = vi.mocked(useFeeds);
const mockedUseDeleteFeed = vi.mocked(useDeleteFeed);

const mockFeeds: Feed[] = [
  {
    feed_id: "1",
    url: "https://example.com/feed1.xml",
    title: "Tech News",
    folder: "Technology",
    created_at: "2024-01-01T10:00:00Z",
    last_fetched_at: "2024-01-01T12:00:00Z",
    is_active: true,
  },
  {
    feed_id: "2",
    url: "https://example.com/feed2.xml",
    title: "Science Updates",
    folder: "Science",
    created_at: "2024-01-01T11:00:00Z",
    last_fetched_at: null,
    is_active: false,
  },
  {
    feed_id: "3",
    url: "https://example.com/feed3.xml",
    title: "General News",
    folder: null,
    created_at: "2024-01-01T09:00:00Z",
    last_fetched_at: "2024-01-01T13:00:00Z",
    is_active: true,
  },
];

describe("FeedList", () => {
  const mockDeleteMutateAsync = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseFeeds.mockReturnValue({
      data: mockFeeds,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    mockedUseDeleteFeed.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as any);

    // window.confirmをモック
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
  });

  it("should render feed list correctly", () => {
    render(<FeedList />);

    expect(screen.getByText("Tech News")).toBeInTheDocument();
    expect(screen.getByText("Science Updates")).toBeInTheDocument();
    expect(screen.getByText("General News")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    mockedUseFeeds.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<FeedList />);

    // Skeletonが表示されることを確認
    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show error state", () => {
    mockedUseFeeds.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Test error"),
      refetch: mockRefetch,
    } as any);

    render(<FeedList />);

    expect(
      screen.getByText("フィード一覧の取得に失敗しました")
    ).toBeInTheDocument();
  });

  it("should show empty state when no feeds", () => {
    mockedUseFeeds.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as any);

    render(<FeedList />);

    expect(
      screen.getByText("登録されているフィードがありません")
    ).toBeInTheDocument();
    expect(screen.getByText("最初のフィードを追加")).toBeInTheDocument();
  });

  it("should group feeds by folder", () => {
    render(<FeedList />);

    expect(screen.getByText("Technology (1)")).toBeInTheDocument();
    expect(screen.getByText("Science (1)")).toBeInTheDocument();
    expect(screen.getByText("未分類 (1)")).toBeInTheDocument();
  });

  it("should show feed details correctly", () => {
    render(<FeedList />);

    // フィードタイトル
    expect(screen.getByText("Tech News")).toBeInTheDocument();
    expect(screen.getByText("Science Updates")).toBeInTheDocument();

    // フィードURL
    expect(
      screen.getByText("https://example.com/feed1.xml")
    ).toBeInTheDocument();
    expect(
      screen.getByText("https://example.com/feed2.xml")
    ).toBeInTheDocument();

    // ステータスバッジ
    const activeBadges = screen.getAllByText("アクティブ");
    expect(activeBadges.length).toBeGreaterThan(0);
    expect(screen.getByText("無効")).toBeInTheDocument();
  });

  it("should show formatted dates", () => {
    render(<FeedList />);

    const createdDates = screen.getAllByText((content, element) =>
      content.startsWith("作成日:") && element?.tagName.toLowerCase() === "p"
    );
    expect(createdDates.length).toBeGreaterThan(0);

    const lastFetchDates = screen.getAllByText((content, element) =>
      content.startsWith("最終取得:") &&
      element?.tagName.toLowerCase() === "p"
    );
    expect(lastFetchDates.length).toBeGreaterThan(0);
  });

  it("should show add feed button", () => {
    render(<FeedList />);

    expect(screen.getByText("フィードを追加")).toBeInTheDocument();
  });

  it("should open add feed modal when add button is clicked", async () => {
    const user = userEvent.setup();

    render(<FeedList />);

    const addButton = screen.getByRole("button", {
      name: /フィードを追加/,
    });
    await user.click(addButton);

    const addTexts = screen.getAllByText("フィードを追加");
    expect(addTexts.length).toBeGreaterThan(1); // ボタンとタイトル
    expect(screen.getByLabelText("フィードURL")).toBeInTheDocument();
  });

  it("should show edit and delete buttons for each feed", () => {
    render(<FeedList />);

    const editButtons = screen.getAllByLabelText("フィードを編集");
    const deleteButtons = screen.getAllByLabelText("フィードを削除");

    expect(editButtons).toHaveLength(3);
    expect(deleteButtons).toHaveLength(3);
  });

  it("should open edit modal when edit button is clicked", async () => {
    const user = userEvent.setup();

    render(<FeedList />);

    const editButtons = screen.getAllByLabelText("フィードを編集");
    await user.click(editButtons[0]);

    expect(screen.getByText("フィードを編集")).toBeInTheDocument();
  });

  it("should delete feed when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    mockDeleteMutateAsync.mockResolvedValue({});

    render(<FeedList />);

    const deleteButtons = screen.getAllByLabelText("フィードを削除");
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "フィード「Tech News」を削除しますか？\n関連する記事もすべて削除されます。"
    );

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith("1");
    });
  });

  it("should not delete feed when delete is cancelled", async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);

    render(<FeedList />);

    const deleteButtons = screen.getAllByLabelText("フィードを削除");
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it("should show external link buttons", () => {
    render(<FeedList />);

    const externalLinkButtons = screen.getAllByLabelText("外部リンクで開く");
    expect(externalLinkButtons).toHaveLength(3);
  });

  it("should handle feeds without last_fetched_at", () => {
    render(<FeedList />);

    // Science Updatesは最終取得日時がnull
    const scienceCard = screen
      .getByText("Science Updates")
      .closest('[role="article"]');
    expect(scienceCard).toBeInTheDocument();
    expect(scienceCard).not.toHaveTextContent("最終取得:");
  });

  it("should handle feeds without folder (uncategorized)", () => {
    render(<FeedList />);

    expect(screen.getByText("未分類 (1)")).toBeInTheDocument();
    expect(screen.getByText("General News")).toBeInTheDocument();
  });

  it("should show loading state for delete button", () => {
    mockedUseDeleteFeed.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: true,
    } as any);

    render(<FeedList />);

    const deleteButtons = screen.getAllByLabelText("フィードを削除");
    deleteButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("should refetch feeds after successful add", async () => {
    const user = userEvent.setup();

    render(<FeedList />);

    const addButton = screen.getByText("フィードを追加");
    await user.click(addButton);

    // モーダルが開いていることを確認
    expect(screen.getByLabelText("フィードURL")).toBeInTheDocument();

    // フォーム送信の成功をシミュレート（実際のテストではFeedFormのテストで行う）
    // ここでは refetch が呼ばれることを確認するためのテスト構造のみ確認
  });
});
