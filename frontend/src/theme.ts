import { createSystem, defaultConfig } from "@chakra-ui/react";

// Chakra UI v3のテーマシステムを作成
export const system = createSystem(defaultConfig);

// 後方互換性のためのエクスポート
export const theme = system;
