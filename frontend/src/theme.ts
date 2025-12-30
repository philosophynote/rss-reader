import { createSystem, defaultConfig } from "@chakra-ui/react";

// Chakra UI v3のテーマシステムを作成
export const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      fonts: {
        heading: { value: `'Inter', sans-serif` },
        body: { value: `'Inter', sans-serif` },
      },
    },
  },
});

// 後方互換性のためのエクスポート
export const theme = system;
export default system;
