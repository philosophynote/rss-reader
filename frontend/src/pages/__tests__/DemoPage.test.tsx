import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "../../test/test-utils";
import { DemoPage } from "../DemoPage";

// window.alertをモック
vi.stubGlobal("alert", vi.fn());

describe("DemoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render page title and description", () => {
    render(<DemoPage />);

    expect(screen.getByText("動作確認デモページ")).toBeInTheDocument();
    expect(
      screen.getByText(/実装済みのコンポーネントを確認できます/)
    ).toBeInTheDocument();
  });

  it("should render tabs correctly", () => {
    render(<DemoPage />);

    expect(screen.getByRole("tab", { name: "フォーム" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "バッジ" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "このページについて" })).toBeInTheDocument();
  });

  it("should show forms tab by default", () => {
    render(<DemoPage />);

    expect(screen.getByText("フィード追加フォーム")).toBeInTheDocument();
    expect(screen.getByText("キーワード追加フォーム")).toBeInTheDocument();
  });

  it("should show feed form in forms tab", () => {
    render(<DemoPage />);

    expect(screen.getByLabelText("フィードURL")).toBeInTheDocument();
    expect(screen.getByLabelText("フォルダ（任意）")).toBeInTheDocument();
    expect(screen.getByText("フィードを追加")).toBeInTheDocument();
  });

  it("should show keyword form in forms tab", () => {
    render(<DemoPage />);

    expect(screen.getByLabelText("キーワード")).toBeInTheDocument();
    expect(screen.getByLabelText("重み（任意）")).toBeInTheDocument();
    expect(screen.getByText("キーワードを追加")).toBeInTheDocument();
  });

  it("should switch to badges tab when clicked", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    const badgesTab = screen.getByRole("tab", { name: "バッジ" });
    await user.click(badgesTab);

    expect(screen.getByText("記事ステータスバッジ")).toBeInTheDocument();
    expect(screen.getByText("高重要度の記事")).toBeInTheDocument();
    expect(
      screen.getByText("中重要度の記事（既読・保存済み）")
    ).toBeInTheDocument();
    expect(screen.getByText("低重要度の記事（既読）")).toBeInTheDocument();
  });

  it("should show article status badges in badges tab", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    const badgesTab = screen.getByRole("tab", { name: "バッジ" });
    await user.click(badgesTab);

    // 記事ステータスバッジが表示されることを確認
    const unreadBadges = screen.getAllByText("未読");
    expect(unreadBadges.length).toBeGreaterThan(0);

    const readBadges = screen.getAllByText("既読");
    expect(readBadges.length).toBeGreaterThan(0);

    const savedBadges = screen.getAllByText("保存済み");
    expect(savedBadges.length).toBeGreaterThan(0);

    // 重要度スコアが表示されることを確認
    expect(screen.getByText("0.85")).toBeInTheDocument();
    expect(screen.getByText("0.55")).toBeInTheDocument();
    expect(screen.getByText("0.25")).toBeInTheDocument();
  });

  it("should switch to about tab when clicked", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    const aboutTab = screen.getByRole("tab", { name: "このページについて" });
    await user.click(aboutTab);

    expect(screen.getByRole("heading", { name: "このページについて" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "実装状況" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "確認できる機能" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "技術スタック" })).toBeInTheDocument();
  });

  it("should show implementation status in about tab", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    const aboutTab = screen.getByRole("tab", { name: "このページについて" });
    await user.click(aboutTab);

    expect(screen.getByText("フロントエンドUI実装")).toBeInTheDocument();
    expect(screen.getByText("Chakra UI v3 移行")).toBeInTheDocument();
    expect(screen.getByText("バックエンドAPI")).toBeInTheDocument();
    expect(
      screen.getByText("インフラストラクチャ（AWS CDK）")
    ).toBeInTheDocument();
  });

  it("should show technology stack in about tab", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    const aboutTab = screen.getByRole("tab", { name: "このページについて" });
    await user.click(aboutTab);

    expect(screen.getByText("• React 19.2.3")).toBeInTheDocument();
    expect(screen.getByText("• TypeScript 5.9")).toBeInTheDocument();
    expect(screen.getByText("• Chakra UI v3.30")).toBeInTheDocument();
    expect(screen.getByText("• TanStack Query v5")).toBeInTheDocument();
  });

  it("should show checkable features in about tab", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    const aboutTab = screen.getByRole("tab", { name: "このページについて" });
    await user.click(aboutTab);

    expect(
      screen.getByText("✅ Chakra UI v3 コンポーネント表示")
    ).toBeInTheDocument();
    expect(screen.getByText("✅ フォームバリデーション")).toBeInTheDocument();
    expect(screen.getByText("✅ レスポンシブデザイン")).toBeInTheDocument();
    expect(
      screen.getByText("⚠️ API通信（バックエンド未実装のためエラーになります）")
    ).toBeInTheDocument();
  });

  it("should show status badges with correct colors", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    const aboutTab = screen.getByRole("tab", { name: "このページについて" });
    await user.click(aboutTab);

    // 完了バッジ（緑）
    const completedBadges = screen.getAllByText("完了");
    expect(completedBadges.length).toBe(3);

    // 未実装バッジ（黄）
    const pendingBadges = screen.getAllByText("未実装");
    expect(pendingBadges.length).toBe(2);
  });

  it("should handle form success callbacks", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    // フィードフォームのキャンセルボタンをクリック
    const feedCancelButton = screen.getAllByText("キャンセル")[0];
    await user.click(feedCancelButton);

    expect(window.alert).toHaveBeenCalledWith("キャンセルされました");
  });

  it("should handle keyword form callbacks", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    // キーワードフォームのキャンセルボタンをクリック
    const keywordCancelButton = screen.getAllByText("キャンセル")[1];
    await user.click(keywordCancelButton);

    expect(window.alert).toHaveBeenCalledWith("キャンセルされました");
  });

  it("should show demo articles with different states", async () => {
    const user = userEvent.setup();

    render(<DemoPage />);

    const badgesTab = screen.getByText("バッジ");
    await user.click(badgesTab);

    // 3つのデモ記事が表示されることを確認
    const articleTitles = [
      "高重要度の記事",
      "中重要度の記事（既読・保存済み）",
      "低重要度の記事（既読）",
    ];

    articleTitles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });
});
