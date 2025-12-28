"""
キーワードモデル

重要度判定に使用するキーワードの情報を管理するデータモデル。
"""

from typing import Dict
from pydantic import Field, field_validator
from uuid import uuid4
from .base import BaseModel


class Keyword(BaseModel):
    """
    キーワードエンティティ
    
    Attributes:
        keyword_id: キーワードの一意識別子
        text: キーワードのテキスト
        weight: キーワードの重み（デフォルト: 1.0）
        is_active: キーワードが有効かどうか
    """
    
    keyword_id: str = Field(default_factory=lambda: str(uuid4()))
    text: str
    weight: float = 1.0
    is_active: bool = True
    
    @staticmethod
    def _normalize_text(text: str) -> str:
        """
        テキストの正規化処理
        
        Args:
            text: 正規化するテキスト
            
        Returns:
            str: 正規化されたテキスト
        """
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        
        # 前後の空白を除去
        text = text.strip()
        
        # 改行文字を除去
        text = text.replace('\n', ' ').replace('\r', ' ')
        
        # 連続する空白を単一の空白に変換
        import re
        text = re.sub(r'\s+', ' ', text)
        
        return text
    
    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        """
        キーワードテキストのバリデーション
        
        Args:
            v: キーワードテキスト
            
        Returns:
            str: バリデーション済みキーワードテキスト
        """
        # 共通の正規化処理を使用
        text = cls._normalize_text(v)
        
        # 長さ制限（100文字以内）
        if len(text) > 100:
            raise ValueError("Keyword text must be 100 characters or less")
        
        return text
    
    @field_validator('weight')
    @classmethod
    def validate_weight(cls, v: float) -> float:
        """
        重みのバリデーション
        
        Args:
            v: 重み
            
        Returns:
            float: バリデーション済み重み
        """
        if v <= 0.0:
            raise ValueError("Weight must be greater than 0.0")
        
        if v > 10.0:
            raise ValueError("Weight must be 10.0 or less")
        
        return v
    
    def generate_pk(self) -> str:
        """
        プライマリキーを生成
        
        Returns:
            str: "KEYWORD#{keyword_id}" 形式のプライマリキー
        """
        return f"KEYWORD#{self.keyword_id}"
    
    def generate_sk(self) -> str:
        """
        ソートキーを生成
        
        Returns:
            str: "METADATA" 固定値
        """
        return "METADATA"
    
    def generate_gsi1_pk(self) -> str:
        """
        GSI1のパーティションキーを生成（キーワード一覧取得用）
        
        Returns:
            str: "KEYWORD" 固定値
        """
        return "KEYWORD"
    
    def generate_gsi1_sk(self) -> str:
        """
        GSI1のソートキーを生成（キーワード一覧取得用）
        
        Returns:
            str: "KEYWORD#{keyword_id}" 形式
        """
        return f"KEYWORD#{self.keyword_id}"
    
    def to_dynamodb_item(self) -> Dict:
        """
        DynamoDB用のアイテム形式に変換
        
        Returns:
            Dict: DynamoDBに保存可能な形式のデータ
        """
        item = super().to_dynamodb_item()
        
        # DynamoDB用のキーを追加
        item.update({
            "PK": self.generate_pk(),
            "SK": self.generate_sk(),
            "EntityType": "Keyword",
            "GSI1PK": self.generate_gsi1_pk(),
            "GSI1SK": self.generate_gsi1_sk(),
        })
        
        return item
    
    def activate(self) -> None:
        """
        キーワードを有効化
        """
        if not self.is_active:
            self.is_active = True
            self.update_timestamp()
    
    def deactivate(self) -> None:
        """
        キーワードを無効化
        """
        if self.is_active:
            self.is_active = False
            self.update_timestamp()
    
    def update_weight(self, new_weight: float) -> None:
        """
        重みを更新
        
        Args:
            new_weight: 新しい重み値
        """
        if new_weight <= 0.0:
            raise ValueError("Weight must be greater than 0.0")
        
        if new_weight > 10.0:
            raise ValueError("Weight must be 10.0 or less")
        
        self.weight = new_weight
        self.update_timestamp()
    
    def update_text(self, new_text: str) -> None:
        """
        キーワードテキストを更新
        
        Args:
            new_text: 新しいキーワードテキスト
        """
        # 共通の正規化処理を使用（バリデーションは@field_validatorで自動実行される）
        self.text = new_text
        self.update_timestamp()