"""
FastAPI アプリケーションのメインエントリーポイント

このモジュールは、RSSリーダーのバックエンドAPIを提供するFastAPIアプリケーションを定義します。
AWS Lambda Web Adapterを使用してコンテナとしてデプロイされます。
"""

import asyncio
import logging
import os

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    articles_router,
    feeds_router,
    jobs_router,
    keywords_router,
)
from app.api.feeds import build_feed_fetch_response
from app.api.jobs import _load_cleanup_service_class
from app.middleware import (
    rate_limit_middleware,
    security_headers_middleware,
    setup_logging_filters,
)
from app.services import FeedFetcherService

app = FastAPI(
    title="RSS Reader API",
    description="Feedly風RSSリーダーのバックエンドAPI",
    version="1.0.0",
)

setup_logging_filters()
logger = logging.getLogger(__name__)


def get_cors_origins() -> list[str]:
    """
    CORS許可オリジンを環境変数から取得します。

    Returns:
        list[str]: 許可するオリジンのリスト。
    """
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    origins = [origin.strip() for origin in raw_origins.split(",")]
    filtered_origins = [origin for origin in origins if origin]
    return filtered_origins or ["http://localhost:3000"]


# CORS設定
cors_origins = get_cors_origins()
environment = os.getenv("ENVIRONMENT", "development")
if "*" in cors_origins and environment == "production":
    raise ValueError(
        "CORS_ORIGINS cannot contain '*' in production environment."
    )
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)


app.middleware("http")(rate_limit_middleware)
app.middleware("http")(security_headers_middleware)

app.include_router(feeds_router)
app.include_router(articles_router)
app.include_router(keywords_router)
app.include_router(jobs_router)


@app.get("/")
async def root() -> dict[str, str]:
    """ヘルスチェック用のルートエンドポイント"""
    return {"message": "RSS Reader API is running"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    """ヘルスチェックエンドポイント"""
    return {"status": "healthy"}


@app.post("/events")
async def handle_events(request: Request) -> dict[str, object]:
    """
    EventBridge からのイベントを処理します。
    """
    payload = await request.json()
    action = payload.get("action")
    if not isinstance(action, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Event action is required",
        )

    if action == "fetch_feeds":
        service = FeedFetcherService()
        try:
            results = await asyncio.to_thread(service.fetch_all_feeds)
        except Exception as exc:
            logger.exception("fetch_all_feeds failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            ) from exc
        return {
            "message": "Fetch completed",
            "items": [build_feed_fetch_response(result) for result in results],
        }

    if action == "cleanup_articles":
        cleanup_service_class = _load_cleanup_service_class()
        if cleanup_service_class is None:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="CleanupService is not implemented",
            )
        try:
            cleanup_service = cleanup_service_class()
            result = await asyncio.to_thread(
                cleanup_service.cleanup_old_articles
            )
        except Exception as exc:
            logger.exception("cleanup_old_articles failed")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error",
            ) from exc
        return {
            "message": "Cleanup completed",
            "deleted_articles": result.get("deleted_articles_by_age", [])
            + result.get("deleted_read_articles", []),
            "deleted_reasons": result.get("deleted_reasons_by_age", [])
            + result.get("deleted_reasons_read", []),
        }

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Unknown event action",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
