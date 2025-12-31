import "@testing-library/jest-dom";
import { vi } from "vitest";

// console.errorをモック
vi.spyOn(console, "error").mockImplementation(() => {});
