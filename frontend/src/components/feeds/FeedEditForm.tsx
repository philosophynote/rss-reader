import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Switch,
  VStack,
  createToaster,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";

// toasterを作成
const toaster = createToaster({
  placement: "top",
  duration: 3000,
});
import { useUpdateFeed } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Feed, UpdateFeedRequest } from "../../api";

interface FeedEditFormProps {
  feed: Feed;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * フィード編集フォームコンポーネント
 */
export function FeedEditForm({ feed, onSuccess, onCancel }: FeedEditFormProps) {
  const [formData, setFormData] = useState<UpdateFeedRequest>({
    title: feed.title,
    folder: feed.folder || "",
    is_active: feed.is_active,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFeed = useUpdateFeed();

  // フィードが変更された場合にフォームデータを更新
  useEffect(() => {
    setFormData({
      title: feed.title,
      folder: feed.folder || "",
      is_active: feed.is_active,
    });
  }, [feed]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // タイトル必須チェック
    if (!formData.title?.trim()) {
      newErrors.title = "タイトルは必須です";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await updateFeed.mutateAsync({
        feedId: feed.feed_id,
        data: {
          title: formData.title?.trim(),
          folder: formData.folder?.trim() || undefined,
          is_active: formData.is_active,
        },
      });

      toaster.create({
        title: "フィードを更新しました",
        type: "success",
        duration: 3000,
      });

      onSuccess?.();
    } catch (error) {
      console.error("フィード更新エラー:", error);

      let errorMessage = "フィードの更新に失敗しました";
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

  const handleInputChange =
    (field: keyof UpdateFeedRequest) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));

      // エラーをクリア
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: "",
        }));
      }
    };

  const handleSwitchChange =
    (field: keyof UpdateFeedRequest) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: e.target.checked,
      }));
    };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={4} align="stretch">
        {updateFeed.error && (
          <Alert status="error">
            <AlertIcon />
            {updateFeed.error instanceof ApiAuthError
              ? "認証エラー: API Keyを確認してください"
              : updateFeed.error instanceof ApiError
              ? updateFeed.error.message
              : "フィードの更新に失敗しました"}
          </Alert>
        )}

        <FormControl isInvalid={!!errors.title} isRequired>
          <FormLabel>タイトル</FormLabel>
          <Input
            value={formData.title || ""}
            onChange={handleInputChange("title")}
            placeholder="フィードのタイトル"
            disabled={updateFeed.isPending}
          />
          <FormErrorMessage>{errors.title}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.folder}>
          <FormLabel>フォルダ（任意）</FormLabel>
          <Input
            value={formData.folder || ""}
            onChange={handleInputChange("folder")}
            placeholder="例: テクノロジー"
            disabled={updateFeed.isPending}
          />
          <FormErrorMessage>{errors.folder}</FormErrorMessage>
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="is-active" mb="0">
            アクティブ
          </FormLabel>
          <Switch
            id="is-active"
            isChecked={formData.is_active}
            onChange={handleSwitchChange("is_active")}
            disabled={updateFeed.isPending}
          />
        </FormControl>

        <VStack spacing={2}>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={updateFeed.isPending}
            loadingText="更新中..."
          >
            フィードを更新
          </Button>

          {onCancel && (
            <Button
              variant="ghost"
              width="full"
              onClick={onCancel}
              disabled={updateFeed.isPending}
            >
              キャンセル
            </Button>
          )}
        </VStack>
      </VStack>
    </Box>
  );
}
