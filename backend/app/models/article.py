"""
記事モデル

RSSフィードから取得した記事の情報を管理するデータモデル。
"""

from datetime import datetime
from typing import Optional, Dict
from pydantic import Field, HttpUrl, field_validator
from uuid import uuid4
from .base import BaseModel


class Article(BaseModel):
    """
    記事エンティティ
    
    Attributes:
        article_id: 記事の一意識別子
        feed_id: 記事が属するフィードのID
        link: 記事のURL
        title: 記事のタイトル
        content: 記事の本文
        published_at: 記事の公開日時
        is_read: 既読フラグ
        is_saved: 保存フラグ
        importance_score: 重要度スコア（0.0～1.0）
        read_at: 既読にした日時
        ttl: TTL（自動削除用のUnix timestamp）
    """
    
    article_id: str = Field(default_factory=lambda: str(uuid4()))
    feed_id: str
    link: HttpUrl
    title: str
    content: str = ""
    published_at: datetime
    is_read: bool = False
    is_saved: bool = False
    importance_score: float = 0.0
    read_at: Optional[datetime] = None
    ttl: Optional[int] = None
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v: str) -> str:
        """
        タイトルのバリデーション
        
        Args:
            v: タイトル
            
        Returns:
            str: バリデーション済みタイトル
        """
        if not v or not v.strip():
            raise ValueError("Title cannot be empty")
        
        # 長さ制限（500文字以内）
        if len(v) > 500:
            raise ValueError("Title must be 500 characters or less")
        
        return v.strip()
    
    @field_validator('content')
    @classmethod
    def validate_content(cls, v: str) -> str:
        """
        本文のバリデーション
        
        Args:
            v: 本文
            
        Returns:
            str: バリデーション済み本文
        """
        # 長さ制限（50,000文字以内）
        if len(v) > 50000:
            raise ValueError("Content must be 50,000 characters or less")
        
        return v
    
    @field_validator('importance_score')
    @classmethod
    def validate_importance_score(cls, v: float) -> float:
        """
        重要度スコアのバリデーション
        
        Args:
            v: 重要度スコア
            
        Returns:
            float: バリデーション済み重要度スコア
        """
        if v < 0.0 or v > 1.0:
            raise ValueError("Importance score must be between 0.0 and 1.0")
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
            str: "METADATA" 固定値
        """
        return "METADATA"
    
    def generate_gsi1_pk(self) -> str:
        """
        GSI1のパーティションキーを生成（時系列順ソート用）
        
        Returns:
            str: "ARTICLE" 固定値
        """
        return "ARTICLE"
    
    def generate_gsi1_sk(self) -> str:
        """
        GSI1のソートキーを生成（時系列順ソート用）
        
        Returns:
            str: 公開日時のISO形式文字列
        """
        return self.published_at.isoformat() + "Z"
    
    def generate_gsi2_pk(self) -> str:
        """
        GSI2のパーティションキーを生成（重要度順ソート用）
        
        Returns:
            str: "ARTICLE" 固定値
        """
        return "ARTICLE"
    
    def generate_gsi2_sk(self) -> str:
        """
        GSI2のソートキーを生成（重要度順ソート用）
        
        逆順ソートキーを使用して、昇順ソートで高スコア順を実現。
        
        Returns:
            str: ゼロパディングされた逆順ソートキー
        """
        return self.generate_reverse_sort_key(self.importance_score)
    
    def generate_gsi3_pk(self) -> str:
        """
        GSI3のパーティションキーを生成（削除クエリ用）
        
        Returns:
            str: "ARTICLE" 固定値
        """
        return "ARTICLE"
    
    def generate_gsi3_sk(self) -> str:
        """
        GSI3のソートキーを生成（削除クエリ用）
        
        Returns:
            str: 作成日時のISO形式文字列
        """
        return self.created_at.isoformat() + "Z"
    
    def generate_gsi4_pk(self) -> Optional[str]:
        """
        GSI4のパーティションキーを生成（既読記事削除用）
        
        既読記事の場合のみ設定される。
        
        Returns:
            Optional[str]: 既読の場合は "ARTICLE_READ"、未読の場合は None
        """
        return "ARTICLE_READ" if self.is_read else None
    
    def generate_gsi4_sk(self) -> Optional[str]:
        """
        GSI4のソートキーを生成（既読記事削除用）
        
        既読記事の場合のみ設定される。
        
        Returns:
            Optional[str]: 既読の場合は "true#{read_at}"、未読の場合は None
        """
        if self.is_read and self.read_at:
            return f"true#{self.read_at.isoformat()}Z"
        return None
    
    def generate_gsi5_pk(self) -> str:
        """
        GSI5のパーティションキーを生成（フィード別記事クエリ用）
        
        Returns:
            str: "FEED#{feed_id}" 形式
        """
        return f"FEED#{self.feed_id}"
    
    def generate_gsi5_sk(self) -> str:
        """
        GSI5のソートキーを生成（フィード別記事クエリ用）
        
        Returns:
            str: "ARTICLE#{article_id}" 形式
        """
        return f"ARTICLE#{self.article_id}"
    
    def set_ttl_for_article(self, days: int = 7) -> None:
        """
        記事用のTTLを設定
        
        Args:
            days: TTLの日数（デフォルト: 7日）
        """
        self.ttl = self.set_ttl(days)
    
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
            "EntityType": "Article",
            "GSI1PK": self.generate_gsi1_pk(),
            "GSI1SK": self.generate_gsi1_sk(),
            "GSI2PK": self.generate_gsi2_pk(),
            "GSI2SK": self.generate_gsi2_sk(),
            "GSI3PK": self.generate_gsi3_pk(),
            "GSI3SK": self.generate_gsi3_sk(),
            "GSI5PK": self.generate_gsi5_pk(),
            "GSI5SK": self.generate_gsi5_sk(),
        })
        
        # 既読記事の場合のみGSI4を設定
        gsi4_pk = self.generate_gsi4_pk()
        gsi4_sk = self.generate_gsi4_sk()
        if gsi4_pk and gsi4_sk:
            item["GSI4PK"] = gsi4_pk
            item["GSI4SK"] = gsi4_sk
        
        # HttpUrlを文字列に変換
        if 'link' in item:
            item['link'] = str(item['link'])
        
        # TTLが設定されていない場合はデフォルト値を設定
        if not self.ttl:
            self.set_ttl_for_article()
            item['ttl'] = self.ttl
        
        return item
    
    def mark_as_read(self) -> None:
        """
        記事を既読にマーク
        """
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.now()
            self.update_timestamp()
    
    def mark_as_unread(self) -> None:
        """
        記事を未読にマーク
        """
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.update_timestamp()
    
    def toggle_saved(self) -> None:
        """
        保存状態を切り替え
        """
        self.is_saved = not self.is_saved
        self.update_timestamp()
    
    def update_importance_score(self, score: float) -> None:
        """
        重要度スコアを更新
        
        Args:
            score: 新しい重要度スコア（0.0～1.0）
        """
        if score < 0.0 or score > 1.0:
            raise ValueError("Importance score must be between 0.0 and 1.0")
        
        self.importance_score = score
        self.update_timestamp()