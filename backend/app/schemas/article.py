"""
記事関連のAPIスキーマ

記事管理機能のリクエスト/レスポンスで使用する
Pydanticスキーマを定義します。
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl


class ArticleUpdateRequest(BaseModel):
    """
    記事更新リクエスト

    Attributes:
        is_read: 既読フラグ
        is_saved: 保存フラグ
    """

    is_read: Optional[bool] = None
    is_saved: Optional[bool] = None


class ArticleResponse(BaseModel):
    """
    記事レスポンス

    Attributes:
        article_id: 記事ID
        feed_id: フィードID
        link: 記事URL
        title: 記事タイトル
        content: 記事本文
        published_at: 公開日時
        is_read: 既読フラグ
        is_saved: 保存フラグ
        importance_score: 重要度スコア
        read_at: 既読日時
        created_at: 作成日時
        updated_at: 更新日時
    """

    article_id: str
    feed_id: str
    link: HttpUrl
    title: str
    content: str
    published_at: datetime
    is_read: bool
    is_saved: bool
    importance_score: float
    read_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class ArticleListResponse(BaseModel):
    """
    記事一覧レスポンス

    Attributes:
        items: 記事一覧
    """

    items: List[ArticleResponse]
