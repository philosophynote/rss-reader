"""
FastAPI アプリケーションのメインエントリーポイント

このモジュールは、RSSリーダーのバックエンドAPIを提供するFastAPIアプリケーションを定義します。
AWS Lambda Web Adapterを使用してコンテナとしてデプロイされます。
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import feeds_router

app = FastAPI(
    title="RSS Reader API",
    description="Feedly風RSSリーダーのバックエンドAPI",
    version="1.0.0",
)


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

app.include_router(feeds_router)


@app.get("/")
async def root() -> dict[str, str]:
    """ヘルスチェック用のルートエンドポイント"""
    return {"message": "RSS Reader API is running"}


@app.get("/health")
async def health_check() -> dict[str, str]:
    """ヘルスチェックエンドポイント"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
