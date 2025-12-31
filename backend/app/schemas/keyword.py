"""
キーワード関連のAPIスキーマ

キーワード管理機能のリクエスト/レスポンスで使用する
Pydanticスキーマを定義します。
"""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.keyword import Keyword


class KeywordCreateRequest(BaseModel):
    """
    キーワード作成リクエスト

    Attributes:
        text: キーワードテキスト
        weight: 重み
    """

    text: str = Field(..., max_length=100)
    weight: float = Field(default=1.0, gt=0.0, le=10.0)

    @field_validator("text")
    @classmethod
    def normalize_text(cls, v: str) -> str:
        """
        テキストを正規化します。

        Args:
            v: 入力テキスト

        Returns:
            str: 正規化後のテキスト
        """
        normalized = Keyword._normalize_text(v)
        if len(normalized) > 100:
            raise ValueError("Keyword text must be 100 characters or less")
        return normalized


class KeywordUpdateRequest(BaseModel):
    """
    キーワード更新リクエスト

    Attributes:
        text: キーワードテキスト
        weight: 重み
        is_active: 有効/無効フラグ
    """

    text: str | None = Field(default=None, max_length=100)
    weight: float | None = Field(default=None, gt=0.0, le=10.0)
    is_active: bool | None = None

    @field_validator("text")
    @classmethod
    def normalize_text(cls, v: str | None) -> str | None:
        """
        テキストを正規化します。

        Args:
            v: 入力テキスト

        Returns:
            Optional[str]: 正規化後のテキスト
        """
        if v is None:
            return None
        normalized = Keyword._normalize_text(v)
        if len(normalized) > 100:
            raise ValueError("Keyword text must be 100 characters or less")
        return normalized


class KeywordResponse(BaseModel):
    """
    キーワードレスポンス

    Attributes:
        keyword_id: キーワードID
        text: キーワードテキスト
        weight: 重み
        is_active: 有効/無効フラグ
        created_at: 作成日時
        updated_at: 更新日時
    """

    keyword_id: str
    text: str
    weight: float
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class KeywordListResponse(BaseModel):
    """
    キーワード一覧レスポンス

    Attributes:
        items: キーワード一覧
    """

    items: list[KeywordResponse]


class KeywordRecalculateResponse(BaseModel):
    """
    重要度再計算レスポンス

    Attributes:
        message: 結果メッセージ
    """

    message: str
