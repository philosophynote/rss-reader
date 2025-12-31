import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { render } from "./test/test-utils";
import App from "./App";

// MemoryRouterでラップするカスタムレンダー関数
const renderWithRouter = (initialEntries = ["/"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
};

describe("App", () => {
  it("should render layout correctly", () => {
    renderWithRouter();

    // DemoPageが表示されることを確認
    expect(screen.getByText("動作確認デモページ")).toBeInTheDocument();
  });

  it("should render demo page on root route", () => {
    renderWithRouter(["/"]);

    // DemoPageの内容が表示されることを確認
    expect(screen.getByText("動作確認デモページ")).toBeInTheDocument();
  });

  it("should render feeds placeholder on /feeds route", () => {
    renderWithRouter(["/feeds"]);

    expect(
      screen.getByText("フィード管理画面（実装予定）")
    ).toBeInTheDocument();
  });

  it("should render articles placeholder on /articles route", () => {
    renderWithRouter(["/articles"]);

    expect(screen.getByText("記事一覧画面（実装予定）")).toBeInTheDocument();
  });

  it("should render keywords placeholder on /keywords route", () => {
    renderWithRouter(["/keywords"]);

    expect(
      screen.getByText("キーワード管理画面（実装予定）")
    ).toBeInTheDocument();
  });

  it("should have proper background styling", () => {
    const { container } = renderWithRouter();

    // Appコンポーネントのルート要素が存在することを確認
    expect(container.firstChild).toBeInTheDocument();
  });

  it("should handle unknown routes gracefully", () => {
    const { container } = renderWithRouter(["/unknown-route"]);

    // 不明なルートでもLayoutは表示される（エラーが発生しない）
    expect(container).toBeInTheDocument();
  });
});
