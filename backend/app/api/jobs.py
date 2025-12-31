"""
ジョブ実行API

フィード取得や記事クリーンアップのジョブを手動実行します。
"""

import asyncio
import importlib
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.feeds import build_feed_fetch_response
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
    try:
        results = await asyncio.to_thread(service.fetch_all_feeds)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc
    return JobFetchFeedsResponse(
        items=[build_feed_fetch_response(result) for result in results]
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

    try:
        cleanup_service = cleanup_service_class()
        await asyncio.to_thread(cleanup_service.cleanup_old_articles)
        await asyncio.to_thread(cleanup_service.delete_read_articles)
    except TypeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to instantiate CleanupService: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cleanup operation failed: {exc}",
        ) from exc
    return JobCleanupResponse(message="Cleanup completed")
