"""
記事削除サービスのプロパティベーステスト。

Feature: rss-reader, Property 24-26
検証: 要件 11.1, 11.2, 11.4
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from uuid import uuid4

from hypothesis import given, settings
from hypothesis.strategies import integers, lists

from app.models.article import Article
from app.models.importance_reason import ImportanceReason
from app.services.cleanup_service import CleanupService


@dataclass
class StoredItem:
    """テスト用の保存アイテム。"""

    pk: str
    sk: str
    item: Dict


class FakeDynamoDBClient:
    """
    記事削除テスト用のDynamoDBクライアント。

    in-memoryの辞書でDynamoDBの動作を擬似的に再現する。
    """

    def __init__(self) -> None:
        self.items: Dict[Tuple[str, str], Dict] = {}

    def put_item(self, item: Dict) -> None:
        """アイテムを保存する。"""
        self.items[(item["PK"], item["SK"])] = item

    def query(
        self,
        key_condition_expression,
        index_name: Optional[str] = None,
        filter_expression=None,
        scan_index_forward: bool = True,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None,
        **kwargs,
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        GSIクエリを擬似的に実行する。

        Args:
            key_condition_expression: キー条件式
            index_name: インデックス名
            filter_expression: 未使用
            scan_index_forward: ソート順
            limit: 取得件数制限
            exclusive_start_key: ページネーションキー
            **kwargs: 未使用

        Returns:
            Tuple[List[Dict], Optional[Dict]]: 取得結果と次ページのキー
        """
        pk_name, sk_name = self._resolve_index_keys(index_name)
        pk_value = self._extract_value(
            key_condition_expression, "=", pk_name
        )
        cutoff_value = self._extract_value(
            key_condition_expression, "<", sk_name
        )

        items = [
            item
            for item in self.items.values()
            if item.get(pk_name) == pk_value
            and item.get(sk_name) < cutoff_value
        ]

        items.sort(
            key=lambda item: (item.get(sk_name, ""), item["PK"]),
            reverse=not scan_index_forward,
        )

        start_index = 0
        if exclusive_start_key:
            for idx, item in enumerate(items):
                if (
                    item["PK"] == exclusive_start_key.get("PK")
                    and item["SK"] == exclusive_start_key.get("SK")
                ):
                    start_index = idx + 1
                    break

        sliced = items[start_index:]
        if limit is not None:
            sliced = sliced[:limit]

        last_evaluated_key = None
        if limit is not None and start_index + limit < len(items):
            last_item = sliced[-1]
            last_evaluated_key = {"PK": last_item["PK"], "SK": last_item["SK"]}

        return sliced, last_evaluated_key

    def batch_write_item(
        self, items: List[Dict], delete_keys: Optional[List[Dict]] = None
    ) -> None:
        """バッチ削除を実行する。"""
        delete_keys = delete_keys or []
        for key in delete_keys:
            self.items.pop((key["PK"], key["SK"]), None)

    def delete_importance_reasons_for_article(self, article_id: str) -> int:
        """重要度理由を削除する。"""
        delete_keys = [
            {"PK": pk, "SK": sk}
            for (pk, sk), item in self.items.items()
            if pk == f"ARTICLE#{article_id}"
            and str(item.get("EntityType")) == "ImportanceReason"
        ]
        self.batch_write_item(items=[], delete_keys=delete_keys)
        return len(delete_keys)

    @staticmethod
    def _resolve_index_keys(index_name: Optional[str]) -> Tuple[str, str]:
        """GSIのキー名を返す。"""
        if index_name == "GSI4":
            return "GSI4PK", "GSI4SK"
        return "GSI3PK", "GSI3SK"

    @staticmethod
    def _extract_value(expression, operator: str, key_name: str) -> str:
        """条件式から対象キーの比較値を取得する。"""
        if hasattr(expression, "get_expression"):
            expr = expression.get_expression()
            if expr.get("operator") == operator:
                left, value = expr.get("values", (None, None))
                if getattr(left, "name", None) == key_name:
                    return value

        if hasattr(expression, "_values"):
            for child in expression._values:
                result = FakeDynamoDBClient._extract_value(
                    child, operator, key_name
                )
                if result is not None:
                    return result

        raise ValueError("条件式から値を抽出できませんでした。")


def create_article(created_at: datetime, is_read: bool = False) -> Article:
    """指定条件のArticleを作成する。"""
    return Article(
        feed_id=str(uuid4()),
        link=f"https://example.com/{uuid4()}",
        title="テスト記事",
        content="content",
        published_at=created_at,
        created_at=created_at,
        is_read=is_read,
        read_at=created_at if is_read else None,
    )


def create_reason(article: Article) -> ImportanceReason:
    """記事に紐づく重要度理由を作成する。"""
    return ImportanceReason.create_from_calculation(
        article_id=article.article_id,
        keyword_id=str(uuid4()),
        keyword_text="keyword",
        similarity_score=0.5,
        weight=1.0,
    )


def seed_items(client: FakeDynamoDBClient, items: List[Dict]) -> None:
    """FakeDynamoDBClientにアイテムを保存する。"""
    for item in items:
        client.put_item(item)


class TestCleanupServiceProperty:
    """CleanupServiceのプロパティテスト。"""

    @given(
        old_days=lists(integers(min_value=8, max_value=30), min_size=1),
        new_days=lists(integers(min_value=0, max_value=6), min_size=1),
    )
    @settings(max_examples=30)
    def test_old_articles_are_deleted(
        self, old_days: List[int], new_days: List[int]
    ) -> None:
        """
        古い記事が削除されることを検証する。

        検証: 要件 11.1
        """
        now = datetime.now()
        fake_client = FakeDynamoDBClient()
        articles = []

        for days in old_days:
            article = create_article(now - timedelta(days=days))
            articles.append(article)

        for days in new_days:
            article = create_article(now - timedelta(days=days))
            articles.append(article)

        seed_items(
            fake_client,
            [article.to_dynamodb_item() for article in articles],
        )

        service = CleanupService(dynamodb_client=fake_client)
        deleted_articles, _ = service.delete_articles_by_age(days=7)

        deleted_ids = {
            article.article_id
            for article in articles
            if (now - article.created_at).days >= 7
        }
        remaining_ids = {
            article.article_id
            for article in articles
            if (now - article.created_at).days < 7
        }

        assert deleted_articles == len(deleted_ids)
        for article_id in deleted_ids:
            assert (
                f"ARTICLE#{article_id}",
                "METADATA",
            ) not in fake_client.items
        for article_id in remaining_ids:
            assert (f"ARTICLE#{article_id}", "METADATA") in fake_client.items

    @given(
        old_hours=lists(integers(min_value=25, max_value=72), min_size=1),
        new_hours=lists(integers(min_value=0, max_value=23), min_size=1),
    )
    @settings(max_examples=30)
    def test_read_articles_are_deleted(
        self, old_hours: List[int], new_hours: List[int]
    ) -> None:
        """
        既読記事が削除されることを検証する。

        検証: 要件 11.2
        """
        now = datetime.now()
        fake_client = FakeDynamoDBClient()
        articles = []

        for hours in old_hours:
            article = create_article(
                now - timedelta(hours=hours), is_read=True
            )
            articles.append(article)

        for hours in new_hours:
            article = create_article(
                now - timedelta(hours=hours), is_read=True
            )
            articles.append(article)

        unread_article = create_article(now, is_read=False)
        articles.append(unread_article)

        seed_items(
            fake_client,
            [article.to_dynamodb_item() for article in articles],
        )

        service = CleanupService(dynamodb_client=fake_client)
        deleted_articles, _ = service.delete_read_articles(hours=24)

        deleted_ids = {
            article.article_id
            for article in articles
            if article.is_read
            and article.read_at
            and (now - article.read_at).total_seconds() >= 24 * 3600
        }
        remaining_ids = {
            article.article_id
            for article in articles
            if article.article_id not in deleted_ids
        }

        assert deleted_articles == len(deleted_ids)
        for article_id in deleted_ids:
            assert (
                f"ARTICLE#{article_id}",
                "METADATA",
            ) not in fake_client.items
        for article_id in remaining_ids:
            assert (f"ARTICLE#{article_id}", "METADATA") in fake_client.items

    @given(old_days=lists(integers(min_value=8, max_value=20), min_size=1))
    @settings(max_examples=20)
    def test_cascade_delete_importance_reasons(
        self, old_days: List[int]
    ) -> None:
        """
        記事削除時に重要度理由が削除されることを検証する。

        検証: 要件 11.4
        """
        now = datetime.now()
        fake_client = FakeDynamoDBClient()

        old_articles = [
            create_article(now - timedelta(days=days)) for days in old_days
        ]
        new_article = create_article(now)

        items = []
        for article in old_articles + [new_article]:
            items.append(article.to_dynamodb_item())
            reason = create_reason(article)
            items.append(reason.to_dynamodb_item())

        seed_items(fake_client, items)

        service = CleanupService(dynamodb_client=fake_client)
        _, deleted_reasons = service.delete_articles_by_age(days=7)

        deleted_ids = {article.article_id for article in old_articles}
        remaining_reason_pk = f"ARTICLE#{new_article.article_id}"

        assert deleted_reasons == len(old_articles)
        for article_id in deleted_ids:
            reason_key = (f"ARTICLE#{article_id}",)
            assert not any(
                pk == reason_key[0]
                and item.get("EntityType") == "ImportanceReason"
                for (pk, _), item in fake_client.items.items()
            )
        assert any(
            pk == remaining_reason_pk
            and item.get("EntityType") == "ImportanceReason"
            for (pk, _), item in fake_client.items.items()
        )
