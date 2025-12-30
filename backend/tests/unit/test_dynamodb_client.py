"""
DynamoDBクライアントのユニットテスト

基本的なCRUD操作、GSIクエリ、エラーハンドリング、
バッチ操作の動作を検証します。
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from app.utils.dynamodb_client import DynamoDBClient


class TestDynamoDBClient:
    """DynamoDBクライアントのユニットテスト"""

    @pytest.fixture
    def mock_table(self):
        """モックテーブルのフィクスチャ"""
        mock_table = MagicMock()
        mock_table.table_name = "test-table"
        return mock_table

    @pytest.fixture
    def client(self, mock_table):
        """DynamoDBクライアントのフィクスチャ"""
        with patch(
            "app.utils.dynamodb_client.boto3.resource"
        ) as mock_resource:
            mock_dynamodb = MagicMock()
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            client = DynamoDBClient("test-table")
            client.table = mock_table
            return client

    def test_client_initialization(self):
        """クライアント初期化のテスト"""
        with patch(
            "app.utils.dynamodb_client.boto3.resource"
        ) as mock_resource:
            mock_dynamodb = MagicMock()
            mock_table = MagicMock()
            mock_table.table_name = "test-table"
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            client = DynamoDBClient("test-table")

            assert client.table_name == "test-table"
            mock_resource.assert_called_once_with(
                "dynamodb", region_name="ap-northeast-1"
            )
            mock_dynamodb.Table.assert_called_once_with("test-table")

    def test_client_initialization_with_env_var(self):
        """環境変数からのクライアント初期化テスト"""
        with (
            patch("app.utils.dynamodb_client.settings") as mock_settings,
            patch("app.utils.dynamodb_client.boto3.resource") as mock_resource,
        ):
            mock_settings.get_table_name.return_value = "env-table"
            mock_settings.get_region.return_value = "us-west-2"
            mock_dynamodb = MagicMock()
            mock_table = MagicMock()
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            client = DynamoDBClient()

            assert client.table_name == "env-table"
            mock_resource.assert_called_once_with(
                "dynamodb", region_name="us-west-2"
            )

    def test_put_item_success(self, client, mock_table):
        """アイテム保存の成功テスト"""
        item = {"PK": "TEST#123", "SK": "METADATA", "data": "test data"}

        client.put_item(item)

        mock_table.put_item.assert_called_once_with(Item=item)

    def test_put_item_error(self, client, mock_table):
        """アイテム保存のエラーテスト"""
        item = {"PK": "TEST#123", "SK": "METADATA"}
        error = ClientError(
            error_response={"Error": {"Code": "ValidationException"}},
            operation_name="PutItem",
        )
        mock_table.put_item.side_effect = error

        with pytest.raises(ClientError):
            client.put_item(item)

    def test_get_item_success(self, client, mock_table):
        """アイテム取得の成功テスト"""
        expected_item = {
            "PK": "TEST#123",
            "SK": "METADATA",
            "data": "test data",
        }
        mock_table.get_item.return_value = {"Item": expected_item}

        result = client.get_item("TEST#123", "METADATA")

        assert result == expected_item
        mock_table.get_item.assert_called_once_with(
            Key={"PK": "TEST#123", "SK": "METADATA"}
        )

    def test_get_item_not_found(self, client, mock_table):
        """アイテム取得の未発見テスト"""
        mock_table.get_item.return_value = {}

        result = client.get_item("TEST#123", "METADATA")

        assert result is None

    def test_get_item_error(self, client, mock_table):
        """アイテム取得のエラーテスト"""
        error = ClientError(
            error_response={"Error": {"Code": "ResourceNotFoundException"}},
            operation_name="GetItem",
        )
        mock_table.get_item.side_effect = error

        with pytest.raises(ClientError):
            client.get_item("TEST#123", "METADATA")

    def test_query_success(self, client, mock_table):
        """クエリの成功テスト"""
        expected_items = [
            {"PK": "TEST#123", "SK": "ITEM#1"},
            {"PK": "TEST#123", "SK": "ITEM#2"},
        ]
        mock_table.query.return_value = {
            "Items": expected_items,
            "LastEvaluatedKey": {"PK": "TEST#123", "SK": "ITEM#2"},
        }

        from boto3.dynamodb.conditions import Key

        key_condition = Key("PK").eq("TEST#123")

        items, last_key = client.query(key_condition)

        assert items == expected_items
        assert last_key == {"PK": "TEST#123", "SK": "ITEM#2"}
        mock_table.query.assert_called_once()

    def test_query_with_gsi(self, client, mock_table):
        """GSIを使用したクエリのテスト"""
        expected_items = [
            {"GSI1PK": "ARTICLE", "GSI1SK": "2024-01-01T00:00:00Z"}
        ]
        mock_table.query.return_value = {"Items": expected_items}

        from boto3.dynamodb.conditions import Key

        key_condition = Key("GSI1PK").eq("ARTICLE")

        items, _ = client.query(key_condition, index_name="GSI1")

        assert items == expected_items
        # クエリパラメータにIndexNameが含まれていることを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI1"

    def test_delete_item_success(self, client, mock_table):
        """アイテム削除の成功テスト"""
        client.delete_item("TEST#123", "METADATA")

        mock_table.delete_item.assert_called_once_with(
            Key={"PK": "TEST#123", "SK": "METADATA"}
        )

    def test_delete_item_error(self, client, mock_table):
        """アイテム削除のエラーテスト"""
        error = ClientError(
            error_response={
                "Error": {"Code": "ConditionalCheckFailedException"}
            },
            operation_name="DeleteItem",
        )
        mock_table.delete_item.side_effect = error

        with pytest.raises(ClientError):
            client.delete_item("TEST#123", "METADATA")

    def test_batch_write_item_success(self, client, mock_table):
        """バッチ書き込みの成功テスト"""
        items = [
            {"PK": "TEST#1", "SK": "METADATA"},
            {"PK": "TEST#2", "SK": "METADATA"},
        ]
        delete_keys = [{"PK": "TEST#3", "SK": "METADATA"}]

        # batch_writerのモックを設定
        mock_batch = MagicMock()
        mock_table.batch_writer.return_value.__enter__.return_value = (
            mock_batch
        )

        client.batch_write_item(items, delete_keys)

        # put_itemが各アイテムに対して呼ばれることを確認
        assert mock_batch.put_item.call_count == 2
        mock_batch.put_item.assert_any_call(Item=items[0])
        mock_batch.put_item.assert_any_call(Item=items[1])

        # delete_itemが各キーに対して呼ばれることを確認
        mock_batch.delete_item.assert_called_once_with(Key=delete_keys[0])

    def test_query_articles_by_published_date(self, client, mock_table):
        """公開日時による記事クエリのテスト"""
        expected_items = [
            {"PK": "ARTICLE#123", "published_at": "2024-01-01T00:00:00Z"}
        ]
        mock_table.query.return_value = {"Items": expected_items}

        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 1, 31)

        items, _ = client.query_articles_by_published_date(
            start_date=start_date, end_date=end_date, limit=10, descending=True
        )

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI1"
        assert call_args["ScanIndexForward"] is False  # 降順
        assert call_args["Limit"] == 10

    def test_query_feeds(self, client, mock_table):
        """フィード一覧クエリのテスト"""
        expected_items = [{"PK": "FEED#123", "title": "Test Feed"}]
        mock_table.query.return_value = {"Items": expected_items}

        items, _ = client.query_feeds(limit=20)

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI1"
        assert call_args["Limit"] == 20

    def test_query_keywords(self, client, mock_table):
        """キーワード一覧クエリのテスト"""
        expected_items = [{"PK": "KEYWORD#123", "text": "Python"}]
        mock_table.query.return_value = {"Items": expected_items}

        items, _ = client.query_keywords()

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI1"

    def test_query_articles_by_importance_score(self, client, mock_table):
        """重要度スコアによる記事クエリのテスト"""
        expected_items = [{"PK": "ARTICLE#123", "importance_score": 0.8}]
        mock_table.query.return_value = {"Items": expected_items}

        items, _ = client.query_articles_by_importance_score(
            min_score=0.5, max_score=1.0, limit=10
        )

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI2"
        assert (
            call_args["ScanIndexForward"] is True
        )  # 昇順（逆順ソートキーのため）
        assert call_args["Limit"] == 10

    def test_query_articles_for_deletion_by_age(self, client, mock_table):
        """古い記事の削除クエリのテスト"""
        expected_items = [
            {"PK": "ARTICLE#123", "created_at": "2024-01-01T00:00:00Z"}
        ]
        mock_table.query.return_value = {
            "Items": expected_items,
            "LastEvaluatedKey": None,
        }

        cutoff_date = datetime(2024, 1, 8)  # 7日前
        items = client.query_articles_for_deletion_by_age(
            cutoff_date, limit=50
        )

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI3"
        assert call_args["Limit"] == 50

    def test_query_read_articles_for_deletion(self, client, mock_table):
        """既読記事の削除クエリのテスト"""
        expected_items = [{"PK": "ARTICLE#123", "is_read": True}]
        mock_table.query.return_value = {
            "Items": expected_items,
            "LastEvaluatedKey": None,
        }

        cutoff_datetime = datetime.now() - timedelta(days=1)
        items = client.query_read_articles_for_deletion(
            cutoff_datetime, limit=50
        )

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI4"
        assert call_args["Limit"] == 50

    def test_query_articles_by_feed_id(self, client, mock_table):
        """フィード別記事クエリのテスト（カスケード削除用）"""
        expected_items = [{"PK": "ARTICLE#123", "feed_id": "feed-456"}]
        mock_table.query.return_value = {
            "Items": expected_items,
            "LastEvaluatedKey": None,
        }

        items, _ = client.query_articles_by_feed_id("feed-456", limit=100)

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI5"
        assert call_args["Limit"] == 100

    def test_query_importance_reasons_for_article(self, client, mock_table):
        """記事の重要度理由クエリのテスト"""
        expected_items = [
            {"PK": "ARTICLE#123", "SK": "REASON#keyword1"},
            {"PK": "ARTICLE#123", "SK": "REASON#keyword2"},
        ]
        mock_table.query.return_value = {
            "Items": expected_items,
            "LastEvaluatedKey": None,
        }

        items = client.query_importance_reasons_for_article("123")

        assert items == expected_items

        # KeyConditionExpressionが正しく設定されていることを確認
        mock_table.query.assert_called_once()

    def test_delete_importance_reasons_for_article(self, client, mock_table):
        """記事の重要度理由削除のテスト"""
        # まずクエリの結果をモック
        reasons = [
            {"PK": "ARTICLE#123", "SK": "REASON#keyword1"},
            {"PK": "ARTICLE#123", "SK": "REASON#keyword2"},
        ]
        mock_table.query.return_value = {
            "Items": reasons,
            "LastEvaluatedKey": None,
        }

        # batch_writerのモックを設定
        mock_batch = MagicMock()
        mock_table.batch_writer.return_value.__enter__.return_value = (
            mock_batch
        )

        deleted_count = client.delete_importance_reasons_for_article("123")

        assert deleted_count == 2

        # delete_itemが各理由に対して呼ばれることを確認
        assert mock_batch.delete_item.call_count == 2
        mock_batch.delete_item.assert_any_call(
            Key={"PK": "ARTICLE#123", "SK": "REASON#keyword1"}
        )
        mock_batch.delete_item.assert_any_call(
            Key={"PK": "ARTICLE#123", "SK": "REASON#keyword2"}
        )

    def test_delete_importance_reasons_for_article_no_reasons(
        self, client, mock_table
    ):
        """重要度理由が存在しない場合の削除テスト"""
        mock_table.query.return_value = {"Items": [], "LastEvaluatedKey": None}

        deleted_count = client.delete_importance_reasons_for_article("123")

        assert deleted_count == 0

    def test_query_articles_with_filters_by_published_date(
        self, client, mock_table
    ):
        """フィルタ付き記事クエリのテスト（公開日時順）"""
        expected_items = [{"PK": "ARTICLE#123", "is_read": False}]
        mock_table.query.return_value = {
            "Items": expected_items,
            "LastEvaluatedKey": None,
        }

        items, _ = client.query_articles_with_filters(
            sort_by="published_at", filter_by="unread", limit=10
        )

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI1"
        assert call_args["ScanIndexForward"] is False  # 降順
        assert call_args["Limit"] == 10
        assert "FilterExpression" in call_args

    def test_query_articles_with_filters_by_importance_score(
        self, client, mock_table
    ):
        """フィルタ付き記事クエリのテスト（重要度順）"""
        expected_items = [{"PK": "ARTICLE#123", "is_saved": True}]
        mock_table.query.return_value = {
            "Items": expected_items,
            "LastEvaluatedKey": None,
        }

        items, _ = client.query_articles_with_filters(
            sort_by="importance_score", filter_by="saved", limit=10
        )

        assert items == expected_items

        # クエリパラメータを確認
        call_args = mock_table.query.call_args[1]
        assert call_args["IndexName"] == "GSI2"
        assert (
            call_args["ScanIndexForward"] is True
        )  # 昇順（逆順ソートキーのため）
        assert call_args["Limit"] == 10
        assert "FilterExpression" in call_args

    def test_generate_reverse_sort_key(self, client):
        """逆順ソートキー生成のテスト"""
        # テストケース
        test_cases = [
            (0.0, "1000000.000000"),
            (0.5, "500000.000000"),
            (0.85, "150000.000000"),
            (1.0, "000000.000000"),
        ]

        for score, expected in test_cases:
            result = client._generate_reverse_sort_key(score)
            assert result == expected, (
                f"Score {score} should generate {expected}, got {result}"
            )

    def test_generate_reverse_sort_key_invalid_score(self, client):
        """無効なスコアでの逆順ソートキー生成エラーテスト"""
        with pytest.raises(ValueError):
            client._generate_reverse_sort_key(-0.1)

        with pytest.raises(ValueError):
            client._generate_reverse_sort_key(1.1)

    def test_health_check_success(self, client, mock_table):
        """ヘルスチェック成功のテスト"""
        mock_table.load.return_value = None  # 正常な場合

        result = client.health_check()

        assert result is True
        mock_table.load.assert_called_once()

    def test_health_check_failure(self, client, mock_table):
        """ヘルスチェック失敗のテスト"""
        error = ClientError(
            error_response={"Error": {"Code": "ResourceNotFoundException"}},
            operation_name="DescribeTable",
        )
        mock_table.load.side_effect = error

        result = client.health_check()

        assert result is False
        mock_table.load.assert_called_once()


class TestDynamoDBClientErrorHandling:
    """DynamoDBクライアントのエラーハンドリングテスト"""

    @pytest.fixture
    def client_with_error_table(self):
        """エラーを発生させるテーブルを持つクライアント"""
        with patch(
            "app.utils.dynamodb_client.boto3.resource"
        ) as mock_resource:
            mock_dynamodb = MagicMock()
            mock_table = MagicMock()
            mock_dynamodb.Table.return_value = mock_table
            mock_resource.return_value = mock_dynamodb

            client = DynamoDBClient("test-table")
            client.table = mock_table
            return client, mock_table

    def test_put_item_throttling_error(self, client_with_error_table):
        """スロットリングエラーのテスト"""
        client, mock_table = client_with_error_table

        error = ClientError(
            error_response={
                "Error": {"Code": "ProvisionedThroughputExceededException"}
            },
            operation_name="PutItem",
        )
        mock_table.put_item.side_effect = error

        with pytest.raises(ClientError) as exc_info:
            client.put_item({"PK": "TEST", "SK": "TEST"})

        assert (
            exc_info.value.response["Error"]["Code"]
            == "ProvisionedThroughputExceededException"
        )

    def test_query_validation_error(self, client_with_error_table):
        """クエリのバリデーションエラーテスト"""
        client, mock_table = client_with_error_table

        error = ClientError(
            error_response={"Error": {"Code": "ValidationException"}},
            operation_name="Query",
        )
        mock_table.query.side_effect = error

        from boto3.dynamodb.conditions import Key

        key_condition = Key("PK").eq("TEST")

        with pytest.raises(ClientError) as exc_info:
            client.query(key_condition)

        assert (
            exc_info.value.response["Error"]["Code"] == "ValidationException"
        )

    def test_batch_write_partial_failure(self, client_with_error_table):
        """バッチ書き込みの部分的失敗テスト"""
        client, mock_table = client_with_error_table

        # batch_writerでエラーが発生する場合
        error = ClientError(
            error_response={"Error": {"Code": "ValidationException"}},
            operation_name="BatchWriteItem",
        )

        mock_batch = MagicMock()
        mock_batch.put_item.side_effect = error
        mock_table.batch_writer.return_value.__enter__.return_value = (
            mock_batch
        )

        items = [{"PK": "TEST#1", "SK": "METADATA"}]

        with pytest.raises(ClientError):
            client.batch_write_item(items)
