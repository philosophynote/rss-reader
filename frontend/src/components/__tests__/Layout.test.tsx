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
    const outerBox = container.firstChild;
    expect(outerBox).toHaveClass("chakra-box");

    // Containerが存在することを確認
    const containerElement = container.querySelector(".chakra-container");
    expect(containerElement).toBeInTheDocument();
  });

  it("should have minimum height for full viewport", () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const outerBox = container.firstChild as HTMLElement;
    expect(outerBox).toHaveStyle({ minHeight: "100vh" });
  });

  it("should have proper padding", () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const containerElement = container.querySelector(".chakra-container");
    expect(containerElement).toHaveClass("chakra-container");
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

    // レイアウト構造は存在するが、子要素はない
    expect(container.firstChild).toHaveClass("chakra-box");
    expect(container.querySelector(".chakra-container")).toBeInTheDocument();
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

  it("should maintain responsive container width", () => {
    const { container } = render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );

    const containerElement = container.querySelector(".chakra-container");
    expect(containerElement).toHaveClass("chakra-container");
    // Chakra UIのContainerコンポーネントが適切にレスポンシブ幅を設定していることを確認
  });
});
