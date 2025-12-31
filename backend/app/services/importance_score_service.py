"""重要度スコア計算サービス

AWS Bedrockを使用してセマンティック検索による重要度スコアを計算します。
"""

import json
import logging
from collections import OrderedDict
from threading import Lock
from typing import Any

import boto3
import numpy as np
from botocore.exceptions import BotoCoreError, ClientError
from sklearn.metrics.pairwise import cosine_similarity

from app.config import settings
from app.models.article import Article
from app.utils.datetime_utils import parse_datetime_string
from app.utils.dynamodb_client import DynamoDBClient

logger = logging.getLogger(__name__)


class ImportanceScoreService:
    """重要度スコア計算サービス

    AWS Bedrock Nova Multimodal Embeddingsを使用して、
    記事とキーワードの意味的類似度を計算し、重要度スコアを算出します。
    """

    # DynamoDBキー形式の定数
    ARTICLE_PK_PREFIX = "ARTICLE#"
    REASON_SK_PREFIX = "REASON#"

    def __init__(self, region_name: str | None = None) -> None:
        """ImportanceScoreServiceを初期化

        Args:
            region_name: AWS Bedrockのリージョン（デフォルト: ap-northeast-1）
        """
        self.region_name = region_name or settings.BEDROCK_REGION
        self.bedrock_runtime = boto3.client(
            service_name="bedrock-runtime", region_name=self.region_name
        )
        self.model_id = settings.BEDROCK_MODEL_ID
        self.embedding_dimension = settings.EMBEDDING_DIMENSION
        self.dynamodb_client = DynamoDBClient()
        self._keyword_embedding_cache_max = (
            settings.KEYWORD_EMBEDDING_CACHE_SIZE
        )
        self._keyword_embedding_cache: OrderedDict[str, np.ndarray] = (
            OrderedDict()
        )
        self._keyword_embedding_cache_lock = Lock()
        logger.info(
            f"ImportanceScoreService initialized with model: {self.model_id}, "
            f"cache max size: {self._keyword_embedding_cache_max}"
        )

    def invoke_bedrock_embeddings(
        self, text: str, dimension: int = 1024
    ) -> list[float]:
        """AWS Bedrockを使用してテキストの埋め込みを生成

        公式ドキュメント準拠のAPIフォーマット:
        https://docs.aws.amazon.com/nova/latest/userguide/embeddings-schema.html

        Args:
            text: 埋め込みを生成するテキスト
            dimension: 埋め込みの次元数（256, 384, 1024, 3072から選択）

        Returns:
            埋め込みベクトル（float型のリスト）

        Raises:
            Exception: Bedrock API呼び出しに失敗した場合
        """
        request_body = {
            "taskType": "SINGLE_EMBEDDING",
            "singleEmbeddingParams": {
                "embeddingPurpose": "GENERIC_INDEX",
                "embeddingDimension": dimension,
                "text": {"truncationMode": "END", "value": text},
            },
        }

        try:
            response = self.bedrock_runtime.invoke_model(
                body=json.dumps(request_body),
                modelId=self.model_id,
                accept="application/json",
                contentType="application/json",
            )

            response_body = json.loads(response.get("body").read())
            # レスポンス形式: {"embeddings": [{"embeddingType": "TEXT", "embedding": [...]}]}
            embedding = response_body["embeddings"][0]["embedding"]
            logger.debug(
                f"Generated embedding with dimension: {len(embedding)}"
            )
            return embedding

        except (ClientError, BotoCoreError) as e:
            logger.error(f"Bedrock embedding error: {e}")
            # エラーを呼び出し側に伝播させる
            raise

    def get_embedding(self, text: str) -> np.ndarray:
        """テキストの埋め込みを取得

        Args:
            text: 埋め込みを生成するテキスト

        Returns:
            埋め込みベクトル（numpy配列）
        """
        embedding = self.invoke_bedrock_embeddings(
            text, self.embedding_dimension
        )
        return np.array(embedding)

    def _evict_oldest_cache_entry(self) -> None:
        """キャッシュから最も古いエントリを削除

        Note:
            このメソッドはロック内で呼び出される前提です。
        """
        if (
            len(self._keyword_embedding_cache)
            >= self._keyword_embedding_cache_max
        ):
            oldest_key = next(iter(self._keyword_embedding_cache))
            self._keyword_embedding_cache.pop(oldest_key)
            logger.debug(
                f"Evicted oldest cached embedding for keyword: {oldest_key}"
            )

    def get_keyword_embedding(self, keyword_text: str) -> np.ndarray:
        """キーワードの埋め込みを取得（キャッシュ使用）

        ダブルチェックロッキングパターンを使用して、
        同じキーワードに対する重複した埋め込み生成を防ぎます。

        Args:
            keyword_text: キーワードテキスト

        Returns:
            埋め込みベクトル（numpy配列）
        """
        # 第1回目のキャッシュチェック（ロック取得）
        with self._keyword_embedding_cache_lock:
            cached_embedding = self._keyword_embedding_cache.get(keyword_text)
            if cached_embedding is not None:
                # LRU順序を更新するため、一度削除して再挿入
                self._keyword_embedding_cache.move_to_end(keyword_text)
                return cached_embedding

        # キャッシュミスの場合、ロックを解放して埋め込みを生成
        # （この間に他のスレッドが同じキーワードの埋め込みを生成する可能性がある）
        embedding = self.get_embedding(keyword_text)

        # 第2回目のキャッシュチェック（ダブルチェックロッキング）
        with self._keyword_embedding_cache_lock:
            # 他のスレッドが既に同じキーワードをキャッシュに追加していないかチェック
            cached_embedding = self._keyword_embedding_cache.get(keyword_text)
            if cached_embedding is not None:
                # 他のスレッドが既に追加済み - 生成した埋め込みは破棄してキャッシュ済みを返す
                self._keyword_embedding_cache.move_to_end(keyword_text)
                logger.debug(
                    f"Found keyword embedding cached by another thread: {keyword_text}"
                )
                return cached_embedding

            # まだキャッシュにない場合、生成した埋め込みを追加
            # キャッシュサイズ上限チェックとエビクション
            self._evict_oldest_cache_entry()

            # 新しい埋め込みをキャッシュに追加
            self._keyword_embedding_cache[keyword_text] = embedding

            logger.debug(
                f"Cached embedding for keyword: {keyword_text} "
                f"(cache size: {len(self._keyword_embedding_cache)}/{self._keyword_embedding_cache_max})"
            )
            return embedding

    def calculate_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        """コサイン類似度を計算

        Args:
            embedding1: 埋め込みベクトル1
            embedding2: 埋め込みベクトル2

        Returns:
            コサイン類似度（-1.0~1.0）
        """
        similarity = cosine_similarity([embedding1], [embedding2])[0][0]
        return float(similarity)

    def _create_importance_reason(
        self,
        article: dict[str, Any],
        keyword: dict[str, Any],
        similarity: float,
        contribution: float,
    ) -> dict[str, Any]:
        """重要度理由データを生成

        Args:
            article: 記事データ
            keyword: キーワードデータ
            similarity: 類似度スコア
            contribution: 重み付き貢献度

        Returns:
            重要度理由データ
        """
        return {
            "PK": f"{self.ARTICLE_PK_PREFIX}{article['article_id']}",
            "SK": f"{self.REASON_SK_PREFIX}{keyword['keyword_id']}",
            "EntityType": "ImportanceReason",
            "article_id": article["article_id"],
            "keyword_id": keyword["keyword_id"],
            "keyword_text": keyword["text"],
            "similarity_score": similarity,
            "contribution": contribution,
        }

    def calculate_score(
        self, article: dict[str, Any], keywords: list[dict[str, Any]]
    ) -> tuple[float, list[dict[str, Any]]]:
        """記事の重要度スコアを計算

        Args:
            article: 記事データ（title, content, article_idを含む）
            keywords: キーワードリスト（text, weight, is_active, keyword_idを含む）

        Returns:
            (重要度スコア, 重要度理由のリスト)
        """
        # 記事のテキストを結合
        article_text = f"{article['title']} {article.get('content', '')}"
        article_embedding = self.get_embedding(article_text)

        total_score = 0.0
        reasons = []

        for keyword in keywords:
            if not keyword.get("is_active", True):
                continue

            # キーワードの埋め込みを取得（キャッシュから）
            keyword_embedding = self.get_keyword_embedding(keyword["text"])

            # 類似度を計算
            similarity = self.calculate_similarity(
                article_embedding, keyword_embedding
            )

            # 重みを適用
            weight = keyword.get("weight", 1.0)
            contribution = similarity * weight
            total_score += contribution

            # 理由を記録
            reason = self._create_importance_reason(
                article, keyword, similarity, contribution
            )
            reasons.append(reason)

        logger.info(
            f"Calculated importance score for article {article['article_id'][:8]}...: {total_score}"
        )
        return total_score, reasons

    def clear_cache(self) -> None:
        """キーワード埋め込みキャッシュをクリア"""
        with self._keyword_embedding_cache_lock:
            self._keyword_embedding_cache.clear()
        logger.info("Cleared keyword embeddings cache")

    def recalculate_score(self, article_id: str) -> None:
        """
        記事の重要度スコアを再計算

        Args:
            article_id: 記事ID
        """
        article_item = self.dynamodb_client.get_item(
            pk=f"{self.ARTICLE_PK_PREFIX}{article_id}",
            sk="METADATA",
        )
        if not article_item:
            logger.warning(
                "Article not found for recalculation: %s", article_id
            )
            return

        keywords, _ = self.dynamodb_client.query_keywords()
        article = self._convert_item_to_article(article_item)
        article_payload = {
            "article_id": article.article_id,
            "title": article.title,
            "content": article.content,
        }
        keyword_payloads = []
        for item in keywords:
            keyword_data = self._extract_keyword_data(item)
            if keyword_data is not None:
                keyword_payloads.append(keyword_data)

        score, reasons = self.calculate_score(
            article_payload,
            keyword_payloads,
        )
        normalized_score = max(0.0, min(score, 1.0))
        article.update_importance_score(normalized_score)
        self.dynamodb_client.put_item(article.to_dynamodb_item())

        self.dynamodb_client.delete_importance_reasons_for_article(article_id)
        if reasons:
            self.dynamodb_client.batch_write_item(reasons)

    def _convert_item_to_article(self, item: dict[str, Any]) -> Article:
        """
        DynamoDBアイテムをArticleモデルに変換

        Args:
            item: DynamoDBアイテム

        Returns:
            Article: 変換済みArticle
        """
        article_fields = Article.model_fields.keys()
        article_data = {
            key: item[key] for key in article_fields if key in item
        }
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

    def _extract_keyword_data(
        self, item: dict[str, Any]
    ) -> dict[str, Any] | None:
        """
        DynamoDBアイテムからキーワード情報を抽出

        Args:
            item: DynamoDBアイテム

        Returns:
            dict[str, Any]: キーワード情報
        """
        keyword_id = item.get("keyword_id")
        text = item.get("text", "")
        if not keyword_id or not text:
            return None

        return {
            "keyword_id": keyword_id,
            "text": text,
            "weight": item.get("weight", 1.0),
            "is_active": item.get("is_active", True),
        }
