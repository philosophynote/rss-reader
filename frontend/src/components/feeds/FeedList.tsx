import React, { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  IconButton,
  CardRoot,
  CardBody,
  Skeleton,
  AlertRoot,
  AlertIndicator,
  AlertContent,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  createToaster,
  Portal,
  Tooltip,
  Flex,
  Spacer,
} from "@chakra-ui/react";

// toasterを作成
const toaster = createToaster({
  placement: "top",
  duration: 3000,
});
import { FiEdit2, FiTrash2, FiExternalLink, FiPlus } from "react-icons/fi";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useFeeds, useDeleteFeed } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Feed } from "../../api";
import { FeedForm } from "./FeedForm";
import { FeedEditForm } from "./FeedEditForm";

/**
 * フィード一覧コンポーネント
 */
export function FeedList() {
  const { data: feeds, isLoading, error, refetch } = useFeeds();
  const deleteFeed = useDeleteFeed();

  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
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

  const handleEdit = (feed: Feed) => {
    setSelectedFeed(feed);
    onEditOpen();
  };

  const handleDelete = async (feed: Feed) => {
    if (
      !confirm(
        `フィード「${feed.title}」を削除しますか？\n関連する記事もすべて削除されます。`
      )
    ) {
      return;
    }

    try {
      await deleteFeed.mutateAsync(feed.feed_id);

      toaster.create({
        title: "フィードを削除しました",
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      console.error("フィード削除エラー:", error);

      let errorMessage = "フィードの削除に失敗しました";
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
    setSelectedFeed(null);
    refetch();
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy/MM/dd HH:mm", { locale: ja });
    } catch {
      return "不明";
    }
  };

  const groupFeedsByFolder = (feeds: Feed[]) => {
    const grouped = feeds.reduce((acc, feed) => {
      const folder = feed.folder || "未分類";
      if (!acc[folder]) {
        acc[folder] = [];
      }
      acc[folder].push(feed);
      return acc;
    }, {} as Record<string, Feed[]>);

    return grouped;
  };

  if (isLoading) {
    return (
      <VStack spacing={4} align="stretch">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} height="120px" borderRadius="md" data-testid="skeleton" />
        ))}
      </VStack>
    );
  }

  if (error) {
    return (
      <AlertRoot status="error">
        <AlertIndicator />
        <AlertContent>
          {error instanceof ApiAuthError
            ? "認証エラー: API Keyを確認してください"
            : error instanceof ApiError
            ? error.message
            : "フィード一覧の取得に失敗しました"}
        </AlertContent>
      </AlertRoot>
    );
  }

  if (!feeds || feeds.length === 0) {
    return (
      <VStack spacing={6} py={8}>
        <Text color="gray.500" textAlign="center">
          登録されているフィードがありません
        </Text>
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onAddOpen}>
          最初のフィードを追加
        </Button>

        <Modal isOpen={isAddOpen} onClose={onAddClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>フィードを追加</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <FeedForm onSuccess={handleAddSuccess} onCancel={onAddClose} />
            </ModalBody>
          </ModalContent>
        </Modal>
      </VStack>
    );
  }

  const groupedFeeds = groupFeedsByFolder(feeds);

  return (
    <VStack spacing={6} align="stretch">
      <Flex>
        <Spacer />
        <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={onAddOpen}>
          フィードを追加
        </Button>
      </Flex>

      {Object.entries(groupedFeeds).map(([folder, folderFeeds]) => (
        <Box key={folder}>
          <Text fontSize="lg" fontWeight="bold" mb={3} color="gray.700">
            {folder} ({folderFeeds.length})
          </Text>

          <VStack spacing={3} align="stretch">
            {folderFeeds.map((feed) => (
              <CardRoot key={feed.feed_id} variant="outline">
                <CardBody>
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="md">
                            {feed.title}
                          </Text>
                          <Badge
                            colorScheme={feed.is_active ? "green" : "gray"}
                          >
                            {feed.is_active ? "アクティブ" : "無効"}
                          </Badge>
                        </HStack>

                        <HStack spacing={2}>
                          <Text
                            fontSize="sm"
                            color="blue.500"
                            as="a"
                            href={feed.url}
                            target="_blank"
                          >
                            {feed.url}
                          </Text>
                          <IconButton
                            aria-label="外部リンクで開く"
                            icon={<FiExternalLink />}
                            size="xs"
                            variant="ghost"
                            as="a"
                            href={feed.url}
                            target="_blank"
                          />
                        </HStack>
                      </VStack>

                      <HStack spacing={2}>
                        <Tooltip label="編集">
                          <IconButton
                            aria-label="フィードを編集"
                            icon={<FiEdit2 />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(feed)}
                          />
                        </Tooltip>

                        <Tooltip label="削除">
                          <IconButton
                            aria-label="フィードを削除"
                            icon={<FiTrash2 />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDelete(feed)}
                            isLoading={deleteFeed.isPending}
                          />
                        </Tooltip>
                      </HStack>
                    </HStack>

                    <HStack fontSize="sm" color="gray.500">
                      <Text>作成日: {formatDate(feed.created_at)}</Text>
                      {feed.last_fetched_at && (
                        <Text>
                          最終取得: {formatDate(feed.last_fetched_at)}
                        </Text>
                      )}
                    </HStack>
                  </VStack>
                </CardBody>
              </CardRoot>
            ))}
          </VStack>
        </Box>
      ))}

      {/* フィード追加モーダル */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>フィードを追加</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FeedForm onSuccess={handleAddSuccess} onCancel={onAddClose} />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* フィード編集モーダル */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>フィードを編集</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedFeed && (
              <FeedEditForm
                feed={selectedFeed}
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
