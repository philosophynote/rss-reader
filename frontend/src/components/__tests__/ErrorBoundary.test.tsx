import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { ErrorBoundary, AuthErrorBoundary } from "../ErrorBoundary";
import { ApiAuthError, ApiError } from "../../api";

// テスト用のエラーを投げるコンポーネント
function ThrowError({ error }: { error?: Error }) {
  if (error) {
    throw error;
  }
  return <div>正常なコンポーネント</div>;
}

// Chakra UIでラップするヘルパー
function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider>{ui}</ChakraProvider>);
}

describe("ErrorBoundary", () => {
  // コンソールエラーを抑制
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("should render children when no error occurs", () => {
    renderWithChakra(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("正常なコンポーネント")).toBeInTheDocument();
  });

  it("should render error display when error occurs", () => {
    const error = new Error("テストエラー");

    renderWithChakra(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText("アプリケーションエラー")).toBeInTheDocument();
    expect(screen.getByText("テストエラー")).toBeInTheDocument();
  });

  it("should render auth error display for ApiAuthError", () => {
    const error = new ApiAuthError("認証に失敗しました", 401);

    renderWithChakra(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText("認証エラー")).toBeInTheDocument();
    expect(screen.getByText("認証に失敗しました")).toBeInTheDocument();
  });

  it("should render API error display for ApiError", () => {
    const error = new ApiError("サーバーエラーが発生しました", 500);

    renderWithChakra(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText("API通信エラー")).toBeInTheDocument();
    expect(
      screen.getByText("サーバーエラーが発生しました")
    ).toBeInTheDocument();
  });

  it("should allow retry functionality", () => {
    const error = new Error("テストエラー");

    const { rerender } = renderWithChakra(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText("アプリケーションエラー")).toBeInTheDocument();

    // 再試行ボタンをクリック
    fireEvent.click(screen.getByText("再試行"));

    // エラーなしで再レンダリング
    rerender(
      <ChakraProvider>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </ChakraProvider>
    );

    expect(screen.getByText("正常なコンポーネント")).toBeInTheDocument();
  });

  it("should show error details when toggled", () => {
    const error = new Error("テストエラー");

    renderWithChakra(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    // 詳細を表示ボタンをクリック
    fireEvent.click(screen.getByText("詳細を表示"));

    expect(screen.getByText("エラー名:")).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText("エラーメッセージ:")).toBeInTheDocument();
  });

  it("should render custom fallback when provided", () => {
    const error = new Error("テストエラー");
    const customFallback = <div>カスタムエラー表示</div>;

    renderWithChakra(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText("カスタムエラー表示")).toBeInTheDocument();
  });
});

describe("AuthErrorBoundary", () => {
  // コンソールエラーを抑制
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("should render children when no error occurs", () => {
    renderWithChakra(
      <AuthErrorBoundary>
        <ThrowError />
      </AuthErrorBoundary>
    );

    expect(screen.getByText("正常なコンポーネント")).toBeInTheDocument();
  });

  it("should render auth-specific error message when error occurs", () => {
    const error = new Error("テストエラー");

    renderWithChakra(
      <AuthErrorBoundary>
        <ThrowError error={error} />
      </AuthErrorBoundary>
    );

    expect(screen.getByText("認証が必要です")).toBeInTheDocument();
    expect(
      screen.getByText(/API Keyが設定されていないか、無効です/)
    ).toBeInTheDocument();
  });
});
