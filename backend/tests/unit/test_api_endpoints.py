"""
APIエンドポイントの統合テスト

認証付きのエンドツーエンド動作とエラーレスポンスを検証します。
"""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.api import articles as articles_api
from app.api import feeds as feeds_api
from app.api import jobs as jobs_api
from app.api import keywords as keywords_api
from app.config import settings
from app.main import app
from app.models.article import Article
from app.models.feed import Feed
from app.models.keyword import Keyword
from app.services.feed_fetcher_service import FeedFetchResult


class DummyFeedService:
    """テスト用のFeedService"""

    def __init__(self) -> None:
        self.feed = Feed(url="https://example.com/rss", title="Example")

    def create_feed(self, url: str, title: str | None, folder: str | None):
        return Feed(url=url, title=title or "Example", folder=folder)

    def list_feeds(self):
        return [self.feed]

    def get_feed(self, feed_id: str):
        if feed_id == self.feed.feed_id:
            return self.feed
        return None

    def update_feed(
        self,
        feed_id: str,
        title: str | None,
        folder: str | None,
        is_active: bool | None,
    ):
        if feed_id != self.feed.feed_id:
            return None
        if title is not None:
            self.feed.title = title
        if folder is not None:
            self.feed.folder = folder
        if is_active is not None:
            self.feed.is_active = is_active
        return self.feed

    def delete_feed(self, feed_id: str) -> bool:
        return feed_id == self.feed.feed_id


class DummyArticleService:
    """テスト用のArticleService"""

    def __init__(self) -> None:
        self.article = Article(
            feed_id="feed-1",
            link="https://example.com/article",
            title="Example Article",
            content="Content",
            published_at=datetime.now(),
        )

    def get_articles(
        self,
        sort_by: str = "published_at",
        filter_by: str | None = None,
        limit: int = 100,
        last_evaluated_key: dict | None = None,
    ):
        return [self.article], None

    def get_article(self, article_id: str):
        if article_id == self.article.article_id:
            return self.article
        return None

    def mark_as_read(self, article_id: str, is_read: bool):
        if article_id != self.article.article_id:
            return None
        if is_read:
            self.article.mark_as_read()
        else:
            self.article.mark_as_unread()
        return self.article

    def mark_as_saved(self, article_id: str, is_saved: bool):
        if article_id != self.article.article_id:
            return None
        if self.article.is_saved != is_saved:
            self.article.toggle_saved()
        return self.article


class DummyKeywordService:
    """テスト用のKeywordService"""

    def __init__(self) -> None:
        self.keyword = Keyword(text="news", weight=1.0)

    def add_keyword(self, text: str, weight: float = 1.0):
        return Keyword(text=text, weight=weight)

    def get_keywords(self):
        return [self.keyword]

    def update_keyword(
        self,
        keyword_id: str,
        text: str | None = None,
        weight: float | None = None,
        is_active: bool | None = None,
    ):
        if keyword_id != self.keyword.keyword_id:
            return None
        if text is not None:
            self.keyword.text = text
        if weight is not None:
            self.keyword.weight = weight
        if is_active is not None:
            self.keyword.is_active = is_active
        return self.keyword

    def delete_keyword(self, keyword_id: str) -> bool:
        return keyword_id == self.keyword.keyword_id

    def recalculate_all_scores(self) -> None:
        return None


class DummyFeedFetcherService:
    """テスト用のFeedFetcherService"""

    def fetch_all_feeds(self):
        return [
            FeedFetchResult(
                feed_id="feed-1",
                total_entries=1,
                created_articles=1,
                skipped_duplicates=0,
                skipped_invalid=0,
                error_message=None,
            )
        ]


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    """
    テスト用のクライアントを生成します。
    """
    monkeypatch.setattr(settings, "API_KEY", "test-key")
    app.dependency_overrides[feeds_api.get_feed_service] = DummyFeedService
    app.dependency_overrides[feeds_api.get_feed_fetcher_service] = (
        DummyFeedFetcherService
    )
    app.dependency_overrides[articles_api.get_article_service] = (
        DummyArticleService
    )
    app.dependency_overrides[keywords_api.get_keyword_service] = (
        DummyKeywordService
    )
    app.dependency_overrides[jobs_api.get_feed_fetcher_service] = (
        DummyFeedFetcherService
    )

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides = {}


def test_requires_authentication(client: TestClient) -> None:
    """
    認証なしのアクセスが拒否されることを確認します。
    """
    response = client.get("/api/feeds")
    assert response.status_code == 401


def test_list_feeds_with_auth(client: TestClient) -> None:
    """
    認証付きでフィード一覧が取得できることを確認します。
    """
    response = client.get(
        "/api/feeds",
        headers={"Authorization": "Bearer test-key"},
    )
    assert response.status_code == 200
    assert response.json()["items"][0]["title"] == "Example"


def test_invalid_sort_returns_error(client: TestClient) -> None:
    """
    不正なソート条件でエラーが返ることを確認します。
    """
    response = client.get(
        "/api/articles?sort=invalid",
        headers={"Authorization": "Bearer test-key"},
    )
    assert response.status_code == 400


def test_security_headers_present(client: TestClient) -> None:
    """
    セキュリティヘッダーが付与されることを確認します。
    """
    response = client.get(
        "/api/feeds",
        headers={"Authorization": "Bearer test-key"},
    )
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
