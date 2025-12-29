"""
RSSフィード取得サービスのユニットテスト。

FeedFetcherServiceの取得処理が正しく動作することを検証します。
"""

from typing import Dict, List, Optional, Tuple

import httpx

from app.models.feed import Feed
from app.models.link_index import LinkIndex
from app.services.feed_fetcher_service import (
    FeedFetchError,
    FeedFetcherService,
)


class FakeDynamoDBClient:
    """
    RSS取得テスト用のDynamoDBクライアント。

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

    def batch_write_item(
        self,
        items: List[Dict],
        delete_keys: Optional[List[Dict]] = None,
    ) -> None:
        """バッチ書き込みを実行"""
        for item in items:
            self.put_item(item)


class FakeHttpResponse:
    """テスト用HTTPレスポンス"""

    def __init__(self, content: bytes) -> None:
        self.content = content

    def raise_for_status(self) -> None:
        """常に正常応答とする"""


class FakeHttpClient:
    """テスト用HTTPクライアント"""

    def __init__(self, content: bytes) -> None:
        self.response = FakeHttpResponse(content)

    def get(self, url: str) -> FakeHttpResponse:
        """指定URLのレスポンスを返す"""
        return self.response


class FakeHttpClientError:
    """HTTPエラーを発生させるテスト用クライアント"""

    def get(self, url: str) -> FakeHttpResponse:
        """HTTPエラーを発生させる"""
        request = httpx.Request("GET", url)
        raise httpx.RequestError("network error", request=request)


class FakeImportanceScoreService:
    """重要度スコア計算サービスのモック"""

    def __init__(self, score: float) -> None:
        self.score = score
        self.called_with: List[Tuple[str, str]] = []

    def calculate_score(self, title: str, content: str) -> float:
        """引数を記録して固定スコアを返す"""
        self.called_with.append((title, content))
        return self.score


class TestFeedFetcherService:
    """FeedFetcherServiceのテスト"""

    def test_fetch_feed_saves_articles_and_updates_feed(self) -> None:
        """記事保存とフィード更新が行われることを検証"""
        rss_content = b"""
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Example Feed</title>
            <item>
              <title>Article 1</title>
              <link>https://example.com/article-1</link>
              <description>First</description>
              <pubDate>Mon, 18 Sep 2023 12:00:00 GMT</pubDate>
            </item>
            <item>
              <title>Article 2</title>
              <link>https://example.com/article-2</link>
              <description>Second</description>
              <pubDate>Tue, 19 Sep 2023 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
        """

        feed = Feed(url="https://example.com/rss.xml", title="")
        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClient(rss_content)

        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
        )

        result = service.fetch_feed(feed)

        assert result.total_entries == 2
        assert result.created_articles == 2
        assert result.skipped_duplicates == 0
        assert result.skipped_invalid == 0

        article_items = [
            item
            for item in fake_client.items.values()
            if item.get("EntityType") == "Article"
        ]
        link_items = [
            item
            for item in fake_client.items.values()
            if item.get("EntityType") == "LinkIndex"
        ]

        assert len(article_items) == 2
        assert len(link_items) == 2

        feed_item = fake_client.get_item(
            pk=f"FEED#{feed.feed_id}",
            sk="METADATA",
        )
        assert feed_item is not None
        assert feed_item.get("last_fetched_at") is not None

    def test_fetch_feed_skips_duplicate_link(self) -> None:
        """重複リンクをスキップすることを検証"""
        rss_content = b"""
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Example Feed</title>
            <item>
              <title>Article 1</title>
              <link>https://example.com/article-1</link>
              <description>First</description>
              <pubDate>Mon, 18 Sep 2023 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
        """

        feed = Feed(url="https://example.com/rss.xml", title="")
        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClient(rss_content)

        link_index = LinkIndex.create_from_article(
            link="https://example.com/article-1",
            article_id="article-1",
        )
        fake_client.put_item(link_index.to_dynamodb_item())

        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
        )

        result = service.fetch_feed(feed)

        assert result.total_entries == 1
        assert result.created_articles == 0
        assert result.skipped_duplicates == 1
        assert result.skipped_invalid == 0

    def test_fetch_feed_skips_invalid_entry(self) -> None:
        """不正なエントリーをスキップすることを検証"""
        rss_content = b"""
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Example Feed</title>
            <item>
              <title></title>
              <description>Missing link and title</description>
              <pubDate>Mon, 18 Sep 2023 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
        """

        feed = Feed(url="https://example.com/rss.xml", title="")
        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClient(rss_content)

        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
        )

        result = service.fetch_feed(feed)

        assert result.total_entries == 1
        assert result.created_articles == 0
        assert result.skipped_duplicates == 0
        assert result.skipped_invalid == 1

    def test_parse_feed_supports_rss2(self) -> None:
        """RSS 2.0フィードを解析できることを検証"""
        rss_content = b"""
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>RSS 2.0 Example</title>
            <item>
              <title>Article 1</title>
              <link>https://example.com/rss-1</link>
              <description>RSS summary</description>
              <pubDate>Mon, 18 Sep 2023 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
        """

        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClient(rss_content)
        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
        )

        parsed_feed = service.parse_feed("https://example.com/rss.xml")

        assert parsed_feed.feed.get("title") == "RSS 2.0 Example"
        assert len(parsed_feed.entries) == 1
        assert parsed_feed.entries[0].get("title") == "Article 1"

    def test_parse_feed_supports_atom(self) -> None:
        """Atomフィードを解析できることを検証"""
        atom_content = b"""
        <?xml version="1.0" encoding="utf-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Atom Example</title>
          <entry>
            <title>Atom Article</title>
            <link href="https://example.com/atom-1" />
            <summary>Atom summary</summary>
            <updated>2023-09-19T12:00:00Z</updated>
          </entry>
        </feed>
        """

        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClient(atom_content)
        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
        )

        parsed_feed = service.parse_feed("https://example.com/atom.xml")

        assert parsed_feed.feed.get("title") == "Atom Example"
        assert len(parsed_feed.entries) == 1
        assert parsed_feed.entries[0].get("title") == "Atom Article"

    def test_parse_feed_raises_on_http_error(self) -> None:
        """HTTP取得失敗時にFeedFetchErrorが発生することを検証"""
        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClientError()
        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
        )

        try:
            service.parse_feed("https://example.com/rss.xml")
        except FeedFetchError as exc:
            assert "フィード取得に失敗しました" in str(exc)
        else:
            raise AssertionError("FeedFetchErrorが発生しませんでした。")

    def test_fetch_feed_uses_importance_score_service(self) -> None:
        """重要度スコア計算サービスが呼ばれることを検証"""
        rss_content = b"""
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Example Feed</title>
            <item>
              <title>Scored Article</title>
              <link>https://example.com/scored-1</link>
              <description>Scored content</description>
              <pubDate>Mon, 18 Sep 2023 12:00:00 GMT</pubDate>
            </item>
          </channel>
        </rss>
        """

        fake_client = FakeDynamoDBClient()
        fake_http_client = FakeHttpClient(rss_content)
        importance_service = FakeImportanceScoreService(score=0.7)
        feed = Feed(url="https://example.com/rss.xml", title="")

        service = FeedFetcherService(
            dynamodb_client=fake_client,
            http_client=fake_http_client,
            importance_score_service=importance_service,
        )

        result = service.fetch_feed(feed)

        assert result.created_articles == 1
        assert importance_service.called_with == [
            ("Scored Article", "Scored content"),
        ]
        article_items = [
            item
            for item in fake_client.items.values()
            if item.get("EntityType") == "Article"
        ]
        assert article_items[0]["importance_score"] == 0.7
