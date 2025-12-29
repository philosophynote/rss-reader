"""
記事管理API

記事一覧の取得、既読/保存状態の更新を提供します。
"""

from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.article import (
    ArticleListResponse,
    ArticleResponse,
    ArticleUpdateRequest,
)
from app.services import ArticleService

router = APIRouter(prefix="/api/articles", tags=["articles"])


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


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    sort_by: Literal["published_at", "importance_score"] = "published_at",
    filter_by: Optional[Literal["unread", "read", "saved"]] = None,
    limit: Optional[int] = Query(default=None, ge=1, le=200),
    service: ArticleService = Depends(get_article_service),
) -> ArticleListResponse:
    """記事一覧を取得"""
    articles = service.list_articles(
        sort_by=sort_by,
        filter_by=filter_by,
        limit=limit,
    )
    return ArticleListResponse(
        items=[build_article_response(article) for article in articles],
    )


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(
    article_id: str,
    service: ArticleService = Depends(get_article_service),
) -> ArticleResponse:
    """記事を取得"""
    article = service.get_article(article_id)
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )
    return build_article_response(article)


@router.patch("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: str,
    payload: ArticleUpdateRequest,
    service: ArticleService = Depends(get_article_service),
) -> ArticleResponse:
    """記事を更新"""
    try:
        article = service.update_article(
            article_id=article_id,
            is_read=payload.is_read,
            is_saved=payload.is_saved,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )

    return build_article_response(article)
