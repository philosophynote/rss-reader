"""
フィード管理サービス

フィードの登録、取得、更新、削除を担当します。
"""

from app.config import settings
from app.models.feed import Feed
from app.utils.dynamodb_client import DynamoDBClient


class FeedService:
    """
    フィード管理サービスクラス

    DynamoDBとのやり取りを抽象化し、
    フィードデータの操作を提供します。
    """

    def __init__(self, dynamodb_client: DynamoDBClient | None = None):
        """
        FeedServiceの初期化

        Args:
            dynamodb_client: DynamoDBクライアント（省略時は新規生成）
        """
        self.dynamodb_client = dynamodb_client or DynamoDBClient()

    def create_feed(
        self,
        url: str,
        title: str | None,
        folder: str | None,
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

    def list_feeds(self) -> list[Feed]:
        """
        フィード一覧を取得

        Returns:
            List[Feed]: フィード一覧
        """
        items, _ = self.dynamodb_client.query_feeds()
        return [self._convert_item_to_feed(item) for item in items]

    def get_feed(self, feed_id: str) -> Feed | None:
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
        title: str | None,
        folder: str | None,
        is_active: bool | None,
    ) -> Feed | None:
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

        self._delete_feed_related_data(feed_id)
        self.dynamodb_client.delete_item(
            pk=f"FEED#{feed_id}",
            sk="METADATA",
        )
        return True

    def _delete_feed_related_data(
        self,
        feed_id: str,
    ) -> tuple[int, int]:
        """
        フィードに紐づく記事と重要度理由を削除

        Args:
            feed_id: フィードID

        Returns:
            Tuple[int, int]: (削除した記事数, 削除した理由数)
        """
        deleted_articles = 0
        deleted_reasons = 0
        delete_keys: list[dict] = []
        last_evaluated_key = None

        while True:
            items, last_evaluated_key = (
                self.dynamodb_client.query_articles_by_feed_id(
                    feed_id=feed_id,
                    exclusive_start_key=last_evaluated_key,
                )
            )

            for item in items:
                article_id = item.get("article_id")
                if article_id:
                    deleted_reasons += self.dynamodb_client.delete_importance_reasons_for_article(
                        article_id
                    )

                delete_keys.append({"PK": item["PK"], "SK": item["SK"]})
                if len(delete_keys) >= settings.BATCH_SIZE:
                    self.dynamodb_client.batch_write_item(
                        items=[],
                        delete_keys=delete_keys,
                    )
                    deleted_articles += len(delete_keys)
                    delete_keys = []

            if not last_evaluated_key:
                break

        if delete_keys:
            self.dynamodb_client.batch_write_item(
                items=[],
                delete_keys=delete_keys,
            )
            deleted_articles += len(delete_keys)

        return deleted_articles, deleted_reasons

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
