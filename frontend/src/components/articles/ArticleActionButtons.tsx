import React from "react";
import { HStack, IconButton, Tooltip, useToast } from "@chakra-ui/react";
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
  const toast = useToast();

  const handleToggleRead = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await toggleRead.mutateAsync({
        articleId: article.article_id,
        data: { is_read: !article.is_read },
      });

      onReadToggle?.(article);

      toast({
        title: article.is_read ? "未読にしました" : "既読にしました",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("既読状態更新エラー:", error);

      let errorMessage = "既読状態の更新に失敗しました";
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

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await toggleSave.mutateAsync({
        articleId: article.article_id,
        data: { is_saved: !article.is_saved },
      });

      onSaveToggle?.(article);

      toast({
        title: article.is_saved ? "保存を解除しました" : "保存しました",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
    } catch (error) {
      console.error("保存状態更新エラー:", error);

      let errorMessage = "保存状態の更新に失敗しました";
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

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(article.link, "_blank", "noopener,noreferrer");
  };

  return (
    <HStack spacing={1}>
      {/* 既読/未読切り替え */}
      <Tooltip label={article.is_read ? "未読にする" : "既読にする"}>
        <IconButton
          aria-label={article.is_read ? "未読にする" : "既読にする"}
          icon={article.is_read ? <FiEyeOff /> : <FiEye />}
          size={size}
          variant={variant}
          colorScheme={article.is_read ? "gray" : "blue"}
          onClick={handleToggleRead}
          isLoading={toggleRead.isPending}
        />
      </Tooltip>

      {/* 保存/解除切り替え */}
      <Tooltip label={article.is_saved ? "保存を解除" : "保存する"}>
        <IconButton
          aria-label={article.is_saved ? "保存を解除" : "保存する"}
          icon={article.is_saved ? <FiBookOpen /> : <FiBookmark />}
          size={size}
          variant={variant}
          colorScheme={article.is_saved ? "orange" : "gray"}
          onClick={handleToggleSave}
          isLoading={toggleSave.isPending}
        />
      </Tooltip>

      {/* 外部リンクで開く */}
      <Tooltip label="元記事を開く">
        <IconButton
          aria-label="元記事を開く"
          icon={<FiExternalLink />}
          size={size}
          variant={variant}
          onClick={handleOpenExternal}
        />
      </Tooltip>
    </HStack>
  );
}
