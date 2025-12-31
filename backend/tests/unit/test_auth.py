"""
認証機能のユニットテスト

API Key認証、レート制限、セキュリティヘッダーを検証します。
"""

import logging

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app import middleware as middleware_module
from app.config import settings
from app.middleware import (
    RateLimiter,
    SensitiveDataFilter,
    rate_limit_middleware,
    security_headers_middleware,
)
from app.security import verify_api_key


def test_verify_api_key_requires_configuration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    API Key未設定時にエラーとなることを確認します。
    """
    monkeypatch.setattr(settings, "API_KEY", None)
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="test-key",
    )
    with pytest.raises(HTTPException) as exc_info:
        verify_api_key(credentials)

    assert exc_info.value.status_code == 500


def test_verify_api_key_rejects_invalid_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    無効なAPI Keyが拒否されることを確認します。
    """
    monkeypatch.setattr(settings, "API_KEY", "valid-key")
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="invalid-key",
    )
    with pytest.raises(HTTPException) as exc_info:
        verify_api_key(credentials)

    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_rate_limiter_blocks_excess_requests() -> None:
    """
    レート制限が上限を超えるとブロックすることを確認します。
    """
    limiter = RateLimiter(max_requests=2, window_minutes=1)
    assert await limiter.check_rate_limit("client")
    assert await limiter.check_rate_limit("client")
    assert not await limiter.check_rate_limit("client")


def test_rate_limit_middleware_blocks_requests(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """
    ミドルウェアがレート制限を適用することを確認します。
    """
    app = FastAPI()
    monkeypatch.setattr(
        middleware_module,
        "rate_limiter",
        RateLimiter(max_requests=1, window_minutes=1),
    )

    app.middleware("http")(rate_limit_middleware)

    @app.get("/ping")
    async def ping() -> dict[str, str]:
        return {"status": "ok"}

    client = TestClient(app)
    response = client.get("/ping")
    assert response.status_code == 200
    response = client.get("/ping")
    assert response.status_code == 429


def test_security_headers_middleware_adds_headers() -> None:
    """
    セキュリティヘッダーが付与されることを確認します。
    """
    app = FastAPI()

    app.middleware("http")(security_headers_middleware)

    @app.get("/ping")
    async def ping() -> dict[str, str]:
        return {"status": "ok"}

    client = TestClient(app)
    response = client.get("/ping")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"


def test_sensitive_data_filter_masks_tokens(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """
    機密情報がログに残らないことを確認します。
    """
    logger = logging.getLogger("test.logger")
    logger.addFilter(SensitiveDataFilter())

    with caplog.at_level(logging.INFO):
        logger.info("Bearer abcdefghijklmnopqrstuvwxyz012345")
        logger.info("api_key: supersecretkey")

    assert "Bearer [REDACTED]" in caplog.text
    assert "supersecretkey" not in caplog.text
