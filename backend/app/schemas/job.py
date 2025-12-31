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
    """

    message: str
