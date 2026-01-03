"""
キーワード管理のプロパティベーステスト。

Feature: rss-reader, Property 16-19, 23
検証: 要件 6.1, 6.2, 6.4, 6.5, 6.6, 7.5
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import pytest
from hypothesis import given, settings
from hypothesis.strategies import (
    booleans,
    composite,
    floats,
    lists,
    text,
)

from app.services.keyword_service import KeywordService

pytestmark = pytest.mark.property


class FakeDynamoDBClient:
    """
    キーワード管理テスト用のDynamoDBクライアント。

    in-memoryの辞書でDynamoDBの動作を擬似的に再現します。
    """

    def __init__(self) -> None:
        self.items: dict[tuple[str, str], dict] = {}

    def put_item(self, item: dict) -> None:
        """アイテムを保存。"""
        self.items[(item["PK"], item["SK"])] = item

    def get_item(self, pk: str, sk: str) -> dict | None:
        """キーでアイテムを取得。"""
        return self.items.get((pk, sk))

    def delete_item(self, pk: str, sk: str) -> None:
        """アイテムを削除。"""
        self.items.pop((pk, sk), None)

    def query_keywords(
        self,
        limit: int | None = None,
        exclusive_start_key: dict | None = None,
    ) -> tuple[list[dict], dict | None]:
        """キーワード一覧を取得。"""
        items = [
            item
            for item in self.items.values()
            if item.get("GSI1PK") == "KEYWORD"
        ]
        items = sorted(items, key=lambda item: item.get("GSI1SK", ""))
        start_index = 0
        if exclusive_start_key:
            start_index = next(
                (
                    index + 1
                    for index, item in enumerate(items)
                    if item.get("PK") == exclusive_start_key.get("PK")
                    and item.get("SK") == exclusive_start_key.get("SK")
                ),
                len(items),
            )
        sliced = items[start_index:]
        if limit is not None:
            sliced = sliced[:limit]
        last_key = None
        if limit is not None and start_index + limit < len(items):
            last_item = sliced[-1]
            last_key = {"PK": last_item["PK"], "SK": last_item["SK"]}
        return sliced, last_key

    def query_articles_by_published_date(
        self,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
        exclusive_start_key: dict | None = None,
        descending: bool = True,
    ) -> tuple[list[dict], dict | None]:
        """記事を公開日時順で取得。"""
        items = [
            item
            for item in self.items.values()
            if item.get("GSI1PK") == "ARTICLE"
        ]
        items = sorted(
            items,
            key=lambda item: item.get("GSI1SK", ""),
            reverse=descending,
        )
        start_index = 0
        if exclusive_start_key:
            start_index = next(
                (
                    index + 1
                    for index, item in enumerate(items)
                    if item.get("PK") == exclusive_start_key.get("PK")
                    and item.get("SK") == exclusive_start_key.get("SK")
                ),
                len(items),
            )
        sliced = items[start_index:]
        if limit is not None:
            sliced = sliced[:limit]
        last_key = None
        if limit is not None and start_index + limit < len(items):
            last_item = sliced[-1]
            last_key = {"PK": last_item["PK"], "SK": last_item["SK"]}
        return sliced, last_key


@dataclass
class FakeImportanceScoreService:
    """重要度再計算の呼び出しを記録するテスト用サービス。"""

    recalculated_article_ids: list[str]

    def recalculate_score(self, article_id: str) -> None:
        """記事IDを記録する。"""
        self.recalculated_article_ids.append(article_id)


@composite
def keyword_text_strategy(draw) -> str:
    """有効なキーワードテキストを生成する戦略。"""
    return draw(
        text(min_size=1, max_size=50).filter(lambda value: value.strip())
    )


@composite
def keyword_weight_strategy(draw) -> float:
    """有効な重みを生成する戦略。"""
    return draw(
        floats(
            min_value=0.1,
            max_value=10.0,
            allow_nan=False,
            allow_infinity=False,
        )
    )


@composite
def keyword_payload_strategy(draw) -> dict[str, object]:
    """KeywordService用の入力を生成する戦略。"""
    return {
        "text": draw(keyword_text_strategy()),
        "weight": draw(keyword_weight_strategy()),
        "is_active": draw(booleans()),
    }


@composite
def keyword_payloads_strategy(draw) -> list[dict[str, object]]:
    """複数キーワードの入力を生成する戦略。"""
    return draw(lists(keyword_payload_strategy(), min_size=1, max_size=5))


class TestKeywordServiceProperties:
    """KeywordServiceのプロパティテスト。"""

    @given(payload=keyword_payload_strategy())
    @settings(max_examples=50)
    def test_keyword_registration_persistence(
        self, payload: dict[str, object]
    ):
        """
        キーワード登録後に同じキーワードを取得できる。

        検証: 要件 6.1
        """
        fake_client = FakeDynamoDBClient()
        service = KeywordService(dynamodb_client=fake_client)

        created = service.add_keyword(
            text=str(payload["text"]),
            weight=float(payload["weight"]),
        )

        fetched = service.get_keyword(created.keyword_id)

        assert fetched is not None
        assert fetched.keyword_id == created.keyword_id
        assert fetched.text == created.text

    @given(payload=keyword_payload_strategy())
    @settings(max_examples=50)
    def test_keyword_weight_persistence(self, payload: dict[str, object]):
        """
        登録時に指定した重みが保存される。

        検証: 要件 6.2
        """
        fake_client = FakeDynamoDBClient()
        service = KeywordService(dynamodb_client=fake_client)

        created = service.add_keyword(
            text=str(payload["text"]),
            weight=float(payload["weight"]),
        )

        fetched = service.get_keyword(created.keyword_id)

        assert fetched is not None
        assert fetched.weight == created.weight

    @given(payload=keyword_payload_strategy())
    @settings(max_examples=50)
    def test_keyword_activation_toggle(self, payload: dict[str, object]):
        """
        キーワードの有効/無効が正しく切り替わる。

        検証: 要件 6.4, 6.5
        """
        fake_client = FakeDynamoDBClient()
        service = KeywordService(dynamodb_client=fake_client)

        created = service.add_keyword(
            text=str(payload["text"]),
            weight=float(payload["weight"]),
        )

        updated = service.update_keyword(
            keyword_id=created.keyword_id,
            is_active=bool(payload["is_active"]),
        )

        assert updated is not None
        assert updated.is_active is bool(payload["is_active"])

        fetched = service.get_keyword(created.keyword_id)
        assert fetched is not None
        assert fetched.is_active is bool(payload["is_active"])

    @given(payloads=keyword_payloads_strategy())
    @settings(max_examples=50)
    def test_keyword_list_is_complete(self, payloads: list[dict[str, object]]):
        """
        登録したキーワードが一覧にすべて含まれる。

        検証: 要件 6.6
        """
        fake_client = FakeDynamoDBClient()
        service = KeywordService(dynamodb_client=fake_client)

        created_keywords = [
            service.add_keyword(
                text=str(payload["text"]),
                weight=float(payload["weight"]),
            )
            for payload in payloads
        ]

        fetched_keywords = service.get_keywords()

        created_ids = {keyword.keyword_id for keyword in created_keywords}
        fetched_ids = {keyword.keyword_id for keyword in fetched_keywords}

        assert created_ids.issubset(fetched_ids)

    @given(payloads=keyword_payloads_strategy())
    @settings(max_examples=25)
    def test_recalculate_all_scores_triggers_each_article(
        self,
        payloads: list[dict[str, object]],
    ) -> None:
        """
        重要度スコアの再計算が全記事に対して実行される。

        検証: 要件 7.5
        """
        fake_client = FakeDynamoDBClient()
        for index, payload in enumerate(payloads):
            article_id = f"article-{index}-{payload['text']}"
            article_item = {
                "PK": f"ARTICLE#{article_id}",
                "SK": "METADATA",
                "GSI1PK": "ARTICLE",
                "GSI1SK": datetime.now().isoformat() + "Z",
                "EntityType": "Article",
                "article_id": article_id,
            }
            fake_client.put_item(article_item)

        fake_importance_service = FakeImportanceScoreService([])
        service = KeywordService(
            dynamodb_client=fake_client,
            importance_score_service=fake_importance_service,
        )

        service.recalculate_all_scores()

        expected_ids = {
            f"article-{index}-{payload['text']}"
            for index, payload in enumerate(payloads)
        }
        assert (
            set(fake_importance_service.recalculated_article_ids)
            == expected_ids
        )
