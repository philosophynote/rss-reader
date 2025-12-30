"""
RSSフィード取得サービス

RSSフィードを取得し、記事として保存する処理を提供します。
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import TYPE_CHECKING, Protocol

import feedparser
import httpx

from app.config import settings
from app.models.article import Article
from app.models.link_index import LinkIndex
from app.services.feed_service import FeedService
from app.utils.dynamodb_client import DynamoDBClient

if TYPE_CHECKING:
    from collections.abc import Iterable

    from app.models.feed import Feed

logger = logging.getLogger(__name__)


class FeedFetchError(RuntimeError):
    """RSSフィード取得時のエラー。"""


class ImportanceScoreService(Protocol):
    """
    重要度スコア計算サービスのインターフェース。

    実装はタスク6で追加予定。
    """

    def calculate_score(self, title: str, content: str) -> float:
        """
        記事のタイトルと本文から重要度スコアを算出する。

        Args:
            title: 記事タイトル
            content: 記事本文

        Returns:
            float: 重要度スコア（0.0～1.0）
        """
        ...


@dataclass(frozen=True)
class FeedFetchResult:
    """
    RSSフィード取得結果。

    Attributes:
        feed_id: フィードID
        total_entries: 取得したエントリー数
        created_articles: 新規作成された記事数
        skipped_duplicates: 重複のためにスキップした件数
        skipped_invalid: 不正データのためにスキップした件数
        error_message: エラーが発生した場合のメッセージ
    """

    feed_id: str
    total_entries: int
    created_articles: int
    skipped_duplicates: int
    skipped_invalid: int
    error_message: str | None = None


class FeedFetcherService:
    """
    RSSフィード取得サービス。

    feedparserを使用してRSS/Atomフィードを取得し、
    記事データをDynamoDBに保存します。
    """

    def __init__(
        self,
        dynamodb_client: DynamoDBClient | None = None,
        http_client: httpx.Client | None = None,
        importance_score_service: ImportanceScoreService | None = None,
    ) -> None:
        """
        FeedFetcherServiceの初期化。

        Args:
            dynamodb_client: DynamoDBクライアント
            http_client: HTTPクライアント
            importance_score_service: 重要度スコア計算サービス
        """
        self.dynamodb_client = dynamodb_client or DynamoDBClient()
        self.http_client = http_client or httpx.Client(
            timeout=10.0,
            headers={"User-Agent": "RSS Reader/1.0"},
        )
        self.importance_score_service = importance_score_service

    def fetch_all_feeds(self) -> list[FeedFetchResult]:
        """
        登録済みの全フィードを取得する。

        Returns:
            List[FeedFetchResult]: 取得結果の一覧
        """
        feed_service = FeedService(dynamodb_client=self.dynamodb_client)
        results: list[FeedFetchResult] = []

        for feed in feed_service.list_feeds():
            if not feed.is_active:
                continue
            try:
                results.append(self.fetch_feed(feed))
            except FeedFetchError as exc:
                results.append(
                    FeedFetchResult(
                        feed_id=feed.feed_id,
                        total_entries=0,
                        created_articles=0,
                        skipped_duplicates=0,
                        skipped_invalid=0,
                        error_message=str(exc),
                    )
                )

        return results

    def fetch_feed(self, feed: Feed) -> FeedFetchResult:
        """
        指定フィードを取得して記事を保存する。

        Args:
            feed: 取得対象のフィード

        Returns:
            FeedFetchResult: 取得結果

        Raises:
            FeedFetchError: フィードの取得や解析に失敗した場合
        """
        parsed_feed = self.parse_feed(str(feed.url))
        entries = list(parsed_feed.entries or [])

        created_articles = 0
        skipped_duplicates = 0
        skipped_invalid = 0
        items_to_save: list[dict] = []

        for entry in entries:
            link = self._extract_link(entry)
            title = self._extract_title(entry)

            if not link or not title:
                skipped_invalid += 1
                continue

            if self._is_duplicate(link):
                skipped_duplicates += 1
                continue

            article = self._build_article(feed, entry, link, title)
            if article is None:
                skipped_invalid += 1
                continue

            items_to_save.append(article.to_dynamodb_item())
            link_index = LinkIndex.create_from_article(
                link=str(article.link),
                article_id=article.article_id,
            )
            items_to_save.append(link_index.to_dynamodb_item())
            created_articles += 1

        if items_to_save:
            self.dynamodb_client.batch_write_item(items=items_to_save)

        self._update_feed_metadata(feed, parsed_feed)
        self.dynamodb_client.put_item(feed.to_dynamodb_item())

        return FeedFetchResult(
            feed_id=feed.feed_id,
            total_entries=len(entries),
            created_articles=created_articles,
            skipped_duplicates=skipped_duplicates,
            skipped_invalid=skipped_invalid,
        )

    def parse_feed(self, url: str) -> feedparser.FeedParserDict:
        """
        RSSフィードを取得して解析する。

        Args:
            url: RSSフィードURL

        Returns:
            feedparser.FeedParserDict: 解析済みフィード

        Raises:
            FeedFetchError: フィード取得に失敗した場合
        """
        try:
            response = self.http_client.get(url)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise FeedFetchError(f"フィード取得に失敗しました: {exc}") from exc

        parsed_feed = feedparser.parse(response.content)
        if parsed_feed.bozo and not parsed_feed.entries:
            bozo_exception = parsed_feed.get("bozo_exception")
            raise FeedFetchError(
                f"フィード解析に失敗しました: {bozo_exception}"
            )
        if parsed_feed.bozo:
            logger.warning(
                "フィード解析に警告: %s", parsed_feed.bozo_exception
            )

        return parsed_feed

    def _update_feed_metadata(
        self,
        feed: Feed,
        parsed_feed: feedparser.FeedParserDict,
    ) -> None:
        """
        フィードのメタデータを更新する。

        Args:
            feed: 更新対象のフィード
            parsed_feed: 解析済みフィード
        """
        feed_title = (
            parsed_feed.feed.get("title") if parsed_feed.feed else None  # type: ignore[union-attr]
        )
        if feed_title and feed.title.startswith("Feed from "):
            feed.title = str(feed_title).strip()
        feed.mark_as_fetched()

    def _build_article(
        self,
        feed: Feed,
        entry: feedparser.FeedParserDict,
        link: str,
        title: str,
    ) -> Article | None:
        """
        記事モデルを生成する。

        Args:
            feed: フィード情報
            entry: フィードエントリー
            link: 記事リンク
            title: 記事タイトル

        Returns:
            Optional[Article]: 記事モデル（不正データの場合はNone）
        """
        content = self._extract_content(entry)
        published_at = self._extract_published_at(entry)

        try:
            article = Article(
                feed_id=feed.feed_id,
                link=link,  # type: ignore[arg-type]
                title=title,
                content=content,
                published_at=published_at,
            )
        except ValueError as exc:
            logger.warning("記事データが不正なためスキップ: %s", exc)
            return None

        if self.importance_score_service is not None:
            try:
                article.importance_score = (
                    self.importance_score_service.calculate_score(
                        title=article.title,
                        content=article.content,
                    )
                )
            except Exception as exc:
                logger.warning("重要度スコア計算に失敗: %s", exc)

        article.set_ttl_for_article(settings.DEFAULT_ARTICLE_TTL_DAYS)
        return article

    def _extract_link(self, entry: feedparser.FeedParserDict) -> str | None:
        """
        エントリーからリンクを抽出する。

        Args:
            entry: フィードエントリー

        Returns:
            Optional[str]: 記事リンク
        """
        link = entry.get("link")
        if not link or not isinstance(link, str):
            return None
        link = link.strip()
        return link or None

    def _extract_title(
        self,
        entry: feedparser.FeedParserDict,
    ) -> str | None:
        """
        エントリーからタイトルを抽出する。

        Args:
            entry: フィードエントリー

        Returns:
            Optional[str]: 記事タイトル
        """
        title = entry.get("title")
        if not title or not isinstance(title, str):
            return None
        title = title.strip()
        return title or None

    def _extract_content(self, entry: feedparser.FeedParserDict) -> str:
        """
        エントリーから本文を抽出する。

        Args:
            entry: フィードエントリー

        Returns:
            str: 記事本文
        """
        content_sources: Iterable[str | None] = (
            entry.get("summary"),  # type: ignore[assignment]
            entry.get("description"),  # type: ignore[assignment]
        )

        content = next((value for value in content_sources if value), None)
        if not content:
            contents = entry.get("content") or []
            if contents:
                content_value = contents[0].get("value")
                if content_value:
                    content = content_value
        content = content or ""

        if len(content) > 50000:
            content = content[:50000]
        return content  # type: ignore[return-value]

    def _extract_published_at(
        self,
        entry: feedparser.FeedParserDict,
    ) -> datetime:
        """
        エントリーから公開日時を抽出する。

        Args:
            entry: フィードエントリー

        Returns:
            datetime: 公開日時
        """
        for key in ("published_parsed", "updated_parsed", "created_parsed"):
            parsed_time = entry.get(key)
            if parsed_time:
                return datetime(*parsed_time[:6])  # type: ignore[arg-type]
        return datetime.now()

    def _is_duplicate(self, link: str) -> bool:
        """
        リンクインデックスを用いて重複を判定する。

        Args:
            link: 記事リンク

        Returns:
            bool: 重複している場合はTrue
        """
        url_hash = LinkIndex.generate_hash_from_url(link)
        item = self.dynamodb_client.get_item(
            pk=f"LINK#{url_hash}",
            sk="METADATA",
        )
        return item is not None
