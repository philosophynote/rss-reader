"""
フィードモデル

RSSフィードの情報を管理するデータモデル。
"""

from datetime import datetime
from typing import Optional, Dict
from pydantic import Field, HttpUrl, field_validator
from .base import BaseModel


class Feed(BaseModel):
    """
    RSSフィードエンティティ
    
    Attributes:
        feed_id: フィードの一意識別子
        url: RSSフィードのURL
        title: フィードのタイトル
        folder: フィードが属するフォルダ名（オプション）
        last_fetched_at: 最後にフィードを取得した日時
        is_active: フィードが有効かどうか
    """
    
    feed_id: str = Field(default_factory=lambda: BaseModel().generate_id())
    url: HttpUrl
    title: str = ""
    folder: Optional[str] = None
    last_fetched_at: Optional[datetime] = None
    is_active: bool = True
    
    def __init__(self, **data):
        """
        Feedの初期化
        
        タイトルが空の場合はURLからデフォルトタイトルを生成します。
        """
        if ('title' not in data or not data['title']) and 'url' in data:
            # URLからドメイン名を抽出してタイトルとする
            url_str = str(data['url'])
            domain = url_str.split('/')[2] if '/' in url_str else url_str
            data['title'] = f"Feed from {domain}"
        
        super().__init__(**data)
    
    @field_validator('title', mode='before')
    @classmethod
    def set_default_title(cls, v: str) -> str:
        """
        タイトルが空の場合、デフォルトタイトルを設定
        
        Args:
            v: タイトル値
            
        Returns:
            str: 設定されたタイトル
        """
        return v or "Untitled Feed"
    
    @field_validator('folder')
    @classmethod
    def validate_folder(cls, v: Optional[str]) -> Optional[str]:
        """
        フォルダ名のバリデーション
        
        Args:
            v: フォルダ名
            
        Returns:
            Optional[str]: バリデーション済みフォルダ名
        """
        if v is not None:
            # 空文字列の場合はNoneに変換
            v = v.strip()
            if not v:
                return None
            # 長さ制限（100文字以内）
            if len(v) > 100:
                raise ValueError("Folder name must be 100 characters or less")
        return v
    
    def generate_pk(self) -> str:
        """
        プライマリキーを生成
        
        Returns:
            str: "FEED#{feed_id}" 形式のプライマリキー
        """
        return f"FEED#{self.feed_id}"
    
    def generate_sk(self) -> str:
        """
        ソートキーを生成
        
        Returns:
            str: "METADATA" 固定値
        """
        return "METADATA"
    
    def generate_gsi1_pk(self) -> str:
        """
        GSI1のパーティションキーを生成（フィード一覧取得用）
        
        Returns:
            str: "FEED" 固定値
        """
        return "FEED"
    
    def generate_gsi1_sk(self) -> str:
        """
        GSI1のソートキーを生成（フィード一覧取得用）
        
        Returns:
            str: "FEED#{feed_id}" 形式
        """
        return f"FEED#{self.feed_id}"
    
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
            "EntityType": "Feed",
            "GSI1PK": self.generate_gsi1_pk(),
            "GSI1SK": self.generate_gsi1_sk(),
        })
        
        # HttpUrlを文字列に変換
        if 'url' in item:
            item['url'] = str(item['url'])
        
        return item
    
    def mark_as_fetched(self) -> None:
        """
        フィード取得完了時に呼び出し、最終取得日時を更新
        """
        self.last_fetched_at = datetime.now()
        self.update_timestamp()
    
    def deactivate(self) -> None:
        """
        フィードを無効化
        """
        self.is_active = False
        self.update_timestamp()
    
    def activate(self) -> None:
        """
        フィードを有効化
        """
        self.is_active = True
        self.update_timestamp()