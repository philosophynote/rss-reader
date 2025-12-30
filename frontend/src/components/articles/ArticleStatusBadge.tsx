import React from "react";
import { HStack, Badge, Tooltip } from "@chakra-ui/react";
import type { Article } from "../../api";

interface ArticleStatusBadgeProps {
  article: Article;
  showImportanceScore?: boolean;
}

/**
 * 記事状態表示バッジコンポーネント
 */
export function ArticleStatusBadge({
  article,
  showImportanceScore = true,
}: ArticleStatusBadgeProps) {
  const formatScore = (score: number) => {
    return score.toFixed(2);
  };

  const getScoreColorScheme = (score: number) => {
    if (score >= 0.7) return "red";
    if (score >= 0.4) return "orange";
    return "gray";
  };

  return (
    <HStack spacing={2}>
      {/* 未読/既読状態 */}
      <Badge
        colorScheme={article.is_read ? "gray" : "blue"}
        size="sm"
        variant={article.is_read ? "subtle" : "solid"}
      >
        {article.is_read ? "既読" : "未読"}
      </Badge>

      {/* 保存状態 */}
      {article.is_saved && (
        <Badge colorScheme="orange" size="sm" variant="solid">
          保存済み
        </Badge>
      )}

      {/* 重要度スコア */}
      {showImportanceScore && (
        <Tooltip
          label={`重要度スコア: ${formatScore(article.importance_score)}`}
          placement="top"
        >
          <Badge
            colorScheme={getScoreColorScheme(article.importance_score)}
            size="sm"
            variant="subtle"
          >
            {formatScore(article.importance_score)}
          </Badge>
        </Tooltip>
      )}
    </HStack>
  );
}
