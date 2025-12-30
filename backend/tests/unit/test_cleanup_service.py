"""
記事削除サービスのユニットテスト。

CleanupServiceの削除条件とカスケード削除を検証する。
"""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.services.cleanup_service import CleanupService
from ..support.cleanup_fakes import (
    FakeDynamoDBClient,
    create_article,
    create_reason,
)


class TestCleanupService:
    """CleanupServiceのユニットテスト。"""

    def test_delete_articles_by_age_removes_old_articles(self) -> None:
        """古い記事が削除されることを検証する。"""
        now = datetime.now()
        fake_client = FakeDynamoDBClient()

        old_article = create_article(now - timedelta(days=10))
        new_article = create_article(now - timedelta(days=2))
        for article in [old_article, new_article]:
            fake_client.put_item(article.to_dynamodb_item())

        service = CleanupService(dynamodb_client=fake_client)
        deleted_articles, deleted_reasons = service.delete_articles_by_age(
            days=7
        )

        assert deleted_articles == 1
        assert deleted_reasons == 0
        assert (
            f"ARTICLE#{old_article.article_id}",
            "METADATA",
        ) not in fake_client.items
        assert (
            f"ARTICLE#{new_article.article_id}",
            "METADATA",
        ) in fake_client.items

    def test_delete_read_articles_removes_read_articles(self) -> None:
        """既読記事が削除されることを検証する。"""
        now = datetime.now()
        fake_client = FakeDynamoDBClient()

        old_read = create_article(
            now - timedelta(hours=30),
            is_read=True,
            read_at=now - timedelta(hours=30),
        )
        new_read = create_article(
            now - timedelta(hours=5),
            is_read=True,
            read_at=now - timedelta(hours=5),
        )
        unread = create_article(now, is_read=False)

        for article in [old_read, new_read, unread]:
            fake_client.put_item(article.to_dynamodb_item())

        service = CleanupService(dynamodb_client=fake_client)
        deleted_articles, deleted_reasons = service.delete_read_articles(
            hours=24
        )

        assert deleted_articles == 1
        assert deleted_reasons == 0
        assert (
            f"ARTICLE#{old_read.article_id}",
            "METADATA",
        ) not in fake_client.items
        assert (
            f"ARTICLE#{new_read.article_id}",
            "METADATA",
        ) in fake_client.items
        assert (
            f"ARTICLE#{unread.article_id}",
            "METADATA",
        ) in fake_client.items

    def test_delete_articles_by_age_cascades_reasons(self) -> None:
        """記事削除時に重要度理由が削除されることを検証する。"""
        now = datetime.now()
        fake_client = FakeDynamoDBClient()

        old_article = create_article(now - timedelta(days=9))
        new_article = create_article(now - timedelta(days=1))
        old_reason = create_reason(old_article)
        new_reason = create_reason(new_article)

        for item in [
            old_article.to_dynamodb_item(),
            new_article.to_dynamodb_item(),
            old_reason.to_dynamodb_item(),
            new_reason.to_dynamodb_item(),
        ]:
            fake_client.put_item(item)

        service = CleanupService(dynamodb_client=fake_client)
        deleted_articles, deleted_reasons = service.delete_articles_by_age(
            days=7
        )

        assert deleted_articles == 1
        assert deleted_reasons == 1
        assert (
            old_reason.generate_pk(),
            old_reason.generate_sk(),
        ) not in fake_client.items
        assert (
            new_reason.generate_pk(),
            new_reason.generate_sk(),
        ) in fake_client.items

    def test_delete_articles_by_age_rejects_invalid_days(self) -> None:
        """不正な日数でエラーになることを検証する。"""
        service = CleanupService(dynamodb_client=FakeDynamoDBClient())

        with pytest.raises(ValueError):
            service.delete_articles_by_age(days=0)

    def test_delete_read_articles_rejects_invalid_hours(self) -> None:
        """不正な時間でエラーになることを検証する。"""
        service = CleanupService(dynamodb_client=FakeDynamoDBClient())

        with pytest.raises(ValueError):
            service.delete_read_articles(hours=0)
