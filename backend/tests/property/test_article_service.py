"""
記事管理サービスのプロパティベーステスト。

Feature: rss-reader, Property 8-15
検証: 要件 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from hypothesis import given, settings
from hypothesis.strategies import (
    booleans,
    composite,
    datetimes,
    floats,
    just,
    lists,
    text,
)

from app.models.article import Article
from app.services.article_service import ArticleService


@dataclass
class StoredItem:
    """テスト用の保存アイテム。"""

    pk: str
    sk: str
    item: dict


class FakeDynamoDBClient:
    """
    記事管理テスト用のDynamoDBクライアント。

    in-memoryの辞書でDynamoDBの動作を擬似的に再現する。
    """

    def __init__(self) -> None:
        self.items: dict[tuple[str, str], dict] = {}

    def put_item(self, item: dict) -> None:
        """アイテムを保存する。"""
        self.items[(item["PK"], item["SK"])] = item

    def get_item(self, pk: str, sk: str) -> dict | None:
        """キーでアイテムを取得する。"""
        return self.items.get((pk, sk))

    def query_articles_with_filters(
        self,
        sort_by: str = "published_at",
        filter_by: str | None = None,
        limit: int | None = None,
        exclusive_start_key: dict | None = None,
    ) -> tuple[list[dict], dict | None]:
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


@composite
def article_strategy(draw) -> Article:
    """有効なArticleを生成する戦略。"""
    title = draw(
        text(min_size=1, max_size=50).filter(lambda value: value.strip())
    )
    published_at = draw(datetimes(timezones=just(UTC)))
    importance_score = draw(floats(min_value=0.0, max_value=1.0))
    is_read = draw(booleans())
    is_saved = draw(booleans())

    return Article(
        feed_id=str(uuid4()),
        link=f"https://example.com/{uuid4()}",
        title=title,
        content="content",
        published_at=published_at,
        is_read=is_read,
        is_saved=is_saved,
        importance_score=importance_score,
    )


def seed_articles(
    client: FakeDynamoDBClient,
    articles: list[Article],
) -> None:
    """
    記事をFakeDynamoDBClientに保存する。

    Args:
        client: FakeDynamoDBClient
        articles: 保存対象の記事
    """
    for article in articles:
        client.put_item(article.to_dynamodb_item())


class TestArticleServiceProperty:
    """ArticleServiceのプロパティテスト。"""

    @given(articles=lists(article_strategy(), min_size=2, max_size=8))
    @settings(max_examples=50)
    def test_articles_sorted_by_published_at(
        self,
        articles: list[Article],
    ) -> None:
        """
        記事が公開日時の降順で返ることを検証する。

        検証: 要件 3.1
        """
        fake_client = FakeDynamoDBClient()
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        results, _ = service.get_articles(sort_by="published_at")

        published_list = [article.published_at for article in results]
        assert published_list == sorted(published_list, reverse=True)

    @given(articles=lists(article_strategy(), min_size=2, max_size=8))
    @settings(max_examples=50)
    def test_articles_sorted_by_importance_score(
        self,
        articles: list[Article],
    ) -> None:
        """
        記事が重要度スコアの降順で返ることを検証する。

        検証: 要件 3.2
        """
        fake_client = FakeDynamoDBClient()
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        results, _ = service.get_articles(sort_by="importance_score")

        score_list = [article.importance_score for article in results]
        assert score_list == sorted(score_list, reverse=True)

    @given(article=article_strategy())
    @settings(max_examples=50)
    def test_article_list_has_required_fields(self, article: Article) -> None:
        """
        記事一覧に必要な情報が含まれることを検証する。

        検証: 要件 3.3
        """
        fake_client = FakeDynamoDBClient()
        seed_articles(fake_client, [article])
        service = ArticleService(dynamodb_client=fake_client)

        results, _ = service.get_articles()
        assert len(results) == 1

        stored = results[0]
        assert stored.title
        assert isinstance(stored.published_at, datetime)
        assert stored.feed_id
        assert isinstance(stored.is_read, bool)
        assert isinstance(stored.importance_score, float)

    @given(article=article_strategy())
    @settings(max_examples=50)
    def test_mark_as_read_roundtrip(self, article: Article) -> None:
        """
        既読→未読のラウンドトリップを検証する。

        検証: 要件 4.1, 4.2
        """
        fake_client = FakeDynamoDBClient()
        seed_articles(fake_client, [article])
        service = ArticleService(dynamodb_client=fake_client)

        read_article = service.mark_as_read(article.article_id, True)
        assert read_article is not None
        assert read_article.is_read is True

        unread_article = service.mark_as_read(article.article_id, False)
        assert unread_article is not None
        assert unread_article.is_read is False
        assert unread_article.read_at is None

    @given(articles=lists(article_strategy(), min_size=2, max_size=8))
    @settings(max_examples=50)
    def test_unread_filter_returns_only_unread(
        self,
        articles: list[Article],
    ) -> None:
        """
        未読フィルタで未読記事のみ返ることを検証する。

        検証: 要件 4.3
        """
        fake_client = FakeDynamoDBClient()
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        results, _ = service.get_articles(filter_by="unread")

        assert all(not article.is_read for article in results)

    @given(articles=lists(article_strategy(), min_size=2, max_size=8))
    @settings(max_examples=50)
    def test_read_filter_returns_only_read(
        self,
        articles: list[Article],
    ) -> None:
        """
        既読フィルタで既読記事のみ返ることを検証する。

        検証: 要件 4.4
        """
        fake_client = FakeDynamoDBClient()
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        results, _ = service.get_articles(filter_by="read")

        assert all(article.is_read for article in results)

    @given(article=article_strategy())
    @settings(max_examples=50)
    def test_mark_as_saved_roundtrip(self, article: Article) -> None:
        """
        保存→解除のラウンドトリップを検証する。

        検証: 要件 5.1, 5.2
        """
        fake_client = FakeDynamoDBClient()
        seed_articles(fake_client, [article])
        service = ArticleService(dynamodb_client=fake_client)

        saved_article = service.mark_as_saved(article.article_id, True)
        assert saved_article is not None
        assert saved_article.is_saved is True

        unsaved_article = service.mark_as_saved(article.article_id, False)
        assert unsaved_article is not None
        assert unsaved_article.is_saved is False

    @given(articles=lists(article_strategy(), min_size=2, max_size=8))
    @settings(max_examples=50)
    def test_saved_filter_returns_only_saved(
        self,
        articles: list[Article],
    ) -> None:
        """
        保存フィルタで保存済み記事のみ返ることを検証する。

        検証: 要件 5.3
        """
        fake_client = FakeDynamoDBClient()
        seed_articles(fake_client, articles)
        service = ArticleService(dynamodb_client=fake_client)

        results, _ = service.get_articles(filter_by="saved")

        assert all(article.is_saved for article in results)
