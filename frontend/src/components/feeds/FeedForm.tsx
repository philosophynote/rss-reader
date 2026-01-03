import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Box,
  Button,
  Field,
  Input,
  VStack,
  Alert,
  createToaster,
} from "@chakra-ui/react";
import { useCreateFeed } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { CreateFeedRequest } from "../../api";

// toasterを作成
const toaster = createToaster({
  placement: "top",
});

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    void createFeed
      .mutateAsync({
        url: formData.url.trim(),
        folder: formData.folder?.trim() || undefined,
      })
      .then(() => {
        toaster.create({
          title: "フィードを追加しました",
          type: "success",
          duration: 3000,
        });

        // フォームをリセット
        setFormData({ url: "", folder: "" });
        setErrors({});

        onSuccess?.();
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("フィード作成エラー:", error);

        let errorMessage = "フィードの追加に失敗しました";
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

  const handleInputChange =
    (field: keyof CreateFeedRequest) =>
    (e: ChangeEvent<HTMLInputElement>) => {
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
      <VStack gap={4} align="stretch">
        {createFeed.error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>エラー</Alert.Title>
              <Alert.Description>
                {createFeed.error instanceof ApiAuthError
                  ? "認証エラー: API Keyを確認してください"
                  : createFeed.error instanceof ApiError
                  ? createFeed.error.message
                  : "フィードの追加に失敗しました"}
              </Alert.Description>
            </Alert.Content>
          </Alert.Root>
        )}

        <Field.Root invalid={!!errors.url} required>
          <Field.Label>フィードURL</Field.Label>
          <Input
            type="url"
            value={formData.url}
            onChange={handleInputChange("url")}
            placeholder="https://example.com/feed.xml"
            disabled={createFeed.isPending}
          />
          {errors.url && <Field.ErrorText>{errors.url}</Field.ErrorText>}
        </Field.Root>

        <Field.Root invalid={!!errors.folder}>
          <Field.Label>フォルダ（任意）</Field.Label>
          <Input
            value={formData.folder ?? ""}
            onChange={handleInputChange("folder")}
            placeholder="例: テクノロジー"
            disabled={createFeed.isPending}
          />
          {errors.folder && <Field.ErrorText>{errors.folder}</Field.ErrorText>}
        </Field.Root>

        <VStack gap={2}>
          <Button
            type="submit"
            colorPalette="blue"
            width="full"
            loading={createFeed.isPending}
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
