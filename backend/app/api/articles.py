"""
記事管理API

記事の一覧取得、詳細取得、既読/保存の更新を提供します。
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.article import (
    ArticleListResponse,
    ArticleReadUpdateRequest,
    ArticleResponse,
    ArticleSaveUpdateRequest,
)
from app.security import verify_api_key
from app.services import ArticleService

router = APIRouter(
    prefix="/api/articles",
    tags=["articles"],
    dependencies=[Depends(verify_api_key)],
)


def get_article_service() -> ArticleService:
    """ArticleServiceの依存性を提供"""
    return ArticleService()


def build_article_response(article) -> ArticleResponse:
    """
    Articleモデルからレスポンスを生成

    Args:
        article: Articleモデル

    Returns:
        ArticleResponse: APIレスポンス
    """
    return ArticleResponse.model_validate(article.model_dump())


def _parse_last_key(raw_key: str | None) -> dict | None:
    """
    ページネーション用キーをパースします。

    Args:
        raw_key: JSON文字列のキー

    Returns:
        Optional[dict]: パース済みのキー

    Raises:
        ValueError: JSONの解析に失敗した場合
    """
    if raw_key is None:
        return None

    try:
        return json.loads(raw_key)
    except json.JSONDecodeError as exc:
        raise ValueError("Invalid last_evaluated_key") from exc


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    sort_by: str = Query(
        "published_at",
        alias="sort",
        description="published_at または importance_score",
    ),
    filter_by: str | None = Query(
        None,
        alias="filter",
        description="unread, read, saved のいずれか",
    ),
    limit: int = Query(100, ge=1, le=500),
    last_key: str | None = Query(None, alias="last_evaluated_key"),
    service: ArticleService = Depends(get_article_service),
) -> ArticleListResponse:
    """
    記事一覧を取得
    """
    try:
        parsed_key = _parse_last_key(last_key)
        articles, next_key = service.get_articles(
            sort_by=sort_by,
            filter_by=filter_by,
            limit=limit,
            last_evaluated_key=parsed_key,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return ArticleListResponse(
        items=[build_article_response(article) for article in articles],
        last_evaluated_key=next_key,
    )


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: str,
    service: ArticleService = Depends(get_article_service),
) -> ArticleResponse:
    """
    記事詳細を取得
    """
    article = service.get_article(article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )
    return build_article_response(article)


@router.put("/{article_id}/read", response_model=ArticleResponse)
async def update_read_status(
    article_id: str,
    payload: ArticleReadUpdateRequest,
    service: ArticleService = Depends(get_article_service),
) -> ArticleResponse:
    """
    既読状態を更新
    """
    article = service.mark_as_read(article_id, payload.is_read)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )
    return build_article_response(article)


@router.put("/{article_id}/save", response_model=ArticleResponse)
async def update_save_status(
    article_id: str,
    payload: ArticleSaveUpdateRequest,
    service: ArticleService = Depends(get_article_service),
) -> ArticleResponse:
    """
    保存状態を更新
    """
    article = service.mark_as_saved(article_id, payload.is_saved)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )
    return build_article_response(article)
