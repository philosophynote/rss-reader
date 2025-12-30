"""APIルーター定義"""

from .articles import router as articles_router
from .feeds import router as feeds_router
from .jobs import router as jobs_router
from .keywords import router as keywords_router

__all__ = [
    "articles_router",
    "feeds_router",
    "jobs_router",
    "keywords_router",
]
