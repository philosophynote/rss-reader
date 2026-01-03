import { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Box,
  Button,
  FieldRoot,
  FieldLabel,
  FieldErrorText,
  Input,
  SwitchRoot,
  SwitchHiddenInput,
  SwitchControl,
  VStack,
  createToaster,
  AlertRoot,
  AlertIndicator,
  AlertContent,
} from "@chakra-ui/react";
import { useUpdateFeed } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Feed, UpdateFeedRequest } from "../../api";

// toasterを作成
const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

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
    folder: feed.folder ?? "",
    is_active: feed.is_active,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFeed = useUpdateFeed();

  // フィードが変更された場合にフォームデータを更新
  useEffect(() => {
    setFormData({
      title: feed.title,
      folder: feed.folder ?? "",
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    void updateFeed
      .mutateAsync({
        feedId: feed.feed_id,
        data: {
          title: formData.title?.trim(),
          folder: formData.folder?.trim() ?? undefined,
          is_active: formData.is_active,
        },
      })
      .then(() => {
        toaster.create({
          title: "フィードを更新しました",
          type: "success",
          duration: 3000,
        });

        onSuccess?.();
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
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
      });
  };

  const handleInputChange =
    (field: keyof UpdateFeedRequest) =>
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
        {updateFeed.error && (
          <AlertRoot status="error">
            <AlertIndicator />
            <AlertContent>
              {updateFeed.error instanceof ApiAuthError
                ? "認証エラー: API Keyを確認してください"
                : updateFeed.error instanceof ApiError
                ? updateFeed.error.message
                : "フィードの更新に失敗しました"}
            </AlertContent>
          </AlertRoot>
        )}

        <FieldRoot invalid={!!errors.title} required>
          <FieldLabel>タイトル</FieldLabel>
          <Input
            value={formData.title ?? ""}
            onChange={handleInputChange("title")}
            placeholder="フィードのタイトル"
            disabled={updateFeed.isPending}
          />
          <FieldErrorText>{errors.title}</FieldErrorText>
        </FieldRoot>

        <FieldRoot invalid={!!errors.folder}>
          <FieldLabel>フォルダ（任意）</FieldLabel>
          <Input
            value={formData.folder ?? ""}
            onChange={handleInputChange("folder")}
            placeholder="例: テクノロジー"
            disabled={updateFeed.isPending}
          />
          <FieldErrorText>{errors.folder}</FieldErrorText>
        </FieldRoot>

        <FieldRoot display="flex" alignItems="center">
          <FieldLabel htmlFor="is-active" mb="0">
            アクティブ
          </FieldLabel>
          <SwitchRoot
            checked={formData.is_active}
            onCheckedChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                is_active: e.checked,
              }));
            }}
            disabled={updateFeed.isPending}
          >
            <SwitchHiddenInput id="is-active" />
            <SwitchControl />
          </SwitchRoot>
        </FieldRoot>

        <VStack gap={2}>
          <Button
            type="submit"
            colorPalette="blue"
            width="full"
            loading={updateFeed.isPending}
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
