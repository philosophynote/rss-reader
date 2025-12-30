import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../../test/test-utils";
import { ArticleStatusBadge } from "../ArticleStatusBadge";
import type { Article } from "../../../api";

describe("ArticleStatusBadge", () => {
  const baseArticle: Article = {
    article_id: "1",
    feed_id: "feed-1",
    link: "https://example.com/article",
    title: "Test Article",
    content: "Test content",
    published_at: "2024-01-01T00:00:00Z",
    created_at: "2024-01-01T00:00:00Z",
    is_read: false,
    is_saved: false,
    importance_score: 0.5,
  };

  it("should show unread badge for unread article", () => {
    render(<ArticleStatusBadge article={baseArticle} />);

    expect(screen.getByText("未読")).toBeInTheDocument();
    expect(screen.queryByText("既読")).not.toBeInTheDocument();
  });

  it("should show read badge for read article", () => {
    const readArticle = { ...baseArticle, is_read: true };

    render(<ArticleStatusBadge article={readArticle} />);

    expect(screen.getByText("既読")).toBeInTheDocument();
    expect(screen.queryByText("未読")).not.toBeInTheDocument();
  });

  it("should show saved badge for saved article", () => {
    const savedArticle = { ...baseArticle, is_saved: true };

    render(<ArticleStatusBadge article={savedArticle} />);

    expect(screen.getByText("保存済み")).toBeInTheDocument();
  });

  it("should not show saved badge for unsaved article", () => {
    render(<ArticleStatusBadge article={baseArticle} />);

    expect(screen.queryByText("保存済み")).not.toBeInTheDocument();
  });

  it("should show importance score by default", () => {
    render(<ArticleStatusBadge article={baseArticle} />);

    expect(screen.getByText("0.50")).toBeInTheDocument();
  });

  it("should hide importance score when showImportanceScore is false", () => {
    render(
      <ArticleStatusBadge article={baseArticle} showImportanceScore={false} />
    );

    expect(screen.queryByText("0.50")).not.toBeInTheDocument();
  });

  it("should show both read and saved badges when both are true", () => {
    const readAndSavedArticle = {
      ...baseArticle,
      is_read: true,
      is_saved: true,
    };

    render(<ArticleStatusBadge article={readAndSavedArticle} />);

    expect(screen.getByText("既読")).toBeInTheDocument();
    expect(screen.getByText("保存済み")).toBeInTheDocument();
  });

  it("should format importance score correctly", () => {
    const highScoreArticle = { ...baseArticle, importance_score: 0.856 };

    render(<ArticleStatusBadge article={highScoreArticle} />);

    expect(screen.getByText("0.86")).toBeInTheDocument();
  });

  it("should format low importance score correctly", () => {
    const lowScoreArticle = { ...baseArticle, importance_score: 0.123 };

    render(<ArticleStatusBadge article={lowScoreArticle} />);

    expect(screen.getByText("0.12")).toBeInTheDocument();
  });
});
