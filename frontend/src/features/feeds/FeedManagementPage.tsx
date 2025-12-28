import { useMemo, useState } from 'react'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Switch,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createFeed,
  deleteFeed,
  Feed,
  FeedUpdatePayload,
  getFeeds,
  isApiError,
  updateFeed,
} from './api'

type FeedFormState = {
  url: string
  title: string
  folder: string
}

type FeedEditState = {
  feedId: string
  title: string
  folder: string
  isActive: boolean
}

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

const createEmptyForm = (): FeedFormState => ({
  url: '',
  title: '',
  folder: '',
})

const createEditState = (feed: Feed): FeedEditState => ({
  feedId: feed.feed_id,
  title: feed.title,
  folder: feed.folder ?? '',
  isActive: feed.is_active,
})

function FeedManagementPage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [formState, setFormState] = useState<FeedFormState>(createEmptyForm())
  const [editState, setEditState] = useState<FeedEditState | null>(null)
  const editModal = useDisclosure()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['feeds'],
    queryFn: getFeeds,
  })

  const createMutation = useMutation({
    mutationFn: createFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      setFormState(createEmptyForm())
      toast({
        status: 'success',
        title: 'フィードを登録しました。',
      })
    },
    onError: (mutationError) => {
      toast({
        status: 'error',
        title: 'フィード登録に失敗しました。',
        description: isApiError(mutationError)
          ? `ステータス: ${mutationError.status}`
          : '通信エラーが発生しました。',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      feedId,
      payload,
    }: {
      feedId: string
      payload: FeedUpdatePayload
    }) => updateFeed(feedId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      toast({
        status: 'success',
        title: 'フィードを更新しました。',
      })
    },
    onError: () => {
      toast({
        status: 'error',
        title: 'フィード更新に失敗しました。',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFeed,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] })
      toast({
        status: 'success',
        title: 'フィードを削除しました。',
      })
    },
    onError: () => {
      toast({
        status: 'error',
        title: 'フィード削除に失敗しました。',
      })
    },
  })

  const feeds = useMemo(() => data?.items ?? [], [data])

  const handleCreateSubmit = () => {
    if (!formState.url.trim()) {
      toast({
        status: 'warning',
        title: 'URLを入力してください。',
      })
      return
    }

    createMutation.mutate({
      url: formState.url.trim(),
      title: formState.title.trim() || undefined,
      folder: formState.folder.trim() || undefined,
    })
  }

  const handleOpenEdit = (feed: Feed) => {
    setEditState(createEditState(feed))
    editModal.onOpen()
  }

  const handleCloseEdit = () => {
    editModal.onClose()
    setEditState(null)
  }

  const handleSaveEdit = () => {
    if (!editState) {
      return
    }

    updateMutation.mutate({
      feedId: editState.feedId,
      payload: {
        title: editState.title.trim(),
        folder: editState.folder.trim(),
        is_active: editState.isActive,
      },
    })
    handleCloseEdit()
  }

  const handleToggleActive = (feed: Feed) => {
    updateMutation.mutate({
      feedId: feed.feed_id,
      payload: {
        is_active: !feed.is_active,
      },
    })
  }

  const handleDelete = (feed: Feed) => {
    deleteMutation.mutate(feed.feed_id)
  }

  return (
    <Stack spacing={8}>
      <Box>
        <Heading size="lg" mb={2}>
          フィード管理
        </Heading>
        <Text color="gray.600">
          登録済みのRSSフィードを追加・更新・削除します。
        </Text>
      </Box>

      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <Heading size="md" mb={4}>
          新規フィード登録
        </Heading>
        <Stack spacing={4}>
          <FormControl isRequired>
            <FormLabel>RSSフィードURL</FormLabel>
            <Input
              placeholder="https://example.com/rss.xml"
              value={formState.url}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  url: event.target.value,
                }))
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel>タイトル</FormLabel>
            <Input
              placeholder="フィードタイトル"
              value={formState.title}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  title: event.target.value,
                }))
              }
            />
          </FormControl>
          <FormControl>
            <FormLabel>フォルダ</FormLabel>
            <Input
              placeholder="フォルダ名"
              value={formState.folder}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  folder: event.target.value,
                }))
              }
            />
          </FormControl>
          <Button
            colorScheme="blue"
            alignSelf="flex-start"
            onClick={handleCreateSubmit}
            isLoading={createMutation.isPending}
          >
            登録する
          </Button>
        </Stack>
      </Box>

      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm">
        <HStack justify="space-between" mb={4}>
          <Heading size="md">登録済みフィード</Heading>
          <Badge colorScheme="purple">{feeds.length} 件</Badge>
        </HStack>

        {isLoading && <Text>読み込み中...</Text>}

        {isError && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            <AlertDescription>
              フィード一覧の取得に失敗しました。
              {isApiError(error) ? ` (ステータス: ${error.status})` : ''}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && feeds.length === 0 && (
          <Text color="gray.500">まだフィードが登録されていません。</Text>
        )}

        {feeds.length > 0 && (
          <TableContainer borderWidth="1px" borderRadius="md">
            <Table variant="simple">
              <Thead bg="gray.50">
                <Tr>
                  <Th>タイトル</Th>
                  <Th>URL</Th>
                  <Th>フォルダ</Th>
                  <Th>最終取得</Th>
                  <Th>状態</Th>
                  <Th>操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {feeds.map((feed) => (
                  <Tr key={feed.feed_id}>
                    <Td fontWeight="medium">{feed.title}</Td>
                    <Td color="blue.600">{feed.url}</Td>
                    <Td>{feed.folder ?? '未分類'}</Td>
                    <Td>{formatDateTime(feed.last_fetched_at)}</Td>
                    <Td>
                      <HStack spacing={2}>
                        <Switch
                          colorScheme="green"
                          isChecked={feed.is_active}
                          onChange={() => handleToggleActive(feed)}
                          isDisabled={updateMutation.isPending}
                        />
                        <Text fontSize="sm" color="gray.600">
                          {feed.is_active ? '有効' : '無効'}
                        </Text>
                      </HStack>
                    </Td>
                    <Td>
                      <HStack spacing={2}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(feed)}
                        >
                          編集
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => handleDelete(feed)}
                          isLoading={deleteMutation.isPending}
                        >
                          削除
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

      <Modal isOpen={editModal.isOpen} onClose={handleCloseEdit}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>フィードを編集</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>タイトル</FormLabel>
                <Input
                  value={editState?.title ?? ''}
                  onChange={(event) =>
                    setEditState((prev) =>
                      prev
                        ? { ...prev, title: event.target.value }
                        : prev,
                    )
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>フォルダ</FormLabel>
                <Input
                  value={editState?.folder ?? ''}
                  onChange={(event) =>
                    setEditState((prev) =>
                      prev
                        ? { ...prev, folder: event.target.value }
                        : prev,
                    )
                  }
                />
              </FormControl>
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0}>有効</FormLabel>
                <Switch
                  colorScheme="green"
                  isChecked={editState?.isActive ?? false}
                  onChange={(event) =>
                    setEditState((prev) =>
                      prev
                        ? { ...prev, isActive: event.target.checked }
                        : prev,
                    )
                  }
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseEdit}>
              キャンセル
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSaveEdit}
              isLoading={updateMutation.isPending}
            >
              保存する
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  )
}

export default FeedManagementPage
