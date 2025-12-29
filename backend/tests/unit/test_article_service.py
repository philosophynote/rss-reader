"""
記事管理サービスのユニットテスト。

ArticleServiceのソート・フィルタ・更新処理が正しく動作することを検証します。
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from uuid import uuid4

import pytest

from app.models.article import Article
from app.services.article_service import ArticleService


class FakeDynamoDBClient:
    """
    記事管理テスト用のDynamoDBクライアント。

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

    def query_articles_with_filters(
        self,
        sort_by: str = "published_at",
        filter_by: Optional[str] = None,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None,
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        記事をソート・フィルタして取得する。

        Args:
            sort_by: ソート基準
            filter_by: フィルタ条件
            limit: 取得件数
            exclusive_start_key: 未使用

        Returns:
            Tuple[List[Dict], Optional[Dict]]: 記事リストとページキー
        """
        items = [
            item
            for item in self.items.values()
            if item.get("EntityType") == "Article"
        ]

        if filter_by == "unread":
            items = [item for item in items if item.get("is_read") is False]
        elif filter_by == "read":
            items = [item for item in items if item.get("is_read") is True]
        elif filter_by == "saved":
            items = [item for item in items if item.get("is_saved") is True]

        if sort_by == "importance_score":
            items.sort(
                key=lambda item: item.get("importance_score", 0.0),
                reverse=True,
            )
        else:
            items.sort(
                key=lambda item: item.get("published_at", ""),
                reverse=True,
            )

        if limit is not None:
            items = items[:limit]

        return items, None


def build_article(
    *,
    article_id: str,
    published_at: datetime,
    importance_score: float,
    is_read: bool,
    is_saved: bool,
) -> Article:
    """
    テスト用のArticleを生成する。

    Args:
        article_id: 記事ID
        published_at: 公開日時
        importance_score: 重要度スコア
        is_read: 既読フラグ
        is_saved: 保存フラグ

    Returns:
        Article: 記事モデル
    """
    return Article(
        article_id=article_id,
        feed_id=str(uuid4()),
        link=f"https://example.com/{article_id}",
        title=f"title-{article_id}",
        content="content",
        published_at=published_at,
        is_read=is_read,
        is_saved=is_saved,
        importance_score=importance_score,
    )


def seed_articles(
    client: FakeDynamoDBClient,
    articles: List[Article],
) -> None:
    """
    記事をFakeDynamoDBClientに保存する。

    Args:
        client: FakeDynamoDBClient
        articles: 保存対象の記事
    """
    for article in articles:
        client.put_item(article.to_dynamodb_item())


class TestArticleService:
    """ArticleServiceのテスト"""

    def test_get_articles_sorted_by_published_at(self) -> None:
        """公開日時の降順で取得されることを検証"""
        fake_client = FakeDynamoDBClient()
        articles = [
            build_article(
                article_id="a1",
                published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                importance_score=0.4,
                is_read=False,
                is_saved=False,
            ),
            build_article(
                article_id="a2",
                published_at=datetime(2024, 1, 3, tzinfo=timezone.utc),
                importance_score=0.2,
                is_read=False,
                is_saved=False,
            ),
        ]
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        result, _ = service.get_articles(sort_by="published_at")

        assert [article.article_id for article in result] == ["a2", "a1"]

    def test_get_articles_sorted_by_importance_score(self) -> None:
        """重要度スコアの降順で取得されることを検証"""
        fake_client = FakeDynamoDBClient()
        articles = [
            build_article(
                article_id="a1",
                published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                importance_score=0.1,
                is_read=False,
                is_saved=False,
            ),
            build_article(
                article_id="a2",
                published_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
                importance_score=0.9,
                is_read=False,
                is_saved=False,
            ),
        ]
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        result, _ = service.get_articles(sort_by="importance_score")

        assert [article.article_id for article in result] == ["a2", "a1"]

    def test_get_articles_filter_unread(self) -> None:
        """未読フィルタが機能することを検証"""
        fake_client = FakeDynamoDBClient()
        articles = [
            build_article(
                article_id="a1",
                published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                importance_score=0.3,
                is_read=True,
                is_saved=False,
            ),
            build_article(
                article_id="a2",
                published_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
                importance_score=0.2,
                is_read=False,
                is_saved=False,
            ),
        ]
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        result, _ = service.get_articles(filter_by="unread")

        assert [article.article_id for article in result] == ["a2"]

    def test_get_articles_filter_read(self) -> None:
        """既読フィルタが機能することを検証"""
        fake_client = FakeDynamoDBClient()
        articles = [
            build_article(
                article_id="a1",
                published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                importance_score=0.3,
                is_read=True,
                is_saved=False,
            ),
            build_article(
                article_id="a2",
                published_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
                importance_score=0.2,
                is_read=False,
                is_saved=False,
            ),
        ]
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        result, _ = service.get_articles(filter_by="read")

        assert [article.article_id for article in result] == ["a1"]

    def test_get_articles_filter_saved(self) -> None:
        """保存フィルタが機能することを検証"""
        fake_client = FakeDynamoDBClient()
        articles = [
            build_article(
                article_id="a1",
                published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
                importance_score=0.3,
                is_read=False,
                is_saved=True,
            ),
            build_article(
                article_id="a2",
                published_at=datetime(2024, 1, 2, tzinfo=timezone.utc),
                importance_score=0.2,
                is_read=False,
                is_saved=False,
            ),
        ]
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        result, _ = service.get_articles(filter_by="saved")

        assert [article.article_id for article in result] == ["a1"]

    def test_get_article_returns_none_for_missing(self) -> None:
        """存在しない記事はNoneが返ることを検証"""
        fake_client = FakeDynamoDBClient()
        service = ArticleService(dynamodb_client=fake_client)

        result = service.get_article("missing")

        assert result is None

    def test_mark_as_read_updates_state(self) -> None:
        """既読/未読の切り替えが反映されることを検証"""
        fake_client = FakeDynamoDBClient()
        article = build_article(
            article_id="a1",
            published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            importance_score=0.3,
            is_read=False,
            is_saved=False,
        )
        seed_articles(fake_client, [article])
        service = ArticleService(dynamodb_client=fake_client)

        read_article = service.mark_as_read(article.article_id, True)

        assert read_article is not None
        assert read_article.is_read is True
        assert read_article.read_at is not None

        unread_article = service.mark_as_read(article.article_id, False)

        assert unread_article is not None
        assert unread_article.is_read is False
        assert unread_article.read_at is None

    def test_mark_as_saved_updates_state(self) -> None:
        """保存状態の切り替えが反映されることを検証"""
        fake_client = FakeDynamoDBClient()
        article = build_article(
            article_id="a1",
            published_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            importance_score=0.3,
            is_read=False,
            is_saved=False,
        )
        seed_articles(fake_client, [article])
        service = ArticleService(dynamodb_client=fake_client)

        saved_article = service.mark_as_saved(article.article_id, True)

        assert saved_article is not None
        assert saved_article.is_saved is True

        unsaved_article = service.mark_as_saved(article.article_id, False)

        assert unsaved_article is not None
        assert unsaved_article.is_saved is False

    def test_get_articles_rejects_invalid_sort(self) -> None:
        """不正なソート指定がエラーになることを検証"""
        fake_client = FakeDynamoDBClient()
        service = ArticleService(dynamodb_client=fake_client)

        with pytest.raises(ValueError):
            service.get_articles(sort_by="unknown")

    def test_get_articles_rejects_invalid_filter(self) -> None:
        """不正なフィルタ指定がエラーになることを検証"""
        fake_client = FakeDynamoDBClient()
        service = ArticleService(dynamodb_client=fake_client)

        with pytest.raises(ValueError):
            service.get_articles(filter_by="invalid")
