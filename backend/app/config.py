"""
アプリケーション設定

環境変数とデフォルト値を一元管理します。
"""

import os
from typing import Optional


class Settings:
    """アプリケーション設定クラス"""
    
    # DynamoDB設定
    DYNAMODB_TABLE_NAME: str = os.getenv('DYNAMODB_TABLE_NAME', 'rss-reader')
    DYNAMODB_REGION: str = os.getenv('AWS_REGION', 'us-east-1')
    
    # AWS Bedrock設定
    BEDROCK_REGION: str = os.getenv('BEDROCK_REGION', 'us-east-1')
    BEDROCK_MODEL_ID: str = os.getenv(
        'BEDROCK_MODEL_ID',
        'amazon.nova-2-multimodal-embeddings-v1:0'
    )
    EMBEDDING_DIMENSION: int = int(os.getenv('EMBEDDING_DIMENSION', '1024'))
    
    # API設定
    API_KEY: Optional[str] = os.getenv('RSS_READER_API_KEY')
    
    # ログ設定
    LOG_LEVEL: str = os.getenv('LOG_LEVEL', 'INFO')
    
    # TTL設定（日数）
    DEFAULT_ARTICLE_TTL_DAYS: int = int(os.getenv('DEFAULT_ARTICLE_TTL_DAYS', '30'))
    
    # バッチ処理設定
    BATCH_SIZE: int = int(os.getenv('BATCH_SIZE', '25'))  # DynamoDBのバッチ書き込み上限
    
    @classmethod
    def get_table_name(cls) -> str:
        """DynamoDBテーブル名を取得"""
        return cls.DYNAMODB_TABLE_NAME
    
    @classmethod
    def get_region(cls) -> str:
        """AWSリージョンを取得"""
        return cls.DYNAMODB_REGION


# グローバル設定インスタンス
settings = Settings()