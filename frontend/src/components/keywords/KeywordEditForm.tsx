import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  VStack,
  useToast,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useUpdateKeyword } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Keyword, UpdateKeywordRequest } from "../../api";

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

  const toast = useToast();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await updateKeyword.mutateAsync({
        keywordId: keyword.keyword_id,
        data: {
          text: formData.text?.trim(),
          weight: formData.weight,
          is_active: formData.is_active,
        },
      });

      toast({
        title: "キーワードを更新しました",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      onSuccess?.();
    } catch (error) {
      console.error("キーワード更新エラー:", error);

      let errorMessage = "キーワードの更新に失敗しました";
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

  const handleWeightChange = (valueString: string, valueNumber: number) => {
    setFormData((prev) => ({
      ...prev,
      weight: valueNumber,
    }));

    // エラーをクリア
    if (errors.weight) {
      setErrors((prev) => ({
        ...prev,
        weight: "",
      }));
    }
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      is_active: e.target.checked,
    }));
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <VStack spacing={4} align="stretch">
        {updateKeyword.error && (
          <Alert status="error">
            <AlertIcon />
            {updateKeyword.error instanceof ApiAuthError
              ? "認証エラー: API Keyを確認してください"
              : updateKeyword.error instanceof ApiError
              ? updateKeyword.error.message
              : "キーワードの更新に失敗しました"}
          </Alert>
        )}

        <FormControl isInvalid={!!errors.text} isRequired>
          <FormLabel>キーワード</FormLabel>
          <Input
            value={formData.text || ""}
            onChange={handleTextChange}
            placeholder="例: Python, 機械学習, React"
            disabled={updateKeyword.isPending}
          />
          <FormErrorMessage>{errors.text}</FormErrorMessage>
        </FormControl>

        <FormControl isInvalid={!!errors.weight}>
          <FormLabel>重み</FormLabel>
          <NumberInput
            value={formData.weight}
            onChange={handleWeightChange}
            min={0.1}
            max={10.0}
            step={0.1}
            precision={1}
            disabled={updateKeyword.isPending}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText>
            キーワードの重要度を調整できます（0.1〜10.0）
          </FormHelperText>
          <FormErrorMessage>{errors.weight}</FormErrorMessage>
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="is-active" mb="0">
            有効
          </FormLabel>
          <Switch
            id="is-active"
            isChecked={formData.is_active}
            onChange={handleActiveChange}
            disabled={updateKeyword.isPending}
          />
          <FormHelperText ml={3}>
            無効にすると重要度計算から除外されます
          </FormHelperText>
        </FormControl>

        <VStack spacing={2}>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={updateKeyword.isPending}
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
