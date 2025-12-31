import React from "react";
import { HStack, Text, Button, ButtonGroup, Icon } from "@chakra-ui/react";
import { FiClock, FiTrendingUp } from "react-icons/fi";
import type { ArticleListParams } from "../../api";

interface ArticleSortControlsProps {
  sortBy: ArticleListParams["sort_by"];
  onSortChange: (sortBy: ArticleListParams["sort_by"]) => void;
}

/**
 * 記事ソート制御コンポーネント
 */
export function ArticleSortControls({
  sortBy,
  onSortChange,
}: ArticleSortControlsProps) {
  return (
    <HStack spacing={4}>
      <Text fontSize="sm" fontWeight="medium" color="gray.600">
        並び順:
      </Text>

      <ButtonGroup size="sm" isAttached variant="outline">
        <Button
          colorScheme={sortBy === "published_at" ? "blue" : "gray"}
          variant={sortBy === "published_at" ? "solid" : "outline"}
          onClick={() => onSortChange("published_at")}
          className={`chakra-button--size-sm chakra-button--variant-${sortBy === "published_at" ? "solid" : "outline"}`}
        >
          <Icon as={FiClock} />
          時系列順
        </Button>

        <Button
          colorScheme={sortBy === "importance_score" ? "blue" : "gray"}
          variant={sortBy === "importance_score" ? "solid" : "outline"}
          onClick={() => onSortChange("importance_score")}
          className={`chakra-button--size-sm chakra-button--variant-${sortBy === "importance_score" ? "solid" : "outline"}`}
        >
          <Icon as={FiTrendingUp} />
          重要度順
        </Button>
      </ButtonGroup>
    </HStack>
  );
}
