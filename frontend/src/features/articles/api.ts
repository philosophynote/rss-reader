export type Article = {
  article_id: string
  feed_id: string
  link: string
  title: string
  content: string
  published_at: string
  is_read: boolean
  is_saved: boolean
  importance_score: number
  read_at?: string | null
  created_at: string
  updated_at?: string | null
}

export type ArticleListResponse = {
  items: Article[]
}

export type ArticleUpdatePayload = {
  is_read?: boolean
  is_saved?: boolean
}

export type ArticleSortBy = 'published_at' | 'importance_score'
export type ArticleFilterBy = 'unread' | 'read' | 'saved'

type ArticleListParams = {
  sortBy?: ArticleSortBy
  filterBy?: ArticleFilterBy
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

const buildQuery = (params: ArticleListParams) => {
  const searchParams = new URLSearchParams()
  if (params.sortBy) {
    searchParams.set('sort_by', params.sortBy)
  }
  if (params.filterBy) {
    searchParams.set('filter_by', params.filterBy)
  }
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export const getArticles = async (
  params: ArticleListParams = {},
): Promise<ArticleListResponse> => {
  const query = buildQuery(params)
  return await request<ArticleListResponse>(`/api/articles${query}`)
}

export const updateArticle = async (
  articleId: string,
  payload: ArticleUpdatePayload,
): Promise<Article> => {
  return await request<Article>(`/api/articles/${articleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError
}
