"""
キーワード管理サービスのユニットテスト

KeywordServiceの基本的な挙動と再計算処理を検証します。
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import pytest

from app.services.keyword_service import KeywordService


class FakeDynamoDBClient:
    """
    KeywordServiceテスト用のDynamoDBクライアント。

    in-memoryの辞書でDynamoDBの動作を擬似的に再現します。
    """

    def __init__(self) -> None:
        self.items: Dict[Tuple[str, str], Dict] = {}

    def put_item(self, item: Dict) -> None:
        """アイテムを保存。"""
        self.items[(item["PK"], item["SK"])] = item

    def get_item(self, pk: str, sk: str) -> Optional[Dict]:
        """キーでアイテムを取得。"""
        return self.items.get((pk, sk))

    def delete_item(self, pk: str, sk: str) -> None:
        """アイテムを削除。"""
        self.items.pop((pk, sk), None)

    def query_keywords(
        self,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None,
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """キーワード一覧を取得。"""
        items = [
            item
            for item in self.items.values()
            if item.get("GSI1PK") == "KEYWORD"
        ]
        if limit is not None:
            items = items[:limit]
        return items, None

    def query_articles_by_published_date(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None,
        descending: bool = True,
    ) -> Tuple[List[Dict], Optional[Dict]]:
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
        if limit is not None:
            items = items[:limit]
        return items, None


@dataclass
class FakeImportanceScoreService:
    """重要度再計算の呼び出しを記録するテスト用サービス。"""

    recalculated_article_ids: List[str]

    def recalculate_score(self, article_id: str) -> None:
        """記事IDを記録する。"""
        self.recalculated_article_ids.append(article_id)


class TestKeywordService:
    """KeywordServiceのユニットテスト。"""

    def test_add_keyword_uses_default_weight(self) -> None:
        """
        add_keywordで重みを省略するとデフォルト値が設定される。

        検証: 要件 6.3
        """
        fake_client = FakeDynamoDBClient()
        service = KeywordService(dynamodb_client=fake_client)

        created = service.add_keyword(text="AI")

        assert created.weight == 1.0

    def test_recalculate_all_scores_requires_service(self) -> None:
        """
        重要度スコアサービスが未設定の場合はエラーになる。

        検証: 要件 7.5
        """
        fake_client = FakeDynamoDBClient()
        service = KeywordService(dynamodb_client=fake_client)

        with pytest.raises(ValueError):
            service.recalculate_all_scores()

    def test_recalculate_all_scores_calls_each_article(self) -> None:
        """
        全記事に対して再計算が呼ばれる。

        検証: 要件 7.5
        """
        fake_client = FakeDynamoDBClient()
        article_ids = ["article-1", "article-2", "article-3"]
        for article_id in article_ids:
            fake_client.put_item(
                {
                    "PK": f"ARTICLE#{article_id}",
                    "SK": "METADATA",
                    "GSI1PK": "ARTICLE",
                    "GSI1SK": datetime.now().isoformat() + "Z",
                    "EntityType": "Article",
                    "article_id": article_id,
                }
            )

        fake_importance_service = FakeImportanceScoreService([])
        service = KeywordService(
            dynamodb_client=fake_client,
            importance_score_service=fake_importance_service,
        )

        service.recalculate_all_scores()

        assert set(fake_importance_service.recalculated_article_ids) == set(
            article_ids
        )
