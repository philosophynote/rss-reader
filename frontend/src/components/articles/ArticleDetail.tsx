import React from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Link,
  Separator,
  CardRoot,
  CardBody,
  Skeleton,
  AlertRoot,
  AlertIndicator,
  AlertContent,
  Badge,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import { FiExternalLink, FiCalendar, FiTrendingUp } from "react-icons/fi";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useArticle, useArticleReasons } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Article } from "../../api";
import { ArticleStatusBadge } from "./ArticleStatusBadge";
import { ArticleActionButtons } from "./ArticleActionButtons";

interface ArticleDetailProps {
  articleId: string;
  onClose?: () => void;
}

/**
 * 記事詳細コンポーネント
 */
export function ArticleDetail({ articleId, onClose }: ArticleDetailProps) {
  const {
    data: article,
    isLoading: articleLoading,
    error: articleError,
  } = useArticle(articleId);
  const {
    data: reasons,
    isLoading: reasonsLoading,
    error: reasonsError,
  } = useArticleReasons(articleId);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "yyyy年MM月dd日 HH:mm", {
        locale: ja,
      });
    } catch {
      return "不明";
    }
  };

  const formatScore = (score: number) => {
    return score.toFixed(3);
  };

  if (articleLoading) {
    return (
      <VStack spacing={4} align="stretch" p={6}>
        <Skeleton height="40px" data-testid="skeleton" />
        <Skeleton height="20px" data-testid="skeleton" />
        <Skeleton height="200px" data-testid="skeleton" />
        <Skeleton height="100px" data-testid="skeleton" />
      </VStack>
    );
  }

  if (articleError || !article) {
    return (
      <AlertRoot status="error" m={6}>
        <AlertIndicator />
        <AlertContent>
          {articleError instanceof ApiAuthError
            ? "認証エラー: API Keyを確認してください"
            : articleError instanceof ApiError
            ? articleError.message
            : "記事の取得に失敗しました"}
        </AlertContent>
      </AlertRoot>
    );
  }

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <VStack spacing={6} align="stretch">
        {/* ヘッダー */}
        <Box>
          <Flex mb={4}>
            <ArticleStatusBadge article={article} />
            <Spacer />
            <ArticleActionButtons
              article={article}
              size="md"
              variant="outline"
            />
          </Flex>

          <Heading size="lg" mb={4} lineHeight="1.4">
            {article.title}
          </Heading>

          <HStack spacing={4} fontSize="sm" color="gray.500" mb={4}>
            <HStack>
              <FiCalendar />
              <Text>公開: {formatDate(article.published_at)}</Text>
            </HStack>
            <HStack>
              <FiTrendingUp />
              <Text>重要度: {formatScore(article.importance_score)}</Text>
            </HStack>
          </HStack>

          <Link
            href={article.link}
            isExternal
            color="blue.500"
            fontSize="sm"
            display="inline-flex"
            alignItems="center"
            gap={1}
          >
            元記事を開く
            <FiExternalLink size={12} />
          </Link>
        </Box>

        <Separator />

        {/* 記事内容 */}
        <CardRoot variant="outline">
          <CardBody>
            <Box
              bg="white"
              p={4}
              borderRadius="md"
              border="1px"
              borderColor="gray.200"
              fontSize="md"
              lineHeight="1.7"
              whiteSpace="pre-wrap"
              sx={{
                "& p": {
                  mb: 4,
                },
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                  fontWeight: "bold",
                  mb: 3,
                  mt: 4,
                },
                "& ul, & ol": {
                  pl: 6,
                  mb: 4,
                },
                "& li": {
                  mb: 1,
                },
                "& blockquote": {
                  borderLeft: "4px solid",
                  borderColor: "blue.200",
                  pl: 4,
                  fontStyle: "italic",
                  mb: 4,
                },
                "& code": {
                  bg: "gray.100",
                  px: 1,
                  py: 0.5,
                  borderRadius: "sm",
                  fontSize: "sm",
                },
                "& pre": {
                  bg: "gray.100",
                  p: 4,
                  borderRadius: "md",
                  overflowX: "auto",
                  mb: 4,
                },
              }}
            >
              {article.content || "記事の内容がありません。"}
            </Box>
          </CardBody>
        </CardRoot>

        {/* 重要度理由 */}
        {reasons && reasons.length > 0 && (
          <CardRoot variant="outline">
            <CardBody>
              <Heading size="md" mb={4}>
                重要度の理由
              </Heading>

              {reasonsLoading ? (
                <VStack spacing={2}>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} height="40px" />
                  ))}
                </VStack>
              ) : reasonsError ? (
                <AlertRoot status="warning" size="sm">
                  <AlertIndicator />
                  <AlertContent>重要度理由の取得に失敗しました</AlertContent>
                </AlertRoot>
              ) : (
                <VStack spacing={3} align="stretch">
                  {reasons.map((reason, index) => (
                    <Box
                      key={index}
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                    >
                      <HStack justify="space-between" mb={2}>
                        <Badge colorScheme="blue" variant="subtle">
                          {reason.keyword_text}
                        </Badge>
                        <Text fontSize="sm" fontWeight="bold" color="green.500">
                          +{reason.contribution.toFixed(3)}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        類似度: {reason.similarity_score.toFixed(3)}
                      </Text>
                    </Box>
                  ))}

                  <Box mt={2} p={3} bg="blue.50" borderRadius="md">
                    <HStack justify="space-between">
                      <Text fontWeight="bold">合計重要度スコア</Text>
                      <Text fontWeight="bold" color="blue.600">
                        {formatScore(article.importance_score)}
                      </Text>
                    </HStack>
                  </Box>
                </VStack>
              )}
            </CardBody>
          </CardRoot>
        )}

        {/* メタデータ */}
        <CardRoot variant="outline">
          <CardBody>
            <Heading size="sm" mb={3}>
              記事情報
            </Heading>
            <VStack spacing={2} align="stretch" fontSize="sm">
              <HStack justify="space-between">
                <Text color="gray.600">記事ID:</Text>
                <Text fontFamily="mono">{article.article_id}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.600">フィードID:</Text>
                <Text fontFamily="mono">{article.feed_id}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="gray.600">作成日時:</Text>
                <Text>{formatDate(article.created_at)}</Text>
              </HStack>
              {article.read_at && (
                <HStack justify="space-between">
                  <Text color="gray.600">既読日時:</Text>
                  <Text>{formatDate(article.read_at)}</Text>
                </HStack>
              )}
            </VStack>
          </CardBody>
        </CardRoot>
      </VStack>
    </Box>
  );
}
