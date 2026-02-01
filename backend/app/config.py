"""
アプリケーション設定

環境変数とデフォルト値を一元管理します。
"""

import logging
import os

import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)


class Settings:
    """アプリケーション設定クラス"""

    # DynamoDB設定
    DYNAMODB_TABLE_NAME: str = os.getenv("DYNAMODB_TABLE_NAME", "rss-reader")
    DYNAMODB_REGION: str = os.getenv("AWS_REGION", "ap-northeast-1")
    DYNAMODB_ENDPOINT_URL: str | None = os.getenv("DYNAMODB_ENDPOINT_URL")

    # AWS Bedrock設定
    # Nova 2 multimodal embeddings is only available in us-east-1
    BEDROCK_REGION: str = os.getenv("BEDROCK_REGION", "us-east-1")
    BEDROCK_MODEL_ID: str = os.getenv(
        "BEDROCK_MODEL_ID", "amazon.nova-2-multimodal-embeddings-v1:0"
    )
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "1024"))
    KEYWORD_EMBEDDING_CACHE_SIZE: int = int(
        os.getenv("KEYWORD_EMBEDDING_CACHE_SIZE", "100")
    )

    # API設定
    API_KEY_PARAMETER_NAME: str | None = None
    API_KEY: str | None = None

    # ログ設定
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # TTL設定（日数）
    DEFAULT_ARTICLE_TTL_DAYS: int = int(
        os.getenv("DEFAULT_ARTICLE_TTL_DAYS", "30")
    )

    # バッチ処理設定
    BATCH_SIZE: int = int(
        os.getenv("BATCH_SIZE", "25")
    )  # DynamoDBのバッチ書き込み上限

    def __init__(self) -> None:
        self.API_KEY = self._load_api_key()

    @classmethod
    def get_table_name(cls) -> str:
        """DynamoDBテーブル名を取得"""
        return cls.DYNAMODB_TABLE_NAME

    @classmethod
    def get_region(cls) -> str:
        """AWSリージョンを取得"""
        return cls.DYNAMODB_REGION

    @classmethod
    def _load_api_key(cls) -> str | None:
        parameter_name = os.getenv("RSS_READER_API_KEY_PARAMETER_NAME")
        if not parameter_name:
            environment = os.getenv("ENVIRONMENT", "development")
            parameter_name = f"/rss-reader/{environment}/api-key"
        if not parameter_name:
            logger.error("API KeyのParameter名が設定されていません")
            return None

        try:
            client = boto3.client(
                "ssm",
                region_name=cls.DYNAMODB_REGION,
            )
            response = client.get_parameter(
                Name=parameter_name, WithDecryption=True
            )
        except (BotoCoreError, ClientError) as exc:
            logger.error(
                "Parameter StoreからAPI Keyの取得に失敗しました",
                exc_info=exc,
            )
            return None

        parameter = response.get("Parameter")
        if not parameter:
            logger.error("Parameter StoreのAPI Keyが見つかりません")
            return None

        value = parameter.get("Value")
        if not value:
            logger.error("Parameter StoreのAPI Keyが空です")
            return None

        return value

    @classmethod
    def get_dynamodb_endpoint_url(cls) -> str | None:
        """DynamoDBエンドポイントURLを取得（ローカル用）"""
        return cls.DYNAMODB_ENDPOINT_URL


# グローバル設定インスタンス
settings = Settings()
