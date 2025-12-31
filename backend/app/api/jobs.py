"""
ジョブ実行API

フィード取得や記事クリーンアップのジョブを手動実行します。
"""

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
    try:
        from app.services.cleanup_service import CleanupService
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="CleanupService is not implemented",
        ) from exc

    cleanup_service = CleanupService()
    cleanup_service.cleanup_old_articles()
    cleanup_service.delete_read_articles()
    return JobCleanupResponse(message="Cleanup completed")
