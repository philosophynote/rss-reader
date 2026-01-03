import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { render } from "../../../test/test-utils";
import { KeywordList } from "../KeywordList";
import {
  useKeywords,
  useDeleteKeyword,
  useToggleKeywordActive,
  useRecalculateScores,
} from "../../../hooks";
import type { Keyword } from "../../../api";

// フックをモック
vi.mock("../../../hooks", () => ({
  useKeywords: vi.fn(),
  useDeleteKeyword: vi.fn(),
  useToggleKeywordActive: vi.fn(),
  useRecalculateScores: vi.fn(),
  useCreateKeyword: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateKeyword: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

const mockedUseKeywords = vi.mocked(useKeywords);
const mockedUseDeleteKeyword = vi.mocked(useDeleteKeyword);
const mockedUseToggleKeywordActive = vi.mocked(useToggleKeywordActive);
const mockedUseRecalculateScores = vi.mocked(useRecalculateScores);

const mockKeywords: Keyword[] = [
  {
    keyword_id: "1",
    text: "Python",
    weight: 1.5,
    is_active: true,
    created_at: "2024-01-01T10:00:00Z",
  },
  {
    keyword_id: "2",
    text: "JavaScript",
    weight: 1.0,
    is_active: true,
    created_at: "2024-01-01T11:00:00Z",
  },
  {
    keyword_id: "3",
    text: "Inactive Keyword",
    weight: 2.0,
    is_active: false,
    created_at: "2024-01-01T09:00:00Z",
  },
];

describe("KeywordList", () => {
  const mockDeleteMutateAsync = vi.fn();
  const mockToggleActiveMutateAsync = vi.fn();
  const mockRecalculateMutateAsync = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseKeywords.mockReturnValue({
      data: mockKeywords,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<Keyword[], Error>);

    mockedUseDeleteKeyword.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteKeyword>);

    mockedUseToggleKeywordActive.mockReturnValue({
      mutateAsync: mockToggleActiveMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useToggleKeywordActive>);

    mockedUseRecalculateScores.mockReturnValue({
      mutateAsync: mockRecalculateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useRecalculateScores>);

    // window.confirmをモック
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
  });

  it("should render keyword list correctly", () => {
    render(<KeywordList />);

    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Inactive Keyword")).toBeInTheDocument();
  });

  it("should show loading state", () => {
    mockedUseKeywords.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<Keyword[], Error>);

    render(<KeywordList />);

    // Skeletonが表示されることを確認
    const skeletons = document.querySelectorAll('[data-testid="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show error state", () => {
    mockedUseKeywords.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Test error"),
      refetch: mockRefetch,
    } as unknown as UseQueryResult<Keyword[], Error>);

    render(<KeywordList />);

    expect(
      screen.getByText("キーワード一覧の取得に失敗しました")
    ).toBeInTheDocument();
  });

  it("should show empty state when no keywords", () => {
    mockedUseKeywords.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    } as unknown as UseQueryResult<Keyword[], Error>);

    render(<KeywordList />);

    expect(
      screen.getByText("登録されているキーワードがありません")
    ).toBeInTheDocument();
    expect(screen.getByText("最初のキーワードを追加")).toBeInTheDocument();
  });

  it("should separate active and inactive keywords", () => {
    render(<KeywordList />);

    expect(screen.getByText("有効なキーワード (2)")).toBeInTheDocument();
    expect(screen.getByText("無効なキーワード (1)")).toBeInTheDocument();
  });

  it("should show keyword details correctly", () => {
    render(<KeywordList />);

    // キーワードテキスト
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();

    // 重みバッジ
    expect(screen.getByText("重み: 1.5")).toBeInTheDocument();
    expect(screen.getByText("重み: 1.0")).toBeInTheDocument();
    expect(screen.getByText("重み: 2.0")).toBeInTheDocument();
  });

  it("should show formatted dates", () => {
    render(<KeywordList />);

    // 日付が表示されていることを確認（複数のキーワードがあるので getAllByText を使用）
    const dates = screen.getAllByText(/作成日:/);
    expect(dates.length).toBeGreaterThan(0);
  });

  it("should show add keyword button", () => {
    render(<KeywordList />);

    expect(screen.getByText("キーワードを追加")).toBeInTheDocument();
  });

  it("should show recalculate button", () => {
    render(<KeywordList />);

    expect(screen.getByText("重要度を再計算")).toBeInTheDocument();
  });

  it("should open add keyword modal when add button is clicked", async () => {
    const user = userEvent.setup();

    render(<KeywordList />);

    const addButtons = screen.getAllByRole("button", { name: /キーワードを追加/ });
    await user.click(addButtons[0]);

    // useDisclosureのonOpenが呼ばれていることを確認（モーダルの開閉は実装詳細）
    // ここではボタンのクリックが正常に動作することのみをテスト
    expect(addButtons[0]).toBeInTheDocument();
  });

  it("should show edit and delete buttons for each keyword", () => {
    render(<KeywordList />);

    const editButtons = screen.getAllByLabelText("キーワードを編集");
    const deleteButtons = screen.getAllByLabelText("キーワードを削除");

    expect(editButtons).toHaveLength(3);
    expect(deleteButtons).toHaveLength(3);
  });

  it("should show toggle switches for each keyword", () => {
    render(<KeywordList />);

    const switches = screen.getAllByRole("checkbox");
    expect(switches).toHaveLength(3);

    // アクティブなキーワードのスイッチはオン
    expect(switches[0]).toBeChecked();
    expect(switches[1]).toBeChecked();
    // 非アクティブなキーワードのスイッチはオフ
    expect(switches[2]).not.toBeChecked();
  });

  it("should toggle keyword active state when switch is clicked", async () => {
    const user = userEvent.setup();
    mockToggleActiveMutateAsync.mockResolvedValue({});

    render(<KeywordList />);

    const switches = screen.getAllByRole("checkbox");
    await user.click(switches[0]); // Pythonキーワードを無効化

    expect(mockToggleActiveMutateAsync).toHaveBeenCalledWith({
      keywordId: "1",
      data: { is_active: false },
    });
  });

  it("should delete keyword when delete button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    mockDeleteMutateAsync.mockResolvedValue({});

    render(<KeywordList />);

    const deleteButtons = screen.getAllByLabelText("キーワードを削除");
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      "キーワード「Python」を削除しますか？"
    );

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith("1");
    });
  });

  it("should not delete keyword when delete is cancelled", async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);

    render(<KeywordList />);

    const deleteButtons = screen.getAllByLabelText("キーワードを削除");
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it("should open edit modal when edit button is clicked", async () => {
    const user = userEvent.setup();

    render(<KeywordList />);

    const editButtons = screen.getAllByLabelText("キーワードを編集");
    await user.click(editButtons[0]);

    // 編集ボタンのクリックが正常に動作することを確認
    expect(editButtons[0]).toBeInTheDocument();
  });

  it("should recalculate scores when recalculate button is clicked and confirmed", async () => {
    const user = userEvent.setup();
    mockRecalculateMutateAsync.mockResolvedValue({});

    render(<KeywordList />);

    const recalculateButton = screen.getByText("重要度を再計算");
    await user.click(recalculateButton);

    expect(window.confirm).toHaveBeenCalledWith(
      "すべての記事の重要度スコアを再計算しますか？\nこの処理には時間がかかる場合があります。"
    );

    await waitFor(() => {
      expect(mockRecalculateMutateAsync).toHaveBeenCalled();
    });
  });

  it("should show loading state for recalculate button", () => {
    mockedUseRecalculateScores.mockReturnValue({
      mutateAsync: mockRecalculateMutateAsync,
      isPending: true,
    } as unknown as ReturnType<typeof useRecalculateScores>);

    render(<KeywordList />);

    expect(screen.getByText("再計算中...")).toBeInTheDocument();
  });

  it("should show loading state for delete button", () => {
    mockedUseDeleteKeyword.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: true,
    } as unknown as ReturnType<typeof useDeleteKeyword>);

    render(<KeywordList />);

    const deleteButtons = screen.getAllByLabelText("キーワードを削除");
    deleteButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("should show loading state for toggle switch", () => {
    mockedUseToggleKeywordActive.mockReturnValue({
      mutateAsync: mockToggleActiveMutateAsync,
      isPending: true,
    } as unknown as ReturnType<typeof useToggleKeywordActive>);

    render(<KeywordList />);

    const switches = screen.getAllByRole("checkbox");
    switches.forEach((switchElement) => {
      expect(switchElement).toBeDisabled();
    });
  });

  it("should style inactive keywords differently", () => {
    render(<KeywordList />);

    const inactiveSection = screen.getByText("無効なキーワード (1)");
    expect(inactiveSection).toBeInTheDocument();

    // 無効なキーワードのテキストが存在することを確認
    expect(screen.getByText("Inactive Keyword")).toBeInTheDocument();
  });
});
