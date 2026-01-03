"""
記事削除サービスのプロパティベーステスト。

Feature: rss-reader, Property 24-26
検証: 要件 11.1, 11.2, 11.4
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from hypothesis import given, settings
from hypothesis.strategies import integers, lists

from app.services.cleanup_service import CleanupService

from ..support.cleanup_fakes import (
    FakeDynamoDBClient,
    create_article,
    create_reason,
    seed_items,
)

pytestmark = pytest.mark.property


class TestCleanupServiceProperty:
    """CleanupServiceのプロパティテスト。"""

    @given(
        old_days=lists(integers(min_value=8, max_value=30), min_size=1),
        new_days=lists(integers(min_value=0, max_value=6), min_size=1),
    )
    @settings(max_examples=30)
    def test_old_articles_are_deleted(
        self, old_days: list[int], new_days: list[int]
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
        self, old_hours: list[int], new_hours: list[int]
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
                now - timedelta(hours=hours),
                is_read=True,
                read_at=now - timedelta(hours=hours),
            )
            articles.append(article)

        for hours in new_hours:
            article = create_article(
                now - timedelta(hours=hours),
                is_read=True,
                read_at=now - timedelta(hours=hours),
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
        self, old_days: list[int]
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
