"""
日時変換ユーティリティ

DynamoDBから取得した日時文字列をdatetimeオブジェクトに変換する共通処理を提供します。
"""

from datetime import datetime


def parse_datetime_string(dt_str: str) -> datetime:
    """
    ISO 8601形式の日時文字列をdatetimeオブジェクトに変換。

    Args:
        dt_str: ISO 8601形式の日時文字列

    Returns:
        datetime: 変換されたdatetimeオブジェクト

    Raises:
        ValueError: 無効な日時文字列の場合
    """
    if not dt_str:
        raise ValueError("Empty datetime string")

    # 重複したタイムゾーン情報を修正（+00:00+00:00 -> +00:00）
    if dt_str.endswith("+00:00+00:00"):
        dt_str = dt_str[:-6]  # 重複した最後の+00:00を削除
    elif dt_str.endswith("-00:00-00:00"):
        dt_str = dt_str[:-6]  # 重複した最後の-00:00を削除

    # 既にタイムゾーン情報が含まれている場合はそのまま使用
    if dt_str.endswith("+00:00") or dt_str.endswith("-00:00"):
        return datetime.fromisoformat(dt_str)

    # 'Z'で終わる場合は'+00:00'に置換
    if dt_str.endswith("Z"):
        dt_str = dt_str[:-1] + "+00:00"
        return datetime.fromisoformat(dt_str)

    # その他のタイムゾーン情報がある場合（+XX:XX, -XX:XX）
    if "+" in dt_str[-6:] or "-" in dt_str[-6:]:
        return datetime.fromisoformat(dt_str)

    # タイムゾーン情報がない場合はUTCとして扱う
    return datetime.fromisoformat(dt_str + "+00:00")
