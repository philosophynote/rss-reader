import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  FieldRoot,
  FieldLabel,
  FieldErrorText,
  FieldHelperText,
  Input,
  NumberInput,
  SwitchRoot,
  SwitchHiddenInput,
  SwitchControl,
  SwitchThumb,
  VStack,
  createToaster,
  AlertRoot,
  AlertIndicator,
  AlertContent,
} from "@chakra-ui/react";
import { useUpdateKeyword } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Keyword, UpdateKeywordRequest } from "../../api";

// toasterを作成
const toaster = createToaster({
  placement: "top",
  duration: 3000,
});

interface KeywordEditFormProps {
  keyword: Keyword;
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * キーワード編集フォームコンポーネント
 */
export function KeywordEditForm({
  keyword,
  onSuccess,
  onCancel,
}: KeywordEditFormProps) {
  const [formData, setFormData] = useState<UpdateKeywordRequest>({
    text: keyword.text,
    weight: keyword.weight,
    is_active: keyword.is_active,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateKeyword = useUpdateKeyword();

  // キーワードが変更された場合にフォームデータを更新
  useEffect(() => {
    setFormData({
      text: keyword.text,
      weight: keyword.weight,
      is_active: keyword.is_active,
    });
  }, [keyword]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // テキスト必須チェック
    if (!formData.text?.trim()) {
      newErrors.text = "キーワードは必須です";
    } else if (formData.text.trim().length < 2) {
      newErrors.text = "キーワードは2文字以上で入力してください";
    } else if (formData.text.trim().length > 50) {
      newErrors.text = "キーワードは50文字以内で入力してください";
    }

    // 重み値チェック
    if (formData.weight !== undefined) {
      if (formData.weight < 0.1) {
        newErrors.weight = "重みは0.1以上で入力してください";
      } else if (formData.weight > 10.0) {
        newErrors.weight = "重みは10.0以下で入力してください";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    void updateKeyword
      .mutateAsync({
        keywordId: keyword.keyword_id,
        data: {
          text: formData.text?.trim(),
          weight: formData.weight,
          is_active: formData.is_active,
        },
      })
      .then(() => {
        toaster.create({
          title: "キーワードを更新しました",
          type: "success",
          duration: 3000,
        });

        onSuccess?.();
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error("キーワード更新エラー:", error);

        let errorMessage = "キーワードの更新に失敗しました";
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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      text: e.target.value,
    }));

    // エラーをクリア
    if (errors.text) {
      setErrors((prev) => ({
        ...prev,
        text: "",
      }));
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={4} align="stretch">
        {updateKeyword.error && (
          <AlertRoot status="error">
            <AlertIndicator />
            <AlertContent>
              {updateKeyword.error instanceof ApiAuthError
                ? "認証エラー: API Keyを確認してください"
                : updateKeyword.error instanceof ApiError
                ? updateKeyword.error.message
                : "キーワードの更新に失敗しました"}
            </AlertContent>
          </AlertRoot>
        )}

        <FieldRoot invalid={!!errors.text} required>
          <FieldLabel>キーワード</FieldLabel>
          <Input
            value={formData.text ?? ""}
            onChange={handleTextChange}
            placeholder="例: Python, 機械学習, React"
            disabled={updateKeyword.isPending}
          />
          <FieldErrorText>{errors.text}</FieldErrorText>
        </FieldRoot>

        <FieldRoot invalid={!!errors.weight}>
          <FieldLabel>重み</FieldLabel>
          <NumberInput.Root
            value={formData.weight?.toString()}
            onValueChange={(details) => {
              setFormData((prev) => ({
                ...prev,
                weight: details.valueAsNumber,
              }));
              // エラーをクリア
              if (errors.weight) {
                setErrors((prev) => ({
                  ...prev,
                  weight: "",
                }));
              }
            }}
            min={0.1}
            max={10.0}
            step={0.1}
            disabled={updateKeyword.isPending}
          >
            <NumberInput.Control />
            <NumberInput.Input />
          </NumberInput.Root>
          <FieldHelperText>
            キーワードの重要度を調整できます（0.1〜10.0）
          </FieldHelperText>
          <FieldErrorText>{errors.weight}</FieldErrorText>
        </FieldRoot>

        <FieldRoot display="flex" alignItems="center">
          <FieldLabel htmlFor="is-active" mb="0">
            有効
          </FieldLabel>
          <SwitchRoot
            checked={formData.is_active}
            onCheckedChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                is_active: e.checked,
              }));
            }}
            disabled={updateKeyword.isPending}
          >
            <SwitchHiddenInput id="is-active" />
            <SwitchControl>
              <SwitchThumb />
            </SwitchControl>
          </SwitchRoot>
          <FieldHelperText ml={3}>
            無効にすると重要度計算から除外されます
          </FieldHelperText>
        </FieldRoot>

        <VStack spacing={2}>
          <Button
            type="submit"
            colorPalette="blue"
            width="full"
            loading={updateKeyword.isPending}
            loadingText="更新中..."
          >
            キーワードを更新
          </Button>

          {onCancel && (
            <Button
              variant="ghost"
              width="full"
              onClick={onCancel}
              disabled={updateKeyword.isPending}
            >
              キャンセル
            </Button>
          )}
        </VStack>
      </VStack>
    </Box>
  );
}
