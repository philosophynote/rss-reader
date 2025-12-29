import { useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Link,
  Select,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Article,
  ArticleFilterBy,
  ArticleSortBy,
  ArticleUpdatePayload,
  getArticles,
  isApiError,
  updateArticle,
} from './api'

type FilterSelection = 'all' | ArticleFilterBy

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '未取得'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleString('ja-JP')
}

const formatScore = (score: number) => `${Math.round(score * 100)}%`

const formatPreview = (content: string) => {
  const trimmed = content.trim()
  if (!trimmed) {
    return ''
  }
  if (trimmed.length <= 80) {
    return trimmed
  }
  return `${trimmed.slice(0, 80)}...`
}

const statusBadgeColor = (article: Article) => {
  if (article.is_saved) {
    return 'yellow'
  }
  if (article.is_read) {
    return 'gray'
  }
  return 'green'
}

const statusLabel = (article: Article) => {
  if (article.is_saved) {
    return '保存済み'
  }
  if (article.is_read) {
    return '既読'
  }
  return '未読'
}

function ArticleManagementPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [sortBy, setSortBy] = useState<ArticleSortBy>('published_at')
  const [filterBy, setFilterBy] = useState<FilterSelection>('all')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['articles', sortBy, filterBy],
    queryFn: () =>
      getArticles({
        sortBy,
        filterBy: filterBy === 'all' ? undefined : filterBy,
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      articleId,
      payload,
    }: {
      articleId: string
      payload: ArticleUpdatePayload
    }) => updateArticle(articleId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] })
    },
    onError: () => {
      toast({
        status: 'error',
        title: '記事の更新に失敗しました。',
      })
    },
  })

  const articles = useMemo(() => data?.items ?? [], [data])

  const handleToggleRead = (article: Article) => {
    updateMutation.mutate({
      articleId: article.article_id,
      payload: { is_read: !article.is_read },
    })
  }

  const handleToggleSaved = (article: Article) => {
    updateMutation.mutate({
      articleId: article.article_id,
      payload: { is_saved: !article.is_saved },
    })
  }

  return (
    <Stack spacing={8}>
      <Box>
        <Heading size="lg" mb={2}>
          記事管理
        </Heading>
        <Text color="gray.600">
          取得済みの記事を既読・保存の状態で管理します。
        </Text>
      </Box>

      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack spacing={4} justify="space-between" flexWrap="wrap">
          <Heading size="md">記事一覧</Heading>
          <HStack spacing={3}>
            <Select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as ArticleSortBy)
              }
              maxW="200px"
            >
              <option value="published_at">新着順</option>
              <option value="importance_score">重要度順</option>
            </Select>
            <Select
              value={filterBy}
              onChange={(event) =>
                setFilterBy(event.target.value as FilterSelection)
              }
              maxW="200px"
            >
              <option value="all">すべて</option>
              <option value="unread">未読のみ</option>
              <option value="read">既読のみ</option>
              <option value="saved">保存のみ</option>
            </Select>
            <Badge colorScheme="purple">{articles.length} 件</Badge>
          </HStack>
        </HStack>

        {isLoading && <Text mt={4}>読み込み中...</Text>}

        {isError && (
          <Alert status="error" mt={4}>
            <AlertIcon />
            <AlertDescription>
              記事一覧の取得に失敗しました。
              {isApiError(error) ? ` (ステータス: ${error.status})` : ''}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && articles.length === 0 && (
          <Text mt={4} color="gray.500">
            表示できる記事がありません。
          </Text>
        )}

        {articles.length > 0 && (
          <TableContainer mt={4} borderWidth="1px" borderRadius="md">
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>タイトル</Th>
                  <Th>フィード</Th>
                  <Th>公開日時</Th>
                  <Th>重要度</Th>
                  <Th>状態</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {articles.map((article) => (
                  <Tr key={article.article_id}>
                    <Td>
                      <Stack spacing={1}>
                        <Link
                          href={article.link}
                          isExternal
                          color="blue.600"
                          fontWeight="medium"
                        >
                          {article.title}
                        </Link>
                        <Text fontSize="sm" color="gray.500">
                          {formatPreview(article.content)}
                        </Text>
                      </Stack>
                    </Td>
                    <Td>
                      <Text fontSize="sm">{article.feed_id}</Text>
                    </Td>
                    <Td>{formatDateTime(article.published_at)}</Td>
                    <Td>{formatScore(article.importance_score)}</Td>
                    <Td>
                      <Badge colorScheme={statusBadgeColor(article)}>
                        {statusLabel(article)}
                      </Badge>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleRead(article)}
                          isLoading={updateMutation.isPending}
                        >
                          {article.is_read ? '未読にする' : '既読にする'}
                        </Button>
                        <Button
                          size="sm"
                          colorScheme={article.is_saved ? 'yellow' : 'blue'}
                          variant="outline"
                          onClick={() => handleToggleSaved(article)}
                          isLoading={updateMutation.isPending}
                        >
                          {article.is_saved ? '保存解除' : '保存'}
                        </Button>
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Stack>
  )
}

export default ArticleManagementPage
