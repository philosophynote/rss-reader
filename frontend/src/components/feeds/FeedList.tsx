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
  createToaster,
  Portal,
  Flex,
  Spacer,
  DialogRoot,
  DialogBackdrop,
  DialogPositioner,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogCloseTrigger,
} from "@chakra-ui/react";
import { Tooltip } from "../../compositions/ui/tooltip";
import { FiEdit2, FiTrash2, FiExternalLink, FiPlus } from "react-icons/fi";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useFeeds, useDeleteFeed } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Feed } from "../../api";
import { FeedForm } from "./FeedForm";
import { FeedEditForm } from "./FeedEditForm";

// toasterを作成
const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

/**
 * フィード一覧コンポーネント
 */
export function FeedList() {
  const { data: feeds, isLoading, error, refetch } = useFeeds();
  const deleteFeed = useDeleteFeed();

  const [selectedFeed, setSelectedFeed] = useState<Feed | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEdit = (feed: Feed) => {
    setSelectedFeed(feed);
    setIsEditOpen(true);
  };

  const handleDelete = (feed: Feed) => {
    if (
      !confirm(
        `フィード「${feed.title}」を削除しますか？\n関連する記事もすべて削除されます。`
      )
    ) {
      return;
    }

    void deleteFeed
      .mutateAsync(feed.feed_id)
      .then(() => {
        toaster.create({
          title: "フィードを削除しました",
          type: "success",
          duration: 3000,
        });
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
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
      });
  };

  const handleAddSuccess = () => {
    setIsAddOpen(false);
    void refetch();
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    setSelectedFeed(null);
    void refetch();
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
      const folder = feed.folder ?? "未分類";
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
        {Array.from({ length: 3 }).map((_, i) => (
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
        <Button colorPalette="blue" onClick={() => setIsAddOpen(true)}>
          <FiPlus />
          最初のフィードを追加
        </Button>

        <DialogRoot
          open={isAddOpen}
          onOpenChange={(e) => setIsAddOpen(e.open)}
        >
          <Portal>
            <DialogBackdrop />
            <DialogPositioner>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>フィードを追加</DialogTitle>
                </DialogHeader>
                <DialogCloseTrigger />
                <DialogBody pb={6}>
                  <FeedForm
                    onSuccess={handleAddSuccess}
                    onCancel={() => setIsAddOpen(false)}
                  />
                </DialogBody>
              </DialogContent>
            </DialogPositioner>
          </Portal>
        </DialogRoot>
      </VStack>
    );
  }

  const groupedFeeds = groupFeedsByFolder(feeds);

  return (
    <VStack spacing={6} align="stretch">
      <Flex>
        <Spacer />
        <Button colorPalette="blue" onClick={() => setIsAddOpen(true)}>
          <FiPlus />
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
                <CardBody role="article">
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <VStack align="start" spacing={1} flex={1}>
                        <HStack>
                          <Text fontWeight="bold" fontSize="md">
                            {feed.title}
                          </Text>
                          <Badge
                            colorPalette={feed.is_active ? "green" : "gray"}
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
                            size="xs"
                            variant="ghost"
                            asChild
                          >
                            <a href={feed.url} target="_blank" rel="noreferrer">
                              <FiExternalLink />
                            </a>
                          </IconButton>
                        </HStack>
                      </VStack>

                      <HStack spacing={2}>
                        <Tooltip content="編集">
                          <IconButton
                            aria-label="フィードを編集"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(feed)}
                          >
                            <FiEdit2 />
                          </IconButton>
                        </Tooltip>

                        <Tooltip content="削除">
                          <IconButton
                            aria-label="フィードを削除"
                            size="sm"
                            variant="ghost"
                            colorPalette="red"
                            onClick={() => handleDelete(feed)}
                            loading={deleteFeed.isPending}
                          >
                            <FiTrash2 />
                          </IconButton>
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
      <DialogRoot
        open={isAddOpen}
        onOpenChange={(e) => setIsAddOpen(e.open)}
      >
        <Portal>
          <DialogBackdrop />
          <DialogPositioner>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>フィードを追加</DialogTitle>
              </DialogHeader>
              <DialogCloseTrigger />
              <DialogBody pb={6}>
                <FeedForm
                  onSuccess={handleAddSuccess}
                  onCancel={() => setIsAddOpen(false)}
                />
              </DialogBody>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>

      {/* フィード編集モーダル */}
      <DialogRoot
        open={isEditOpen}
        onOpenChange={(e) => setIsEditOpen(e.open)}
      >
        <Portal>
          <DialogBackdrop />
          <DialogPositioner>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>フィードを編集</DialogTitle>
              </DialogHeader>
              <DialogCloseTrigger />
              <DialogBody pb={6}>
                {selectedFeed && (
                  <FeedEditForm
                    feed={selectedFeed}
                    onSuccess={handleEditSuccess}
                    onCancel={() => setIsEditOpen(false)}
                  />
                )}
              </DialogBody>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>
    </VStack>
  );
}
