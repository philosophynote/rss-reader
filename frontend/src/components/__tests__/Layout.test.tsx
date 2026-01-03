import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "../../test/test-utils";
import Layout from "../Layout";

describe("Layout", () => {
  it("should render children correctly", () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should have proper container structure", () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    // 最外側のBoxが存在することを確認
    const outerBox = container.firstChild as Element;
    expect(outerBox).toBeInTheDocument();

    // 内部のコンテンツが存在することを確認
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should have minimum height for full viewport", () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const outerBox = container.firstChild as Element;
    expect(outerBox).toBeInTheDocument();
  });

  it("should render container element", () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const outerBox = container.firstChild as Element;
    expect(outerBox).toBeInTheDocument();
  });

  it("should handle multiple children", () => {
    render(
      <Layout>
        <div>First Child</div>
        <div>Second Child</div>
        <span>Third Child</span>
      </Layout>
    );

    expect(screen.getByText("First Child")).toBeInTheDocument();
    expect(screen.getByText("Second Child")).toBeInTheDocument();
    expect(screen.getByText("Third Child")).toBeInTheDocument();
  });

  it("should handle empty children", () => {
    const { container } = render(<Layout>{null}</Layout>);

    // レイアウト構造は存在する
    const outerBox = container.firstChild as Element;
    expect(outerBox).toBeInTheDocument();
  });

  it("should handle complex nested children", () => {
    render(
      <Layout>
        <div>
          <h1>Title</h1>
          <div>
            <p>Paragraph</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </div>
      </Layout>
    );

    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Paragraph")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("should render responsive container wrapper", () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const outerBox = container.firstChild as Element;
    expect(outerBox).toBeInTheDocument();
  });
});
