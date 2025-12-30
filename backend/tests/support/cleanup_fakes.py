"""
CleanupServiceテスト用の支援クラスとヘルパー。
"""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from app.models.article import Article
from app.models.importance_reason import ImportanceReason


class FakeDynamoDBClient:
    """
    CleanupServiceテスト用のDynamoDBクライアント。

    in-memoryの辞書でDynamoDBの動作を擬似的に再現する。
    """

    def __init__(self) -> None:
        self.items: dict[tuple[str, str], dict] = {}

    def put_item(self, item: dict) -> None:
        """アイテムを保存する。"""
        self.items[(item["PK"], item["SK"])] = item

    def query(
        self,
        key_condition_expression,
        index_name: str | None = None,
        filter_expression=None,
        scan_index_forward: bool = True,
        limit: int | None = None,
        exclusive_start_key: dict | None = None,
        **kwargs,
    ) -> tuple[list[dict], dict | None]:
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
        pk_value = self._extract_value(key_condition_expression, "=", pk_name)
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
                if item["PK"] == exclusive_start_key.get("PK") and item[
                    "SK"
                ] == exclusive_start_key.get("SK"):
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
        self, items: list[dict], delete_keys: list[dict] | None = None
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
            and item.get("EntityType") == "ImportanceReason"
        ]
        self.batch_write_item(items=[], delete_keys=delete_keys)
        return len(delete_keys)

    @staticmethod
    def _resolve_index_keys(index_name: str | None) -> tuple[str, str]:
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


def create_article(
    created_at: datetime,
    is_read: bool = False,
    read_at: datetime | None = None,
) -> Article:
    """指定条件のArticleを作成する。"""
    return Article(
        feed_id=str(uuid4()),
        link=f"https://example.com/{uuid4()}",
        title="テスト記事",
        content="content",
        published_at=created_at,
        created_at=created_at,
        is_read=is_read,
        read_at=read_at,
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


def seed_items(client: FakeDynamoDBClient, items: list[dict]) -> None:
    """FakeDynamoDBClientにアイテムを保存する。"""
    for item in items:
        client.put_item(item)
