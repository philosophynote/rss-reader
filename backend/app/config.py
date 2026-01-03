"""
アプリケーション設定

環境変数とデフォルト値を一元管理します。
"""

import base64
import json
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
    API_KEY_SECRET_ID: str | None = os.getenv("RSS_READER_API_KEY_SECRET_ID")
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
        api_key = os.getenv("RSS_READER_API_KEY")
        if api_key:
            return api_key

        secret_id = os.getenv("RSS_READER_API_KEY_SECRET_ID")
        if not secret_id:
            return None

        try:
            client = boto3.client(
                "secretsmanager",
                region_name=cls.DYNAMODB_REGION,
            )
            response = client.get_secret_value(SecretId=secret_id)
        except (BotoCoreError, ClientError) as exc:
            logger.error(
                "Secrets ManagerからAPI Keyの取得に失敗しました",
                exc_info=exc,
            )
            return None

        secret_value = response.get("SecretString")
        if not secret_value and "SecretBinary" in response:
            secret_value = base64.b64decode(response["SecretBinary"]).decode(
                "utf-8"
            )

        if not secret_value:
            logger.error("Secrets ManagerのAPI Keyが空です")
            return None

        try:
            parsed = json.loads(secret_value)
        except json.JSONDecodeError:
            return secret_value

        return (
            parsed.get("api_key")
            or parsed.get("RSS_READER_API_KEY")
            or secret_value
        )


# グローバル設定インスタンス
settings = Settings()
