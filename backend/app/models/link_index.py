"""
リンクインデックスモデル

記事の重複チェック用のインデックスを管理するデータモデル。
"""

import hashlib

from pydantic import Field, HttpUrl, field_validator

from .base import BaseModel


class LinkIndex(BaseModel):
    """
    リンクインデックスエンティティ

    記事のURLの重複チェックを効率的に行うためのインデックス。
    URLのハッシュ値をキーとして使用し、高速な重複検出を実現します。

    Attributes:
        link: 記事のURL
        article_id: 関連する記事のID
        url_hash: URLのハッシュ値（SHA-256）
    """

    link: HttpUrl
    article_id: str
    url_hash: str = Field(default="")

    @field_validator("article_id")
    @classmethod
    def validate_article_id(cls, v: str) -> str:
        """
        記事IDのバリデーション

        Args:
            v: 記事ID

        Returns:
            str: バリデーション済み記事ID
        """
        if not v or not v.strip():
            raise ValueError("Article ID cannot be empty")

        return v.strip()

    def __init__(self, **data):
        """
        LinkIndexの初期化

        URLハッシュが空の場合は自動生成します。
        """
        if ("url_hash" not in data or not data["url_hash"]) and "link" in data:
            # URLを正規化してハッシュ化
            url_str = str(data["link"]).lower().strip()

            # URLの末尾のスラッシュを除去
            if url_str.endswith("/"):
                url_str = url_str[:-1]

            # SHA-256ハッシュを生成
            data["url_hash"] = hashlib.sha256(
                url_str.encode("utf-8")
            ).hexdigest()

        super().__init__(**data)

    @field_validator("url_hash", mode="before")
    @classmethod
    def generate_url_hash(cls, v: str) -> str:
        """
        URLハッシュを自動生成

        Args:
            v: 既存のハッシュ値

        Returns:
            str: 生成されたハッシュ値
        """
        # 空の場合は__init__で設定される
        return v

    def generate_pk(self) -> str:
        """
        プライマリキーを生成

        Returns:
            str: "LINK#{url_hash}" 形式のプライマリキー
        """
        return f"LINK#{self.url_hash}"

    def generate_sk(self) -> str:
        """
        ソートキーを生成

        Returns:
            str: "METADATA" 固定値
        """
        return "METADATA"

    def to_dynamodb_item(self) -> dict:
        """
        DynamoDB用のアイテム形式に変換

        Returns:
            Dict: DynamoDBに保存可能な形式のデータ
        """
        item = super().to_dynamodb_item()

        # DynamoDB用のキーを追加
        item.update(
            {
                "PK": self.generate_pk(),
                "SK": self.generate_sk(),
                "EntityType": "LinkIndex",
            }
        )

        # HttpUrlを文字列に変換
        if "link" in item:
            item["link"] = str(item["link"])

        return item

    @classmethod
    def create_from_article(cls, link: str, article_id: str) -> "LinkIndex":
        """
        記事情報からリンクインデックスを作成

        Args:
            link: 記事のURL
            article_id: 記事ID

        Returns:
            LinkIndex: 作成されたインスタンス
        """
        return cls(link=HttpUrl(link), article_id=article_id)

    @staticmethod
    def generate_hash_from_url(url: str) -> str:
        """
        URLからハッシュ値を生成（静的メソッド）

        Args:
            url: URL文字列

        Returns:
            str: SHA-256ハッシュ値
        """
        # URLを正規化
        url_normalized = url.lower().strip()

        # 末尾のスラッシュを除去
        if url_normalized.endswith("/"):
            url_normalized = url_normalized[:-1]

        # SHA-256ハッシュを生成
        return hashlib.sha256(url_normalized.encode("utf-8")).hexdigest()

    def is_duplicate_of(self, other_url: str) -> bool:
        """
        他のURLとの重複チェック

        Args:
            other_url: 比較対象のURL

        Returns:
            bool: 重複している場合はTrue
        """
        other_hash = self.generate_hash_from_url(other_url)
        return self.url_hash == other_hash

    def get_normalized_url(self) -> str:
        """
        正規化されたURLを取得

        Returns:
            str: 正規化されたURL
        """
        url_str = str(self.link).lower().strip()

        # 末尾のスラッシュを除去
        if url_str.endswith("/"):
            url_str = url_str[:-1]

        return url_str
