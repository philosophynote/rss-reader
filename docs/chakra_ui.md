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
colorScheme → colorPalette
isLoading → loading
loadingText → loadingText（変更なし）

// IconButton
icon → 子要素として配置
colorScheme → colorPalette
isLoading → loading

// Badge
colorScheme → colorPalette
```

#### 実装例

```typescript
// v2
<Switch
  isChecked={isActive}
  onChange={handleChange}
  isDisabled={isPending}
/>

// v3（必須: HiddenInputを含める）
<Switch.Root
  checked={isActive}
  onCheckedChange={handleChange}
  disabled={isPending}
>
  <Switch.HiddenInput />  {/* アクセシビリティのために必須 */}
  <Switch.Control>
    <Switch.Thumb />
  </Switch.Control>
</Switch.Root>
```

**重要**: `Switch.HiddenInput`はフォームの送信とアクセシビリティのために必須です。これがないと、スクリーンリーダーでの操作やフォーム送信が正しく動作しません。

```typescript
// v2
<Button leftIcon={<FiPlus />} colorScheme="blue" isLoading={isPending}>
  追加
</Button>

// v3
<Button colorPalette="blue" loading={isPending}>
  <FiPlus />
  追加
</Button>
```

```typescript
// IconButton: v2
<IconButton
  icon={<FiEdit2 />}
  aria-label="編集"
  colorScheme="red"
  isLoading={isPending}
/>

// IconButton: v3
<IconButton
  aria-label="編集"
  colorPalette="red"
  loading={isPending}
>
  <FiEdit2 />
</IconButton>
```

### 4. インポート方法の変更

v3 では名前空間化されたコンポーネントをインポートします。

```typescript
// v3 インポート例（推奨）
import {
  Card,
  Alert,
  Dialog,
  Switch,
  Button,
  IconButton,
  Badge,
  Separator
} from "@chakra-ui/react";

// 使用例
<Card.Root>
  <Card.Body>...</Card.Body>
</Card.Root>

<Alert.Root status="error">
  <Alert.Indicator />
  <Alert.Content>...</Alert.Content>
</Alert.Root>

<Switch.Root checked={value} onCheckedChange={handler}>
  <Switch.HiddenInput />
  <Switch.Control>
    <Switch.Thumb />
  </Switch.Control>
</Switch.Root>
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
<Dialog.Root open={isOpen} onOpenChange={({ open }) => !open && onClose()}>
  <Dialog.Backdrop />
  <Dialog.Content>
    <Dialog.Header>タイトル</Dialog.Header>
    <Dialog.CloseTrigger />
    <Dialog.Body>
      コンテンツ
    </Dialog.Body>
  </Dialog.Content>
</Dialog.Root>
```

**重要**: `onOpenChange`は`onClose`の代わりに使用します。`{ open }`オブジェクトを受け取るため、`!open && onClose()`のパターンで閉じるときのみハンドラを実行します。

```typescript
// useDisclosure との使用例
const { isOpen, onOpen, onClose } = useDisclosure();

<Dialog.Root
  open={isOpen}
  onOpenChange={({ open }) => {
    if (!open) {
      onClose();
      // クリーンアップ処理があればここに記述
    }
  }}
>
  {/* ... */}
</Dialog.Root>
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

### 1. Switch のアクセシビリティ role 変更

**重要**: v3では、Switchコンポーネントのroleが`"switch"`から`"checkbox"`に変更されました。

```typescript
// v2
const switches = screen.getAllByRole("switch");

// v3
const switches = screen.getAllByRole("checkbox");
```

これは、Switchが内部的に`<input type="checkbox">`を使用しているためです。

### 2. 実装の詳細に依存しないテスト

CSSクラス名やスタイルの詳細に依存するテストは避けるべきです。代わりに、ユーザーが実際に見える内容や要素の存在をテストします。

```typescript
// ❌ 悪い例: 実装の詳細に依存
expect(element).toHaveClass("chakra-text");
expect(element).toHaveStyle({ opacity: "0.6" });

// ✅ 良い例: ユーザーが見える内容をテスト
expect(screen.getByText("表示されるテキスト")).toBeInTheDocument();
expect(screen.getAllByRole("checkbox")).toHaveLength(3);
expect(screen.getByLabelText("ラベル")).toBeInTheDocument();
```

### 3. 複数要素のマッチング

同じテキストが複数回出現する場合は`getAllByText`を使用します。

```typescript
// 単一要素を期待する場合
expect(screen.getByText("ユニークなテキスト")).toBeInTheDocument();

// 複数要素が存在する場合
const elements = screen.getAllByText(/共通のパターン/);
expect(elements.length).toBeGreaterThan(0);
```

### 4. Skeleton コンポーネント

```typescript
// テスト用の data-testid 属性を追加
<Skeleton height="40px" data-testid="skeleton" />
```

### 5. console.error のモック

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// console.errorをモック
vi.spyOn(console, "error").mockImplementation(() => {});
```

### 6. Dialog（旧Modal）のテスト

Dialogが開いていることを確認する場合は、`role="dialog"`を使用します。

```typescript
// Dialogが開いていることを確認
await waitFor(() => {
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
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

- **テスト通過数**: 151個 → 220個（69個改善）
- **修正完了コンポーネント**:
  - ArticleDetail.tsx
  - ArticleList.tsx
  - FeedList.tsx
  - KeywordList.tsx（完了）
  - ArticleStatusBadge.tsx
  - ArticleActionButtons.tsx

### 主要な修正パターン

1. **Alert コンポーネント**: `Alert` → `Alert.Root + Alert.Indicator + Alert.Content`
2. **Card コンポーネント**: `Card` → `Card.Root + Card.Body`
3. **Table コンポーネント**: 完全な構造変更（名前空間化）
4. **Modal コンポーネント**: `Modal` → `Dialog.Root` 構造
5. **Divider コンポーネント**: `Divider` → `Separator`
6. **Switch コンポーネント**: `Switch` → `Switch.Root + Switch.HiddenInput + Switch.Control + Switch.Thumb`
7. **Button/IconButton**: `leftIcon`/`icon` プロパティ → 子要素として配置、`colorScheme` → `colorPalette`

## 参考資料

- [Chakra UI v3 Migration Guide](https://www.chakra-ui.com/docs/migration)
- [Chakra UI v3 Components](https://www.chakra-ui.com/docs/components)

## 注意事項

- v3 では多くのコンポーネントが compound components pattern を採用しているため、構造的な変更が必要
- 一部のコンポーネント（Switch, Tooltip など）は完全に新しい API になっている
- テストコードも新しい構造に合わせて更新が必要
- 段階的な移行を推奨（一度にすべてを変更するとデバッグが困難）

### 特に注意が必要な変更

1. **Switch.HiddenInput の必須化**
   - アクセシビリティとフォーム送信のために`Switch.HiddenInput`を必ず含める
   - これがないとスクリーンリーダーやフォーム送信が正しく動作しない

2. **colorScheme → colorPalette**
   - すべてのカラー関連のプロパティが`colorPalette`に統一された
   - Button, IconButton, Badge など多くのコンポーネントで変更が必要

3. **アイコンの配置方法**
   - `leftIcon`や`icon`プロパティは廃止され、子要素として配置する
   - IconButtonも同様に子要素としてアイコンを渡す

4. **Dialog の onOpenChange**
   - `onClose`の代わりに`onOpenChange`を使用
   - `({ open }) => !open && onClose()`のパターンで実装

5. **テストの role 変更**
   - Switch のroleが`"switch"`から`"checkbox"`に変更
   - テストコードでの期待値を更新する必要がある

6. **MCPツールの活用**
   - `mcp__chakra-ui__get_component_example`で最新のAPIを確認
   - `mcp__chakra-ui__v2_to_v3_code_review`で移行パターンを確認
   - 公式ドキュメントだけでなく、実際のコード例を参照する
