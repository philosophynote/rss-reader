"""
ミドルウェアとログフィルター

セキュリティヘッダー付与、レート制限、
機密情報マスキングフィルターを提供します。
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import re
from collections import defaultdict
from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from fastapi.responses import JSONResponse, Response

if TYPE_CHECKING:
    from fastapi import Request

logger = logging.getLogger(__name__)


class SensitiveDataFilter(logging.Filter):
    """
    ログから機密情報を除去するフィルター。
    """

    def __init__(self) -> None:
        super().__init__()
        self.patterns = [
            (
                re.compile(r"Bearer [A-Za-z0-9+/=]{20,}"),
                "Bearer [REDACTED]",
            ),
            (
                re.compile(
                    r"api[_-]?key[\"\s]*[:=][\"\s]*"
                    r"[^\s\"]+",
                    re.IGNORECASE,
                ),
                "api_key: [REDACTED]",
            ),
            (
                re.compile(
                    r"password[\"\s]*[:=][\"\s]*[^\s\"]+",
                    re.IGNORECASE,
                ),
                "password: [REDACTED]",
            ),
        ]

    def filter(self, record: logging.LogRecord) -> bool:
        """
        ログレコードのメッセージから機密情報を除去します。

        Args:
            record: ログレコード

        Returns:
            bool: ログ出力を許可する場合はTrue
        """
        message = record.getMessage()
        for pattern, replacement in self.patterns:
            message = pattern.sub(replacement, message)
        record.msg = message
        record.args = ()
        return True


def setup_logging_filters() -> None:
    """
    ルートロガーに機密情報マスキングフィルターを追加します。
    """
    root_logger = logging.getLogger()
    if not any(
        isinstance(log_filter, SensitiveDataFilter)
        for log_filter in root_logger.filters
    ):
        root_logger.addFilter(SensitiveDataFilter())


class RateLimiter:
    """
    クライアント単位のレート制限を管理します。
    """

    def __init__(self, max_requests: int, window_minutes: int) -> None:
        """
        RateLimiterの初期化。

        Args:
            max_requests: 許可する最大リクエスト数
            window_minutes: レート制限ウィンドウ（分）
        """
        self.max_requests = max_requests
        self.window = timedelta(minutes=window_minutes)
        self.requests: defaultdict[str, list[datetime]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def check_rate_limit(self, client_id: str) -> bool:
        """
        レート制限をチェックします。

        Args:
            client_id: クライアント識別子

        Returns:
            bool: 許可する場合はTrue
        """
        async with self._lock:
            now = datetime.now()
            cutoff = now - self.window
            self.requests[client_id] = [
                timestamp
                for timestamp in self.requests[client_id]
                if timestamp > cutoff
            ]

            if len(self.requests[client_id]) >= self.max_requests:
                return False

            self.requests[client_id].append(now)
            return True


def _hash_identifier(identifier: str) -> str:
    """
    クライアント識別子をハッシュ化します。

    Args:
        identifier: 識別子

    Returns:
        str: ハッシュ化された識別子
    """
    return hashlib.sha256(identifier.encode("utf-8")).hexdigest()[:16]


def _get_client_identifier(request: Request) -> str:
    """
    リクエストからクライアント識別子を生成します。

    Args:
        request: FastAPIリクエスト

    Returns:
        str: クライアント識別子
    """
    authorization = request.headers.get("authorization")
    if authorization:
        return f"auth:{_hash_identifier(authorization)}"

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return f"ip:{_hash_identifier(forwarded.split(',')[0].strip())}"

    if request.client:
        return f"ip:{_hash_identifier(request.client.host)}"

    return "ip:unknown"


rate_limiter = RateLimiter(
    max_requests=int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "100")),
    window_minutes=int(os.getenv("RATE_LIMIT_WINDOW_MINUTES", "1")),
)


async def rate_limit_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """
    レート制限を適用するミドルウェア。

    Args:
        request: FastAPIリクエスト
        call_next: 次のミドルウェア

    Returns:
        JSONResponse: レスポンス
    """
    client_id = _get_client_identifier(request)
    allowed = await rate_limiter.check_rate_limit(client_id)
    if not allowed:
        logger.warning("Rate limit exceeded for client")
        return JSONResponse(
            status_code=429,
            content={
                "detail": "レート制限に達しました。しばらく待ってから再試行してください。"
            },
        )

    return await call_next(request)


async def security_headers_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """
    セキュリティヘッダーを付与するミドルウェア。

    Args:
        request: FastAPIリクエスト
        call_next: 次のミドルウェア

    Returns:
        JSONResponse: レスポンス
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response
