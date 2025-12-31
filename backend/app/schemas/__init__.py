"""APIスキーマパッケージ"""

from .article import (
    ArticleListResponse,
    ArticleReadUpdateRequest,
    ArticleResponse,
    ArticleSaveUpdateRequest,
)
from .feed import (
    FeedCreateRequest,
    FeedFetchListResponse,
    FeedFetchResponse,
    FeedListResponse,
    FeedResponse,
    FeedUpdateRequest,
)
from .job import JobCleanupResponse, JobFetchFeedsResponse
from .keyword import (
    KeywordCreateRequest,
    KeywordListResponse,
    KeywordRecalculateResponse,
    KeywordResponse,
    KeywordUpdateRequest,
)

__all__ = [
    "ArticleListResponse",
    "ArticleReadUpdateRequest",
    "ArticleResponse",
    "ArticleSaveUpdateRequest",
    "FeedCreateRequest",
    "FeedFetchListResponse",
    "FeedFetchResponse",
    "FeedListResponse",
    "FeedResponse",
    "FeedUpdateRequest",
    "JobCleanupResponse",
    "JobFetchFeedsResponse",
    "KeywordCreateRequest",
    "KeywordListResponse",
    "KeywordRecalculateResponse",
    "KeywordResponse",
    "KeywordUpdateRequest",
]
