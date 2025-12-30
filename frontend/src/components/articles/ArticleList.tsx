import React, { useMemo, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Button,
  HStack,
  VStack,
  Skeleton,
  Alert,
  AlertIcon,
  Link,
  useColorModeValue,
  Flex,
  Spacer,
} from "@chakra-ui/react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { FiExternalLink } from "react-icons/fi";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useArticles } from "../../hooks";
import { ApiAuthError, ApiError } from "../../api";
import type { Article, ArticleListParams } from "../../api";
import { ArticleStatusBadge } from "./ArticleStatusBadge";
import { ArticleActionButtons } from "./ArticleActionButtons";
import { ArticleSortControls } from "./ArticleSortControls";
import { ArticleFilterControls } from "./ArticleFilterControls";

interface ArticleListProps {
  onArticleClick?: (article: Article) => void;
}

const columnHelper = createColumnHelper<Article>();

/**
 * 記事一覧コンポーネント（統合版）
 */
export function ArticleList({ onArticleClick }: ArticleListProps) {
  const [params, setParams] = useState<ArticleListParams>({
    sort_by: "published_at",
    filter_by: undefined,
    limit: 50,
  });

  const { data: articleData, isLoading, error } = useArticles(params);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // テーブルの背景色
  const tableBg = useColorModeValue("white", "gray.800");
  const hoverBg = useColorModeValue("gray.50", "gray.700");

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MM/dd HH:mm", { locale: ja });
    } catch {
      return "不明";
    }
  };

  const handleRowClick = (article: Article) => {
    onArticleClick?.(article);
  };

  const handleSortChange = (sortBy: ArticleListParams["sort_by"]) => {
    setParams((prev) => ({ ...prev, sort_by: sortBy }));
  };

  const handleFilterChange = (filterBy: ArticleListParams["filter_by"]) => {
    setParams((prev) => ({ ...prev, filter_by: filterBy }));
  };

  // 記事数の統計を計算
  const counts = useMemo(() => {
    if (!articleData?.articles) return undefined;

    const articles = articleData.articles;
    return {
      total: articles.length,
      unread: articles.filter((a) => !a.is_read).length,
      read: articles.filter((a) => a.is_read).length,
      saved: articles.filter((a) => a.is_saved).length,
    };
  }, [articleData?.articles]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("is_read", {
        id: "status",
        header: "状態",
        cell: ({ row }) => {
          const article = row.original;
          return <ArticleStatusBadge article={article} />;
        },
        enableSorting: false,
        size: 150,
      }),
      columnHelper.accessor("title", {
        header: "タイトル",
        cell: ({ getValue, row }) => {
          const article = row.original;
          return (
            <VStack align="start" spacing={1}>
              <Text
                fontWeight={article.is_read ? "normal" : "bold"}
                color={article.is_read ? "gray.600" : "inherit"}
                cursor="pointer"
                _hover={{ color: "blue.500" }}
                onClick={() => handleRowClick(article)}
                noOfLines={2}
              >
                {getValue()}
              </Text>
              <HStack spacing={2} fontSize="sm" color="gray.500">
                <Text>フィード: {article.feed_id}</Text>
                <Link href={article.link} isExternal>
                  <HStack spacing={1}>
                    <Text>元記事</Text>
                    <FiExternalLink size={12} />
                  </HStack>
                </Link>
              </HStack>
            </VStack>
          );
        },
        enableSorting: false,
        minSize: 300,
      }),
      columnHelper.accessor("published_at", {
        header: "公開日時",
        cell: ({ getValue }) => (
          <Text fontSize="sm" whiteSpace="nowrap">
            {formatDate(getValue())}
          </Text>
        ),
        sortingFn: "datetime",
        size: 120,
      }),
      columnHelper.display({
        id: "actions",
        header: "操作",
        cell: ({ row }) => {
          const article = row.original;
          return <ArticleActionButtons article={article} />;
        },
        enableSorting: false,
        size: 150,
      }),
    ],
    [onArticleClick]
  );

  const table = useReactTable({
    data: articleData?.articles || [],
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return (
      <VStack spacing={4} align="stretch">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height="60px" borderRadius="md" />
        ))}
      </VStack>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error instanceof ApiAuthError
          ? "認証エラー: API Keyを確認してください"
          : error instanceof ApiError
          ? error.message
          : "記事一覧の取得に失敗しました"}
      </Alert>
    );
  }

  return (
    <VStack spacing={4} align="stretch">
      {/* コントロール */}
      <Flex wrap="wrap" gap={4}>
        <ArticleSortControls
          sortBy={params.sort_by}
          onSortChange={handleSortChange}
        />
        <Spacer />
        <ArticleFilterControls
          filterBy={params.filter_by}
          onFilterChange={handleFilterChange}
          counts={counts}
        />
      </Flex>

      {/* テーブル */}
      {!articleData?.articles || articleData.articles.length === 0 ? (
        <Box textAlign="center" py={8}>
          <Text color="gray.500">
            {params.filter_by
              ? "フィルタ条件に一致する記事がありません"
              : "記事がありません"}
          </Text>
        </Box>
      ) : (
        <Box>
          <Box overflowX="auto">
            <Table variant="simple" bg={tableBg}>
              <Thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Th
                        key={header.id}
                        cursor={
                          header.column.getCanSort() ? "pointer" : "default"
                        }
                        onClick={header.column.getToggleSortingHandler()}
                        width={header.getSize()}
                      >
                        <HStack spacing={2}>
                          <Text>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </Text>
                          {header.column.getCanSort() && (
                            <Text fontSize="xs" color="gray.400">
                              {{
                                asc: "↑",
                                desc: "↓",
                              }[header.column.getIsSorted() as string] ?? "↕"}
                            </Text>
                          )}
                        </HStack>
                      </Th>
                    ))}
                  </Tr>
                ))}
              </Thead>
              <Tbody>
                {table.getRowModel().rows.map((row) => (
                  <Tr key={row.id} _hover={{ bg: hoverBg }} cursor="pointer">
                    {row.getVisibleCells().map((cell) => (
                      <Td key={cell.id} py={3}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {articleData.last_evaluated_key && (
            <Box mt={4} textAlign="center">
              <Button variant="outline" size="sm">
                さらに読み込む
              </Button>
            </Box>
          )}
        </Box>
      )}
    </VStack>
  );
}
