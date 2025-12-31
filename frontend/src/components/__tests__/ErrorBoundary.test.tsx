import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { render } from "../../test/test-utils";
import { ErrorBoundary, AuthErrorBoundary } from "../ErrorBoundary";
import { ApiAuthError, ApiError } from "../../api";

// テスト用のエラーを投げるコンポーネント
function ThrowError({ error }: { error?: Error }) {
  if (error) {
    throw error;
  }
  return <div>正常なコンポーネント</div>;
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
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("正常なコンポーネント")).toBeInTheDocument();
  });

  it("should render error display when error occurs", () => {
    const error = new Error("テストエラー");

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText("アプリケーションエラー")).toBeInTheDocument();
    // Alert.Description内のテキストを確認（複数存在する場合があるため最初の要素を取得）
    const errorMessages = screen.getAllByText("テストエラー");
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it("should render auth error display for ApiAuthError", () => {
    const error = new ApiAuthError("認証に失敗しました", 401);

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText("認証エラー")).toBeInTheDocument();
    // Alert.Description内のテキストを確認（複数存在する場合があるため最初の要素を取得）
    const errorMessages = screen.getAllByText("認証に失敗しました");
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it("should render API error display for ApiError", () => {
    const error = new ApiError("サーバーエラーが発生しました", 500);

    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );

    expect(screen.getByText("API通信エラー")).toBeInTheDocument();
    // Alert.Description内のテキストを確認（複数存在する場合があるため最初の要素を取得）
    const errorMessages = screen.getAllByText("サーバーエラーが発生しました");
    expect(errorMessages.length).toBeGreaterThan(0);
  });

  it("should allow retry functionality", () => {
    // エラーの状態を管理
    let shouldThrow = true;
    const ConditionalThrowError = () => {
      if (shouldThrow) {
        throw new Error("テストエラー");
      }
      return <div>正常なコンポーネント</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <ConditionalThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("アプリケーションエラー")).toBeInTheDocument();
    // Alert.Description内のテキストを確認（複数存在する場合があるため最初の要素を取得）
    const errorMessages = screen.getAllByText("テストエラー");
    expect(errorMessages.length).toBeGreaterThan(0);

    // エラーを解消してから再試行ボタンをクリック
    shouldThrow = false;
    fireEvent.click(screen.getByText("再試行"));

    // エラーなしで再レンダリング
    rerender(
      <ErrorBoundary>
        <ConditionalThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("正常なコンポーネント")).toBeInTheDocument();
  });

  it("should show error details when toggled", () => {
    const error = new Error("テストエラー");

    render(
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

    render(
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
    render(
      <AuthErrorBoundary>
        <ThrowError />
      </AuthErrorBoundary>
    );

    expect(screen.getByText("正常なコンポーネント")).toBeInTheDocument();
  });

  it("should render auth-specific error message when error occurs", () => {
    const error = new Error("テストエラー");

    render(
      <AuthErrorBoundary>
        <ThrowError error={error} />
      </AuthErrorBoundary>
    );

    expect(screen.getByText("認証が必要です")).toBeInTheDocument();
    // テキストが複数の要素に分割されている可能性があるため、正規表現を使用
    expect(
      screen.getByText(/API Keyが設定されていないか、無効です/)
    ).toBeInTheDocument();
  });
});
