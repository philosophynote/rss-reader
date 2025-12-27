"""
FastAPI アプリケーションのメインエントリーポイント

このモジュールは、RSSリーダーのバックエンドAPIを提供するFastAPIアプリケーションを定義します。
AWS Lambda Web Adapterを使用してコンテナとしてデプロイされます。
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(
    title="RSS Reader API",
    description="Feedly風RSSリーダーのバックエンドAPI",
    version="1.0.0"
)

# CORS設定
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """ヘルスチェック用のルートエンドポイント"""
    return {"message": "RSS Reader API is running"}

@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)