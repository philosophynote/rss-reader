"""
RSSフィード取得のプロパティベーステスト。

Feature: rss-reader, Property 5-7
検証: 要件 2.2, 2.3, 2.4, 2.5
"""

from __future__ import annotations

from dataclasses import dataclass

import httpx
import pytest
from hypothesis import given, settings
from hypothesis.strategies import (
    characters,
    composite,
    lists,
    sampled_from,
    text,
)

from app.models.feed import Feed
from app.services.feed_fetcher_service import (
    FeedFetchError,
    FeedFetcherService,
)

pytestmark = pytest.mark.property


@dataclass
class FakeHttpResponse:
    """テスト用HTTPレスポンス。"""

    content: bytes

    def raise_for_status(self) -> None:
        """常に正常応答とする。"""


class FakeHttpClient:
    """テスト用HTTPクライアント。"""

    def __init__(self, content: bytes) -> None:
        self.response = FakeHttpResponse(content)

    def get(self, url: str) -> FakeHttpResponse:
        """指定URLのレスポンスを返す。"""
        return self.response


class ErrorHttpClient:
    """HTTPエラーを返すテスト用HTTPクライアント。"""

    def __init__(self, message: str) -> None:
        self.message = message

    def get(self, url: str) -> FakeHttpResponse:
        """HTTPエラーを送出する。"""
        raise httpx.HTTPError(self.message)


class FakeDynamoDBClient:
    """RSS取得テスト用のDynamoDBクライアント。"""

    def __init__(self) -> None:
        self.items: dict[tuple[str, str], dict] = {}

    def put_item(self, item: dict) -> None:
        """アイテムを保存する。"""
        self.items[(item["PK"], item["SK"])] = item

    def get_item(self, pk: str, sk: str) -> dict | None:
        """キーでアイテムを取得する。"""
        return self.items.get((pk, sk))

    def batch_write_item(
        self,
        items: list[dict],
        delete_keys: list[dict] | None = None,
    ) -> None:
        """バッチ書き込みを実行する。"""
        for item in items:
            self.put_item(item)


@composite
def valid_url_strategy(draw) -> str:
    """有効なURL文字列を生成する戦略。"""
    domains = ["example.com", "test.org", "sample.net", "demo.co.jp"]
    paths = ["", "/feed", "/rss", "/feed.xml", "/rss.xml", "/news"]

    domain = draw(sampled_from(domains))
    path = draw(sampled_from(paths))

    return f"https://{domain}{path}"


@composite
def rss_entry_strategy(draw) -> tuple[str, str]:
    """RSSエントリーのリンクとタイトルを生成する戦略。"""
    link = draw(valid_url_strategy())
    title = draw(
        text(
            alphabet=characters(
                blacklist_characters="<>&\"'",
                blacklist_categories=("Cs", "Cc"),
            ),
            min_size=1,
            max_size=50,
        ).filter(lambda value: value.strip())
    )
    return link, title


def build_rss_content(entries: list[tuple[str, str]]) -> bytes:
    """
    RSS 2.0形式のXMLを構築する。

    Args:
        entries: (link, title) の一覧

    Returns:
        bytes: RSS XML
    """
    items_xml = "".join(
        (
            "<item>"
            f"<title>{title}</title>"
            f"<link>{link}</link>"
            "<description>summary</description>"
            "<pubDate>Mon, 18 Sep 2023 12:00:00 GMT</pubDate>"
            "</item>"
        )
        for link, title in entries
    )
    rss_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<rss version="2.0">'
        "<channel>"
        "<title>Example Feed</title>"
        f"{items_xml}"
        "</channel>"
        "</rss>"
    )
    return rss_xml.encode("utf-8")


class TestFeedFetcherProperty:
    """FeedFetcherServiceのプロパティテスト。"""

    @given(message=text(min_size=1, max_size=100))
    @settings(max_examples=50)
    def test_feed_fetch_error_is_wrapped(self, message: str) -> None:
        """
        フィード取得時のHTTPエラーがFeedFetchErrorに変換される。

        検証: 要件 2.2
        """
        feed = Feed(url="https://example.com/rss.xml", title="")
        service = FeedFetcherService(
            dynamodb_client=FakeDynamoDBClient(),
            http_client=ErrorHttpClient(message),
        )

        with pytest.raises(FeedFetchError):
            service.fetch_feed(feed)

    @given(entries=lists(rss_entry_strategy(), min_size=1, max_size=5))
    @settings(max_examples=50)
    def test_fetch_feed_is_idempotent(
        self, entries: list[tuple[str, str]]
    ) -> None:
        """
        同じフィードを繰り返し取得しても記事が重複しない。

        検証: 要件 2.3, 2.4
        """
        unique_entries = list(dict.fromkeys(entries))
        rss_content = build_rss_content(unique_entries)

        feed = Feed(url="https://example.com/rss.xml", title="")
        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClient(rss_content)

        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
        )

        first_result = service.fetch_feed(feed)
        second_result = service.fetch_feed(feed)

        assert first_result.created_articles == len(unique_entries)
        assert second_result.created_articles == 0
        assert second_result.skipped_duplicates == len(unique_entries)

    @given(entries=lists(rss_entry_strategy(), min_size=1, max_size=5))
    @settings(max_examples=50)
    def test_new_articles_are_unread(
        self, entries: list[tuple[str, str]]
    ) -> None:
        """
        新規記事は未読状態で保存される。

        検証: 要件 2.5
        """
        rss_content = build_rss_content(entries)

        feed = Feed(url="https://example.com/rss.xml", title="")
        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClient(rss_content)

        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
        )

        service.fetch_feed(feed)

        article_items = [
            item
            for item in fake_client.items.values()
            if item.get("EntityType") == "Article"
        ]

        assert article_items
        assert all(item.get("is_read") is False for item in article_items)
