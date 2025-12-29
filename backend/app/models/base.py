"""
ベースモデルクラス

DynamoDBのシングルテーブル設計に対応した
共通機能を提供するベースクラス。
"""

import uuid
from datetime import datetime, timedelta

from pydantic import BaseModel as PydanticBaseModel
from pydantic import ConfigDict, Field


class BaseModel(PydanticBaseModel):
    """
    DynamoDBエンティティのベースクラス

    すべてのエンティティが共通で持つ機能を提供します：
    - PK/SK生成
    - TTL設定
    - 作成日時・更新日時の管理
    """

    # スコア精度定数（6桁の精度を確保するため）
    # 0.000001の精度でスコアを表現可能（例: 0.123456）
    SCORE_PRECISION: int = 1_000_000

    model_config = ConfigDict(
        # 追加フィールドを許可しない
        extra="forbid",
        # バリデーションを有効化
        validate_assignment=True,
    )

    # 共通フィールド
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime | None = None

    def generate_id(self) -> str:
        """
        一意なIDを生成

        Returns:
            str: UUID4形式の一意なID
        """
        return str(uuid.uuid4())

    def set_ttl(self, days: int = 7) -> int:
        """
        TTL（Time To Live）を設定

        Args:
            days: TTLの日数（デフォルト: 7日）

        Returns:
            int: Unix timestamp形式のTTL値
        """
        ttl_datetime = datetime.now() + timedelta(days=days)
        return int(ttl_datetime.timestamp())

    def generate_reverse_sort_key(
        self, score: float, max_score: float = 1.0
    ) -> str:
        """
        逆順ソートキーを生成（重要度スコア用）

        DynamoDBは昇順ソートのため、高スコア順にするには
        逆順のソートキーを生成する必要があります。

        Args:
            score: 重要度スコア（0.0～max_score）
            max_score: 最大スコア値（デフォルト: 1.0）

        Returns:
            str: ゼロパディングされた逆順ソートキー

        Example:
            score=0.85 → "150000.000000" (1000000 - 0.85 * 1000000)
            score=0.95 → "050000.000000" (1000000 - 0.95 * 1000000)
        """
        if score < 0 or score > max_score:
            raise ValueError(f"Score must be between 0 and {max_score}")

        # スコアを100万倍して整数化し、100万から引く
        score_scaled = int(score * self.SCORE_PRECISION)
        reverse_score = self.SCORE_PRECISION - score_scaled

        # 小数部分は常に000000（整数部分のみを使用）
        # 7桁のゼロパディング（0～1000000の範囲をカバー）
        return f"{reverse_score:07d}.000000"

    def to_dynamodb_item(self) -> dict:
        """
        DynamoDB用のアイテム形式に変換

        Returns:
            Dict: DynamoDBに保存可能な形式のデータ
        """
        # Pydanticモデルを辞書に変換
        item = self.model_dump()

        # datetime型をISO文字列に変換
        for key, value in item.items():
            if isinstance(value, datetime):
                item[key] = value.isoformat() + "Z"

        return item

    def update_timestamp(self) -> None:
        """更新日時を現在時刻に設定"""
        self.updated_at = datetime.now()
