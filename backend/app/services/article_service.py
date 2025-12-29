"""
記事管理サービス

記事一覧の取得や既読・保存状態の更新を担当します。
"""

from typing import List, Optional

from app.models.article import Article
from app.utils.dynamodb_client import DynamoDBClient


class ArticleService:
    """
    記事管理サービスクラス

    DynamoDBとのやり取りを抽象化し、
    記事データの操作を提供します。
    """

    def __init__(self, dynamodb_client: Optional[DynamoDBClient] = None):
        """
        ArticleServiceの初期化

        Args:
            dynamodb_client: DynamoDBクライアント（省略時は新規生成）
        """
        self.dynamodb_client = dynamodb_client or DynamoDBClient()

    def list_articles(
        self,
        sort_by: str = "published_at",
        filter_by: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Article]:
        """
        記事一覧を取得

        Args:
            sort_by: ソート基準
            filter_by: フィルタ条件
            limit: 取得件数制限

        Returns:
            List[Article]: 記事一覧
        """
        items, _ = self.dynamodb_client.query_articles_with_filters(
            sort_by=sort_by,
            filter_by=filter_by,
            limit=limit,
        )
        return [self._convert_item_to_article(item) for item in items]

    def get_article(self, article_id: str) -> Optional[Article]:
        """
        記事を取得

        Args:
            article_id: 記事ID

        Returns:
            Optional[Article]: 記事（存在しない場合はNone）
        """
        item = self.dynamodb_client.get_item(
            pk=f"ARTICLE#{article_id}",
            sk="METADATA",
        )
        if not item:
            return None
        return self._convert_item_to_article(item)

    def update_article(
        self,
        article_id: str,
        is_read: Optional[bool],
        is_saved: Optional[bool],
    ) -> Optional[Article]:
        """
        記事を更新

        Args:
            article_id: 記事ID
            is_read: 既読フラグ
            is_saved: 保存フラグ

        Returns:
            Optional[Article]: 更新された記事（存在しない場合はNone）

        Raises:
            ValueError: 更新内容が空の場合
        """
        if is_read is None and is_saved is None:
            raise ValueError("Update payload cannot be empty")

        article = self.get_article(article_id)
        if article is None:
            return None

        if is_read is not None:
            if is_read:
                article.mark_as_read()
            else:
                article.mark_as_unread()

        if is_saved is not None and is_saved != article.is_saved:
            article.toggle_saved()

        self.dynamodb_client.put_item(article.to_dynamodb_item())
        return article

    def _convert_item_to_article(self, item: dict) -> Article:
        """
        DynamoDBアイテムをArticleモデルに変換

        Args:
            item: DynamoDBから取得したアイテム

        Returns:
            Article: 変換済み記事
        """
        article_fields = Article.model_fields.keys()
        article_data = {key: item[key] for key in article_fields if key in item}
        return Article(**article_data)
