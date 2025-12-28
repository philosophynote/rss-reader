"""
データモデルのユニットテスト

各エンティティのPydanticバリデーション、PK/SK生成メソッド、
TTL設定などの具体的な動作を検証します。
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from app.models import Feed, Article, Keyword, ImportanceReason, LinkIndex


class TestFeedModel:
    """Feedモデルのユニットテスト"""
    
    def test_feed_creation_with_valid_data(self):
        """有効なデータでフィードを作成"""
        feed = Feed(
            url="https://example.com/feed.xml",
            title="Example Feed",
            folder="Technology"
        )
        
        assert str(feed.url) == "https://example.com/feed.xml"
        assert feed.title == "Example Feed"
        assert feed.folder == "Technology"
        assert feed.is_active is True
        assert feed.feed_id is not None
    
    def test_feed_creation_with_minimal_data(self):
        """最小限のデータでフィードを作成"""
        feed = Feed(url="https://example.com/feed.xml")
        
        assert str(feed.url) == "https://example.com/feed.xml"
        assert feed.title == "Feed from example.com"  # デフォルトタイトル
        assert feed.folder is None
        assert feed.is_active is True
    
    def test_feed_pk_sk_generation(self):
        """PK/SK生成メソッドのテスト"""
        feed = Feed(url="https://example.com/feed.xml")
        
        pk = feed.generate_pk()
        sk = feed.generate_sk()
        
        assert pk == f"FEED#{feed.feed_id}"
        assert sk == "METADATA"
    
    def test_feed_gsi1_generation(self):
        """GSI1キー生成メソッドのテスト"""
        feed = Feed(url="https://example.com/feed.xml")
        
        gsi1_pk = feed.generate_gsi1_pk()
        gsi1_sk = feed.generate_gsi1_sk()
        
        assert gsi1_pk == "FEED"
        assert gsi1_sk == f"FEED#{feed.feed_id}"
    
    def test_feed_to_dynamodb_item(self):
        """DynamoDBアイテム変換のテスト"""
        feed = Feed(
            url="https://example.com/feed.xml",
            title="Test Feed",
            folder="Tech"
        )
        
        item = feed.to_dynamodb_item()
        
        # 必須フィールドの確認
        assert item['PK'] == f"FEED#{feed.feed_id}"
        assert item['SK'] == "METADATA"
        assert item['EntityType'] == "Feed"
        assert item['GSI1PK'] == "FEED"
        assert item['GSI1SK'] == f"FEED#{feed.feed_id}"
        
        # データフィールドの確認
        assert item['url'] == "https://example.com/feed.xml"
        assert item['title'] == "Test Feed"
        assert item['folder'] == "Tech"
        assert item['is_active'] is True
    
    def test_feed_mark_as_fetched(self):
        """フィード取得完了マークのテスト"""
        feed = Feed(url="https://example.com/feed.xml")
        
        # 初期状態では最終取得日時はNone
        assert feed.last_fetched_at is None
        
        # 取得完了をマーク
        feed.mark_as_fetched()
        
        # 最終取得日時が設定される
        assert feed.last_fetched_at is not None
        assert isinstance(feed.last_fetched_at, datetime)
        assert feed.updated_at is not None
    
    def test_feed_activation_deactivation(self):
        """フィードの有効化/無効化のテスト"""
        feed = Feed(url="https://example.com/feed.xml")
        
        # 初期状態では有効
        assert feed.is_active is True
        
        # 無効化
        feed.deactivate()
        assert feed.is_active is False
        assert feed.updated_at is not None
        
        # 有効化
        feed.activate()
        assert feed.is_active is True
    
    def test_feed_folder_validation(self):
        """フォルダ名のバリデーションテスト"""
        # 空文字列はNoneに変換される
        feed = Feed(url="https://example.com/feed.xml", folder="")
        assert feed.folder is None
        
        # 空白のみの文字列もNoneに変換される
        feed = Feed(url="https://example.com/feed.xml", folder="   ")
        assert feed.folder is None
        
        # 長すぎるフォルダ名はエラー
        with pytest.raises(ValidationError):
            Feed(url="https://example.com/feed.xml", folder="a" * 101)


class TestArticleModel:
    """Articleモデルのユニットテスト"""
    
    def test_article_creation_with_valid_data(self):
        """有効なデータで記事を作成"""
        published_at = datetime(2024, 1, 1, 12, 0, 0)
        
        article = Article(
            feed_id="test-feed-id",
            link="https://example.com/article",
            title="Test Article",
            content="This is a test article.",
            published_at=published_at,
            importance_score=0.75
        )
        
        assert article.feed_id == "test-feed-id"
        assert str(article.link) == "https://example.com/article"
        assert article.title == "Test Article"
        assert article.content == "This is a test article."
        assert article.published_at == published_at
        assert article.importance_score == 0.75
        assert article.is_read is False
        assert article.is_saved is False
        assert article.article_id is not None
    
    def test_article_pk_sk_generation(self):
        """PK/SK生成メソッドのテスト"""
        article = Article(
            feed_id="test-feed-id",
            link="https://example.com/article",
            title="Test Article",
            published_at=datetime.now()
        )
        
        pk = article.generate_pk()
        sk = article.generate_sk()
        
        assert pk == f"ARTICLE#{article.article_id}"
        assert sk == "METADATA"
    
    def test_article_gsi_generation(self):
        """GSIキー生成メソッドのテスト"""
        published_at = datetime(2024, 1, 1, 12, 0, 0)
        
        article = Article(
            feed_id="test-feed-id",
            link="https://example.com/article",
            title="Test Article",
            published_at=published_at,
            importance_score=0.85
        )
        
        # GSI1（時系列順）
        assert article.generate_gsi1_pk() == "ARTICLE"
        assert article.generate_gsi1_sk() == "2024-01-01T12:00:00Z"
        
        # GSI2（重要度順）
        assert article.generate_gsi2_pk() == "ARTICLE"
        gsi2_sk = article.generate_gsi2_sk()
        assert isinstance(gsi2_sk, str)
        # 0.85のスコアは逆順で0150000.000000になる
        assert gsi2_sk == "0150000.000000"
        
        # GSI3（削除クエリ用）
        assert article.generate_gsi3_pk() == "ARTICLE"
        gsi3_sk = article.generate_gsi3_sk()
        assert gsi3_sk.endswith("Z")
        
        # GSI5（フィード別記事クエリ用）
        assert article.generate_gsi5_pk() == f"FEED#{article.feed_id}"
        assert article.generate_gsi5_sk() == f"ARTICLE#{article.article_id}"
    
    def test_article_gsi2_reverse_sort_key_calculation(self):
        """GSI2SKゼロパディング処理のテスト（数値ソートの正確性検証）"""
        test_cases = [
            (0.0, "1000000.000000"),
            (0.5, "0500000.000000"),
            (0.85, "0150000.000000"),
            (1.0, "0000000.000000"),
        ]
        
        for score, expected_key in test_cases:
            article = Article(
                feed_id="test-feed-id",
                link="https://example.com/article",
                title="Test Article",
                published_at=datetime.now(),
                importance_score=score
            )
            
            gsi2_sk = article.generate_gsi2_sk()
            assert gsi2_sk == expected_key, f"Score {score} should generate {expected_key}, got {gsi2_sk}"
    
    def test_article_gsi4_generation_for_read_articles(self):
        """既読記事のGSI4生成テスト"""
        article = Article(
            feed_id="test-feed-id",
            link="https://example.com/article",
            title="Test Article",
            published_at=datetime.now()
        )
        
        # 未読の場合はGSI4は生成されない
        assert article.generate_gsi4_pk() is None
        assert article.generate_gsi4_sk() is None
        
        # 既読にマーク
        article.mark_as_read()
        
        # 既読の場合はGSI4が生成される
        assert article.generate_gsi4_pk() == "ARTICLE_READ"
        gsi4_sk = article.generate_gsi4_sk()
        assert gsi4_sk is not None
        assert gsi4_sk.startswith("true#")
        assert gsi4_sk.endswith("Z")
    
    def test_article_ttl_setting(self):
        """TTL設定のテスト"""
        article = Article(
            feed_id="test-feed-id",
            link="https://example.com/article",
            title="Test Article",
            published_at=datetime.now()
        )
        
        # TTLを設定
        article.set_ttl_for_article(days=7)
        
        # TTLが設定されている
        assert article.ttl is not None
        assert isinstance(article.ttl, int)
        
        # TTLが現在時刻より未来である
        current_timestamp = int(datetime.now().timestamp())
        assert article.ttl > current_timestamp
    
    def test_article_read_status_management(self):
        """既読/未読状態管理のテスト"""
        article = Article(
            feed_id="test-feed-id",
            link="https://example.com/article",
            title="Test Article",
            published_at=datetime.now()
        )
        
        # 初期状態では未読
        assert article.is_read is False
        assert article.read_at is None
        
        # 既読にマーク
        article.mark_as_read()
        assert article.is_read is True
        assert article.read_at is not None
        assert article.updated_at is not None
        
        # 未読に戻す
        article.mark_as_unread()
        assert article.is_read is False
        assert article.read_at is None
    
    def test_article_saved_status_management(self):
        """保存状態管理のテスト"""
        article = Article(
            feed_id="test-feed-id",
            link="https://example.com/article",
            title="Test Article",
            published_at=datetime.now()
        )
        
        # 初期状態では未保存
        assert article.is_saved is False
        
        # 保存状態を切り替え
        article.toggle_saved()
        assert article.is_saved is True
        assert article.updated_at is not None
        
        # 再度切り替え
        article.toggle_saved()
        assert article.is_saved is False
    
    def test_article_importance_score_update(self):
        """重要度スコア更新のテスト"""
        article = Article(
            feed_id="test-feed-id",
            link="https://example.com/article",
            title="Test Article",
            published_at=datetime.now(),
            importance_score=0.5
        )
        
        # スコアを更新
        article.update_importance_score(0.8)
        assert article.importance_score == 0.8
        assert article.updated_at is not None
        
        # 無効なスコアはエラー
        with pytest.raises(ValueError):
            article.update_importance_score(-0.1)
        
        with pytest.raises(ValueError):
            article.update_importance_score(1.1)
    
    def test_article_validation_errors(self):
        """記事のバリデーションエラーテスト"""
        # 空のタイトルはエラー
        with pytest.raises(ValidationError):
            Article(
                feed_id="test-feed-id",
                link="https://example.com/article",
                title="",
                published_at=datetime.now()
            )
        
        # 長すぎるタイトルはエラー
        with pytest.raises(ValidationError):
            Article(
                feed_id="test-feed-id",
                link="https://example.com/article",
                title="a" * 501,
                published_at=datetime.now()
            )
        
        # 長すぎる本文はエラー
        with pytest.raises(ValidationError):
            Article(
                feed_id="test-feed-id",
                link="https://example.com/article",
                title="Test Article",
                content="a" * 50001,
                published_at=datetime.now()
            )
        
        # 無効な重要度スコアはエラー
        with pytest.raises(ValidationError):
            Article(
                feed_id="test-feed-id",
                link="https://example.com/article",
                title="Test Article",
                published_at=datetime.now(),
                importance_score=-0.1
            )
        
        with pytest.raises(ValidationError):
            Article(
                feed_id="test-feed-id",
                link="https://example.com/article",
                title="Test Article",
                published_at=datetime.now(),
                importance_score=1.1
            )


class TestKeywordModel:
    """Keywordモデルのユニットテスト"""
    
    def test_keyword_creation_with_valid_data(self):
        """有効なデータでキーワードを作成"""
        keyword = Keyword(
            text="Python",
            weight=1.5,
            is_active=True
        )
        
        assert keyword.text == "Python"
        assert keyword.weight == 1.5
        assert keyword.is_active is True
        assert keyword.keyword_id is not None
    
    def test_keyword_creation_with_default_values(self):
        """デフォルト値でキーワードを作成"""
        keyword = Keyword(text="JavaScript")
        
        assert keyword.text == "JavaScript"
        assert keyword.weight == 1.0  # デフォルト値
        assert keyword.is_active is True  # デフォルト値
    
    def test_keyword_pk_sk_generation(self):
        """PK/SK生成メソッドのテスト"""
        keyword = Keyword(text="Python")
        
        pk = keyword.generate_pk()
        sk = keyword.generate_sk()
        
        assert pk == f"KEYWORD#{keyword.keyword_id}"
        assert sk == "METADATA"
    
    def test_keyword_gsi1_generation(self):
        """GSI1キー生成メソッドのテスト"""
        keyword = Keyword(text="Python")
        
        gsi1_pk = keyword.generate_gsi1_pk()
        gsi1_sk = keyword.generate_gsi1_sk()
        
        assert gsi1_pk == "KEYWORD"
        assert gsi1_sk == f"KEYWORD#{keyword.keyword_id}"
    
    def test_keyword_activation_deactivation(self):
        """キーワードの有効化/無効化のテスト"""
        keyword = Keyword(text="Python")
        
        # 初期状態では有効
        assert keyword.is_active is True
        
        # 無効化
        keyword.deactivate()
        assert keyword.is_active is False
        assert keyword.updated_at is not None
        
        # 有効化
        keyword.activate()
        assert keyword.is_active is True
    
    def test_keyword_weight_update(self):
        """重み更新のテスト"""
        keyword = Keyword(text="Python", weight=1.0)
        
        # 重みを更新
        keyword.update_weight(2.5)
        assert keyword.weight == 2.5
        assert keyword.updated_at is not None
        
        # 無効な重みはエラー
        with pytest.raises(ValueError):
            keyword.update_weight(0.0)
        
        with pytest.raises(ValueError):
            keyword.update_weight(-1.0)
        
        with pytest.raises(ValueError):
            keyword.update_weight(11.0)
    
    def test_keyword_text_update(self):
        """キーワードテキスト更新のテスト"""
        keyword = Keyword(text="Python")
        
        # テキストを更新
        keyword.update_text("JavaScript")
        assert keyword.text == "JavaScript"
        assert keyword.updated_at is not None
    
    def test_keyword_text_validation(self):
        """キーワードテキストのバリデーションテスト"""
        # 空のテキストはエラー
        with pytest.raises(ValidationError):
            Keyword(text="")
        
        # 空白のみのテキストはエラー
        with pytest.raises(ValidationError):
            Keyword(text="   ")
        
        # 長すぎるテキストはエラー
        with pytest.raises(ValidationError):
            Keyword(text="a" * 101)
        
        # 改行文字は除去される
        keyword = Keyword(text="Python\nJavaScript")
        assert keyword.text == "Python JavaScript"
        
        # 連続する空白は単一の空白に変換される
        keyword = Keyword(text="Python    JavaScript")
        assert keyword.text == "Python JavaScript"
    
    def test_keyword_weight_validation(self):
        """重みのバリデーションテスト"""
        # 0以下の重みはエラー
        with pytest.raises(ValidationError):
            Keyword(text="Python", weight=0.0)
        
        with pytest.raises(ValidationError):
            Keyword(text="Python", weight=-1.0)
        
        # 10.0を超える重みはエラー
        with pytest.raises(ValidationError):
            Keyword(text="Python", weight=10.1)


class TestImportanceReasonModel:
    """ImportanceReasonモデルのユニットテスト"""
    
    def test_importance_reason_creation(self):
        """重要度理由の作成テスト"""
        reason = ImportanceReason(
            article_id="article-123",
            keyword_id="keyword-456",
            keyword_text="Python",
            similarity_score=0.8,
            contribution=1.2
        )
        
        assert reason.article_id == "article-123"
        assert reason.keyword_id == "keyword-456"
        assert reason.keyword_text == "Python"
        assert reason.similarity_score == 0.8
        assert reason.contribution == 1.2
    
    def test_importance_reason_creation_from_calculation(self):
        """重要度計算結果からの作成テスト"""
        reason = ImportanceReason.create_from_calculation(
            article_id="article-123",
            keyword_id="keyword-456",
            keyword_text="Python",
            similarity_score=0.8,
            weight=1.5
        )
        
        assert reason.article_id == "article-123"
        assert reason.keyword_id == "keyword-456"
        assert reason.keyword_text == "Python"
        assert reason.similarity_score == 0.8
        assert reason.contribution == 0.8 * 1.5  # similarity_score * weight
    
    def test_importance_reason_pk_sk_generation(self):
        """PK/SK生成メソッドのテスト"""
        reason = ImportanceReason(
            article_id="article-123",
            keyword_id="keyword-456",
            keyword_text="Python",
            similarity_score=0.8,
            contribution=1.2
        )
        
        pk = reason.generate_pk()
        sk = reason.generate_sk()
        
        assert pk == "ARTICLE#article-123"
        assert sk == "REASON#keyword-456"
    
    def test_importance_reason_weight_calculation(self):
        """重み逆算のテスト"""
        reason = ImportanceReason.create_from_calculation(
            article_id="article-123",
            keyword_id="keyword-456",
            keyword_text="Python",
            similarity_score=0.8,
            weight=1.5
        )
        
        # 重みを逆算
        calculated_weight = reason.get_weight_from_contribution()
        assert abs(calculated_weight - 1.5) < 1e-10
        
        # 類似度が0の場合は0を返す
        reason_zero = ImportanceReason(
            article_id="article-123",
            keyword_id="keyword-456",
            keyword_text="Python",
            similarity_score=0.0,
            contribution=0.0
        )
        assert reason_zero.get_weight_from_contribution() == 0.0
    
    def test_importance_reason_validation_errors(self):
        """重要度理由のバリデーションエラーテスト"""
        # 空のIDはエラー
        with pytest.raises(ValidationError):
            ImportanceReason(
                article_id="",
                keyword_id="keyword-456",
                keyword_text="Python",
                similarity_score=0.8,
                contribution=1.2
            )
        
        # 無効な類似度スコアはエラー
        with pytest.raises(ValidationError):
            ImportanceReason(
                article_id="article-123",
                keyword_id="keyword-456",
                keyword_text="Python",
                similarity_score=-0.1,
                contribution=1.2
            )
        
        with pytest.raises(ValidationError):
            ImportanceReason(
                article_id="article-123",
                keyword_id="keyword-456",
                keyword_text="Python",
                similarity_score=1.1,
                contribution=1.2
            )
        
        # 負の寄与度はエラー
        with pytest.raises(ValidationError):
            ImportanceReason(
                article_id="article-123",
                keyword_id="keyword-456",
                keyword_text="Python",
                similarity_score=0.8,
                contribution=-0.1
            )
        
        # 過大な寄与度はエラー
        with pytest.raises(ValidationError):
            ImportanceReason(
                article_id="article-123",
                keyword_id="keyword-456",
                keyword_text="Python",
                similarity_score=0.8,
                contribution=10.1
            )


class TestLinkIndexModel:
    """LinkIndexモデルのユニットテスト"""
    
    def test_link_index_creation(self):
        """リンクインデックスの作成テスト"""
        link_index = LinkIndex.create_from_article(
            "https://example.com/article",
            "article-123"
        )
        
        assert str(link_index.link) == "https://example.com/article"
        assert link_index.article_id == "article-123"
        assert link_index.url_hash
        assert len(link_index.url_hash) == 64  # SHA-256は64文字
    
    def test_link_index_hash_generation(self):
        """URLハッシュ生成のテスト"""
        # 同じURLからは同じハッシュが生成される
        hash1 = LinkIndex.generate_hash_from_url("https://example.com/article")
        hash2 = LinkIndex.generate_hash_from_url("https://example.com/article")
        assert hash1 == hash2
        
        # 末尾のスラッシュは正規化される
        hash3 = LinkIndex.generate_hash_from_url("https://example.com/article/")
        assert hash1 == hash3
        
        # 大文字小文字は正規化される
        hash4 = LinkIndex.generate_hash_from_url("HTTPS://EXAMPLE.COM/ARTICLE")
        assert hash1 == hash4
    
    def test_link_index_pk_generation(self):
        """PK生成メソッドのテスト"""
        link_index = LinkIndex.create_from_article(
            "https://example.com/article",
            "article-123"
        )
        
        pk = link_index.generate_pk()
        assert pk == f"LINK#{link_index.url_hash}"
    
    def test_link_index_duplicate_detection(self):
        """重複検出のテスト"""
        link_index = LinkIndex.create_from_article(
            "https://example.com/article",
            "article-123"
        )
        
        # 同じURLは重複として検出される
        assert link_index.is_duplicate_of("https://example.com/article")
        assert link_index.is_duplicate_of("https://example.com/article/")  # 末尾スラッシュ
        assert link_index.is_duplicate_of("HTTPS://EXAMPLE.COM/ARTICLE")  # 大文字小文字
        
        # 異なるURLは重複として検出されない
        assert not link_index.is_duplicate_of("https://example.com/other-article")
    
    def test_link_index_normalized_url(self):
        """正規化URL取得のテスト"""
        link_index = LinkIndex.create_from_article(
            "HTTPS://EXAMPLE.COM/ARTICLE/",
            "article-123"
        )
        
        normalized = link_index.get_normalized_url()
        assert normalized == "https://example.com/article"
    
    def test_link_index_validation_errors(self):
        """リンクインデックスのバリデーションエラーテスト"""
        # 空の記事IDはエラー
        with pytest.raises(ValidationError):
            LinkIndex(
                link="https://example.com/article",
                article_id=""
            )