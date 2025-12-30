"""
日時変換ユーティリティのテスト
"""

from datetime import UTC, datetime, timezone

import pytest

from app.utils.datetime_utils import parse_datetime_string


class TestParseDatetimeString:
    """parse_datetime_string関数のテストクラス"""

    def test_parse_datetime_with_z_suffix(self) -> None:
        """Z接尾辞付きの日時文字列を正しく変換できること"""
        dt_str = "2025-12-30T10:30:00.123456Z"
        result = parse_datetime_string(dt_str)

        expected = datetime(2025, 12, 30, 10, 30, 0, 123456, UTC)
        assert result == expected

    def test_parse_datetime_with_utc_offset(self) -> None:
        """+00:00接尾辞付きの日時文字列を正しく変換できること"""
        dt_str = "2025-12-30T10:30:00.123456+00:00"
        result = parse_datetime_string(dt_str)

        expected = datetime(2025, 12, 30, 10, 30, 0, 123456, UTC)
        assert result == expected

    def test_parse_datetime_with_negative_utc_offset(self) -> None:
        """-00:00接尾辞付きの日時文字列を正しく変換できること"""
        dt_str = "2025-12-30T10:30:00.123456-00:00"
        result = parse_datetime_string(dt_str)

        expected = datetime(2025, 12, 30, 10, 30, 0, 123456, UTC)
        assert result == expected

    def test_parse_datetime_without_timezone(self) -> None:
        """タイムゾーン情報なしの日時文字列をUTCとして変換できること"""
        dt_str = "2025-12-30T10:30:00.123456"
        result = parse_datetime_string(dt_str)

        expected = datetime(2025, 12, 30, 10, 30, 0, 123456, UTC)
        assert result == expected

    def test_parse_datetime_with_other_timezone(self) -> None:
        """他のタイムゾーン情報付きの日時文字列を正しく変換できること"""
        dt_str = "2025-12-30T10:30:00.123456+09:00"
        result = parse_datetime_string(dt_str)

        # +09:00のタイムゾーンで作成
        from datetime import timedelta

        jst = timezone(timedelta(hours=9))
        expected = datetime(2025, 12, 30, 10, 30, 0, 123456, jst)
        assert result == expected

    def test_parse_datetime_empty_string(self) -> None:
        """空文字列の場合にValueErrorが発生すること"""
        with pytest.raises(ValueError, match="Empty datetime string"):
            parse_datetime_string("")

    def test_parse_datetime_invalid_format(self) -> None:
        """無効な形式の場合にValueErrorが発生すること"""
        with pytest.raises(ValueError):
            parse_datetime_string("invalid-datetime")
