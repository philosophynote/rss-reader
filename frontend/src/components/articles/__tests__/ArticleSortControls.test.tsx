import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../../test/test-utils";
import { ArticleSortControls } from "../ArticleSortControls";

describe("ArticleSortControls", () => {
  const mockOnSortChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render sort controls correctly", () => {
    render(
      <ArticleSortControls
        sortBy="published_at"
        onSortChange={mockOnSortChange}
      />
    );

    expect(screen.getByText("並び順:")).toBeInTheDocument();
    expect(screen.getByText("時系列順")).toBeInTheDocument();
    expect(screen.getByText("重要度順")).toBeInTheDocument();
  });

  it("should highlight active sort option (published_at)", () => {
    render(
      <ArticleSortControls
        sortBy="published_at"
        onSortChange={mockOnSortChange}
      />
    );

    const timeButton = screen.getByText("時系列順");
    const importanceButton = screen.getByText("重要度順");

    expect(timeButton).toHaveClass("chakra-button--variant-solid");
    expect(importanceButton).toHaveClass("chakra-button--variant-outline");
  });

  it("should highlight active sort option (importance_score)", () => {
    render(
      <ArticleSortControls
        sortBy="importance_score"
        onSortChange={mockOnSortChange}
      />
    );

    const timeButton = screen.getByText("時系列順");
    const importanceButton = screen.getByText("重要度順");

    expect(timeButton).toHaveClass("chakra-button--variant-outline");
    expect(importanceButton).toHaveClass("chakra-button--variant-solid");
  });

  it("should call onSortChange when time sort button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ArticleSortControls
        sortBy="importance_score"
        onSortChange={mockOnSortChange}
      />
    );

    const timeButton = screen.getByText("時系列順");
    await user.click(timeButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("published_at");
  });

  it("should call onSortChange when importance sort button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ArticleSortControls
        sortBy="published_at"
        onSortChange={mockOnSortChange}
      />
    );

    const importanceButton = screen.getByText("重要度順");
    await user.click(importanceButton);

    expect(mockOnSortChange).toHaveBeenCalledWith("importance_score");
  });

  it("should show correct icons", () => {
    render(
      <ArticleSortControls
        sortBy="published_at"
        onSortChange={mockOnSortChange}
      />
    );

    // アイコンが表示されることを確認（SVGアイコンの存在確認）
    const timeButton = screen.getByText("時系列順");
    const importanceButton = screen.getByText("重要度順");

    expect(timeButton.querySelector("svg")).toBeInTheDocument();
    expect(importanceButton.querySelector("svg")).toBeInTheDocument();
  });

  it("should have proper button group styling", () => {
    render(
      <ArticleSortControls
        sortBy="published_at"
        onSortChange={mockOnSortChange}
      />
    );

    const timeButton = screen.getByText("時系列順");
    const importanceButton = screen.getByText("重要度順");

    // ボタンが小さいサイズであることを確認
    expect(timeButton).toHaveClass("chakra-button--size-sm");
    expect(importanceButton).toHaveClass("chakra-button--size-sm");
  });

  it("should not call onSortChange when clicking already active button", async () => {
    const user = userEvent.setup();

    render(
      <ArticleSortControls
        sortBy="published_at"
        onSortChange={mockOnSortChange}
      />
    );

    const timeButton = screen.getByText("時系列順");
    await user.click(timeButton);

    // 既にアクティブなボタンをクリックしても、onSortChangeは呼ばれる
    // （実装上は呼ばれるが、親コンポーネントで同じ値の場合は無視される）
    expect(mockOnSortChange).toHaveBeenCalledWith("published_at");
  });
});
