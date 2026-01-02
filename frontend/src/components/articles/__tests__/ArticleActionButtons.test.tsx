import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../../test/test-utils";
import { ArticleActionButtons } from "../ArticleActionButtons";
import { useToggleArticleRead, useToggleArticleSave } from "../../../hooks";
import type { Article } from "../../../api";

// フックをモック
vi.mock("../../../hooks", () => ({
  useToggleArticleRead: vi.fn(),
  useToggleArticleSave: vi.fn(),
}));

const mockedUseToggleArticleRead = vi.mocked(useToggleArticleRead);
const mockedUseToggleArticleSave = vi.mocked(useToggleArticleSave);

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

describe("ArticleActionButtons", () => {
  const mockToggleReadMutateAsync = vi.fn();
  const mockToggleSaveMutateAsync = vi.fn();
  const mockOnReadToggle = vi.fn();
  const mockOnSaveToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseToggleArticleRead.mockReturnValue({
      mutateAsync: mockToggleReadMutateAsync,
      isPending: false,
    } as any);

    mockedUseToggleArticleSave.mockReturnValue({
      mutateAsync: mockToggleSaveMutateAsync,
      isPending: false,
    } as any);

    // window.openをモック
    vi.stubGlobal("open", vi.fn());
  });

  it("should render action buttons correctly for unread unsaved article", () => {
    render(<ArticleActionButtons article={mockArticle} />);

    expect(screen.getByLabelText("既読にする")).toBeInTheDocument();
    expect(screen.getByLabelText("保存する")).toBeInTheDocument();
    expect(screen.getByLabelText("元記事を開く")).toBeInTheDocument();
  });

  it("should render action buttons correctly for read saved article", () => {
    const readSavedArticle = {
      ...mockArticle,
      is_read: true,
      is_saved: true,
    };

    render(<ArticleActionButtons article={readSavedArticle} />);

    expect(screen.getByLabelText("未読にする")).toBeInTheDocument();
    expect(screen.getByLabelText("保存を解除")).toBeInTheDocument();
    expect(screen.getByLabelText("元記事を開く")).toBeInTheDocument();
  });

  it("should toggle read status when read button is clicked", async () => {
    const user = userEvent.setup();
    mockToggleReadMutateAsync.mockResolvedValue({});

    render(
      <ArticleActionButtons
        article={mockArticle}
        onReadToggle={mockOnReadToggle}
      />
    );

    const readButton = screen.getByLabelText("既読にする");
    await user.click(readButton);

    expect(mockToggleReadMutateAsync).toHaveBeenCalledWith({
      articleId: "1",
      data: { is_read: true },
    });

    await waitFor(() => {
      expect(mockOnReadToggle).toHaveBeenCalledWith(mockArticle);
    });
  });

  it("should toggle save status when save button is clicked", async () => {
    const user = userEvent.setup();
    mockToggleSaveMutateAsync.mockResolvedValue({});

    render(
      <ArticleActionButtons
        article={mockArticle}
        onSaveToggle={mockOnSaveToggle}
      />
    );

    const saveButton = screen.getByLabelText("保存する");
    await user.click(saveButton);

    expect(mockToggleSaveMutateAsync).toHaveBeenCalledWith({
      articleId: "1",
      data: { is_saved: true },
    });

    await waitFor(() => {
      expect(mockOnSaveToggle).toHaveBeenCalledWith(mockArticle);
    });
  });

  it("should open external link when external button is clicked", async () => {
    const user = userEvent.setup();

    render(<ArticleActionButtons article={mockArticle} />);

    const externalButton = screen.getByLabelText("元記事を開く");
    await user.click(externalButton);

    expect(window.open).toHaveBeenCalledWith(
      "https://example.com/article",
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("should stop event propagation on button clicks", async () => {
    const user = userEvent.setup();
    const mockParentClick = vi.fn();
    mockToggleReadMutateAsync.mockResolvedValue({});

    const { container } = render(
      <div onClick={mockParentClick}>
        <ArticleActionButtons article={mockArticle} />
      </div>
    );

    const readButton = screen.getByLabelText("既読にする");
    await user.click(readButton);

    // 親要素のクリックイベントが発火しないことを確認
    expect(mockParentClick).not.toHaveBeenCalled();
  });

  it("should show loading state for read button", () => {
    mockedUseToggleArticleRead.mockReturnValue({
      mutateAsync: mockToggleReadMutateAsync,
      isPending: true,
    } as any);

    render(<ArticleActionButtons article={mockArticle} />);

    const readButton = screen.getByLabelText("既読にする");
    expect(readButton).toBeDisabled();
  });

  it("should show loading state for save button", () => {
    mockedUseToggleArticleSave.mockReturnValue({
      mutateAsync: mockToggleSaveMutateAsync,
      isPending: true,
    } as any);

    render(<ArticleActionButtons article={mockArticle} />);

    const saveButton = screen.getByLabelText("保存する");
    expect(saveButton).toBeDisabled();
  });

  it("should handle different button sizes", () => {
    const { rerender } = render(
      <ArticleActionButtons article={mockArticle} size="sm" />
    );

    let buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);

    rerender(<ArticleActionButtons article={mockArticle} size="md" />);

    buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("should handle different button variants", () => {
    const { rerender } = render(
      <ArticleActionButtons article={mockArticle} variant="ghost" />
    );

    let buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);

    rerender(<ArticleActionButtons article={mockArticle} variant="outline" />);

    buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("should handle read toggle error", async () => {
    const user = userEvent.setup();
    const error = new Error("Toggle read failed");
    mockToggleReadMutateAsync.mockRejectedValue(error);

    render(<ArticleActionButtons article={mockArticle} />);

    const readButton = screen.getByLabelText("既読にする");
    await user.click(readButton);

    expect(mockToggleReadMutateAsync).toHaveBeenCalled();
    // エラーハンドリングはtoastで行われるため、コンソールエラーが出力されることを確認
    expect(console.error).toHaveBeenCalledWith("既読状態更新エラー:", error);
  });

  it("should handle save toggle error", async () => {
    const user = userEvent.setup();
    const error = new Error("Toggle save failed");
    mockToggleSaveMutateAsync.mockRejectedValue(error);

    render(<ArticleActionButtons article={mockArticle} />);

    const saveButton = screen.getByLabelText("保存する");
    await user.click(saveButton);

    expect(mockToggleSaveMutateAsync).toHaveBeenCalled();
    // エラーハンドリングはtoastで行われるため、コンソールエラーが出力されることを確認
    expect(console.error).toHaveBeenCalledWith("保存状態更新エラー:", error);
  });
});
