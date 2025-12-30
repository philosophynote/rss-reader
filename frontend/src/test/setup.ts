import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Vitestテスト環境のセットアップファイル
// グローバルなテスト設定やモックを定義します

// 環境変数のモック
vi.stubEnv("VITE_API_BASE_URL", "http://localhost:8000");
vi.stubEnv("VITE_API_KEY", "test-api-key");

// ResizeObserverのモック（Chakra UIで必要）
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// matchMediaのモック
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
