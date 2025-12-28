"""
フィード関連のAPIスキーマ

フィード管理機能のリクエスト/レスポンスで使用する
Pydanticスキーマを定義します。
"""

from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, HttpUrl


class FeedCreateRequest(BaseModel):
    """
    フィード作成リクエスト

    Attributes:
        url: RSSフィードのURL
        title: フィードタイトル（省略可）
        folder: フォルダ名（省略可）
    """

    url: HttpUrl
    title: Optional[str] = Field(default=None, max_length=200)
    folder: Optional[str] = Field(default=None, max_length=100)


class FeedUpdateRequest(BaseModel):
    """
    フィード更新リクエスト

    Attributes:
        title: フィードタイトル
        folder: フォルダ名
        is_active: 有効/無効フラグ
    """

    title: Optional[str] = Field(default=None, max_length=200)
    folder: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None


class FeedResponse(BaseModel):
    """
    フィードレスポンス

    Attributes:
        feed_id: フィードID
        url: RSSフィードのURL
        title: フィードタイトル
        folder: フォルダ名
        last_fetched_at: 最終取得日時
        is_active: 有効/無効フラグ
        created_at: 作成日時
        updated_at: 更新日時
    """

    feed_id: str
    url: HttpUrl
    title: str
    folder: Optional[str] = None
    last_fetched_at: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


class FeedListResponse(BaseModel):
    """
    フィード一覧レスポンス

    Attributes:
        items: フィード一覧
    """

    items: List[FeedResponse]
