import React, { useState } from "react";
import {
  Box,
  Button,
  Field,
  Input,
  NumberInput,
  VStack,
  Alert,
} from "@chakra-ui/react";
import { useCreateKeyword } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import { toaster } from "../../test/test-utils";
import type { CreateKeywordRequest } from "../../api";

interface KeywordFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * キーワード作成フォームコンポーネント
 */
export function KeywordForm({ onSuccess, onCancel }: KeywordFormProps) {
  const [formData, setFormData] = useState<CreateKeywordRequest>({
    text: "",
    weight: 1.0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createKeyword = useCreateKeyword();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // テキスト必須チェック
    if (!formData.text.trim()) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await createKeyword.mutateAsync({
        text: formData.text.trim(),
        weight: formData.weight,
      });

      toaster.create({
        title: "キーワードを追加しました",
        status: "success",
        duration: 3000,
      });

      // フォームをリセット
      setFormData({ text: "", weight: 1.0 });
      setErrors({});

      onSuccess?.();
    } catch (error) {
      console.error("キーワード作成エラー:", error);

      let errorMessage = "キーワードの追加に失敗しました";
      if (error instanceof ApiAuthError) {
        errorMessage = "認証エラー: API Keyを確認してください";
      } else if (error instanceof ApiError) {
        errorMessage = error.message;
      }

      toaster.create({
        title: "エラー",
        description: errorMessage,
        status: "error",
        duration: 5000,
      });
    }
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

  const handleWeightChange = (details: {
    value: string;
    valueAsNumber: number;
  }) => {
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
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {createKeyword.error && (
          <Alert.Root status="error">
            <Alert.Indicator />
            {createKeyword.error instanceof ApiAuthError
              ? "認証エラー: API Keyを確認してください"
              : createKeyword.error instanceof ApiError
              ? createKeyword.error.message
              : "キーワードの追加に失敗しました"}
          </Alert.Root>
        )}

        <Field.Root invalid={!!errors.text} required>
          <Field.Label>キーワード</Field.Label>
          <Input
            value={formData.text}
            onChange={handleTextChange}
            placeholder="例: Python, 機械学習, React"
            disabled={createKeyword.isPending}
          />
          <Field.HelperText>
            記事の重要度判定に使用するキーワードを入力してください
          </Field.HelperText>
          <Field.ErrorText>{errors.text}</Field.ErrorText>
        </Field.Root>

        <Field.Root invalid={!!errors.weight}>
          <Field.Label>重み（任意）</Field.Label>
          <NumberInput.Root
            value={formData.weight.toString()}
            onValueChange={handleWeightChange}
            min={0.1}
            max={10.0}
            step={0.1}
            disabled={createKeyword.isPending}
          >
            <NumberInput.Field />
            <NumberInput.Control>
              <NumberInput.IncrementTrigger />
              <NumberInput.DecrementTrigger />
            </NumberInput.Control>
          </NumberInput.Root>
          <Field.HelperText>
            キーワードの重要度を調整できます（0.1〜10.0、デフォルト: 1.0）
          </Field.HelperText>
          <Field.ErrorText>{errors.weight}</Field.ErrorText>
        </Field.Root>

        <VStack gap={2}>
          <Button
            type="submit"
            colorPalette="blue"
            width="full"
            loading={createKeyword.isPending}
          >
            {createKeyword.isPending ? "追加中..." : "キーワードを追加"}
          </Button>

          {onCancel && (
            <Button
              variant="ghost"
              width="full"
              onClick={onCancel}
              disabled={createKeyword.isPending}
            >
              キャンセル
            </Button>
          )}
        </VStack>
      </VStack>
    </Box>
  );
}
