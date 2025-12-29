"""重要度スコア計算サービス

AWS Bedrockを使用してセマンティック検索による重要度スコアを計算します。
"""

import json
import logging
from typing import Any, Dict, List, Tuple

import boto3
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.config import settings

logger = logging.getLogger(__name__)


class ImportanceScoreService:
    """重要度スコア計算サービス
    
    AWS Bedrock Nova Multimodal Embeddingsを使用して、
    記事とキーワードの意味的類似度を計算し、重要度スコアを算出します。
    """

    def __init__(self, region_name: str | None = None) -> None:
        """ImportanceScoreServiceを初期化
        
        Args:
            region_name: AWS Bedrockのリージョン（デフォルト: us-east-1）
        """
        self.region_name = region_name or settings.BEDROCK_REGION
        self.bedrock_runtime = boto3.client(
            service_name="bedrock-runtime", region_name=self.region_name
        )
        self.model_id = settings.BEDROCK_MODEL_ID
        self.embedding_dimension = settings.EMBEDDING_DIMENSION
        # キーワード埋め込みのキャッシュ
        self.keyword_embeddings_cache: Dict[str, np.ndarray] = {}
        logger.info(
            f"ImportanceScoreService initialized with model: {self.model_id}"
        )

    def invoke_bedrock_embeddings(
        self, text: str, dimension: int = 1024
    ) -> List[float]:
        """AWS Bedrockを使用してテキストの埋め込みを生成
        
        公式ドキュメント準拠のAPIフォーマット:
        https://docs.aws.amazon.com/nova/latest/userguide/embeddings-schema.html
        
        Args:
            text: 埋め込みを生成するテキスト
            dimension: 埋め込みの次元数（256, 384, 1024, 3072から選択）
        
        Returns:
            埋め込みベクトル（float型のリスト）
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

        except Exception as e:
            logger.error(f"Bedrock embedding error: {e}")
            # エラー時はゼロベクトルを返す
            return [0.0] * dimension

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

    def get_keyword_embedding(self, keyword_text: str) -> np.ndarray:
        """キーワードの埋め込みを取得（キャッシュ使用）
        
        Args:
            keyword_text: キーワードテキスト
        
        Returns:
            埋め込みベクトル（numpy配列）
        """
        if keyword_text not in self.keyword_embeddings_cache:
            self.keyword_embeddings_cache[
                keyword_text
            ] = self.get_embedding(keyword_text)
            logger.debug(f"Cached embedding for keyword: {keyword_text}")
        return self.keyword_embeddings_cache[keyword_text]

    def calculate_similarity(
        self, embedding1: np.ndarray, embedding2: np.ndarray
    ) -> float:
        """コサイン類似度を計算
        
        Args:
            embedding1: 埋め込みベクトル1
            embedding2: 埋め込みベクトル2
        
        Returns:
            コサイン類似度（0.0～1.0）
        """
        similarity = cosine_similarity([embedding1], [embedding2])[0][0]
        return float(similarity)

    def calculate_score(
        self, article: Dict[str, Any], keywords: List[Dict[str, Any]]
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """記事の重要度スコアを計算
        
        Args:
            article: 記事データ（title, content, article_idを含む）
            keywords: キーワードリスト（text, weight, is_active, keyword_idを含む）
        
        Returns:
            (重要度スコア, 重要度理由のリスト)
        """
        # 記事のテキストを結合
        article_text = (
            f"{article['title']} {article.get('content', '')}"
        )
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
            reasons.append(
                {
                    "PK": f"ARTICLE#{article['article_id']}",
                    "SK": f"REASON#{keyword['keyword_id']}",
                    "EntityType": "ImportanceReason",
                    "article_id": article["article_id"],
                    "keyword_id": keyword["keyword_id"],
                    "keyword_text": keyword["text"],
                    "similarity_score": similarity,
                    "contribution": contribution,
                }
            )

        logger.info(
            f"Calculated importance score for article {article['article_id']}: {total_score}"
        )
        return total_score, reasons

    def clear_cache(self) -> None:
        """キーワード埋め込みキャッシュをクリア"""
        self.keyword_embeddings_cache.clear()
        logger.info("Cleared keyword embeddings cache")
