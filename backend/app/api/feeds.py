"""
フィード管理API

フィードの登録、取得、更新、削除を提供します。
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.schemas.feed import (
    FeedCreateRequest,
    FeedFetchListResponse,
    FeedFetchResponse,
    FeedListResponse,
    FeedResponse,
    FeedUpdateRequest,
)
from app.services import FeedFetcherService, FeedService
from app.services.feed_fetcher_service import FeedFetchError

router = APIRouter(prefix="/api/feeds", tags=["feeds"])


def get_feed_service() -> FeedService:
    """FeedServiceの依存性を提供"""
    return FeedService()


def get_feed_fetcher_service() -> FeedFetcherService:
    """FeedFetcherServiceの依存性を提供"""
    return FeedFetcherService()


def build_feed_response(feed) -> FeedResponse:
    """
    Feedモデルからレスポンスを生成

    Args:
        feed: Feedモデル

    Returns:
        FeedResponse: APIレスポンス
    """
    return FeedResponse.model_validate(feed.model_dump())


@router.post(
    "",
    response_model=FeedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_feed(
    payload: FeedCreateRequest,
    service: FeedService = Depends(get_feed_service),
) -> FeedResponse:
    """フィードを登録"""
    feed = service.create_feed(
        url=str(payload.url),
        title=payload.title,
        folder=payload.folder,
    )
    return build_feed_response(feed)


@router.get("", response_model=FeedListResponse)
async def list_feeds(
    service: FeedService = Depends(get_feed_service),
) -> FeedListResponse:
    """フィード一覧を取得"""
    feeds = service.list_feeds()
    return FeedListResponse(
        items=[build_feed_response(feed) for feed in feeds],
    )


@router.post("/fetch", response_model=FeedFetchListResponse)
async def fetch_all_feeds(
    service: FeedFetcherService = Depends(get_feed_fetcher_service),
) -> FeedFetchListResponse:
    """全フィードを取得"""
    results = service.fetch_all_feeds()
    return FeedFetchListResponse(
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


@router.post("/{feed_id}/fetch", response_model=FeedFetchResponse)
async def fetch_feed(
    feed_id: str,
    feed_service: FeedService = Depends(get_feed_service),
    fetcher_service: FeedFetcherService = Depends(get_feed_fetcher_service),
    response: Response,
) -> FeedFetchResponse:
    """指定フィードを取得"""
    feed = feed_service.get_feed(feed_id)
    if feed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found",
        )

    try:
        result = fetcher_service.fetch_feed(feed)
    except FeedFetchError as exc:
        response.status_code = status.HTTP_502_BAD_GATEWAY
        return FeedFetchResponse(
            feed_id=feed.feed_id,
            total_entries=0,
            created_articles=0,
            skipped_duplicates=0,
            skipped_invalid=0,
            error_message=str(exc),
        )
    return FeedFetchResponse(
        feed_id=result.feed_id,
        total_entries=result.total_entries,
        created_articles=result.created_articles,
        skipped_duplicates=result.skipped_duplicates,
        skipped_invalid=result.skipped_invalid,
        error_message=result.error_message,
    )


@router.get("/{feed_id}", response_model=FeedResponse)
async def get_feed(
    feed_id: str,
    service: FeedService = Depends(get_feed_service),
) -> FeedResponse:
    """フィードを取得"""
    feed = service.get_feed(feed_id)
    if feed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found",
        )
    return build_feed_response(feed)


@router.put("/{feed_id}", response_model=FeedResponse)
async def update_feed(
    feed_id: str,
    payload: FeedUpdateRequest,
    service: FeedService = Depends(get_feed_service),
) -> FeedResponse:
    """フィードを更新"""
    try:
        feed = service.update_feed(
            feed_id=feed_id,
            title=payload.title,
            folder=payload.folder,
            is_active=payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if feed is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found",
        )

    return build_feed_response(feed)


@router.delete("/{feed_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feed(
    feed_id: str,
    service: FeedService = Depends(get_feed_service),
) -> None:
    """フィードを削除"""
    deleted = service.delete_feed(feed_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found",
        )
    return None
