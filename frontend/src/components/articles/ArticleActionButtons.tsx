import React from "react";
import {
  HStack,
  IconButton,
  Portal,
  createToaster,
} from "@chakra-ui/react";
import { Tooltip } from "@chakra-ui/react";
import {
  FiEye,
  FiEyeOff,
  FiBookmark,
  FiBookOpen,
  FiExternalLink,
} from "react-icons/fi";
import { useToggleArticleRead, useToggleArticleSave } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Article } from "../../api";

// toasterを作成
const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

interface ArticleActionButtonsProps {
  article: Article;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "outline" | "solid";
  onReadToggle?: (article: Article) => void;
  onSaveToggle?: (article: Article) => void;
}

/**
 * 記事操作ボタンコンポーネント
 */
export function ArticleActionButtons({
  article,
  size = "sm",
  variant = "ghost",
  onReadToggle,
  onSaveToggle,
}: ArticleActionButtonsProps) {
  const toggleRead = useToggleArticleRead();
  const toggleSave = useToggleArticleSave();

  const handleToggleRead = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await toggleRead.mutateAsync({
        articleId: article.article_id,
        data: { is_read: !article.is_read },
      });

      onReadToggle?.(article);

      toaster.create({
        title: article.is_read ? "未読にしました" : "既読にしました",
        type: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("既読状態更新エラー:", error);

      let errorMessage = "既読状態の更新に失敗しました";
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

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await toggleSave.mutateAsync({
        articleId: article.article_id,
        data: { is_saved: !article.is_saved },
      });

      onSaveToggle?.(article);

      toaster.create({
        title: article.is_saved ? "保存を解除しました" : "保存しました",
        type: "success",
        duration: 2000,
      });
    } catch (error) {
      console.error("保存状態更新エラー:", error);

      let errorMessage = "保存状態の更新に失敗しました";
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

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(article.link, "_blank", "noopener,noreferrer");
  };

  return (
    <HStack gap={1}>
      {/* 既読/未読切り替え */}
      <Tooltip.Root positioning={{ placement: "top" }}>
        <Tooltip.Trigger asChild>
          <IconButton
            aria-label={article.is_read ? "未読にする" : "既読にする"}
            size={size}
            variant={variant}
            colorPalette={article.is_read ? "gray" : "blue"}
            onClick={handleToggleRead}
            loading={toggleRead.isPending}
          >
            {article.is_read ? <FiEyeOff /> : <FiEye />}
          </IconButton>
        </Tooltip.Trigger>
        <Portal>
          <Tooltip.Positioner>
            <Tooltip.Content>
              {article.is_read ? "未読にする" : "既読にする"}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Portal>
      </Tooltip.Root>

      {/* 保存/解除切り替え */}
      <Tooltip.Root positioning={{ placement: "top" }}>
        <Tooltip.Trigger asChild>
          <IconButton
            aria-label={article.is_saved ? "保存を解除" : "保存する"}
            size={size}
            variant={variant}
            colorPalette={article.is_saved ? "orange" : "gray"}
            onClick={handleToggleSave}
            loading={toggleSave.isPending}
          >
            {article.is_saved ? <FiBookOpen /> : <FiBookmark />}
          </IconButton>
        </Tooltip.Trigger>
        <Portal>
          <Tooltip.Positioner>
            <Tooltip.Content>
              {article.is_saved ? "保存を解除" : "保存する"}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Portal>
      </Tooltip.Root>

      {/* 外部リンクで開く */}
      <Tooltip.Root positioning={{ placement: "top" }}>
        <Tooltip.Trigger asChild>
          <IconButton
            aria-label="元記事を開く"
            size={size}
            variant={variant}
            onClick={handleOpenExternal}
          >
            <FiExternalLink />
          </IconButton>
        </Tooltip.Trigger>
        <Portal>
          <Tooltip.Positioner>
            <Tooltip.Content>元記事を開く</Tooltip.Content>
          </Tooltip.Positioner>
        </Portal>
      </Tooltip.Root>
    </HStack>
  );
}
