"""
ジョブ実行API

フィード取得や記事クリーンアップのジョブを手動実行します。
"""

import importlib
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.feed import FeedFetchResponse
from app.schemas.job import JobCleanupResponse, JobFetchFeedsResponse
from app.security import verify_api_key
from app.services import FeedFetcherService

router = APIRouter(
    prefix="/api/jobs",
    tags=["jobs"],
    dependencies=[Depends(verify_api_key)],
)


def get_feed_fetcher_service() -> FeedFetcherService:
    """FeedFetcherServiceの依存性を提供"""
    return FeedFetcherService()


def _load_cleanup_service_class() -> type[Any] | None:
    """
    CleanupServiceのクラスを動的に取得します。

    Returns:
        type[Any] | None: CleanupServiceクラス（存在しない場合はNone）
    """
    try:
        module = importlib.import_module("app.services.cleanup_service")
    except ImportError:
        return None

    cleanup_service = getattr(module, "CleanupService", None)
    if cleanup_service is None or not isinstance(cleanup_service, type):
        return None

    return cleanup_service


@router.post("/fetch-feeds", response_model=JobFetchFeedsResponse)
async def run_fetch_feeds_job(
    service: FeedFetcherService = Depends(get_feed_fetcher_service),
) -> JobFetchFeedsResponse:
    """
    フィード取得ジョブを実行
    """
    results = service.fetch_all_feeds()
    return JobFetchFeedsResponse(
        items=[
            FeedFetchResponse(
                feed_id=result.feed_id,
                total_entries=result.total_entries,
                created_articles=result.created_articles,
                skipped_duplicates=result.skipped_duplicates,
                skipped_invalid=result.skipped_invalid,
                error_message=result.error_message,
            )
            for result in results
        ]
    )


@router.post("/cleanup-articles", response_model=JobCleanupResponse)
async def run_cleanup_job() -> JobCleanupResponse:
    """
    記事クリーンアップジョブを実行
    """
    cleanup_service_class = _load_cleanup_service_class()
    if cleanup_service_class is None:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="CleanupService is not implemented",
        )

    cleanup_service = cleanup_service_class()
    cleanup_service.cleanup_old_articles()
    cleanup_service.delete_read_articles()
    return JobCleanupResponse(message="Cleanup completed")
