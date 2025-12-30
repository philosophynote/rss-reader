"""
記事関連のAPIスキーマ

記事管理機能のリクエスト/レスポンスで使用する
Pydanticスキーマを定義します。
"""

from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class ArticleResponse(BaseModel):
    """
    記事レスポンス

    Attributes:
        article_id: 記事ID
        feed_id: フィードID
        link: 記事URL
        title: タイトル
        content: 本文
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
    read_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


class ArticleListResponse(BaseModel):
    """
    記事一覧レスポンス

    Attributes:
        items: 記事一覧
        last_evaluated_key: 次ページ取得用キー
    """

    items: list[ArticleResponse]
    last_evaluated_key: dict | None = None


class ArticleReadUpdateRequest(BaseModel):
    """
    既読状態更新リクエスト

    Attributes:
        is_read: 既読フラグ
    """

    is_read: bool = Field(...)


class ArticleSaveUpdateRequest(BaseModel):
    """
    保存状態更新リクエスト

    Attributes:
        is_saved: 保存フラグ
    """

    is_saved: bool = Field(...)
