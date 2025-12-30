"""
記事管理サービス

記事の取得、更新（既読/保存状態）を担当します。
"""

from app.models.article import Article
from app.utils.datetime_utils import parse_datetime_string
from app.utils.dynamodb_client import DynamoDBClient


class ArticleService:
    """
    記事管理サービスクラス

    DynamoDBとのやり取りを抽象化し、
    記事データの取得・更新を提供します。
    """

    def __init__(self, dynamodb_client: DynamoDBClient | None = None):
        """
        ArticleServiceの初期化

        Args:
            dynamodb_client: DynamoDBクライアント（省略時は新規生成）
        """
        self.dynamodb_client = dynamodb_client or DynamoDBClient()

    def get_articles(
        self,
        sort_by: str = "published_at",
        filter_by: str | None = None,
        limit: int = 100,
        last_evaluated_key: dict | None = None,
    ) -> tuple[list[Article], dict | None]:
        """
        記事一覧を取得

        Args:
            sort_by: ソート基準（"published_at" または "importance_score"）
            filter_by: フィルタ条件（"unread", "read", "saved"）
            limit: 取得件数制限
            last_evaluated_key: ページネーション用の開始キー

        Returns:
            Tuple[List[Article], Optional[Dict]]: 記事一覧と次ページのキー

        Raises:
            ValueError: 不正なソート/フィルタ条件が指定された場合
        """
        valid_sort_by = {"published_at", "importance_score"}
        valid_filter_by = {None, "unread", "read", "saved"}

        if sort_by not in valid_sort_by:
            raise ValueError("Invalid sort_by value")

        if filter_by not in valid_filter_by:
            raise ValueError("Invalid filter_by value")

        if limit <= 0:
            raise ValueError("Limit must be greater than 0")

        items, last_key = self.dynamodb_client.query_articles_with_filters(
            sort_by=sort_by,
            filter_by=filter_by,
            limit=limit,
            exclusive_start_key=last_evaluated_key,
        )

        articles = [self._convert_item_to_article(item) for item in items]
        return articles, last_key

    def get_article(self, article_id: str) -> Article | None:
        """
        記事詳細を取得

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

    def mark_as_read(self, article_id: str, is_read: bool) -> Article | None:
        """
        記事の既読状態を更新

        Args:
            article_id: 記事ID
            is_read: 既読フラグ

        Returns:
            Optional[Article]: 更新後の記事（存在しない場合はNone）
        """
        article = self.get_article(article_id)
        if article is None:
            return None

        if is_read:
            article.mark_as_read()
        else:
            article.mark_as_unread()

        self.dynamodb_client.put_item(article.to_dynamodb_item())
        return article

    def mark_as_saved(self, article_id: str, is_saved: bool) -> Article | None:
        """
        記事の保存状態を更新

        Args:
            article_id: 記事ID
            is_saved: 保存フラグ

        Returns:
            Optional[Article]: 更新後の記事（存在しない場合はNone）
        """
        article = self.get_article(article_id)
        if article is None:
            return None

        if article.is_saved != is_saved:
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
        article_data = {
            key: item[key] for key in article_fields if key in item
        }

        # 日時文字列をdatetimeオブジェクトに変換
        datetime_fields = [
            "published_at",
            "read_at",
            "created_at",
            "updated_at",
        ]
        for field in datetime_fields:
            if field in article_data and isinstance(article_data[field], str):
                article_data[field] = parse_datetime_string(
                    article_data[field]
                )

        return Article(**article_data)
