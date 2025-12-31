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

    // Layoutコンポーネントが適用されていることを確認
    const appContainer = document.querySelector(".chakra-box");
    expect(appContainer).toBeInTheDocument();
  });

  it("should render demo page on root route", () => {
    renderWithRouter(["/"]);

    // DemoPageの内容が表示されることを確認
    expect(screen.getByText("RSS Reader Demo")).toBeInTheDocument();
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
    renderWithRouter();

    const appContainer = document.querySelector(".chakra-box");
    expect(appContainer).toHaveStyle({
      minHeight: "100vh",
    });
  });

  it("should handle unknown routes gracefully", () => {
    renderWithRouter(["/unknown-route"]);

    // 不明なルートでもLayoutは表示される
    const appContainer = document.querySelector(".chakra-box");
    expect(appContainer).toBeInTheDocument();
  });
});
