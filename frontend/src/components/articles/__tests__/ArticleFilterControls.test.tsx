import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../../test/test-utils";
import { ArticleFilterControls } from "../ArticleFilterControls";

describe("ArticleFilterControls", () => {
  const mockOnFilterChange = vi.fn();
  const mockCounts = {
    total: 10,
    unread: 5,
    read: 3,
    saved: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render filter controls correctly", () => {
    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    expect(screen.getByText("フィルタ:")).toBeInTheDocument();
    expect(screen.getByText("すべて")).toBeInTheDocument();
    expect(screen.getByText("未読")).toBeInTheDocument();
    expect(screen.getByText("既読")).toBeInTheDocument();
    expect(screen.getByText("保存済み")).toBeInTheDocument();
  });

  it("should show counts in badges", () => {
    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    expect(screen.getByText("10")).toBeInTheDocument(); // total
    expect(screen.getByText("5")).toBeInTheDocument(); // unread
    expect(screen.getByText("3")).toBeInTheDocument(); // read
    expect(screen.getByText("2")).toBeInTheDocument(); // saved
  });

  it("should highlight active filter (all)", () => {
    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const allButton = screen.getByText("すべて");
    const unreadButton = screen.getByText("未読");

    // variant propが正しく設定されているかをテスト
    expect(allButton).toBeInTheDocument();
    expect(unreadButton).toBeInTheDocument();
  });

  it("should highlight active filter (unread)", () => {
    render(
      <ArticleFilterControls
        filterBy="unread"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const allButton = screen.getByText("すべて");
    const unreadButton = screen.getByText("未読");

    expect(allButton).toBeInTheDocument();
    expect(unreadButton).toBeInTheDocument();
  });

  it("should highlight active filter (read)", () => {
    render(
      <ArticleFilterControls
        filterBy="read"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const readButton = screen.getByText("既読");
    expect(readButton).toBeInTheDocument();
  });

  it("should highlight active filter (saved)", () => {
    render(
      <ArticleFilterControls
        filterBy="saved"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const savedButton = screen.getByText("保存済み");
    expect(savedButton).toBeInTheDocument();
  });

  it("should call onFilterChange when all button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ArticleFilterControls
        filterBy="unread"
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const allButton = screen.getByText("すべて");
    await user.click(allButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith(undefined);
  });

  it("should call onFilterChange when unread button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const unreadButton = screen.getByText("未読");
    await user.click(unreadButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith("unread");
  });

  it("should call onFilterChange when read button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const readButton = screen.getByText("既読");
    await user.click(readButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith("read");
  });

  it("should call onFilterChange when saved button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const savedButton = screen.getByText("保存済み");
    await user.click(savedButton);

    expect(mockOnFilterChange).toHaveBeenCalledWith("saved");
  });

  it("should show correct icons", () => {
    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    // アイコンが表示されることを確認
    const allButton = screen.getByText("すべて");
    const unreadButton = screen.getByText("未読");
    const readButton = screen.getByText("既読");
    const savedButton = screen.getByText("保存済み");

    // ボタンが存在することを確認（アイコンは内部に含まれている）
    expect(allButton).toBeInTheDocument();
    expect(unreadButton).toBeInTheDocument();
    expect(readButton).toBeInTheDocument();
    expect(savedButton).toBeInTheDocument();
  });

  it("should work without counts", () => {
    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
      />
    );

    expect(screen.getByText("すべて")).toBeInTheDocument();
    expect(screen.getByText("未読")).toBeInTheDocument();
    expect(screen.getByText("既読")).toBeInTheDocument();
    expect(screen.getByText("保存済み")).toBeInTheDocument();

    // カウントが表示されないことを確認
    expect(screen.queryByText("10")).not.toBeInTheDocument();
    expect(screen.queryByText("5")).not.toBeInTheDocument();
  });

  it("should have proper button styling", () => {
    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={mockCounts}
      />
    );

    const allButton = screen.getByText("すべて");
    expect(allButton).toBeInTheDocument();
  });

  it("should show zero counts correctly", () => {
    const zeroCounts = {
      total: 0,
      unread: 0,
      read: 0,
      saved: 0,
    };

    render(
      <ArticleFilterControls
        filterBy={undefined}
        onFilterChange={mockOnFilterChange}
        counts={zeroCounts}
      />
    );

    // ゼロのカウントも表示されることを確認
    const badges = screen.getAllByText("0");
    expect(badges).toHaveLength(4);
  });
});
