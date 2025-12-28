export type Feed = {
  feed_id: string
  url: string
  title: string
  folder?: string | null
  last_fetched_at?: string | null
  is_active: boolean
  created_at: string
  updated_at?: string | null
}

export type FeedListResponse = {
  items: Feed[]
}

export type FeedCreatePayload = {
  url: string
  title?: string
  folder?: string
}

export type FeedUpdatePayload = {
  title?: string
  folder?: string | null
  is_active?: boolean
}

class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

const buildUrl = (path: string) => `${apiBaseUrl}${path}`

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const details = await parseJson(response)
    throw new ApiError('APIリクエストに失敗しました。', response.status, details)
  }

  return (await parseJson(response)) as T
}

export const getFeeds = async (): Promise<FeedListResponse> => {
  return await request<FeedListResponse>('/api/feeds')
}

export const createFeed = async (
  payload: FeedCreatePayload,
): Promise<Feed> => {
  return await request<Feed>('/api/feeds', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const updateFeed = async (
  feedId: string,
  payload: FeedUpdatePayload,
): Promise<Feed> => {
  return await request<Feed>(`/api/feeds/${feedId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export const deleteFeed = async (feedId: string): Promise<void> => {
  await request<void>(`/api/feeds/${feedId}`, {
    method: 'DELETE',
  })
}

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError
}
