"""
重要度理由モデル

記事の重要度スコア計算の根拠となるキーワードとの関連性を記録するデータモデル。
"""

from typing import Dict
from pydantic import Field, field_validator
from .base import BaseModel


class ImportanceReason(BaseModel):
    """
    重要度理由エンティティ
    
    記事とキーワードの関連性を記録し、重要度スコア計算の根拠を提供します。
    
    Attributes:
        article_id: 関連する記事のID
        keyword_id: 関連するキーワードのID
        keyword_text: キーワードのテキスト（検索用）
        similarity_score: セマンティック類似度スコア（0.0～1.0）
        contribution: 重要度スコアへの寄与度（similarity_score * weight）
    """
    
    article_id: str
    keyword_id: str
    keyword_text: str
    similarity_score: float
    contribution: float
    
    @field_validator('article_id', 'keyword_id')
    @classmethod
    def validate_ids(cls, v: str) -> str:
        """
        IDのバリデーション
        
        Args:
            v: ID文字列
            
        Returns:
            str: バリデーション済みID
        """
        if not v or not v.strip():
            raise ValueError("ID cannot be empty")
        
        return v.strip()
    
    @field_validator('keyword_text')
    @classmethod
    def validate_keyword_text(cls, v: str) -> str:
        """
        キーワードテキストのバリデーション
        
        Args:
            v: キーワードテキスト
            
        Returns:
            str: バリデーション済みキーワードテキスト
        """
        if not v or not v.strip():
            raise ValueError("Keyword text cannot be empty")
        
        # 長さ制限（100文字以内）
        if len(v) > 100:
            raise ValueError("Keyword text must be 100 characters or less")
        
        return v.strip()
    
    @field_validator('similarity_score')
    @classmethod
    def validate_similarity_score(cls, v: float) -> float:
        """
        類似度スコアのバリデーション
        
        Args:
            v: 類似度スコア
            
        Returns:
            float: バリデーション済み類似度スコア
        """
        if v < 0.0 or v > 1.0:
            raise ValueError("Similarity score must be between 0.0 and 1.0")
        
        return v
    
    @field_validator('contribution')
    @classmethod
    def validate_contribution(cls, v: float) -> float:
        """
        寄与度のバリデーション
        
        Args:
            v: 寄与度
            
        Returns:
            float: バリデーション済み寄与度
        """
        if v < 0.0:
            raise ValueError("Contribution must be non-negative")
        
        # 寄与度の上限チェック（重み10.0 * 類似度1.0 = 10.0）
        if v > 10.0:
            raise ValueError("Contribution must be 10.0 or less")
        
        return v
    
    def generate_pk(self) -> str:
        """
        プライマリキーを生成
        
        Returns:
            str: "ARTICLE#{article_id}" 形式のプライマリキー
        """
        return f"ARTICLE#{self.article_id}"
    
    def generate_sk(self) -> str:
        """
        ソートキーを生成
        
        Returns:
            str: "REASON#{keyword_id}" 形式のソートキー
        """
        return f"REASON#{self.keyword_id}"
    
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
            "EntityType": "ImportanceReason",
        })
        
        return item
    
    @classmethod
    def create_from_calculation(
        cls,
        article_id: str,
        keyword_id: str,
        keyword_text: str,
        similarity_score: float,
        weight: float
    ) -> "ImportanceReason":
        """
        重要度計算結果から ImportanceReason を作成
        
        Args:
            article_id: 記事ID
            keyword_id: キーワードID
            keyword_text: キーワードテキスト
            similarity_score: セマンティック類似度スコア
            weight: キーワードの重み
            
        Returns:
            ImportanceReason: 作成されたインスタンス
        """
        contribution = similarity_score * weight
        
        return cls(
            article_id=article_id,
            keyword_id=keyword_id,
            keyword_text=keyword_text,
            similarity_score=similarity_score,
            contribution=contribution
        )
    
    def get_weighted_score(self) -> float:
        """
        重み付きスコアを取得（contributionと同じ）
        
        Returns:
            float: 重み付きスコア
        """
        return self.contribution
    
    def get_weight_from_contribution(self) -> float:
        """
        寄与度から重みを逆算
        
        Returns:
            float: 推定された重み値
        """
        if self.similarity_score == 0.0:
            return 0.0
        
        return self.contribution / self.similarity_score