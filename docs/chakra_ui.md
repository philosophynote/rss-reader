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

// useDisclosure
isOpen → open
// onOpen, onClose, onToggle は変更なし

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

// Stack系（VStack, HStack, Stack）
spacing → gap
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
// useDisclosure: v2
const { isOpen, onOpen, onClose } = useDisclosure();
<Dialog.Root open={isOpen} onOpenChange={onClose}>

// useDisclosure: v3
const { open: isOpen, onOpen, onClose } = useDisclosure();
<Dialog.Root open={isOpen} onOpenChange={({ open }) => !open && onClose()}>
```

**重要**: `useDisclosure` の戻り値が `isOpen` → `open` に変更されました。変数名を維持したい場合は `open: isOpen` のように明示的にリネームします。

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

```typescript
// Stack系の spacing: v2
<VStack spacing={4} align="stretch">
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</VStack>

<HStack spacing={2}>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</HStack>

// Stack系の gap: v3
<VStack gap={4} align="stretch">
  <Box>Item 1</Box>
  <Box>Item 2</Box>
</VStack>

<HStack gap={2}>
  <Button>Button 1</Button>
  <Button>Button 2</Button>
</HStack>
```

**重要**: `VStack`、`HStack`、`Stack` すべてで `spacing` → `gap` に変更されました。これはCSS標準の `gap` プロパティに合わせた変更です。

### 4. React インポートの削除（React 17+）

React 17以降、JSXの変換が自動化されたため、コンポーネントファイルで`React`をインポートする必要がなくなりました。

```typescript
// v2（またはReact 16以前）
import React, { useState } from "react";

// v3（React 17+推奨）
import { useState } from "react";
```

**注意**: TypeScriptの型チェックで未使用インポートとして警告されるため、削除することを推奨します。

### 5. インポート方法の変更

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

### 6. Toast の変更

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

### 7. Modal から Dialog への変更

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

// v3（完全な構造）
import {
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogCloseTrigger,
  Portal,
} from "@chakra-ui/react";

<DialogRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
  <Portal>
    <DialogBackdrop />
    <DialogPositioner>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>タイトル</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          コンテンツ
        </DialogBody>
      </DialogContent>
    </DialogPositioner>
  </Portal>
</DialogRoot>
```

**重要な変更点**:
1. `Modal` → `DialogRoot`
2. `ModalOverlay` → `DialogBackdrop`
3. `ModalContent`は`DialogPositioner`と`DialogContent`の2つに分割
4. `ModalHeader`の中に`DialogTitle`が必要
5. `ModalCloseButton` → `DialogCloseTrigger`
6. `Portal`コンポーネントで明示的にラップする必要がある

#### useDisclosureからuseStateへの移行

v3では、多くの場合`useDisclosure`よりも`useState`を直接使う方がシンプルです。

```typescript
// v2 + useDisclosure
const { isOpen, onOpen, onClose } = useDisclosure();

<Button onClick={onOpen}>開く</Button>
<Dialog.Root open={isOpen} onOpenChange={({ open }) => !open && onClose()}>
  {/* ... */}
</Dialog.Root>

// v3 + useState（推奨）
const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>開く</Button>
<DialogRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
  {/* ... */}
</DialogRoot>
```

`onOpenChange`は`{ open: boolean }`オブジェクトを受け取るため、`e.open`で状態を直接更新できます。

### 8. Tooltip の変更とカスタムコンポーネント作成

```typescript
// v2
<Tooltip label="ツールチップ">
  <Button>ボタン</Button>
</Tooltip>

// v3（生のAPI）
<Tooltip.Root>
  <Tooltip.Trigger asChild>
    <Button>ボタン</Button>
  </Tooltip.Trigger>
  <Portal>
    <Tooltip.Positioner>
      <Tooltip.Content>ツールチップ</Tooltip.Content>
    </Tooltip.Positioner>
  </Portal>
</Tooltip.Root>
```

#### Tooltipカスタムコンポーネントの作成

v3のTooltip APIは冗長なため、v2のような簡潔なAPIを提供するカスタムコンポーネントを作成することを推奨します。

```typescript
// src/compositions/ui/tooltip.tsx
import { Tooltip as ChakraTooltip, Portal } from "@chakra-ui/react";
import * as React from "react";

export interface TooltipProps extends ChakraTooltip.RootProps {
  showArrow?: boolean;
  portalled?: boolean;
  portalRef?: React.RefObject<HTMLElement | null>;
  content: React.ReactNode;
  contentProps?: ChakraTooltip.ContentProps;
  disabled?: boolean;
}

export const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  function Tooltip(props, ref) {
    const {
      showArrow,
      children,
      disabled,
      portalled = true,
      content,
      contentProps,
      portalRef,
      ...rest
    } = props;

    if (disabled) return children;

    return (
      <ChakraTooltip.Root {...rest}>
        <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
        <Portal disabled={!portalled} container={portalRef}>
          <ChakraTooltip.Positioner>
            <ChakraTooltip.Content ref={ref} {...contentProps}>
              {showArrow && (
                <ChakraTooltip.Arrow>
                  <ChakraTooltip.ArrowTip />
                </ChakraTooltip.Arrow>
              )}
              {content}
            </ChakraTooltip.Content>
          </ChakraTooltip.Positioner>
        </Portal>
      </ChakraTooltip.Root>
    );
  }
);
```

使用例:
```typescript
import { Tooltip } from "../../compositions/ui/tooltip";

<Tooltip content="編集">
  <IconButton aria-label="編集">
    <FiEdit2 />
  </IconButton>
</Tooltip>
```

### 9. FormControl から Field への変更

```typescript
// v2
import {
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
} from "@chakra-ui/react";

<FormControl isInvalid={!!errors.title} isRequired>
  <FormLabel>タイトル</FormLabel>
  <Input
    value={formData.title}
    onChange={handleChange}
    placeholder="タイトルを入力"
  />
  <FormErrorMessage>{errors.title}</FormErrorMessage>
</FormControl>

// v3
import {
  FieldRoot,
  FieldLabel,
  FieldErrorText,
  Input,
} from "@chakra-ui/react";

<FieldRoot invalid={!!errors.title} required>
  <FieldLabel>タイトル</FieldLabel>
  <Input
    value={formData.title}
    onChange={handleChange}
    placeholder="タイトルを入力"
  />
  <FieldErrorText>{errors.title}</FieldErrorText>
</FieldRoot>
```

**変更点**:
- `FormControl` → `FieldRoot`
- `FormLabel` → `FieldLabel`
- `FormErrorMessage` → `FieldErrorText`
- `isInvalid` → `invalid`
- `isRequired` → `required`

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

#### カスタムテキストマッチャーの活用

テキストが複数の要素に分割されている場合や、特定の条件でマッチングしたい場合は、カスタムマッチャー関数を使用します。

```typescript
// テキストの開始部分でマッチング
const createdDates = screen.getAllByText((content, element) =>
  content.startsWith("作成日:") && element?.tagName.toLowerCase() === "p"
);
expect(createdDates.length).toBeGreaterThan(0);

// 正規表現でマッチング（複数要素対応）
const lastFetchDates = screen.getAllByText((content, element) =>
  content.startsWith("最終取得:") && element?.tagName.toLowerCase() === "p"
);
expect(lastFetchDates.length).toBeGreaterThan(0);
```

#### 役割（role）ベースのクエリ

UI構造の変更に強いテストを書くには、role属性を活用します。

```typescript
// ボタンを探す（テキストの完全一致ではなく正規表現を使用）
const addButton = screen.getByRole("button", {
  name: /フィードを追加/,
});
await user.click(addButton);

// モーダル/ダイアログが開いたことを確認
expect(screen.getByRole("dialog")).toBeInTheDocument();
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
  - FeedList.tsx（18テスト全通過）
  - FeedEditForm.tsx（完全移行完了）
  - KeywordList.tsx（完了）
  - ArticleStatusBadge.tsx
  - ArticleActionButtons.tsx

#### 最新の移行作業（FeedList.tsx + FeedEditForm.tsx）

**修正内容**:
1. **Modal → Dialog**: 完全な構造変更（Portal、Positioner含む）
2. **Tooltip**: カスタムコンポーネント作成（`src/compositions/ui/tooltip.tsx`）
3. **FormControl → Field**: フォーム要素の完全移行
4. **Switch**: 構造化APIへの対応（HiddenInput、Control必須）
5. **Button/IconButton**: アイコンを子要素として配置、`colorPalette`へ変更
6. **useDisclosure → useState**: シンプルな状態管理への移行
7. **テスト修正**: カスタムマッチャーと複数要素対応

**成果**: FeedList関連の18個のテストすべてが通過

### 主要な修正パターン

1. **Alert コンポーネント**: `Alert` → `Alert.Root + Alert.Indicator + Alert.Content`
2. **Card コンポーネント**: `Card` → `Card.Root + Card.Body`
3. **Table コンポーネント**: 完全な構造変更（名前空間化）
4. **Modal コンポーネント**: `Modal` → `Dialog.Root` 構造
5. **Divider コンポーネント**: `Divider` → `Separator`
6. **Switch コンポーネント**: `Switch` → `Switch.Root + Switch.HiddenInput + Switch.Control + Switch.Thumb`
7. **Button/IconButton**: `leftIcon`/`icon` プロパティ → 子要素として配置、`colorScheme` → `colorPalette`
8. **Stack系コンポーネント**: `spacing` → `gap` プロパティ
9. **useDisclosure**: `isOpen` → `open` プロパティ
10. **React インポート**: `import React` → 削除（React 17+では不要）

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

3. **Link コンポーネントの使用**
   - `Text`に`href`を渡すと型エラーになるため、リンク表示は`Link`を使う
   - `as="a"`で回避せず、`Link`に`href`/`target`/`rel`を渡す

3. **アイコンの配置方法**
   - `leftIcon`や`icon`プロパティは廃止され、子要素として配置する
   - IconButtonも同様に子要素としてアイコンを渡す

4. **Dialog の onOpenChange**
   - `onClose`の代わりに`onOpenChange`を使用
   - `({ open }) => !open && onClose()`のパターンで実装

5. **テストの role 変更**
   - Switch のroleが`"switch"`から`"checkbox"`に変更
   - テストコードでの期待値を更新する必要がある

6. **Stack系の spacing → gap**
   - `VStack`、`HStack`、`Stack`すべてで変更が必要
   - CSS標準の`gap`プロパティに統一された
   - 一括置換で修正可能（`spacing={` → `gap={`）

7. **useDisclosure の open プロパティ**
   - `isOpen` → `open` に変更
   - 変数名を維持したい場合は `const { open: isOpen } = useDisclosure()` のようにリネーム
   - Dialog/Drawer/Modal など、すべての開閉状態管理で影響を受ける

8. **React インポートの削除**
   - React 17以降では`import React`が不要
   - TypeScript型チェックで未使用警告が出るため削除推奨
   - `useState`、`useEffect`などのフック使用時は個別にインポート

9. **MCPツールの活用**
   - `mcp__chakra-ui__get_component_example`で最新のAPIを確認
   - `mcp__chakra-ui__v2_to_v3_code_review`で移行パターンを確認
   - 公式ドキュメントだけでなく、実際のコード例を参照する

10. **Dialog（Modal）の構造**
    - `Portal` → `DialogBackdrop` → `DialogPositioner` → `DialogContent`の階層が必須
    - `DialogHeader`の中に`DialogTitle`を配置する
    - `DialogPositioner`を忘れるとレイアウトが崩れる

11. **Tooltipのカスタムコンポーネント化**
    - v3のTooltip APIは冗長なため、カスタムコンポーネントの作成を推奨
    - `src/compositions/ui/`ディレクトリに再利用可能なコンポーネントを配置
    - v2のような`content`プロパティを提供するラッパーを作成

12. **sx プロパティの削除**
    - v3 では `sx` が非対応のため、スタイルは `css` に移す

12. **テスト修正のベストプラクティス**
    - 重複するテキストには`getAllByText`を使用
    - カスタムマッチャー関数で柔軟なマッチングを実現
    - `getByRole`を活用してUI構造の変更に強いテストを書く
    - 正規表現を使ってテキストの部分一致を許容する
