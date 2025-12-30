"""
キーワード管理API

キーワードの登録、取得、更新、削除、再計算を提供します。
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.keyword import (
    KeywordCreateRequest,
    KeywordListResponse,
    KeywordRecalculateResponse,
    KeywordResponse,
    KeywordUpdateRequest,
)
from app.security import verify_api_key
from app.services import KeywordService
from app.services.importance_score_service import ImportanceScoreService

router = APIRouter(
    prefix="/api/keywords",
    tags=["keywords"],
    dependencies=[Depends(verify_api_key)],
)


def get_keyword_service() -> KeywordService:
    """KeywordServiceの依存性を提供"""
    importance_service = ImportanceScoreService()
    return KeywordService(importance_score_service=importance_service)


def build_keyword_response(keyword) -> KeywordResponse:
    """
    Keywordモデルからレスポンスを生成

    Args:
        keyword: Keywordモデル

    Returns:
        KeywordResponse: APIレスポンス
    """
    return KeywordResponse.model_validate(keyword.model_dump())


@router.post(
    "",
    response_model=KeywordResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_keyword(
    payload: KeywordCreateRequest,
    service: KeywordService = Depends(get_keyword_service),
) -> KeywordResponse:
    """キーワードを登録"""
    keyword = service.add_keyword(text=payload.text, weight=payload.weight)
    return build_keyword_response(keyword)


@router.get("", response_model=KeywordListResponse)
async def list_keywords(
    service: KeywordService = Depends(get_keyword_service),
) -> KeywordListResponse:
    """キーワード一覧を取得"""
    keywords = service.get_keywords()
    return KeywordListResponse(
        items=[build_keyword_response(keyword) for keyword in keywords]
    )


@router.put("/{keyword_id}", response_model=KeywordResponse)
async def update_keyword(
    keyword_id: str,
    payload: KeywordUpdateRequest,
    service: KeywordService = Depends(get_keyword_service),
) -> KeywordResponse:
    """キーワードを更新"""
    try:
        keyword = service.update_keyword(
            keyword_id=keyword_id,
            text=payload.text,
            weight=payload.weight,
            is_active=payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    if keyword is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found",
        )

    return build_keyword_response(keyword)


@router.delete("/{keyword_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_keyword(
    keyword_id: str,
    service: KeywordService = Depends(get_keyword_service),
) -> None:
    """キーワードを削除"""
    deleted = service.delete_keyword(keyword_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Keyword not found",
        )
    return None


@router.post("/recalculate", response_model=KeywordRecalculateResponse)
async def recalculate_scores(
    service: KeywordService = Depends(get_keyword_service),
) -> KeywordRecalculateResponse:
    """
    重要度スコアを再計算
    """
    try:
        service.recalculate_all_scores()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return KeywordRecalculateResponse(message="Recalculation started")
