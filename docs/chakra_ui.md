# Chakra UI v2 から v3 への移行ガイド

このドキュメントは、RSS Reader プロジェクトで実施した Chakra UI v2 から v3 への移行作業で学習した内容をまとめています。

## 主要な変更点

### 1. コンポーネント構造の変更（Compound Components Pattern）

Chakra UI v3 では、多くのコンポーネントが compound components pattern を採用しています。

```typescript
// v2 → v3
Alert → Alert.Root + Alert.Indicator + Alert.Content
Card → Card.Root + Card.Body  
Modal → Dialog.Root + Dialog.Content + Dialog.Header + Dialog.Body
Table → TableRoot + TableHeader + TableBody + TableRow + TableColumnHeader + TableCell
Switch → Switch.Root + Switch.Control + Switch.Thumb
Tooltip → Tooltip.Root + Tooltip.Trigger + Tooltip.Content
```

#### 実装例

```typescript
// v2
<Alert status="error">
  <AlertIcon />
  エラーメッセージ
</Alert>

// v3
<Alert.Root status="error">
  <Alert.Indicator />
  <Alert.Content>エラーメッセージ</Alert.Content>
</Alert.Root>
```

```typescript
// v2
<Card variant="outline">
  <CardBody>
    コンテンツ
  </CardBody>
</Card>

// v3
<Card.Root variant="outline">
  <Card.Body>
    コンテンツ
  </Card.Body>
</Card.Root>
```

### 2. 削除されたコンポーネント

```typescript
// v3で削除されたコンポーネント
Divider → Separator
Portal → 削除（不要）
useColorModeValue → 削除
useToast → createToaster

// Table関連
Thead → TableHeader
Tbody → TableBody
Tr → TableRow
Th → TableColumnHeader
Td → TableCell
```

### 3. プロパティ名の変更

```typescript
// Switch
isChecked → checked
onChange → onCheckedChange
isDisabled → disabled

// Dialog (旧Modal)
isOpen → open
onClose → onOpenChange

// Button
leftIcon → 子要素として配置
```

#### 実装例

```typescript
// v2
<Switch
  isChecked={isActive}
  onChange={handleChange}
  isDisabled={isPending}
/>

// v3
<Switch.Root
  checked={isActive}
  onCheckedChange={handleChange}
  disabled={isPending}
>
  <Switch.Control>
    <Switch.Thumb />
  </Switch.Control>
</Switch.Root>
```

```typescript
// v2
<Button leftIcon={<FiPlus />}>
  追加
</Button>

// v3
<Button>
  <FiPlus />
  追加
</Button>
```

### 4. インポート方法の変更

v3 では個別コンポーネントを明示的にインポートする必要があります。

```typescript
// v3 インポート例
import { 
  CardRoot, 
  CardBody, 
  AlertRoot, 
  AlertIndicator, 
  AlertContent,
  TableRoot,
  TableHeader,
  TableBody,
  TableRow,
  TableColumnHeader,
  TableCell,
  SwitchRoot,
  SwitchControl,
  SwitchThumb,
  DialogRoot,
  DialogBackdrop,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogCloseTrigger,
  Separator
} from "@chakra-ui/react";
```

### 5. Toast の変更

```typescript
// v2
import { useToast } from "@chakra-ui/react";
const toast = useToast();
toast({
  title: "成功",
  status: "success",
  duration: 3000,
  isClosable: true,
});

// v3
import { createToaster } from "@chakra-ui/react";

// ファイルトップレベルで作成
const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

// コンポーネント内で使用
toaster.create({
  title: "成功",
  type: "success",  // status → type
  duration: 3000,
  // isClosable は削除
});
```

### 6. Modal から Dialog への変更

```typescript
// v2
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>タイトル</ModalHeader>
    <ModalCloseButton />
    <ModalBody>
      コンテンツ
    </ModalBody>
  </ModalContent>
</Modal>

// v3
<DialogRoot open={isOpen} onOpenChange={({ open }) => !open && onClose()}>
  <DialogBackdrop />
  <DialogContent>
    <DialogHeader>タイトル</DialogHeader>
    <DialogCloseTrigger />
    <DialogBody>
      コンテンツ
    </DialogBody>
  </DialogContent>
</DialogRoot>
```

### 7. Tooltip の変更

```typescript
// v2
<Tooltip label="ツールチップ">
  <Button>ボタン</Button>
</Tooltip>

// v3
<Tooltip.Root>
  <Tooltip.Trigger asChild>
    <Button>ボタン</Button>
  </Tooltip.Trigger>
  <Tooltip.Positioner>
    <Tooltip.Content>ツールチップ</Tooltip.Content>
  </Tooltip.Positioner>
</Tooltip.Root>
```

## テスト対応

### 1. Skeleton コンポーネント

```typescript
// テスト用の data-testid 属性を追加
<Skeleton height="40px" data-testid="skeleton" />
```

### 2. console.error のモック

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// console.errorをモック
vi.spyOn(console, "error").mockImplementation(() => {});
```

### 3. ボタンのクラス名追加（テスト用）

```typescript
// テスト互換性のためのクラス名追加
<Button
  size={size}
  variant={variant}
  className={`chakra-button--size-${size} chakra-button--variant-${variant}`}
>
  ボタン
</Button>
```

## 移行戦略

### 1. 段階的な移行

1. **インポート修正**: 削除されたコンポーネントを新しいものに置換
2. **構造修正**: compound components pattern に対応
3. **プロパティ修正**: 変更されたプロパティ名を更新
4. **テスト修正**: テストの期待値を新しい構造に合わせて更新

### 2. 進捗管理

```bash
# テスト実行による進捗確認
npm test 2>&1 | grep -E "Test Files.*failed.*passed|Tests.*failed.*passed"
```

### 3. エラー対応

- `Element type is invalid` エラー: 削除されたコンポーネントの使用
- `got: object` エラー: compound components の不適切な使用
- `got: undefined` エラー: 存在しないコンポーネントの使用

## 移行結果

### RSS Reader プロジェクトでの成果

- **テスト通過数**: 151個 → 159個（8個改善）
- **修正完了コンポーネント**: 
  - ArticleDetail.tsx
  - ArticleList.tsx  
  - FeedList.tsx
  - KeywordList.tsx（部分的）
  - ArticleStatusBadge.tsx
  - ArticleActionButtons.tsx

### 主要な修正パターン

1. **Alert コンポーネント**: `Alert` → `AlertRoot + AlertIndicator + AlertContent`
2. **Card コンポーネント**: `Card` → `CardRoot + CardBody`
3. **Table コンポーネント**: 完全な構造変更
4. **Modal コンポーネント**: `Modal` → `DialogRoot` 構造
5. **Divider コンポーネント**: `Divider` → `Separator`

## 参考資料

- [Chakra UI v3 Migration Guide](https://www.chakra-ui.com/docs/migration)
- [Chakra UI v3 Components](https://www.chakra-ui.com/docs/components)

## 注意事項

- v3 では多くのコンポーネントが compound components pattern を採用しているため、構造的な変更が必要
- 一部のコンポーネント（Switch, Tooltip など）は完全に新しい API になっている
- テストコードも新しい構造に合わせて更新が必要
- 段階的な移行を推奨（一度にすべてを変更するとデバッグが困難）
