"""
フィード管理サービスのユニットテスト

FeedServiceのCRUD操作が正しく動作することを検証します。
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime

import pytest

from app.models.article import Article
from app.models.importance_reason import ImportanceReason
from app.services.feed_service import FeedService


class FakeDynamoDBClient:
    """
    フィード管理テスト用のDynamoDBクライアント

    in-memoryの辞書でDynamoDBの動作を擬似的に再現します。
    """

    def __init__(self) -> None:
        self.items: Dict[Tuple[str, str], Dict] = {}

    def put_item(self, item: Dict) -> None:
        """アイテムを保存"""
        self.items[(item["PK"], item["SK"])] = item

    def get_item(self, pk: str, sk: str) -> Optional[Dict]:
        """キーでアイテムを取得"""
        return self.items.get((pk, sk))

    def delete_item(self, pk: str, sk: str) -> None:
        """アイテムを削除"""
        self.items.pop((pk, sk), None)

    def query_feeds(
        self,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None,
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """フィード一覧を取得"""
        items = [
            item
            for item in self.items.values()
            if item.get("GSI1PK") == "FEED"
        ]
        if limit is not None:
            items = items[:limit]
        return items, None

    def query_articles_by_feed_id(
        self,
        feed_id: str,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None,
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """フィードIDに紐づく記事を取得"""
        items = [
            item
            for item in self.items.values()
            if item.get("GSI5PK") == f"FEED#{feed_id}"
        ]
        if limit is not None:
            items = items[:limit]
        return items, None

    def query_importance_reasons_for_article(
        self,
        article_id: str,
    ) -> List[Dict]:
        """記事の重要度理由を取得"""
        pk = f"ARTICLE#{article_id}"
        return [
            item
            for item in self.items.values()
            if item.get("PK") == pk and item.get("SK", "").startswith("REASON#")
        ]

    def delete_importance_reasons_for_article(self, article_id: str) -> int:
        """記事の重要度理由を削除"""
        reasons = self.query_importance_reasons_for_article(article_id)
        for reason in reasons:
            self.items.pop((reason["PK"], reason["SK"]), None)
        return len(reasons)

    def batch_write_item(
        self,
        items: List[Dict],
        delete_keys: Optional[List[Dict]] = None,
    ) -> None:
        """バッチ書き込みを実行"""
        for item in items:
            self.put_item(item)
        if delete_keys:
            for key in delete_keys:
                self.delete_item(pk=key["PK"], sk=key["SK"])


class TestFeedService:
    """FeedServiceのテスト"""

    def test_create_and_list_feed(self):
        """フィード作成と一覧取得ができることを検証"""
        fake_client = FakeDynamoDBClient()
        service = FeedService(dynamodb_client=fake_client)

        created_feed = service.create_feed(
            url="https://example.com/rss.xml",
            title="Example",
            folder="Tech",
        )

        feeds = service.list_feeds()

        assert len(feeds) == 1
        assert feeds[0].feed_id == created_feed.feed_id
        assert feeds[0].title == "Example"
        assert feeds[0].folder == "Tech"

    def test_get_feed_returns_none_for_missing_feed(self):
        """存在しないフィードの取得はNoneになることを確認"""
        fake_client = FakeDynamoDBClient()
        service = FeedService(dynamodb_client=fake_client)

        feed = service.get_feed("missing-feed")

        assert feed is None

    def test_update_feed_updates_fields(self):
        """フィード更新で指定項目が更新されることを検証"""
        fake_client = FakeDynamoDBClient()
        service = FeedService(dynamodb_client=fake_client)

        created_feed = service.create_feed(
            url="https://example.com/rss.xml",
            title="Original",
            folder="News",
        )

        updated_feed = service.update_feed(
            feed_id=created_feed.feed_id,
            title="Updated",
            folder="Tech",
            is_active=False,
        )

        assert updated_feed is not None
        assert updated_feed.title == "Updated"
        assert updated_feed.folder == "Tech"
        assert updated_feed.is_active is False

    def test_update_feed_requires_payload(self):
        """更新内容が空の場合はエラーになることを検証"""
        fake_client = FakeDynamoDBClient()
        service = FeedService(dynamodb_client=fake_client)

        created_feed = service.create_feed(
            url="https://example.com/rss.xml",
            title="Original",
            folder="News",
        )

        with pytest.raises(ValueError):
            service.update_feed(
                feed_id=created_feed.feed_id,
                title=None,
                folder=None,
                is_active=None,
            )

    def test_delete_feed_removes_item(self):
        """フィード削除が正しく実行されることを検証"""
        fake_client = FakeDynamoDBClient()
        service = FeedService(dynamodb_client=fake_client)

        created_feed = service.create_feed(
            url="https://example.com/rss.xml",
            title="Original",
            folder="News",
        )

        deleted = service.delete_feed(created_feed.feed_id)

        assert deleted is True
        assert service.get_feed(created_feed.feed_id) is None

    def test_delete_feed_cascades_articles_and_reasons(self):
        """フィード削除時に関連記事と理由が削除されることを検証"""
        fake_client = FakeDynamoDBClient()
        service = FeedService(dynamodb_client=fake_client)

        created_feed = service.create_feed(
            url="https://example.com/rss.xml",
            title="Original",
            folder="News",
        )

        article = Article(
            feed_id=created_feed.feed_id,
            link="https://example.com/article",
            title="Article",
            published_at=datetime.now(),
        )
        article_item = article.to_dynamodb_item()
        fake_client.put_item(article_item)

        reason = ImportanceReason.create_from_calculation(
            article_id=article.article_id,
            keyword_id="keyword-1",
            keyword_text="Python",
            similarity_score=0.8,
            weight=1.0,
        )
        fake_client.put_item(reason.to_dynamodb_item())

        deleted = service.delete_feed(created_feed.feed_id)

        assert deleted is True
        assert fake_client.get_item(
            pk=article_item["PK"],
            sk=article_item["SK"],
        ) is None
        assert (
            fake_client.query_importance_reasons_for_article(article.article_id)
            == []
        )
