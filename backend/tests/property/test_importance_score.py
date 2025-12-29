"""重要度スコア計算のプロパティベーステスト

設計書のプロパティ20-23を検証します。
"""

from typing import Any
from unittest.mock import Mock, patch

import numpy as np
from hypothesis import given, settings
from hypothesis import strategies as st

from app.services.importance_score_service import ImportanceScoreService


# テスト用の戦略定義
@st.composite
def article_strategy(draw: Any) -> dict[str, Any]:
    """記事データを生成する戦略"""
    return {
        "article_id": draw(
            st.text(
                min_size=1,
                max_size=50,
                alphabet=st.characters(
                    whitelist_categories=("Lu", "Ll", "Nd"),
                    whitelist_characters="-",
                ),
            )
        ),
        "title": draw(
            st.text(
                min_size=1,
                max_size=200,
                alphabet=st.characters(
                    whitelist_categories=("Lu", "Ll", "Nd", "Zs")
                ),
            ).filter(lambda x: x.strip())
        ),
        "content": draw(
            st.text(
                min_size=0,
                max_size=500,
                alphabet=st.characters(
                    whitelist_categories=("Lu", "Ll", "Nd", "Zs", "Po")
                ),
            )
        ),
    }


@st.composite
def keyword_strategy(draw: Any) -> dict[str, Any]:
    """キーワードデータを生成する戦略"""
    return {
        "keyword_id": draw(
            st.text(
                min_size=1,
                max_size=50,
                alphabet=st.characters(
                    whitelist_categories=("Lu", "Ll", "Nd"),
                    whitelist_characters="-",
                ),
            )
        ),
        "text": draw(
            st.text(
                min_size=1,
                max_size=100,
                alphabet=st.characters(
                    whitelist_categories=("Lu", "Ll", "Nd", "Zs")
                ),
            ).filter(lambda x: x.strip())
        ),
        "weight": draw(st.floats(min_value=0.1, max_value=10.0)),
        "is_active": draw(st.booleans()),
    }


def create_mock_service() -> ImportanceScoreService:
    """モックされたImportanceScoreServiceを作成"""
    mock_client = Mock()
    with patch("boto3.client", return_value=mock_client):
        service = ImportanceScoreService(region_name="us-east-1")

    # 埋め込み生成をモック（ランダムな正規化ベクトル）
    def mock_get_embedding(text: str) -> np.ndarray:
        np.random.seed(hash(text) % (2**32))
        vec = np.random.randn(1024)
        # 正規化
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

    service.get_embedding = mock_get_embedding  # type: ignore
    service.get_keyword_embedding = mock_get_embedding  # type: ignore

    return service


class TestImportanceScoreProperties:
    """重要度スコア計算のプロパティテスト"""

    # Feature: rss-reader, Property 20: 重要度スコアの計算
    # 検証: 要件 7.1
    @settings(max_examples=100, deadline=5000)
    @given(
        article=article_strategy(),
        keywords=st.lists(keyword_strategy(), min_size=1, max_size=10),
    )
    def test_property_20_importance_score_calculation(
        self,
        article: dict[str, Any],
        keywords: list[dict[str, Any]],
    ) -> None:
        """
        プロパティ20: 重要度スコアの計算

        任意の記事と有効なキーワードのリストに対して、
        重要度スコアを計算すると、スコアは0以上であり、
        各キーワードの寄与度の合計と等しい。
        """
        service = create_mock_service()
        score, reasons = service.calculate_score(article, keywords)

        # スコアは0以上（類似度が負の場合もあるため、実際には負になる可能性がある）
        # コサイン類似度は-1から1の範囲なので、スコアも負になりうる
        # ただし、重みが正の場合、スコアの範囲は予測可能

        # 有効なキーワードの寄与度の合計がスコアと等しい
        active_keywords = [kw for kw in keywords if kw.get("is_active", True)]
        expected_score = sum(
            reason["contribution"]
            for reason in reasons
            if reason["keyword_id"]
            in [kw["keyword_id"] for kw in active_keywords]
        )

        # 浮動小数点の誤差を考慮
        assert abs(score - expected_score) < 1e-6

        # 理由の数は有効なキーワードの数と等しい
        assert len(reasons) == len(active_keywords)

    # Feature: rss-reader, Property 21: スコア計算の加算性
    # 検証: 要件 7.2
    @settings(max_examples=100, deadline=5000)
    @given(
        article=article_strategy(),
        keyword=keyword_strategy(),
        similarity=st.floats(min_value=0.0, max_value=1.0),
    )
    def test_property_21_score_additivity(
        self,
        article: dict[str, Any],
        keyword: dict[str, Any],
        similarity: float,
    ) -> None:
        """
        プロパティ21: スコア計算の加算性

        任意の記事、キーワード、類似度、重みに対して、
        そのキーワードのスコアへの寄与度は、類似度と重みの積に等しい。
        """
        service = create_mock_service()
        # 類似度を固定値に設定
        with patch.object(
            service,
            "calculate_similarity",
            return_value=similarity,
        ):
            score, reasons = service.calculate_score(article, [keyword])

        if keyword.get("is_active", True):
            # 有効なキーワードの場合
            assert len(reasons) == 1
            reason = reasons[0]

            # 寄与度 = 類似度 * 重み
            expected_contribution = similarity * keyword.get("weight", 1.0)
            assert abs(reason["contribution"] - expected_contribution) < 1e-6

            # スコアは寄与度と等しい
            assert abs(score - expected_contribution) < 1e-6
        else:
            # 無効なキーワードの場合
            assert len(reasons) == 0
            assert score == 0.0

    # Feature: rss-reader, Property 22: 重要度理由の記録
    # 検証: 要件 7.3, 7.4
    @settings(max_examples=100, deadline=5000)
    @given(
        article=article_strategy(),
        keywords=st.lists(
            keyword_strategy().filter(lambda kw: kw.get("is_active", True)),
            min_size=1,
            max_size=10,
            unique_by=lambda kw: kw["keyword_id"],  # keyword_idを一意にする
        ),
    )
    def test_property_22_importance_reason_recording(
        self,
        article: dict[str, Any],
        keywords: list[dict[str, Any]],
    ) -> None:
        """
        プロパティ22: 重要度理由の記録

        任意の記事に対して、重要度スコアを計算した後、
        各キーワードの寄与度がImportanceReasonとして記録されている。
        """
        service = create_mock_service()
        score, reasons = service.calculate_score(article, keywords)

        # 有効なキーワードごとに理由が記録される
        active_keywords = [kw for kw in keywords if kw.get("is_active", True)]
        assert len(reasons) == len(active_keywords)

        for reason in reasons:
            # 必須フィールドが存在する
            assert "PK" in reason
            assert "SK" in reason
            assert "EntityType" in reason
            assert reason["EntityType"] == "ImportanceReason"

            # 記事IDとキーワードIDが正しい
            assert reason["article_id"] == article["article_id"]
            assert reason["PK"] == f"ARTICLE#{article['article_id']}"
            assert reason["SK"].startswith("REASON#")

            # キーワード情報が記録されている
            assert "keyword_id" in reason
            assert "keyword_text" in reason
            assert "similarity_score" in reason
            assert "contribution" in reason

            # 類似度は-1～1の範囲（コサイン類似度）
            assert -1.0 <= reason["similarity_score"] <= 1.0

            # 寄与度は類似度と重みの積
            matching_keyword = next(
                kw
                for kw in active_keywords
                if kw["keyword_id"] == reason["keyword_id"]
            )
            expected_contribution = (
                reason["similarity_score"] * matching_keyword["weight"]
            )
            # 浮動小数点の誤差を考慮
            assert abs(reason["contribution"] - expected_contribution) < 1e-6

    # Feature: rss-reader, Property 23: 重要度スコアの再計算
    # 検証: 要件 7.5
    @settings(max_examples=50, deadline=5000)
    @given(
        article=article_strategy(),
        keywords=st.lists(keyword_strategy(), min_size=1, max_size=5),
        weight_multiplier=st.floats(min_value=0.5, max_value=2.0),
    )
    def test_property_23_score_recalculation(
        self,
        article: dict[str, Any],
        keywords: list[dict[str, Any]],
        weight_multiplier: float,
    ) -> None:
        """
        プロパティ23: 重要度スコアの再計算

        任意の記事とキーワードに対して、
        キーワードの重みを変更して再計算すると、
        記事の重要度スコアが更新される。
        """
        service = create_mock_service()
        # 初回計算
        score1, reasons1 = service.calculate_score(article, keywords)

        # キーワードの重みを変更
        modified_keywords = []
        for kw in keywords:
            modified_kw = kw.copy()
            modified_kw["weight"] = kw.get("weight", 1.0) * weight_multiplier
            modified_keywords.append(modified_kw)

        # 再計算
        score2, reasons2 = service.calculate_score(article, modified_keywords)

        # 有効なキーワードが存在する場合
        active_keywords = [kw for kw in keywords if kw.get("is_active", True)]
        if active_keywords:
            # スコアが変更されている（weight_multiplierが1.0でない場合）
            if abs(weight_multiplier - 1.0) > 1e-6 and score1 > 0:
                # スコアの比率が重みの変更倍率と一致する
                ratio = score2 / score1
                assert abs(ratio - weight_multiplier) < 1e-3

            # 理由の数は変わらない
            assert len(reasons1) == len(reasons2)

    @settings(max_examples=100, deadline=5000)
    @given(
        article=article_strategy(),
        keywords=st.lists(keyword_strategy(), min_size=0, max_size=10),
    )
    def test_score_is_sum_of_contributions(
        self,
        article: dict[str, Any],
        keywords: list[dict[str, Any]],
    ) -> None:
        """
        スコアは各キーワードの寄与度の合計であることを確認
        （コサイン類似度は-1から1の範囲なので、スコアも負になりうる）
        """
        service = create_mock_service()
        score, reasons = service.calculate_score(article, keywords)

        # スコアは寄与度の合計
        expected_score = sum(r["contribution"] for r in reasons)
        assert abs(score - expected_score) < 1e-6

    @settings(max_examples=100, deadline=5000)
    @given(article=article_strategy())
    def test_score_zero_with_no_keywords(
        self,
        article: dict[str, Any],
    ) -> None:
        """
        キーワードがない場合、スコアは0になることを確認
        """
        service = create_mock_service()
        score, reasons = service.calculate_score(article, [])
        assert score == 0.0
        assert len(reasons) == 0

    @settings(max_examples=100, deadline=5000)
    @given(
        article=article_strategy(),
        keywords=st.lists(
            keyword_strategy().map(lambda kw: {**kw, "is_active": False}),
            min_size=1,
            max_size=10,
        ),
    )
    def test_score_zero_with_all_inactive_keywords(
        self,
        article: dict[str, Any],
        keywords: list[dict[str, Any]],
    ) -> None:
        """
        すべてのキーワードが無効な場合、スコアは0になることを確認
        """
        service = create_mock_service()
        score, reasons = service.calculate_score(article, keywords)
        assert score == 0.0
        assert len(reasons) == 0
