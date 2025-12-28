"""
フィード管理サービス

フィードの登録、取得、更新、削除を担当します。
"""

from typing import List, Optional

from app.models.feed import Feed
from app.utils.dynamodb_client import DynamoDBClient


class FeedService:
    """
    フィード管理サービスクラス

    DynamoDBとのやり取りを抽象化し、
    フィードデータの操作を提供します。
    """

    def __init__(self, dynamodb_client: Optional[DynamoDBClient] = None):
        """
        FeedServiceの初期化

        Args:
            dynamodb_client: DynamoDBクライアント（省略時は新規生成）
        """
        self.dynamodb_client = dynamodb_client or DynamoDBClient()

    def create_feed(
        self,
        url: str,
        title: Optional[str],
        folder: Optional[str],
    ) -> Feed:
        """
        フィードを作成

        Args:
            url: RSSフィードURL
            title: フィードタイトル
            folder: フォルダ名

        Returns:
            Feed: 作成されたフィード
        """
        feed = Feed(url=url, title=title or "", folder=folder)
        self.dynamodb_client.put_item(feed.to_dynamodb_item())
        return feed

    def list_feeds(self) -> List[Feed]:
        """
        フィード一覧を取得

        Returns:
            List[Feed]: フィード一覧
        """
        items, _ = self.dynamodb_client.query_feeds()
        return [self._convert_item_to_feed(item) for item in items]

    def get_feed(self, feed_id: str) -> Optional[Feed]:
        """
        フィードを取得

        Args:
            feed_id: フィードID

        Returns:
            Optional[Feed]: フィード（存在しない場合はNone）
        """
        item = self.dynamodb_client.get_item(
            pk=f"FEED#{feed_id}",
            sk="METADATA",
        )
        if not item:
            return None
        return self._convert_item_to_feed(item)

    def update_feed(
        self,
        feed_id: str,
        title: Optional[str],
        folder: Optional[str],
        is_active: Optional[bool],
    ) -> Optional[Feed]:
        """
        フィードを更新

        Args:
            feed_id: フィードID
            title: フィードタイトル
            folder: フォルダ名
            is_active: 有効/無効フラグ

        Returns:
            Optional[Feed]: 更新されたフィード（存在しない場合はNone）

        Raises:
            ValueError: 更新内容が空の場合
        """
        if title is None and folder is None and is_active is None:
            raise ValueError("Update payload cannot be empty")

        existing_feed = self.get_feed(feed_id)
        if existing_feed is None:
            return None

        if title is not None:
            existing_feed.title = title
        if folder is not None:
            existing_feed.folder = folder
        if is_active is not None:
            existing_feed.is_active = is_active

        existing_feed.update_timestamp()
        self.dynamodb_client.put_item(existing_feed.to_dynamodb_item())
        return existing_feed

    def delete_feed(self, feed_id: str) -> bool:
        """
        フィードを削除

        Args:
            feed_id: フィードID

        Returns:
            bool: 削除成功時はTrue
        """
        existing_feed = self.get_feed(feed_id)
        if existing_feed is None:
            return False

        self.dynamodb_client.delete_item(
            pk=f"FEED#{feed_id}",
            sk="METADATA",
        )
        return True

    def _convert_item_to_feed(self, item: dict) -> Feed:
        """
        DynamoDBアイテムをFeedモデルに変換

        Args:
            item: DynamoDBから取得したアイテム

        Returns:
            Feed: 変換済みフィード
        """
        feed_fields = Feed.model_fields.keys()
        feed_data = {key: item[key] for key in feed_fields if key in item}
        return Feed(**feed_data)
