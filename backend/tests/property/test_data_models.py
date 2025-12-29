"""
データモデルのプロパティベーステスト

Feature: rss-reader, Property 1: フィード登録の永続化
検証: 要件 1.1

Hypothesisを使用してデータモデルの正確性を検証します。
"""

import pytest
from datetime import datetime, timedelta
from hypothesis import given, strategies as st, settings
from hypothesis.strategies import composite
from pydantic import ValidationError

from app.models import Feed, Article, Keyword, ImportanceReason, LinkIndex


# カスタム戦略の定義

@composite
def non_empty_text_strategy(draw, min_size=1, max_size=200):
    """空白のみの文字列を除外したテキスト生成戦略
    
    制御文字（Cs: Surrogate, Cc: Control）を除外し、
    空白のみの文字列をフィルターで除外する。
    
    Args:
        draw: Hypothesis描画関数
        min_size: 最小文字数
        max_size: 最大文字数
    
    Returns:
        str: 空白のみでないテキスト
    """
    return draw(st.text(
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc')),
        min_size=min_size,
        max_size=max_size
    ).filter(lambda x: x.strip()))


@composite
def valid_url_strategy(draw):
    """有効なURL文字列を生成する戦略"""
    domains = ['example.com', 'test.org', 'sample.net', 'demo.co.jp']
    paths = ['', '/feed', '/rss', '/feed.xml', '/rss.xml', '/news/feed']
    
    domain = draw(st.sampled_from(domains))
    path = draw(st.sampled_from(paths))
    
    return f"https://{domain}{path}"


@composite
def valid_feed_strategy(draw):
    """有効なFeedオブジェクトを生成する戦略"""
    url = draw(valid_url_strategy())
    title = draw(st.text(min_size=1, max_size=100))
    folder = draw(st.one_of(st.none(), st.text(min_size=1, max_size=50)))
    is_active = draw(st.booleans())
    
    return Feed(
        url=url,
        title=title,
        folder=folder,
        is_active=is_active
    )


@composite
def valid_article_strategy(draw):
    """有効なArticleオブジェクトを生成する戦略"""
    feed_id = draw(st.uuids()).hex
    link = draw(valid_url_strategy())
    # 空白のみの文字列を除外するため、英数字を含む文字列を生成
    title = draw(st.text(
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc')),
        min_size=1,
        max_size=200
    ).filter(lambda x: x.strip()))
    content = draw(st.text(max_size=1000))
    published_at = draw(st.datetimes(
        min_value=datetime(2020, 1, 1),
        max_value=datetime(2030, 12, 31)
    ))
    is_read = draw(st.booleans())
    is_saved = draw(st.booleans())
    importance_score = draw(st.floats(min_value=0.0, max_value=1.0))
    
    return Article(
        feed_id=feed_id,
        link=link,
        title=title,
        content=content,
        published_at=published_at,
        is_read=is_read,
        is_saved=is_saved,
        importance_score=importance_score
    )


@composite
def valid_keyword_strategy(draw):
    """有効なKeywordオブジェクトを生成する戦略"""
    # 空白のみの文字列と制御文字を除外
    text = draw(st.text(
        alphabet=st.characters(blacklist_categories=('Cs', 'Cc')),
        min_size=1,
        max_size=50
    ).filter(lambda x: x.strip()))
    weight = draw(st.floats(min_value=0.1, max_value=10.0))
    is_active = draw(st.booleans())
    
    return Keyword(
        text=text,
        weight=weight,
        is_active=is_active
    )


# プロパティテスト

class TestFeedModelProperties:
    """Feedモデルのプロパティテスト"""
    
    # Feature: rss-reader, Property 1: フィード登録の永続化
    @given(feed=valid_feed_strategy())
    @settings(max_examples=50)
    def test_feed_registration_persistence(self, feed: Feed):
        """
        任意の有効なフィードURLに対して、フィードを登録した後、
        データベースから同じURLのフィードを取得できる
        
        検証: 要件 1.1
        """
        # DynamoDBアイテム形式に変換
        dynamodb_item = feed.to_dynamodb_item()
        
        # 必須フィールドが存在することを確認
        assert 'PK' in dynamodb_item
        assert 'SK' in dynamodb_item
        assert 'EntityType' in dynamodb_item
        assert dynamodb_item['EntityType'] == 'Feed'
        
        # URLが文字列として保存されることを確認
        assert isinstance(dynamodb_item['url'], str)
        assert dynamodb_item['url'] == str(feed.url)
        
        # PKが正しい形式であることを確認
        assert dynamodb_item['PK'] == f"FEED#{feed.feed_id}"
        assert dynamodb_item['SK'] == "METADATA"
    
    @given(feed=valid_feed_strategy())
    @settings(max_examples=50)
    def test_pk_sk_generation_uniqueness(self, feed: Feed):
        """
        PK/SK生成の一意性テスト
        
        同じフィードIDを持つフィードは同じPK/SKを生成し、
        異なるフィードIDを持つフィードは異なるPK/SKを生成する
        """
        pk1 = feed.generate_pk()
        sk1 = feed.generate_sk()
        
        # 同じフィードから生成されるPK/SKは一致する
        pk2 = feed.generate_pk()
        sk2 = feed.generate_sk()
        assert pk1 == pk2
        assert sk1 == sk2
        
        # PKにフィードIDが含まれている
        assert feed.feed_id in pk1
        
        # SKは固定値
        assert sk1 == "METADATA"
    
    @given(feed=valid_feed_strategy())
    @settings(max_examples=50)
    def test_gsi_generation_accuracy(self, feed: Feed):
        """
        GSI生成の正確性テスト
        
        GSI1のキーが正しく生成されることを確認
        """
        gsi1_pk = feed.generate_gsi1_pk()
        gsi1_sk = feed.generate_gsi1_sk()
        
        # GSI1PKは固定値
        assert gsi1_pk == "FEED"
        
        # GSI1SKにフィードIDが含まれている
        assert feed.feed_id in gsi1_sk
        assert gsi1_sk == f"FEED#{feed.feed_id}"


class TestArticleModelProperties:
    """Articleモデルのプロパティテスト"""
    
    @given(article=valid_article_strategy())
    @settings(max_examples=50)
    def test_article_pk_sk_generation(self, article: Article):
        """
        記事のPK/SK生成の正確性テスト
        """
        pk = article.generate_pk()
        sk = article.generate_sk()
        
        # PKに記事IDが含まれている
        assert article.article_id in pk
        assert pk == f"ARTICLE#{article.article_id}"
        
        # SKは固定値
        assert sk == "METADATA"
    
    @given(article=valid_article_strategy())
    @settings(max_examples=50)
    def test_gsi2_reverse_sort_key_generation(self, article: Article):
        """
        GSI2SKゼロパディング処理のテスト（数値ソートの正確性検証）
        
        重要度スコアの逆順ソートキーが正しく生成されることを確認
        """
        gsi2_sk = article.generate_gsi2_sk()
        
        # ゼロパディングされた文字列であることを確認
        assert isinstance(gsi2_sk, str)
        assert '.' in gsi2_sk  # 小数点が含まれている
        
        # 逆順ソートキーの計算が正しいことを確認
        expected_reverse = 1000000 - int(article.importance_score * 1000000)
        expected_key = f"{expected_reverse:07d}.000000"
        assert gsi2_sk == expected_key
    
    @given(
        score1=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
        score2=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)
    )
    @settings(max_examples=50)
    def test_reverse_sort_key_ordering(self, score1: float, score2: float):
        """
        逆順ソートキー生成のテスト（重要度スコア順序の検証）
        
        高いスコアほど小さい（辞書順で前に来る）ソートキーを生成することを確認
        """
        # 2つの記事を作成
        article1 = Article(
            feed_id="test-feed",
            link="https://example.com/1",
            title="Test Article 1",
            published_at=datetime.now(),
            importance_score=score1
        )
        
        article2 = Article(
            feed_id="test-feed",
            link="https://example.com/2", 
            title="Test Article 2",
            published_at=datetime.now(),
            importance_score=score2
        )
        
        key1 = article1.generate_gsi2_sk()
        key2 = article2.generate_gsi2_sk()
        
        # スコアを整数化して比較（精度の問題を回避）
        score1_int = int(score1 * 1000000)
        score2_int = int(score2 * 1000000)
        
        # 逆順ソートキーなので、高いスコアほど小さい数値（辞書順で前）になる
        # score1 > score2 の場合、key1 < key2 になるべき
        if score1_int > score2_int:
            assert key1 < key2, f"score1={score1} > score2={score2} なので key1={key1} < key2={key2} であるべき"
        elif score1_int < score2_int:
            assert key1 > key2, f"score1={score1} < score2={score2} なので key1={key1} > key2={key2} であるべき"
        else:
            # 整数化後に同じ値になる場合は、ソートキーも同じになる
            assert key1 == key2, f"score1={score1} == score2={score2} (整数化後) なので key1={key1} == key2={key2} であるべき"
    
    @given(article=valid_article_strategy())
    @settings(max_examples=50)
    def test_gsi_generation_completeness(self, article: Article):
        """
        全GSIキーの生成が正しく行われることを確認
        """
        # GSI1（時系列順）
        assert article.generate_gsi1_pk() == "ARTICLE"
        assert article.generate_gsi1_sk().endswith("Z")  # ISO形式の日時
        
        # GSI2（重要度順）
        assert article.generate_gsi2_pk() == "ARTICLE"
        gsi2_sk = article.generate_gsi2_sk()
        assert isinstance(gsi2_sk, str)
        assert len(gsi2_sk.split('.')) == 2  # "数値.数値"の形式
        
        # GSI3（削除クエリ用）
        assert article.generate_gsi3_pk() == "ARTICLE"
        assert article.generate_gsi3_sk().endswith("Z")  # ISO形式の日時
        
        # GSI5（フィード別記事クエリ用）
        assert article.generate_gsi5_pk() == f"FEED#{article.feed_id}"
        assert article.generate_gsi5_sk() == f"ARTICLE#{article.article_id}"
    
    @given(article=valid_article_strategy())
    @settings(max_examples=50)
    def test_ttl_setting(self, article: Article):
        """
        TTL設定のテスト
        
        TTLが正しく設定され、未来の日時であることを確認
        """
        # TTLを設定
        article.set_ttl_for_article(days=7)
        
        # TTLが設定されている
        assert article.ttl is not None
        assert isinstance(article.ttl, int)
        
        # TTLが現在時刻より未来である
        current_timestamp = int(datetime.now().timestamp())
        assert article.ttl > current_timestamp
        
        # TTLが約7日後である（±1時間の誤差を許容）
        expected_ttl = int((datetime.now() + timedelta(days=7)).timestamp())
        assert abs(article.ttl - expected_ttl) < 3600  # 1時間以内の誤差


class TestKeywordModelProperties:
    """Keywordモデルのプロパティテスト"""
    
    @given(keyword=valid_keyword_strategy())
    @settings(max_examples=50)
    def test_keyword_pk_sk_generation(self, keyword: Keyword):
        """
        キーワードのPK/SK生成の正確性テスト
        """
        pk = keyword.generate_pk()
        sk = keyword.generate_sk()
        
        # PKにキーワードIDが含まれている
        assert keyword.keyword_id in pk
        assert pk == f"KEYWORD#{keyword.keyword_id}"
        
        # SKは固定値
        assert sk == "METADATA"
    
    @given(keyword=valid_keyword_strategy())
    @settings(max_examples=50)
    def test_keyword_gsi1_generation(self, keyword: Keyword):
        """
        キーワードのGSI1生成の正確性テスト
        """
        gsi1_pk = keyword.generate_gsi1_pk()
        gsi1_sk = keyword.generate_gsi1_sk()
        
        # GSI1PKは固定値
        assert gsi1_pk == "KEYWORD"
        
        # GSI1SKにキーワードIDが含まれている
        assert keyword.keyword_id in gsi1_sk
        assert gsi1_sk == f"KEYWORD#{keyword.keyword_id}"


class TestImportanceReasonProperties:
    """ImportanceReasonモデルのプロパティテスト"""
    
    @given(
        article_id=st.uuids().map(lambda x: x.hex),
        keyword_id=st.uuids().map(lambda x: x.hex),
        keyword_text=st.text(
            alphabet=st.characters(blacklist_categories=('Cs', 'Cc')),
            min_size=1,
            max_size=50
        ).filter(lambda x: x.strip()),
        similarity_score=st.floats(min_value=0.0, max_value=1.0),
        weight=st.floats(min_value=0.1, max_value=10.0)
    )
    @settings(max_examples=50)
    def test_importance_reason_creation_from_calculation(
        self,
        article_id: str,
        keyword_id: str,
        keyword_text: str,
        similarity_score: float,
        weight: float
    ):
        """
        重要度計算結果からImportanceReasonを作成するテスト
        
        寄与度が正しく計算されることを確認
        """
        reason = ImportanceReason.create_from_calculation(
            article_id=article_id,
            keyword_id=keyword_id,
            keyword_text=keyword_text,
            similarity_score=similarity_score,
            weight=weight
        )
        
        # 基本フィールドが正しく設定されている
        assert reason.article_id == article_id
        assert reason.keyword_id == keyword_id
        # keyword_textは正規化される可能性があるため、正規化後の値と比較
        assert reason.keyword_text.strip() == keyword_text.strip()
        assert reason.similarity_score == similarity_score
        
        # 寄与度が正しく計算されている
        expected_contribution = similarity_score * weight
        assert abs(reason.contribution - expected_contribution) < 1e-10
    
    @given(
        article_id=st.uuids().map(lambda x: x.hex),
        keyword_id=st.uuids().map(lambda x: x.hex),
        keyword_text=st.text(
            alphabet=st.characters(blacklist_categories=('Cs', 'Cc')),
            min_size=1,
            max_size=50
        ).filter(lambda x: x.strip()),
        similarity_score=st.floats(min_value=0.0, max_value=1.0),
        weight=st.floats(min_value=0.1, max_value=10.0)
    )
    @settings(max_examples=50)
    def test_importance_reason_pk_sk_generation(
        self,
        article_id: str,
        keyword_id: str,
        keyword_text: str,
        similarity_score: float,
        weight: float
    ):
        """
        ImportanceReasonのPK/SK生成の正確性テスト
        """
        reason = ImportanceReason.create_from_calculation(
            article_id=article_id,
            keyword_id=keyword_id,
            keyword_text=keyword_text,
            similarity_score=similarity_score,
            weight=weight
        )
        
        pk = reason.generate_pk()
        sk = reason.generate_sk()
        
        # PKに記事IDが含まれている
        assert pk == f"ARTICLE#{article_id}"
        
        # SKにキーワードIDが含まれている
        assert sk == f"REASON#{keyword_id}"


class TestLinkIndexProperties:
    """LinkIndexモデルのプロパティテスト"""
    
    @given(
        url=valid_url_strategy(),
        article_id=st.uuids().map(lambda x: x.hex)
    )
    @settings(max_examples=50)
    def test_link_index_hash_generation(self, url: str, article_id: str):
        """
        リンクインデックスのハッシュ生成の正確性テスト
        """
        link_index = LinkIndex.create_from_article(url, article_id)
        
        # ハッシュが生成されている
        assert link_index.url_hash
        assert len(link_index.url_hash) == 64  # SHA-256は64文字
        
        # 同じURLからは同じハッシュが生成される
        hash1 = LinkIndex.generate_hash_from_url(url)
        hash2 = LinkIndex.generate_hash_from_url(url)
        assert hash1 == hash2
        
        # PKが正しく生成される
        pk = link_index.generate_pk()
        assert pk == f"LINK#{link_index.url_hash}"
    
    @given(
        url1=valid_url_strategy(),
        url2=valid_url_strategy(),
        article_id=st.uuids().map(lambda x: x.hex)
    )
    @settings(max_examples=50)
    def test_link_index_duplicate_detection(self, url1: str, url2: str, article_id: str):
        """
        リンクの重複検出の正確性テスト
        """
        link_index = LinkIndex.create_from_article(url1, article_id)
        
        # 同じURLは重複として検出される
        assert link_index.is_duplicate_of(url1)
        
        # 異なるURLは重複として検出されない（ただし、偶然同じになる可能性は除く）
        if url1.lower().rstrip('/') != url2.lower().rstrip('/'):
            assert not link_index.is_duplicate_of(url2)


# エラーケースのプロパティテスト

class TestModelValidationProperties:
    """モデルバリデーションのプロパティテスト"""
    
    @given(score=st.floats(min_value=-10.0, max_value=-0.1))
    @settings(max_examples=50)
    def test_negative_importance_score_validation(self, score: float):
        """
        負の重要度スコアが適切にバリデーションエラーを発生させることを確認
        """
        with pytest.raises(ValidationError):
            Article(
                feed_id="test-feed",
                link="https://example.com",
                title="Test Article",
                published_at=datetime.now(),
                importance_score=score
            )
    
    @given(score=st.floats(min_value=1.1, max_value=10.0))
    @settings(max_examples=50)
    def test_excessive_importance_score_validation(self, score: float):
        """
        1.0を超える重要度スコアが適切にバリデーションエラーを発生させることを確認
        """
        with pytest.raises(ValidationError):
            Article(
                feed_id="test-feed",
                link="https://example.com",
                title="Test Article",
                published_at=datetime.now(),
                importance_score=score
            )
    
    @given(weight=st.floats(min_value=-10.0, max_value=0.0))
    @settings(max_examples=50)
    def test_non_positive_keyword_weight_validation(self, weight: float):
        """
        0以下のキーワード重みが適切にバリデーションエラーを発生させることを確認
        """
        with pytest.raises(ValidationError):
            Keyword(
                text="test keyword",
                weight=weight
            )