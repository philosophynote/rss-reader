import React from "react";
import {
  HStack,
  Text,
  Button,
  ButtonGroup,
  Icon,
  Badge,
} from "@chakra-ui/react";
import { FiList, FiEye, FiEyeOff, FiBookmark } from "react-icons/fi";
import type { ArticleListParams } from "../../api";

interface ArticleFilterControlsProps {
  filterBy: ArticleListParams["filter_by"];
  onFilterChange: (filterBy: ArticleListParams["filter_by"]) => void;
  counts?: {
    total: number;
    unread: number;
    read: number;
    saved: number;
  };
}

/**
 * 記事フィルタ制御コンポーネント
 */
export function ArticleFilterControls({
  filterBy,
  onFilterChange,
  counts,
}: ArticleFilterControlsProps) {
  const filterOptions = [
    {
      value: undefined,
      label: "すべて",
      icon: FiList,
      count: counts?.total,
    },
    {
      value: "unread" as const,
      label: "未読",
      icon: FiEyeOff,
      count: counts?.unread,
    },
    {
      value: "read" as const,
      label: "既読",
      icon: FiEye,
      count: counts?.read,
    },
    {
      value: "saved" as const,
      label: "保存済み",
      icon: FiBookmark,
      count: counts?.saved,
    },
  ];

  return (
    <HStack spacing={4}>
      <Text fontSize="sm" fontWeight="medium" color="gray.600">
        フィルタ:
      </Text>

      <ButtonGroup size="sm" variant="outline" spacing={2}>
        {filterOptions.map((option) => (
          <Button
            key={option.value || "all"}
            colorScheme={filterBy === option.value ? "blue" : "gray"}
            variant={filterBy === option.value ? "solid" : "outline"}
            onClick={() => onFilterChange(option.value)}
          >
            <HStack spacing={2}>
              <Icon as={option.icon} />
              <Text>{option.label}</Text>
              {option.count !== undefined && (
                <Badge
                  colorScheme={filterBy === option.value ? "white" : "gray"}
                  variant={filterBy === option.value ? "solid" : "subtle"}
                  fontSize="xs"
                >
                  {option.count}
                </Badge>
              )}
            </HStack>
          </Button>
        ))}
      </ButtonGroup>
    </HStack>
  );
}
