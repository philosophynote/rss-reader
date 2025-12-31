import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Card,
  Skeleton,
  Alert,
  useDisclosure,
  Dialog,
  createToaster,
  Flex,
  Spacer,
  Switch,
} from "@chakra-ui/react";

// toasterを作成
const toaster = createToaster({
  placement: "top",
  duration: 3000,
});
import { FiEdit2, FiTrash2, FiPlus, FiRefreshCw } from "react-icons/fi";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  useKeywords,
  useDeleteKeyword,
  useToggleKeywordActive,
  useRecalculateScores,
} from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Keyword } from "../../api";
import { KeywordForm } from "./KeywordForm";
import { KeywordEditForm } from "./KeywordEditForm";

/**
 * キーワード一覧コンポーネント
 */
export function KeywordList() {
  const { data: keywords, isLoading, error, refetch } = useKeywords();
  const deleteKeyword = useDeleteKeyword();
  const toggleActive = useToggleKeywordActive();
  const recalculateScores = useRecalculateScores();

  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const {
    open: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = useDisclosure();
  const {
    open: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure();

  const handleEdit = (keyword: Keyword) => {
    setSelectedKeyword(keyword);
    onEditOpen();
  };

  const handleDelete = async (keyword: Keyword) => {
    if (!confirm(`キーワード「${keyword.text}」を削除しますか？`)) {
      return;
    }

    try {
      await deleteKeyword.mutateAsync(keyword.keyword_id);

      toaster.create({
        title: "キーワードを削除しました",
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error("キーワード削除エラー:", error);

      let errorMessage = "キーワードの削除に失敗しました";
      if (error instanceof ApiAuthError) {
        errorMessage = "認証エラー: API Keyを確認してください";
      } else if (error instanceof ApiError) {
        errorMessage = error.message;
      }

      toaster.create({
        title: "エラー",
        description: errorMessage,
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleToggleActive = async (keyword: Keyword) => {
    try {
      await toggleActive.mutateAsync({
        keywordId: keyword.keyword_id,
        data: { is_active: !keyword.is_active },
      });

      toaster.create({
        title: keyword.is_active
          ? "キーワードを無効にしました"
          : "キーワードを有効にしました",
        type: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("キーワード状態更新エラー:", error);

      let errorMessage = "キーワードの状態更新に失敗しました";
      if (error instanceof ApiAuthError) {
        errorMessage = "認証エラー: API Keyを確認してください";
      } else if (error instanceof ApiError) {
        errorMessage = error.message;
      }

      toaster.create({
        title: "エラー",
        description: errorMessage,
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleRecalculate = async () => {
    if (
      !confirm(
        "すべての記事の重要度スコアを再計算しますか？\nこの処理には時間がかかる場合があります。"
      )
    ) {
      return;
    }

    try {
      await recalculateScores.mutateAsync();

      toaster.create({
        title: "重要度スコアの再計算を開始しました",
        description: "処理が完了するまでしばらくお待ちください",
        type: "info",
        duration: 5000,
      });
    } catch (error) {
      console.error("重要度スコア再計算エラー:", error);

      let errorMessage = "重要度スコアの再計算に失敗しました";
      if (error instanceof ApiAuthError) {
        errorMessage = "認証エラー: API Keyを確認してください";
      } else if (error instanceof ApiError) {
        errorMessage = error.message;
      }

      toaster.create({
        title: "エラー",
        description: errorMessage,
        type: "error",
        duration: 5000,
      });
    }
  };

  const handleAddSuccess = () => {
    onAddClose();
    refetch();
  };

  const handleEditSuccess = () => {
    onEditClose();
    setSelectedKeyword(null);
    refetch();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy/MM/dd HH:mm", { locale: ja });
    } catch {
      return "不明";
    }
  };

  const formatWeight = (weight: number) => {
    return weight.toFixed(1);
  };

  if (isLoading) {
    return (
      <VStack gap={4} align="stretch">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height="100px" borderRadius="md" data-testid="skeleton" />
        ))}
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert.Root status="error">
        <Alert.Indicator />
        <Alert.Content>
          {error instanceof ApiAuthError
            ? "認証エラー: API Keyを確認してください"
            : error instanceof ApiError
            ? error.message
            : "キーワード一覧の取得に失敗しました"}
        </Alert.Content>
      </Alert.Root>
    );
  }

  if (!keywords || keywords.length === 0) {
    return (
      <VStack gap={6} py={8}>
        <Text color="gray.500" textAlign="center">
          登録されているキーワードがありません
        </Text>
        <Button colorPalette="blue" onClick={onAddOpen}>
          <FiPlus />
          最初のキーワードを追加
        </Button>

        <Dialog.Root open={isAddOpen} onOpenChange={({ open }) => !open && onAddClose()}>
          <Dialog.Backdrop />
          <Dialog.Content>
            <Dialog.Header>キーワードを追加</Dialog.Header>
            <Dialog.CloseTrigger />
            <Dialog.Body pb={6}>
              <KeywordForm onSuccess={handleAddSuccess} onCancel={onAddClose} />
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Root>
      </VStack>
    );
  }

  const activeKeywords = keywords.filter((k) => k.is_active);
  const inactiveKeywords = keywords.filter((k) => !k.is_active);

  return (
    <VStack gap={6} align="stretch">
      <Flex>
        <Spacer />
        <HStack gap={2}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            loading={recalculateScores.isPending}
            loadingText="再計算中..."
          >
            <FiRefreshCw />
            重要度を再計算
          </Button>
          <Button colorPalette="blue" onClick={onAddOpen}>
            <FiPlus />
            キーワードを追加
          </Button>
        </HStack>
      </Flex>

      {/* アクティブなキーワード */}
      {activeKeywords.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={3} color="gray.700">
            有効なキーワード ({activeKeywords.length})
          </Text>

          <VStack gap={3} align="stretch">
            {activeKeywords.map((keyword) => (
              <Card.Root key={keyword.keyword_id} variant="outline">
                <Card.Body>
                  <VStack gap={3} align="stretch">
                    <HStack>
                      <VStack align="start" gap={1} flex={1}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="md">
                            {keyword.text}
                          </Text>
                          <Badge colorPalette="green" variant="solid">
                            重み: {formatWeight(keyword.weight)}
                          </Badge>
                        </HStack>

                        <Text fontSize="sm" color="gray.500">
                          作成日: {formatDate(keyword.created_at)}
                        </Text>
                      </VStack>

                      <HStack gap={2}>
                        <Switch.Root
                          checked={keyword.is_active}
                          onCheckedChange={() => handleToggleActive(keyword)}
                          disabled={toggleActive.isPending}
                        >
                          <Switch.HiddenInput />
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Root>

                        <IconButton
                          aria-label="キーワードを編集"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(keyword)}
                        >
                          <FiEdit2 />
                        </IconButton>

                        <IconButton
                          aria-label="キーワードを削除"
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleDelete(keyword)}
                          loading={deleteKeyword.isPending}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </HStack>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        </Box>
      )}

      {/* 無効なキーワード */}
      {inactiveKeywords.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="bold" mb={3} color="gray.500">
            無効なキーワード ({inactiveKeywords.length})
          </Text>

          <VStack gap={3} align="stretch">
            {inactiveKeywords.map((keyword) => (
              <Card.Root key={keyword.keyword_id} variant="outline" opacity={0.6}>
                <Card.Body>
                  <VStack gap={3} align="stretch">
                    <HStack>
                      <VStack align="start" gap={1} flex={1}>
                        <HStack>
                          <Text
                            fontWeight="bold"
                            fontSize="md"
                            color="gray.500"
                          >
                            {keyword.text}
                          </Text>
                          <Badge colorPalette="gray" variant="outline">
                            重み: {formatWeight(keyword.weight)}
                          </Badge>
                        </HStack>

                        <Text fontSize="sm" color="gray.400">
                          作成日: {formatDate(keyword.created_at)}
                        </Text>
                      </VStack>

                      <HStack gap={2}>
                        <Switch.Root
                          checked={keyword.is_active}
                          onCheckedChange={() => handleToggleActive(keyword)}
                          disabled={toggleActive.isPending}
                        >
                          <Switch.HiddenInput />
                          <Switch.Control>
                            <Switch.Thumb />
                          </Switch.Control>
                        </Switch.Root>

                        <IconButton
                          aria-label="キーワードを編集"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(keyword)}
                        >
                          <FiEdit2 />
                        </IconButton>

                        <IconButton
                          aria-label="キーワードを削除"
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleDelete(keyword)}
                          loading={deleteKeyword.isPending}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </HStack>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>
        </Box>
      )}

      {/* キーワード追加モーダル */}
      <Dialog.Root open={isAddOpen} onOpenChange={({ open }) => !open && onAddClose()}>
        <Dialog.Backdrop />
        <Dialog.Content>
          <Dialog.Header>キーワードを追加</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body pb={6}>
            <KeywordForm onSuccess={handleAddSuccess} onCancel={onAddClose} />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Root>

      {/* キーワード編集モーダル */}
      <Dialog.Root open={isEditOpen} onOpenChange={({ open }) => !open && onEditClose()}>
        <Dialog.Backdrop />
        <Dialog.Content>
          <Dialog.Header>キーワードを編集</Dialog.Header>
          <Dialog.CloseTrigger />
          <Dialog.Body pb={6}>
            {selectedKeyword && (
              <KeywordEditForm
                keyword={selectedKeyword}
                onSuccess={handleEditSuccess}
                onCancel={onEditClose}
              />
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Root>
    </VStack>
  );
}
