import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../../test/test-utils";
import { KeywordForm } from "../KeywordForm";
import { useCreateKeyword } from "../../../hooks";

// フックをモック
vi.mock("../../../hooks", () => ({
  useCreateKeyword: vi.fn(),
}));

const mockedUseCreateKeyword = vi.mocked(useCreateKeyword);

describe("KeywordForm", () => {
  const mockMutateAsync = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseCreateKeyword.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    } as any);
  });

  it("should render form fields correctly", () => {
    render(<KeywordForm />);

    expect(screen.getByLabelText("キーワード")).toBeInTheDocument();
    expect(screen.getByLabelText("重み（任意）")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "キーワードを追加" })
    ).toBeInTheDocument();
  });

  it("should show validation error for empty keyword", async () => {
    const { container } = render(<KeywordForm />);

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    // Field.ErrorTextが表示されるかを確認
    await waitFor(() => {
      expect(screen.getByText("キーワードは必須です")).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should show validation error for short keyword", async () => {
    const user = userEvent.setup();

    render(<KeywordForm />);

    const keywordInput = screen.getByLabelText("キーワード");
    await user.type(keywordInput, "a");

    const submitButton = screen.getByRole("button", {
      name: "キーワードを追加",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("キーワードは2文字以上で入力してください")
      ).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should show validation error for long keyword", async () => {
    const user = userEvent.setup();

    render(<KeywordForm />);

    const keywordInput = screen.getByLabelText("キーワード");
    await user.type(keywordInput, "a".repeat(51)); // 51文字

    const submitButton = screen.getByRole("button", {
      name: "キーワードを追加",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("キーワードは50文字以内で入力してください")
      ).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      keyword_id: "1",
      text: "Python",
      weight: 1.5,
      is_active: true,
    });

    render(<KeywordForm onSuccess={mockOnSuccess} />);

    const keywordInput = screen.getByLabelText("キーワード");
    const weightInput = screen.getByRole("spinbutton");

    await user.clear(keywordInput);
    await user.type(keywordInput, "Python");

    // NumberInputの場合は全選択してから入力
    await user.tripleClick(weightInput);
    await user.keyboard("1.5");

    const submitButton = screen.getByRole("button", {
      name: "キーワードを追加",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        text: "Python",
        weight: 1.5,
      });
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("should submit form with default weight", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      keyword_id: "1",
      text: "JavaScript",
      weight: 1.0,
      is_active: true,
    });

    render(<KeywordForm />);

    const keywordInput = screen.getByLabelText("キーワード");
    await user.type(keywordInput, "JavaScript");

    const submitButton = screen.getByRole("button", {
      name: "キーワードを追加",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        text: "JavaScript",
        weight: 1.0,
      });
    });
  });

  it("should show validation error for weight too low", async () => {
    const user = userEvent.setup();

    render(<KeywordForm />);

    const keywordInput = screen.getByLabelText("キーワード");
    const weightInput = screen.getByRole("spinbutton");

    await user.type(keywordInput, "Python");

    // NumberInputの場合は全選択してから入力
    await user.tripleClick(weightInput);
    await user.keyboard("0.05");

    const submitButton = screen.getByRole("button", {
      name: "キーワードを追加",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("重みは0.1以上で入力してください")
      ).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should show validation error for weight too high", async () => {
    const user = userEvent.setup();

    render(<KeywordForm />);

    const keywordInput = screen.getByLabelText("キーワード");
    const weightInput = screen.getByRole("spinbutton");

    await user.type(keywordInput, "Python");

    // NumberInputの場合は全選択してから入力
    await user.tripleClick(weightInput);
    await user.keyboard("15.0");

    const submitButton = screen.getByRole("button", {
      name: "キーワードを追加",
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("重みは10.0以下で入力してください")
      ).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should show loading state during submission", () => {
    mockedUseCreateKeyword.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
    } as any);

    render(<KeywordForm />);

    const submitButton = screen.getByRole("button", { name: "追加中..." });
    expect(submitButton).toBeDisabled();

    const keywordInput = screen.getByLabelText("キーワード");
    expect(keywordInput).toBeDisabled();
  });

  it("should show cancel button when onCancel is provided", async () => {
    const user = userEvent.setup();

    render(<KeywordForm onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    expect(cancelButton).toBeInTheDocument();

    await user.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("should clear validation errors when user types", async () => {
    const user = userEvent.setup();
    const { container } = render(<KeywordForm />);

    // まずエラーを表示させる
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("キーワードは必須です")).toBeInTheDocument();
    });

    // 入力するとエラーが消える
    const keywordInput = screen.getByLabelText("キーワード");
    await user.type(keywordInput, "Python");

    await waitFor(() => {
      expect(
        screen.queryByText("キーワードは必須です")
      ).not.toBeInTheDocument();
    });
  });
});
