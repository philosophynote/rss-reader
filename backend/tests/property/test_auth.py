"""
認証機能のプロパティテスト

API Key認証の基本的な性質を検証します。
"""

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from hypothesis import assume, given
from hypothesis import strategies as st

from app.config import settings
from app.security import verify_api_key

pytestmark = pytest.mark.property


def create_test_app() -> FastAPI:
    """
    テスト用のFastAPIアプリを生成します。

    Returns:
        FastAPI: テスト用アプリ
    """
    app = FastAPI()

    @app.get("/protected")
    async def protected_endpoint(
        api_key: str = Depends(verify_api_key),
    ) -> dict[str, str]:
        return {"status": "ok", "api_key": api_key}

    return app


@given(
    api_key=st.text(
        min_size=1,
        max_size=32,
        alphabet=st.characters(min_codepoint=33, max_codepoint=126),
    )
)
def test_api_key_accepts_valid_key(api_key: str) -> None:
    """
    有効なAPI Keyが認証されることを確認します。
    """
    original_key = settings.API_KEY
    try:
        settings.API_KEY = api_key
        client = TestClient(create_test_app())
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        assert response.status_code == 200
    finally:
        settings.API_KEY = original_key


@given(
    valid_key=st.text(
        min_size=1,
        max_size=32,
        alphabet=st.characters(min_codepoint=33, max_codepoint=126),
    ),
    invalid_key=st.text(
        min_size=1,
        max_size=32,
        alphabet=st.characters(min_codepoint=33, max_codepoint=126),
    ),
)
def test_api_key_rejects_invalid_key(
    valid_key: str,
    invalid_key: str,
) -> None:
    """
    無効なAPI Keyが拒否されることを確認します。
    """
    assume(valid_key != invalid_key)
    original_key = settings.API_KEY
    try:
        settings.API_KEY = valid_key
        client = TestClient(create_test_app())
        response = client.get(
            "/protected",
            headers={"Authorization": f"Bearer {invalid_key}"},
        )
        assert response.status_code == 401
    finally:
        settings.API_KEY = original_key
