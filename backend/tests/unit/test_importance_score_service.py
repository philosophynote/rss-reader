"""ImportanceScoreServiceのユニットテスト

AWS Bedrockを使用した重要度スコア計算のテストを実施します。
"""

import json
from typing import Any, Dict, List
from unittest.mock import Mock, patch

import numpy as np
import pytest

from app.services.importance_score_service import ImportanceScoreService


@pytest.fixture
def mock_bedrock_client() -> Mock:
    """モックされたBedrock Runtimeクライアントを作成"""
    mock_client = Mock()
    # 1024次元のダミー埋め込みベクトル
    mock_embedding = [0.1] * 1024
    mock_response = {
        "body": Mock(
            read=Mock(
                return_value=json.dumps(
                    {
                        "embeddings": [
                            {
                                "embeddingType": "TEXT",
                                "embedding": mock_embedding,
                            }
                        ]
                    }
                ).encode()
            )
        )
    }
    mock_client.invoke_model.return_value = mock_response
    return mock_client


@pytest.fixture
def importance_score_service(mock_bedrock_client: Mock) -> ImportanceScoreService:
    """ImportanceScoreServiceのインスタンスを作成"""
    with patch("boto3.client", return_value=mock_bedrock_client):
        service = ImportanceScoreService(region_name="us-east-1")
    return service


class TestImportanceScoreService:
    """ImportanceScoreServiceのテストクラス"""

    def test_initialization(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        ImportanceScoreServiceが正しく初期化されることを確認
        """
        assert importance_score_service.region_name == "us-east-1"
        assert (
            importance_score_service.model_id
            == "amazon.nova-2-multimodal-embeddings-v1:0"
        )
        assert importance_score_service.embedding_dimension == 1024
        assert importance_score_service.keyword_embeddings_cache == {}

    def test_invoke_bedrock_embeddings_success(
        self,
        importance_score_service: ImportanceScoreService,
        mock_bedrock_client: Mock,
    ) -> None:
        """
        Bedrock APIが正常に埋め込みを生成することを確認
        """
        text = "Python programming"
        embedding = importance_score_service.invoke_bedrock_embeddings(
            text, dimension=1024
        )

        # APIが正しいパラメータで呼び出されたことを確認
        mock_bedrock_client.invoke_model.assert_called_once()
        call_args = mock_bedrock_client.invoke_model.call_args
        body = json.loads(call_args.kwargs["body"])

        assert body["taskType"] == "SINGLE_EMBEDDING"
        assert (
            body["singleEmbeddingParams"]["embeddingDimension"] == 1024
        )
        assert body["singleEmbeddingParams"]["text"]["value"] == text

        # 埋め込みが正しく返されることを確認
        assert len(embedding) == 1024
        assert all(isinstance(x, float) for x in embedding)

    def test_invoke_bedrock_embeddings_error_handling(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        Bedrock APIエラー時に例外が再スローされることを確認
        """
        # APIエラーをシミュレート
        importance_score_service.bedrock_runtime.invoke_model.side_effect = (
            Exception("API Error")
        )

        # 例外が再スローされることを確認
        with pytest.raises(Exception, match="API Error"):
            importance_score_service.invoke_bedrock_embeddings(
                "test", dimension=1024
            )

    def test_get_embedding(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        get_embeddingがnumpy配列を返すことを確認
        """
        text = "Machine learning"
        embedding = importance_score_service.get_embedding(text)

        assert isinstance(embedding, np.ndarray)
        assert embedding.shape == (1024,)

    def test_get_keyword_embedding_caching(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        キーワード埋め込みがキャッシュされることを確認
        """
        keyword = "Python"

        # 初回呼び出し
        embedding1 = importance_score_service.get_keyword_embedding(keyword)
        assert keyword in importance_score_service.keyword_embeddings_cache

        # 2回目の呼び出し（キャッシュから取得）
        embedding2 = importance_score_service.get_keyword_embedding(keyword)

        # 同じオブジェクトが返されることを確認
        assert np.array_equal(embedding1, embedding2)
        assert (
            embedding1
            is importance_score_service.keyword_embeddings_cache[keyword]
        )

    def test_calculate_similarity(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        コサイン類似度が正しく計算されることを確認
        """
        # 同じベクトル（類似度 = 1.0）
        vec1 = np.array([1.0, 0.0, 0.0])
        vec2 = np.array([1.0, 0.0, 0.0])
        similarity = importance_score_service.calculate_similarity(vec1, vec2)
        assert abs(similarity - 1.0) < 1e-6

        # 直交ベクトル（類似度 = 0.0）
        vec3 = np.array([1.0, 0.0, 0.0])
        vec4 = np.array([0.0, 1.0, 0.0])
        similarity = importance_score_service.calculate_similarity(vec3, vec4)
        assert abs(similarity - 0.0) < 1e-6

        # 逆ベクトル（類似度 = -1.0）
        vec5 = np.array([1.0, 0.0, 0.0])
        vec6 = np.array([-1.0, 0.0, 0.0])
        similarity = importance_score_service.calculate_similarity(vec5, vec6)
        assert abs(similarity - (-1.0)) < 1e-6

    def test_calculate_score_with_active_keywords(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        有効なキーワードで重要度スコアが正しく計算されることを確認
        """
        article = {
            "article_id": "article-123",
            "title": "Python Programming Tutorial",
            "content": "Learn Python programming basics",
        }

        keywords = [
            {
                "keyword_id": "keyword-1",
                "text": "Python",
                "weight": 1.5,
                "is_active": True,
            },
            {
                "keyword_id": "keyword-2",
                "text": "Programming",
                "weight": 1.0,
                "is_active": True,
            },
        ]

        # モックの埋め込みを設定（類似度が計算可能な値）
        with patch.object(
            importance_score_service,
            "get_embedding",
            return_value=np.array([0.5] * 1024),
        ):
            with patch.object(
                importance_score_service,
                "get_keyword_embedding",
                return_value=np.array([0.5] * 1024),
            ):
                score, reasons = importance_score_service.calculate_score(
                    article, keywords
                )

        # スコアが計算されることを確認
        assert score > 0.0
        assert len(reasons) == 2

        # 理由が正しく記録されることを確認
        assert reasons[0]["article_id"] == "article-123"
        assert reasons[0]["keyword_id"] == "keyword-1"
        assert reasons[0]["keyword_text"] == "Python"
        assert "similarity_score" in reasons[0]
        assert "contribution" in reasons[0]

    def test_calculate_score_with_inactive_keywords(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        無効なキーワードがスコア計算から除外されることを確認
        """
        article = {
            "article_id": "article-123",
            "title": "Python Programming",
            "content": "Python tutorial",
        }

        keywords = [
            {
                "keyword_id": "keyword-1",
                "text": "Python",
                "weight": 1.0,
                "is_active": True,
            },
            {
                "keyword_id": "keyword-2",
                "text": "Java",
                "weight": 1.0,
                "is_active": False,  # 無効
            },
        ]

        with patch.object(
            importance_score_service,
            "get_embedding",
            return_value=np.array([0.5] * 1024),
        ):
            with patch.object(
                importance_score_service,
                "get_keyword_embedding",
                return_value=np.array([0.5] * 1024),
            ):
                score, reasons = importance_score_service.calculate_score(
                    article, keywords
                )

        # 有効なキーワードのみが計算されることを確認
        assert len(reasons) == 1
        assert reasons[0]["keyword_text"] == "Python"

    def test_calculate_score_with_no_keywords(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        キーワードがない場合、スコアが0になることを確認
        """
        article = {
            "article_id": "article-123",
            "title": "Test Article",
            "content": "Test content",
        }

        keywords: List[Dict[str, Any]] = []

        score, reasons = importance_score_service.calculate_score(
            article, keywords
        )

        assert score == 0.0
        assert len(reasons) == 0

    def test_calculate_score_weight_application(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        キーワードの重みが正しく適用されることを確認
        """
        article = {
            "article_id": "article-123",
            "title": "Python",
            "content": "Python",
        }

        keywords = [
            {
                "keyword_id": "keyword-1",
                "text": "Python",
                "weight": 2.0,
                "is_active": True,
            }
        ]

        # 類似度を0.5に固定
        with patch.object(
            importance_score_service,
            "calculate_similarity",
            return_value=0.5,
        ):
            with patch.object(
                importance_score_service,
                "get_embedding",
                return_value=np.array([0.5] * 1024),
            ):
                with patch.object(
                    importance_score_service,
                    "get_keyword_embedding",
                    return_value=np.array([0.5] * 1024),
                ):
                    score, reasons = importance_score_service.calculate_score(
                        article, keywords
                    )

        # スコア = 類似度 * 重み = 0.5 * 2.0 = 1.0
        assert abs(score - 1.0) < 1e-6
        assert abs(reasons[0]["contribution"] - 1.0) < 1e-6

    def test_clear_cache(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        キャッシュがクリアされることを確認
        """
        # キャッシュにデータを追加
        importance_score_service.keyword_embeddings_cache["test"] = (
            np.array([1.0] * 1024)
        )
        assert len(importance_score_service.keyword_embeddings_cache) == 1

        # キャッシュをクリア
        importance_score_service.clear_cache()
        assert len(importance_score_service.keyword_embeddings_cache) == 0

    def test_calculate_score_with_default_weight(
        self, importance_score_service: ImportanceScoreService
    ) -> None:
        """
        重みが指定されていない場合、デフォルト値1.0が使用されることを確認
        """
        article = {
            "article_id": "article-123",
            "title": "Test",
            "content": "Test",
        }

        keywords = [
            {
                "keyword_id": "keyword-1",
                "text": "Test",
                # weightが指定されていない
                "is_active": True,
            }
        ]

        # 類似度を0.5に固定
        with patch.object(
            importance_score_service,
            "calculate_similarity",
            return_value=0.5,
        ):
            with patch.object(
                importance_score_service,
                "get_embedding",
                return_value=np.array([0.5] * 1024),
            ):
                with patch.object(
                    importance_score_service,
                    "get_keyword_embedding",
                    return_value=np.array([0.5] * 1024),
                ):
                    score, reasons = importance_score_service.calculate_score(
                        article, keywords
                    )

        # スコア = 類似度 * デフォルト重み = 0.5 * 1.0 = 0.5
        assert abs(score - 0.5) < 1e-6
        assert abs(reasons[0]["contribution"] - 0.5) < 1e-6
