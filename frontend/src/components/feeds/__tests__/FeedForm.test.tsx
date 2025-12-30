import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FeedForm } from "../FeedForm";
import { useCreateFeed } from "../../../hooks";

// フックをモック
vi.mock("../../../hooks", () => ({
  useCreateFeed: vi.fn(),
}));

const mockedUseCreateFeed = vi.mocked(useCreateFeed);

// テスト用のプロバイダー
function TestProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ChakraProvider>
  );
}

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
    } as any);
  });

  it("should render form fields correctly", () => {
    render(
      <TestProvider>
        <FeedForm />
      </TestProvider>
    );

    expect(screen.getByLabelText("フィードURL")).toBeInTheDocument();
    expect(screen.getByLabelText("フォルダ（任意）")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "フィードを追加" })
    ).toBeInTheDocument();
  });

  it("should show validation error for empty URL", async () => {
    const user = userEvent.setup();

    render(
      <TestProvider>
        <FeedForm />
      </TestProvider>
    );

    const submitButton = screen.getByRole("button", { name: "フィードを追加" });
    await user.click(submitButton);

    expect(screen.getByText("フィードURLは必須です")).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("should show validation error for invalid URL", async () => {
    const user = userEvent.setup();

    render(
      <TestProvider>
        <FeedForm />
      </TestProvider>
    );

    const urlInput = screen.getByLabelText("フィードURL");
    await user.type(urlInput, "invalid-url");

    const submitButton = screen.getByRole("button", { name: "フィードを追加" });
    await user.click(submitButton);

    expect(screen.getByText("有効なURLを入力してください")).toBeInTheDocument();
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

    render(
      <TestProvider>
        <FeedForm onSuccess={mockOnSuccess} />
      </TestProvider>
    );

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

    render(
      <TestProvider>
        <FeedForm />
      </TestProvider>
    );

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

  it("should show loading state during submission", async () => {
    const user = userEvent.setup();

    mockedUseCreateFeed.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
      error: null,
    } as any);

    render(
      <TestProvider>
        <FeedForm />
      </TestProvider>
    );

    const submitButton = screen.getByRole("button", { name: "追加中..." });
    expect(submitButton).toBeDisabled();

    const urlInput = screen.getByLabelText("フィードURL");
    expect(urlInput).toBeDisabled();
  });

  it("should show cancel button when onCancel is provided", () => {
    render(
      <TestProvider>
        <FeedForm onCancel={mockOnCancel} />
      </TestProvider>
    );

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("should clear validation errors when user types", async () => {
    const user = userEvent.setup();

    render(
      <TestProvider>
        <FeedForm />
      </TestProvider>
    );

    // まずエラーを表示させる
    const submitButton = screen.getByRole("button", { name: "フィードを追加" });
    await user.click(submitButton);

    expect(screen.getByText("フィードURLは必須です")).toBeInTheDocument();

    // 入力するとエラーが消える
    const urlInput = screen.getByLabelText("フィードURL");
    await user.type(urlInput, "https://example.com/feed.xml");

    expect(screen.queryByText("フィードURLは必須です")).not.toBeInTheDocument();
  });
});
