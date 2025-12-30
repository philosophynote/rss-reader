"""
キーワード管理サービス

キーワードの登録、取得、更新、削除、重要度再計算を担当します。
"""

from __future__ import annotations

from typing import List, Optional, Protocol

from app.config import settings
from app.models.keyword import Keyword
from app.utils.dynamodb_client import DynamoDBClient


class ImportanceScoreService(Protocol):
    """
    重要度スコア計算サービスのインターフェース。

    実装はタスク6で追加予定。
    """

    def recalculate_score(self, article_id: str) -> None:
        """
        記事の重要度スコアを再計算する。

        Args:
            article_id: 記事ID
        """


class KeywordService:
    """
    キーワード管理サービスクラス。

    DynamoDBとのやり取りを抽象化し、
    キーワードデータの操作を提供します。
    """

    def __init__(
        self,
        dynamodb_client: Optional[DynamoDBClient] = None,
        importance_score_service: Optional[ImportanceScoreService] = None,
    ) -> None:
        """
        KeywordServiceの初期化。

        Args:
            dynamodb_client: DynamoDBクライアント（省略時は新規生成）
            importance_score_service: 重要度スコア計算サービス
        """
        self.dynamodb_client = dynamodb_client or DynamoDBClient()
        self.importance_score_service = importance_score_service

    def add_keyword(self, text: str, weight: float = 1.0) -> Keyword:
        """
        キーワードを登録。

        Args:
            text: キーワードテキスト
            weight: キーワードの重み（デフォルト: 1.0）

        Returns:
            Keyword: 作成されたキーワード
        """
        keyword = Keyword(text=text, weight=weight)
        self.dynamodb_client.put_item(keyword.to_dynamodb_item())
        return keyword

    def get_keywords(self) -> List[Keyword]:
        """
        キーワード一覧を取得。

        Returns:
            List[Keyword]: キーワード一覧
        """
        items, _ = self.dynamodb_client.query_keywords()
        return [self._convert_item_to_keyword(item) for item in items]

    def get_keyword(self, keyword_id: str) -> Optional[Keyword]:
        """
        キーワードを取得。

        Args:
            keyword_id: キーワードID

        Returns:
            Optional[Keyword]: キーワード（存在しない場合はNone）
        """
        item = self.dynamodb_client.get_item(
            pk=f"KEYWORD#{keyword_id}",
            sk="METADATA",
        )
        if not item:
            return None
        return self._convert_item_to_keyword(item)

    def update_keyword(
        self,
        keyword_id: str,
        text: Optional[str] = None,
        weight: Optional[float] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[Keyword]:
        """
        キーワードを更新。

        Args:
            keyword_id: キーワードID
            text: キーワードテキスト
            weight: 重み
            is_active: 有効/無効フラグ

        Returns:
            Optional[Keyword]: 更新されたキーワード（存在しない場合はNone）

        Raises:
            ValueError: 更新内容が空の場合
        """
        if text is None and weight is None and is_active is None:
            raise ValueError("Update payload cannot be empty")

        existing_keyword = self.get_keyword(keyword_id)
        if existing_keyword is None:
            return None

        if text is not None:
            existing_keyword.update_text(text)
        if weight is not None:
            existing_keyword.update_weight(weight)
        if is_active is not None:
            if is_active:
                existing_keyword.activate()
            else:
                existing_keyword.deactivate()

        self.dynamodb_client.put_item(existing_keyword.to_dynamodb_item())
        return existing_keyword

    def delete_keyword(self, keyword_id: str) -> bool:
        """
        キーワードを削除。

        Args:
            keyword_id: キーワードID

        Returns:
            bool: 削除成功時はTrue
        """
        existing_keyword = self.get_keyword(keyword_id)
        if existing_keyword is None:
            return False

        self.dynamodb_client.delete_item(
            pk=f"KEYWORD#{keyword_id}",
            sk="METADATA",
        )
        return True

    def recalculate_all_scores(self) -> None:
        """
        全記事の重要度スコアを再計算。

        Raises:
            ValueError: 重要度スコアサービスが未設定の場合
        """
        if self.importance_score_service is None:
            raise ValueError("ImportanceScoreService is not configured")

        last_evaluated_key = None
        while True:
            items, last_evaluated_key = (
                self.dynamodb_client.query_articles_by_published_date(
                    limit=settings.BATCH_SIZE,
                    exclusive_start_key=last_evaluated_key,
                )
            )
            for item in items:
                article_id = item.get("article_id")
                if not article_id:
                    continue
                self.importance_score_service.recalculate_score(article_id)

            if not last_evaluated_key:
                break

    def _convert_item_to_keyword(self, item: dict) -> Keyword:
        """
        DynamoDBアイテムをKeywordモデルに変換。

        Args:
            item: DynamoDBから取得したアイテム

        Returns:
            Keyword: 変換済みキーワード
        """
        keyword_fields = Keyword.model_fields.keys()
        keyword_data = {
            key: item[key] for key in keyword_fields if key in item
        }
        return Keyword(**keyword_data)
