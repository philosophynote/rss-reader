"""
ジョブ関連のAPIスキーマ

ジョブ実行機能のレスポンスで使用する
Pydanticスキーマを定義します。
"""

from pydantic import BaseModel

from app.schemas.feed import FeedFetchListResponse


class JobFetchFeedsResponse(FeedFetchListResponse):
    """
    フィード取得ジョブレスポンス

    Attributes:
        items: 取得結果一覧
    """


class JobCleanupResponse(BaseModel):
    """
    クリーンアップジョブレスポンス

    Attributes:
        message: 結果メッセージ
        deleted_articles: 削除した記事数
        deleted_reasons: 削除した重要度理由数
    """

    message: str
    deleted_articles: int
    deleted_reasons: int
