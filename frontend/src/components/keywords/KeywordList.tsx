import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  Card,
  CardBody,
  Skeleton,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useToast,
  Tooltip,
  Flex,
  Spacer,
  Switch,
} from "@chakra-ui/react";
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
  const toast = useToast();

  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const {
    isOpen: isAddOpen,
    onOpen: onAddOpen,
    onClose: onAddClose,
  } = useDisclosure();
  const {
    isOpen: isEditOpen,
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

      toast({
        title: "キーワードを削除しました",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error("キーワード削除エラー:", error);

      let errorMessage = "キーワードの削除に失敗しました";
      if (error instanceof ApiAuthError) {
        errorMessage = "認証エラー: API Keyを確認してください";
      } else if (error instanceof ApiError) {
        errorMessage = error.message;
      }

      toast({
        title: "エラー",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleToggleActive = async (keyword: Keyword) => {
    try {
      await toggleActive.mutateAsync({
        keywordId: keyword.keyword_id,
        data: { is_active: !keyword.is_active },
      });

      toast({
        title: keyword.is_active
          ? "キーワードを無効にしました"
          : "キーワードを有効にしました",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("キーワード状態更新エラー:", error);

      let errorMessage = "キーワードの状態更新に失敗しました";
      if (error instanceof ApiAuthError) {
        errorMessage = "認証エラー: API Keyを確認してください";
      } else if (error instanceof ApiError) {
        errorMessage = error.message;
      }

      toast({
        title: "エラー",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
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

      toast({
        title: "重要度スコアの再計算を開始しました",
        description: "処理が完了するまでしばらくお待ちください",
        status: "info",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error("重要度スコア再計算エラー:", error);

      let errorMessage = "重要度スコアの再計算に失敗しました";
      if (error instanceof ApiAuthError) {
        errorMessage = "認証エラー: API Keyを確認してください";
      } else if (error instanceof ApiError) {
        errorMessage = error.message;
      }

      toast({
        title: "エラー",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
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
      <VStack spacing={4} align="stretch">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height="100px" borderRadius="md" />
        ))}
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error instanceof ApiAuthError
          ? "認証エラー: API Keyを確認してください"
          : error instanceof ApiError
          ? error.message
          : "キーワード一覧の取得に失敗しました"}
      </Alert>
    );
  }

  if (!keywords || keywords.length === 0) {
    return (
      <VStack spacing={6} py={8}>
        <Text color="gray.500" textAlign="center">
          登録されているキーワードがありません
        </Text>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onAddOpen}>
          最初のキーワードを追加
        </Button>

        <Modal isOpen={isAddOpen} onClose={onAddClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>キーワードを追加</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <KeywordForm onSuccess={handleAddSuccess} onCancel={onAddClose} />
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    );
  }

  const activeKeywords = keywords.filter((k) => k.is_active);
  const inactiveKeywords = keywords.filter((k) => !k.is_active);

  return (
    <VStack spacing={6} align="stretch">
      <Flex>
        <Spacer />
        <HStack spacing={2}>
          <Button
            leftIcon={<FiRefreshCw />}
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            isLoading={recalculateScores.isPending}
            loadingText="再計算中..."
          >
            重要度を再計算
          </Button>
          <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onAddOpen}>
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

          <VStack spacing={3} align="stretch">
            {activeKeywords.map((keyword) => (
              <Card key={keyword.keyword_id} variant="outline">
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="md">
                            {keyword.text}
                          </Text>
                          <Badge colorScheme="green" variant="solid">
                            重み: {formatWeight(keyword.weight)}
                          </Badge>
                        </HStack>

                        <Text fontSize="sm" color="gray.500">
                          作成日: {formatDate(keyword.created_at)}
                        </Text>
                      </VStack>

                      <HStack spacing={2}>
                        <Tooltip label="有効/無効切り替え">
                          <Switch
                            isChecked={keyword.is_active}
                            onChange={() => handleToggleActive(keyword)}
                            isDisabled={toggleActive.isPending}
                          />
                        </Tooltip>

                        <Tooltip label="編集">
                          <IconButton
                            aria-label="キーワードを編集"
                            icon={<FiEdit2 />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(keyword)}
                          />
                        </Tooltip>

                        <Tooltip label="削除">
                          <IconButton
                            aria-label="キーワードを削除"
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDelete(keyword)}
                            isLoading={deleteKeyword.isPending}
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
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

          <VStack spacing={3} align="stretch">
            {inactiveKeywords.map((keyword) => (
              <Card key={keyword.keyword_id} variant="outline" opacity={0.6}>
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text
                            fontWeight="bold"
                            fontSize="md"
                            color="gray.500"
                          >
                            {keyword.text}
                          </Text>
                          <Badge colorScheme="gray" variant="outline">
                            重み: {formatWeight(keyword.weight)}
                          </Badge>
                        </HStack>

                        <Text fontSize="sm" color="gray.400">
                          作成日: {formatDate(keyword.created_at)}
                        </Text>
                      </VStack>

                      <HStack spacing={2}>
                        <Tooltip label="有効/無効切り替え">
                          <Switch
                            isChecked={keyword.is_active}
                            onChange={() => handleToggleActive(keyword)}
                            isDisabled={toggleActive.isPending}
                          />
                        </Tooltip>

                        <Tooltip label="編集">
                          <IconButton
                            aria-label="キーワードを編集"
                            icon={<FiEdit2 />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(keyword)}
                          />
                        </Tooltip>

                        <Tooltip label="削除">
                          <IconButton
                            aria-label="キーワードを削除"
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDelete(keyword)}
                            isLoading={deleteKeyword.isPending}
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            ))}
          </VStack>
        </Box>
      )}

      {/* キーワード追加モーダル */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>キーワードを追加</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <KeywordForm onSuccess={handleAddSuccess} onCancel={onAddClose} />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* キーワード編集モーダル */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>キーワードを編集</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedKeyword && (
              <KeywordEditForm
                keyword={selectedKeyword}
                onSuccess={handleEditSuccess}
                onCancel={onEditClose}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
}
