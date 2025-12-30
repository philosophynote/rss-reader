import React, { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  VStack,
  useToast,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useCreateFeed } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { CreateFeedRequest } from "../../api";

interface FeedFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * フィード作成フォームコンポーネント
 */
export function FeedForm({ onSuccess, onCancel }: FeedFormProps) {
  const [formData, setFormData] = useState<CreateFeedRequest>({
    url: "",
    folder: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toast = useToast();
  const createFeed = useCreateFeed();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // URL必須チェック
    if (!formData.url.trim()) {
      newErrors.url = "フィードURLは必須です";
    } else {
      // URL形式チェック
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = "有効なURLを入力してください";
      }
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
      await createFeed.mutateAsync({
        url: formData.url.trim(),
        folder: formData.folder.trim() || undefined,
      });

      toast({
        title: "フィードを追加しました",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // フォームをリセット
      setFormData({ url: "", folder: "" });
      setErrors({});

      onSuccess?.();
    } catch (error) {
      console.error("フィード作成エラー:", error);

      let errorMessage = "フィードの追加に失敗しました";
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

  const handleInputChange =
    (field: keyof CreateFeedRequest) =>
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

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={4} align="stretch">
        {createFeed.error && (
          <Alert status="error">
            <AlertIcon />
            {createFeed.error instanceof ApiAuthError
              ? "認証エラー: API Keyを確認してください"
              : createFeed.error instanceof ApiError
              ? createFeed.error.message
              : "フィードの追加に失敗しました"}
          </Alert>
        )}

        <FormControl isInvalid={!!errors.url} isRequired>
          <FormLabel>フィードURL</FormLabel>
          <Input
            type="url"
            value={formData.url}
            onChange={handleInputChange("url")}
            placeholder="https://example.com/feed.xml"
            disabled={createFeed.isPending}
          />
          <FormErrorMessage>{errors.url}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.folder}>
          <FormLabel>フォルダ（任意）</FormLabel>
          <Input
            value={formData.folder}
            onChange={handleInputChange("folder")}
            placeholder="例: テクノロジー"
            disabled={createFeed.isPending}
          />
          <FormErrorMessage>{errors.folder}</FormErrorMessage>
        </FormControl>

        <VStack spacing={2}>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={createFeed.isPending}
            loadingText="追加中..."
          >
            フィードを追加
          </Button>

          {onCancel && (
            <Button
              variant="ghost"
              width="full"
              onClick={onCancel}
              disabled={createFeed.isPending}
            >
              キャンセル
            </Button>
          )}
        </VStack>
      </VStack>
    </Box>
  );
}
