"""
記事削除サービス

TTLによる自動削除と、GSIを利用した即時削除を組み合わせて
記事のクリーンアップを行う。
"""

from __future__ import annotations

from datetime import datetime, timedelta
import logging
from typing import Dict, Optional, Tuple

from boto3.dynamodb.conditions import Key

from app.config import settings
from app.utils.dynamodb_client import DynamoDBClient

logger = logging.getLogger(__name__)


class CleanupService:
    """
    記事削除サービスクラス。

    GSI3で古い記事を、GSI4で既読記事を効率的に削除する。
    TTLは基本的な自動削除を担当し、このクラスは即時削除の補助。
    """

    def __init__(
        self,
        dynamodb_client: Optional[DynamoDBClient] = None,
    ) -> None:
        """
        CleanupServiceの初期化。

        Args:
            dynamodb_client: DynamoDBクライアント（省略時は新規生成）
        """
        self.dynamodb_client = dynamodb_client or DynamoDBClient()

    def cleanup_old_articles(self, days: int = 7) -> Dict[str, int]:
        """
        古い記事と既読記事を削除する。

        Args:
            days: 作成から削除対象とする日数（デフォルト: 7日）

        Returns:
            Dict[str, int]: 削除結果の統計

        Raises:
            ValueError: daysが不正な値の場合
        """
        if days <= 0:
            raise ValueError("days must be greater than 0")

        deleted_by_age, reasons_by_age = self.delete_articles_by_age(
            days=days,
        )
        deleted_read, reasons_read = self.delete_read_articles()

        return {
            "deleted_articles_by_age": deleted_by_age,
            "deleted_reasons_by_age": reasons_by_age,
            "deleted_read_articles": deleted_read,
            "deleted_reasons_read": reasons_read,
        }

    def delete_articles_by_age(self, days: int = 7) -> Tuple[int, int]:
        """
        作成日時が古い記事を削除する。

        GSI3を利用し、Scanを使用せずに削除対象を取得する。

        Args:
            days: 作成から削除対象とする日数（デフォルト: 7日）

        Returns:
            Tuple[int, int]: (削除した記事数, 削除した理由数)

        Raises:
            ValueError: daysが不正な値の場合
        """
        if days <= 0:
            raise ValueError("days must be greater than 0")

        cutoff_date = datetime.now() - timedelta(days=days)
        return self._delete_articles_by_query(
            key_condition=Key("GSI3PK").eq("ARTICLE")
            & Key("GSI3SK").lt(cutoff_date.isoformat() + "Z"),
            index_name="GSI3",
        )

    def delete_read_articles(self, hours: int = 24) -> Tuple[int, int]:
        """
        既読になってから一定時間経過した記事を削除する。

        GSI4を利用し、Scanを使用せずに削除対象を取得する。

        Args:
            hours: 既読後の削除対象時間（デフォルト: 24時間）

        Returns:
            Tuple[int, int]: (削除した記事数, 削除した理由数)

        Raises:
            ValueError: hoursが不正な値の場合
        """
        if hours <= 0:
            raise ValueError("hours must be greater than 0")

        cutoff_datetime = datetime.now() - timedelta(hours=hours)
        cutoff_key = f"true#{cutoff_datetime.isoformat()}Z"
        return self._delete_articles_by_query(
            key_condition=Key("GSI4PK").eq("ARTICLE_READ")
            & Key("GSI4SK").lt(cutoff_key),
            index_name="GSI4",
        )

    def _delete_articles_by_query(
        self,
        key_condition,
        index_name: str,
    ) -> Tuple[int, int]:
        """
        指定クエリで記事と重要度理由を削除する。

        Args:
            key_condition: DynamoDBのキー条件式
            index_name: 使用するGSI名

        Returns:
            Tuple[int, int]: (削除した記事数, 削除した理由数)
        """
        deleted_articles = 0
        deleted_reasons = 0
        delete_keys = []
        last_evaluated_key = None

        while True:
            items, last_evaluated_key = self.dynamodb_client.query(
                key_condition_expression=key_condition,
                index_name=index_name,
                limit=settings.BATCH_SIZE,
                exclusive_start_key=last_evaluated_key,
            )

            if not items:
                break

            for item in items:
                article_id = item.get("article_id")
                if article_id:
                    deleted_reasons += (
                        self.dynamodb_client
                        .delete_importance_reasons_for_article(
                            article_id
                        )
                    )

                delete_keys.append({"PK": item["PK"], "SK": item["SK"]})

                if len(delete_keys) >= settings.BATCH_SIZE:
                    self.dynamodb_client.batch_write_item(
                        items=[],
                        delete_keys=delete_keys,
                    )
                    deleted_articles += len(delete_keys)
                    delete_keys = []

            if not last_evaluated_key:
                break

        if delete_keys:
            self.dynamodb_client.batch_write_item(
                items=[],
                delete_keys=delete_keys,
            )
            deleted_articles += len(delete_keys)

        if logger.isEnabledFor(logging.INFO):
            logger.info(
                "Deleted %s articles via %s",
                deleted_articles,
                index_name,
            )

        return deleted_articles, deleted_reasons
