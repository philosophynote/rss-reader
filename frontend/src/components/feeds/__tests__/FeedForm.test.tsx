import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../../test/test-utils";
import { FeedForm } from "../FeedForm";
import { useCreateFeed } from "../../../hooks";

// フックをモック
vi.mock("../../../hooks", () => ({
  useCreateFeed: vi.fn(),
}));

const mockedUseCreateFeed = vi.mocked(useCreateFeed);

describe("FeedForm", () => {
  const mockMutateAsync = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseCreateFeed.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      error: null,
    } as unknown as ReturnType<typeof useCreateFeed>);
  });

  it("should render form fields correctly", () => {
    render(<FeedForm />);

    expect(screen.getByLabelText("フィードURL")).toBeInTheDocument();
    expect(screen.getByLabelText("フォルダ（任意）")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "フィードを追加" })
    ).toBeInTheDocument();
  });

  it("should show validation error for empty URL", async () => {
    const { container } = render(<FeedForm />);

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("フィードURLは必須です")).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should show validation error for invalid URL", async () => {
    const user = userEvent.setup();

    const { container } = render(<FeedForm />);

    const urlInput = screen.getByLabelText("フィードURL");
    await user.type(urlInput, "invalid-url");

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText("有効なURLを入力してください")
      ).toBeInTheDocument();
    });
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should submit form with valid data", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      feed_id: "1",
      url: "https://example.com/feed.xml",
      title: "Test Feed",
      is_active: true,
    });

    render(<FeedForm onSuccess={mockOnSuccess} />);

    const urlInput = screen.getByLabelText("フィードURL");
    const folderInput = screen.getByLabelText("フォルダ（任意）");

    await user.type(urlInput, "https://example.com/feed.xml");
    await user.type(folderInput, "Tech");

    const submitButton = screen.getByRole("button", { name: "フィードを追加" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        url: "https://example.com/feed.xml",
        folder: "Tech",
      });
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });

  it("should submit form without folder", async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      feed_id: "1",
      url: "https://example.com/feed.xml",
      title: "Test Feed",
      is_active: true,
    });

    render(<FeedForm />);

    const urlInput = screen.getByLabelText("フィードURL");
    await user.type(urlInput, "https://example.com/feed.xml");

    const submitButton = screen.getByRole("button", { name: "フィードを追加" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        url: "https://example.com/feed.xml",
        folder: undefined,
      });
    });
  });

  it("should show loading state during submission", () => {
    mockedUseCreateFeed.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
    } as unknown as ReturnType<typeof useCreateFeed>);

    render(<FeedForm />);

    const submitButton = screen.getByRole("button", { name: "追加中..." });
    expect(submitButton).toBeDisabled();

    const urlInput = screen.getByLabelText("フィードURL");
    expect(urlInput).toBeDisabled();
  });

  it("should show cancel button when onCancel is provided", () => {
    render(<FeedForm onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("should clear validation errors when user types", async () => {
    const user = userEvent.setup();

    const { container } = render(<FeedForm />);

    // まずエラーを表示させる
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("フィードURLは必須です")).toBeInTheDocument();
    });

    // 入力するとエラーが消える
    const urlInput = screen.getByLabelText("フィードURL");
    await user.type(urlInput, "https://example.com/feed.xml");

    await waitFor(() => {
      expect(
        screen.queryByText("フィードURLは必須です")
      ).not.toBeInTheDocument();
    });
  });
});
