"""
DynamoDBクライアント

DynamoDBとの通信を担当するクライアントクラス。
シングルテーブル設計に対応した効率的なクエリメソッドを提供します。
"""

import logging
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr

from ..config import settings

logger = logging.getLogger(__name__)


class DynamoDBClient:
    """
    DynamoDBクライアント
    
    シングルテーブル設計に対応したDynamoDBの操作を提供します。
    GSI1～GSI5を使用した効率的なクエリメソッドを含みます。
    """
    
    def __init__(self, table_name: Optional[str] = None):
        """
        DynamoDBクライアントを初期化
        
        Args:
            table_name: テーブル名（Noneの場合は設定から取得）
        """
        self.table_name = table_name or settings.get_table_name()
        
        # DynamoDBリソースを初期化
        self.dynamodb = boto3.resource('dynamodb', region_name=settings.get_region())
        self.table = self.dynamodb.Table(self.table_name)
        
        logger.info(f"DynamoDBClient initialized with table: {self.table_name}")
    
    def put_item(self, item: Dict) -> None:
        """
        アイテムをテーブルに保存
        
        Args:
            item: 保存するアイテム
            
        Raises:
            ClientError: DynamoDB操作エラー
        """
        try:
            self.table.put_item(Item=item)
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"Item saved: PK={item.get('PK')}, SK={item.get('SK')}")
        except ClientError as e:
            logger.error(f"Failed to put item: {e}")
            raise
    
    def get_item(self, pk: str, sk: str) -> Optional[Dict]:
        """
        プライマリキーでアイテムを取得
        
        Args:
            pk: パーティションキー
            sk: ソートキー
            
        Returns:
            Optional[Dict]: 取得されたアイテム（存在しない場合はNone）
            
        Raises:
            ClientError: DynamoDB操作エラー
        """
        try:
            response = self.table.get_item(Key={'PK': pk, 'SK': sk})
            item = response.get('Item')
            
            if item:
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Item retrieved: PK={pk}, SK={sk}")
            else:
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Item not found: PK={pk}, SK={sk}")
            
            return item
        except ClientError as e:
            logger.error(f"Failed to get item: {e}")
            raise
    
    def query(
        self,
        key_condition_expression,
        index_name: Optional[str] = None,
        filter_expression=None,
        scan_index_forward: bool = True,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None,
        **kwargs
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        クエリを実行
        
        Args:
            key_condition_expression: キー条件式
            index_name: インデックス名（GSI使用時）
            filter_expression: フィルタ条件式
            scan_index_forward: ソート順（True=昇順、False=降順）
            limit: 取得件数制限
            exclusive_start_key: ページネーション用の開始キー
            **kwargs: その他のクエリパラメータ
            
        Returns:
            Tuple[List[Dict], Optional[Dict]]: (アイテムリスト, 次のページのキー)
            
        Raises:
            ClientError: DynamoDB操作エラー
        """
        try:
            query_params = {
                'KeyConditionExpression': key_condition_expression,
                'ScanIndexForward': scan_index_forward,
                **kwargs
            }
            
            if index_name:
                query_params['IndexName'] = index_name
            
            if filter_expression:
                query_params['FilterExpression'] = filter_expression
            
            if limit:
                query_params['Limit'] = limit
            
            if exclusive_start_key:
                query_params['ExclusiveStartKey'] = exclusive_start_key
            
            response = self.table.query(**query_params)
            
            items = response.get('Items', [])
            last_evaluated_key = response.get('LastEvaluatedKey')
            
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"Query returned {len(items)} items")
            
            return items, last_evaluated_key
        except ClientError as e:
            logger.error(f"Failed to query: {e}")
            raise
    
    def delete_item(self, pk: str, sk: str) -> None:
        """
        アイテムを削除
        
        Args:
            pk: パーティションキー
            sk: ソートキー
            
        Raises:
            ClientError: DynamoDB操作エラー
        """
        try:
            self.table.delete_item(Key={'PK': pk, 'SK': sk})
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(f"Item deleted: PK={pk}, SK={sk}")
        except ClientError as e:
            logger.error(f"Failed to delete item: {e}")
            raise
    
    def batch_write_item(self, items: List[Dict], delete_keys: List[Dict] = None) -> None:
        """
        バッチ書き込み操作（リトライロジック付き）
        
        Args:
            items: 保存するアイテムのリスト
            delete_keys: 削除するキーのリスト
            
        Raises:
            ClientError: DynamoDB操作エラー
        """
        import time
        import random
        
        max_retries = 3
        base_delay = 0.1  # 100ms
        
        for attempt in range(max_retries + 1):
            try:
                with self.table.batch_writer() as batch:
                    # アイテムを保存
                    for item in items:
                        batch.put_item(Item=item)
                    
                    # アイテムを削除
                    if delete_keys:
                        for key in delete_keys:
                            batch.delete_item(Key=key)
                
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Batch write completed: {len(items)} puts, {len(delete_keys or [])} deletes")
                return
                
            except ClientError as e:
                error_code = e.response['Error']['Code']
                
                # リトライ可能なエラーかチェック
                if error_code in ['ProvisionedThroughputExceededException', 'ThrottlingException']:
                    if attempt < max_retries:
                        # 指数バックオフ + ジッター
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 0.1)
                        if logger.isEnabledFor(logging.DEBUG):
                            logger.debug(f"Batch write throttled, retrying in {delay:.2f}s (attempt {attempt + 1}/{max_retries + 1})")
                        time.sleep(delay)
                        continue
                
                # リトライ不可能なエラーまたは最大リトライ回数に達した場合
                logger.error(f"Failed to batch write after {attempt + 1} attempts: {e}")
                raise
    
    # GSI1を使用したクエリメソッド（時系列順ソート用）
    
    def query_articles_by_published_date(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None,
        descending: bool = True
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        GSI1を使用して記事を公開日時順で取得
        
        Args:
            start_date: 開始日時（指定しない場合は制限なし）
            end_date: 終了日時（指定しない場合は制限なし）
            limit: 取得件数制限
            exclusive_start_key: ページネーション用の開始キー
            descending: 降順ソート（True=新しい順、False=古い順）
            
        Returns:
            Tuple[List[Dict], Optional[Dict]]: (記事リスト, 次のページのキー)
        """
        key_condition = Key('GSI1PK').eq('ARTICLE')
        
        # 日時範囲の条件を追加
        if start_date and end_date:
            start_str = start_date.isoformat() + "Z"
            end_str = end_date.isoformat() + "Z"
            key_condition = key_condition & Key('GSI1SK').between(start_str, end_str)
        elif start_date:
            start_str = start_date.isoformat() + "Z"
            key_condition = key_condition & Key('GSI1SK').gte(start_str)
        elif end_date:
            end_str = end_date.isoformat() + "Z"
            key_condition = key_condition & Key('GSI1SK').lte(end_str)
        
        return self.query(
            key_condition_expression=key_condition,
            index_name='GSI1',
            scan_index_forward=not descending,
            limit=limit,
            exclusive_start_key=exclusive_start_key
        )
    
    def query_feeds(
        self,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        GSI1を使用してフィード一覧を取得
        
        Args:
            limit: 取得件数制限
            exclusive_start_key: ページネーション用の開始キー
            
        Returns:
            Tuple[List[Dict], Optional[Dict]]: (フィードリスト, 次のページのキー)
        """
        key_condition = Key('GSI1PK').eq('FEED')
        
        return self.query(
            key_condition_expression=key_condition,
            index_name='GSI1',
            limit=limit,
            exclusive_start_key=exclusive_start_key
        )
    
    def query_keywords(
        self,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        GSI1を使用してキーワード一覧を取得
        
        Args:
            limit: 取得件数制限
            exclusive_start_key: ページネーション用の開始キー
            
        Returns:
            Tuple[List[Dict], Optional[Dict]]: (キーワードリスト, 次のページのキー)
        """
        key_condition = Key('GSI1PK').eq('KEYWORD')
        
        return self.query(
            key_condition_expression=key_condition,
            index_name='GSI1',
            limit=limit,
            exclusive_start_key=exclusive_start_key
        )
    
    # GSI2を使用したクエリメソッド（重要度順ソート用）
    
    def query_articles_by_importance_score(
        self,
        min_score: Optional[float] = None,
        max_score: Optional[float] = None,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        GSI2を使用して記事を重要度スコア順で取得
        
        逆順ソートキーを使用しているため、昇順ソートで高スコア順になります。
        
        Args:
            min_score: 最小スコア（指定しない場合は制限なし）
            max_score: 最大スコア（指定しない場合は制限なし）
            limit: 取得件数制限
            exclusive_start_key: ページネーション用の開始キー
            
        Returns:
            Tuple[List[Dict], Optional[Dict]]: (記事リスト, 次のページのキー)
        """
        key_condition = Key('GSI2PK').eq('ARTICLE')
        
        # スコア範囲の条件を追加（逆順ソートキーのため条件も逆転）
        if min_score is not None and max_score is not None:
            # 逆順ソートキーを生成
            max_reverse_key = self._generate_reverse_sort_key(min_score)
            min_reverse_key = self._generate_reverse_sort_key(max_score)
            key_condition = key_condition & Key('GSI2SK').between(min_reverse_key, max_reverse_key)
        elif min_score is not None:
            max_reverse_key = self._generate_reverse_sort_key(min_score)
            key_condition = key_condition & Key('GSI2SK').lte(max_reverse_key)
        elif max_score is not None:
            min_reverse_key = self._generate_reverse_sort_key(max_score)
            key_condition = key_condition & Key('GSI2SK').gte(min_reverse_key)
        
        return self.query(
            key_condition_expression=key_condition,
            index_name='GSI2',
            scan_index_forward=True,  # 昇順ソートで高スコア順
            limit=limit,
            exclusive_start_key=exclusive_start_key
        )
    
    # GSI3を使用したクエリメソッド（効率的な削除クエリ用）
    
    def query_articles_for_deletion_by_age(
        self,
        cutoff_date: datetime,
        limit: Optional[int] = 100
    ) -> List[Dict]:
        """
        GSI3を使用して古い記事を効率的に検索（削除用）
        
        Args:
            cutoff_date: 削除対象の基準日時
            limit: 取得件数制限（バッチサイズ）
            
        Returns:
            List[Dict]: 削除対象の記事リスト
        """
        cutoff_str = cutoff_date.isoformat() + "Z"
        key_condition = Key('GSI3PK').eq('ARTICLE') & Key('GSI3SK').lt(cutoff_str)
        
        items, _ = self.query(
            key_condition_expression=key_condition,
            index_name='GSI3',
            limit=limit
        )
        
        return items
    
    # GSI4を使用したクエリメソッド（既読記事削除用）
    
    def query_read_articles_for_deletion(
        self,
        cutoff_datetime: datetime,
        limit: Optional[int] = 100
    ) -> List[Dict]:
        """
        GSI4を使用して既読記事を効率的に検索（削除用）
        
        Args:
            cutoff_datetime: 削除対象の基準日時
            limit: 取得件数制限（バッチサイズ）
            
        Returns:
            List[Dict]: 削除対象の既読記事リスト
        """
        cutoff_str = f"true#{cutoff_datetime.isoformat()}Z"
        key_condition = Key('GSI4PK').eq('ARTICLE_READ') & Key('GSI4SK').lt(cutoff_str)
        
        items, _ = self.query(
            key_condition_expression=key_condition,
            index_name='GSI4',
            limit=limit
        )
        
        return items
    
    # GSI5を使用したクエリメソッド（カスケード削除用）
    
    def query_articles_by_feed_id(
        self,
        feed_id: str,
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        GSI5を使用してフィード別の記事を効率的に検索（カスケード削除用）
        
        Args:
            feed_id: フィードID
            limit: 取得件数制限
            exclusive_start_key: ページネーション用の開始キー
            
        Returns:
            Tuple[List[Dict], Optional[Dict]]: (記事リスト, 次のページのキー)
        """
        key_condition = Key('GSI5PK').eq(f'FEED#{feed_id}')
        
        return self.query(
            key_condition_expression=key_condition,
            index_name='GSI5',
            limit=limit,
            exclusive_start_key=exclusive_start_key
        )
    
    # 重要度理由の操作メソッド
    
    def query_importance_reasons_for_article(
        self,
        article_id: str
    ) -> List[Dict]:
        """
        記事の重要度理由を取得
        
        Args:
            article_id: 記事ID
            
        Returns:
            List[Dict]: 重要度理由のリスト
        """
        key_condition = Key('PK').eq(f'ARTICLE#{article_id}') & Key('SK').begins_with('REASON#')
        
        items, _ = self.query(key_condition_expression=key_condition)
        return items
    
    def delete_importance_reasons_for_article(self, article_id: str) -> int:
        """
        記事の重要度理由を削除
        
        Args:
            article_id: 記事ID
            
        Returns:
            int: 削除した理由の数
        """
        reasons = self.query_importance_reasons_for_article(article_id)
        
        if not reasons:
            return 0
        
        # バッチ削除
        delete_keys = [{'PK': reason['PK'], 'SK': reason['SK']} for reason in reasons]
        self.batch_write_item([], delete_keys)
        
        return len(delete_keys)
    
    # フィルタ機能付きクエリメソッド
    
    def query_articles_with_filters(
        self,
        sort_by: str = "published_at",  # "published_at" or "importance_score"
        filter_by: Optional[str] = None,  # "unread", "read", "saved"
        limit: Optional[int] = None,
        exclusive_start_key: Optional[Dict] = None
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        フィルタ条件付きで記事を取得
        
        Args:
            sort_by: ソート基準（"published_at" または "importance_score"）
            filter_by: フィルタ条件（"unread", "read", "saved"）
            limit: 取得件数制限
            exclusive_start_key: ページネーション用の開始キー
            
        Returns:
            Tuple[List[Dict], Optional[Dict]]: (記事リスト, 次のページのキー)
        """
        # フィルタ条件を構築
        filter_expression = None
        if filter_by == "unread":
            filter_expression = Attr('is_read').eq(False)
        elif filter_by == "read":
            filter_expression = Attr('is_read').eq(True)
        elif filter_by == "saved":
            filter_expression = Attr('is_saved').eq(True)
        
        # ソート基準に応じてクエリメソッドを選択
        if sort_by == "importance_score":
            key_condition = Key('GSI2PK').eq('ARTICLE')
            return self.query(
                key_condition_expression=key_condition,
                index_name='GSI2',
                filter_expression=filter_expression,
                scan_index_forward=True,  # 昇順ソートで高スコア順
                limit=limit,
                exclusive_start_key=exclusive_start_key
            )
        else:  # published_at
            key_condition = Key('GSI1PK').eq('ARTICLE')
            return self.query(
                key_condition_expression=key_condition,
                index_name='GSI1',
                filter_expression=filter_expression,
                scan_index_forward=False,  # 降順ソートで新しい順
                limit=limit,
                exclusive_start_key=exclusive_start_key
            )
    
    # ヘルパーメソッド
    
    def _generate_reverse_sort_key(self, score: float, max_score: float = 1.0) -> str:
        """
        逆順ソートキーを生成（重要度スコア用）
        
        Args:
            score: 重要度スコア（0.0～max_score）
            max_score: 最大スコア値（デフォルト: 1.0）
        
        Returns:
            str: ゼロパディングされた逆順ソートキー
        """
        if score < 0 or score > max_score:
            raise ValueError(f"Score must be between 0 and {max_score}")
        
        # スコアを100万倍して整数化し、100万から引く
        SCORE_PRECISION = 1_000_000
        score_scaled = int(score * SCORE_PRECISION)
        reverse_score = SCORE_PRECISION - score_scaled
        
        # 小数部分は常に000000（整数部分のみを使用）
        return f"{reverse_score:06d}.000000"
    
    def health_check(self) -> bool:
        """
        DynamoDBテーブルの接続確認
        
        Returns:
            bool: 接続が正常な場合はTrue
        """
        try:
            # テーブルの存在確認
            self.table.load()
            logger.info(f"Health check passed for table: {self.table_name}")
            return True
        except ClientError as e:
            logger.error(f"Health check failed: {e}")
            return False