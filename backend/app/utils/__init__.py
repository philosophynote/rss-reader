"""
ユーティリティパッケージ

システム全体で使用される共通機能を提供します。
"""

from .dynamodb_client import DynamoDBClient

__all__ = [
    "DynamoDBClient",
]