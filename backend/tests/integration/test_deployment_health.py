"""
デプロイメント後の統合テストとヘルスチェック

このモジュールは、デプロイメント後のシステム全体の健全性を検証する
統合テストとヘルスチェック機能を提供します。
"""

import asyncio
import os
import secrets
import time

import httpx
import pytest
from hypothesis import given
from hypothesis import strategies as st


class DeploymentHealthChecker:
    """デプロイメント後のヘルスチェッククラス"""

    REQUEST_TIMEOUT_SECONDS = 30.0
    MAX_RESPONSE_TIME_SECONDS = 5.0
    MIN_SUCCESS_RATE = 0.8

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            timeout=self.REQUEST_TIMEOUT_SECONDS,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def check_api_health(self) -> dict[str, bool]:
        """APIの基本的なヘルスチェック"""
        results = {}

        try:
            # 基本的な接続テスト
            response = await self.client.get(f"{self.base_url}/")
            results["basic_connectivity"] = response.status_code in [
                200,
                404,
            ]  # 404も正常（ルートが定義されていない場合）
        except (TimeoutError, httpx.HTTPError):
            results["basic_connectivity"] = False

        try:
            # フィード一覧取得テスト
            response = await self.client.get(f"{self.base_url}/api/feeds")
            results["feeds_endpoint"] = response.status_code == 200
        except (TimeoutError, httpx.HTTPError):
            results["feeds_endpoint"] = False

        try:
            # 記事一覧取得テスト
            response = await self.client.get(f"{self.base_url}/api/articles")
            results["articles_endpoint"] = response.status_code == 200
        except (TimeoutError, httpx.HTTPError):
            results["articles_endpoint"] = False

        try:
            # キーワード一覧取得テスト
            response = await self.client.get(f"{self.base_url}/api/keywords")
            results["keywords_endpoint"] = response.status_code == 200
        except (TimeoutError, httpx.HTTPError):
            results["keywords_endpoint"] = False

        return results

    async def check_authentication(self) -> dict[str, bool]:
        """認証機能のテスト"""
        results = {}

        # 正しいAPI Keyでのアクセステスト
        try:
            response = await self.client.get(f"{self.base_url}/api/feeds")
            results["valid_auth"] = response.status_code == 200
        except (TimeoutError, httpx.HTTPError):
            results["valid_auth"] = False

        # 無効なAPI Keyでのアクセステスト
        try:
            invalid_api_key = secrets.token_urlsafe(32)
            async with httpx.AsyncClient(
                timeout=self.REQUEST_TIMEOUT_SECONDS,
                headers={
                    "Authorization": f"Bearer {invalid_api_key}",
                    "Content-Type": "application/json",
                },
            ) as invalid_client:
                response = await invalid_client.get(
                    f"{self.base_url}/api/feeds"
                )
                results["invalid_auth_rejected"] = response.status_code == 401
        except (TimeoutError, httpx.HTTPError):
            results["invalid_auth_rejected"] = False

        # API Key なしでのアクセステスト
        try:
            async with httpx.AsyncClient(
                timeout=self.REQUEST_TIMEOUT_SECONDS
            ) as no_auth_client:
                response = await no_auth_client.get(
                    f"{self.base_url}/api/feeds"
                )
                results["no_auth_rejected"] = response.status_code == 401
        except (TimeoutError, httpx.HTTPError):
            results["no_auth_rejected"] = False

        return results

    async def check_crud_operations(self) -> dict[str, bool]:
        """基本的なCRUD操作のテスト"""
        results = {}

        # テスト用のフィードデータ
        test_feed = {
            "url": "https://example.com/test-feed.xml",
            "title": "Test Feed for Health Check",
            "folder": "test",
        }

        try:
            # フィード作成テスト
            response = await self.client.post(
                f"{self.base_url}/api/feeds", json=test_feed
            )
            results["feed_creation"] = response.status_code == 201

            if response.status_code == 201:
                feed_data = response.json()
                feed_id = feed_data.get("id")

                if feed_id:
                    # フィード取得テスト
                    response = await self.client.get(
                        f"{self.base_url}/api/feeds"
                    )
                    results["feed_retrieval"] = response.status_code == 200

                    # フィード削除テスト（クリーンアップ）
                    response = await self.client.delete(
                        f"{self.base_url}/api/feeds/{feed_id}"
                    )
                    results["feed_deletion"] = response.status_code in [
                        200,
                        204,
                    ]
                else:
                    results["feed_retrieval"] = False
                    results["feed_deletion"] = False
            else:
                results["feed_retrieval"] = False
                results["feed_deletion"] = False

        except (TimeoutError, httpx.HTTPError, ValueError):
            results["feed_creation"] = False
            results["feed_retrieval"] = False
            results["feed_deletion"] = False

        return results

    async def check_performance(self) -> dict[str, float]:
        """パフォーマンステスト"""
        results = {}

        # レスポンス時間測定
        endpoints = ["/api/feeds", "/api/articles", "/api/keywords"]

        for endpoint in endpoints:
            try:
                start_time = time.time()
                response = await self.client.get(f"{self.base_url}{endpoint}")
                end_time = time.time()

                if response.status_code == 200:
                    results[f"{endpoint}_response_time"] = (
                        end_time - start_time
                    )
                else:
                    results[f"{endpoint}_response_time"] = float("inf")
            except (TimeoutError, httpx.HTTPError):
                results[f"{endpoint}_response_time"] = float("inf")

        return results


@pytest.mark.asyncio
@pytest.mark.integration
class TestDeploymentHealth:
    """デプロイメント後の統合テスト"""

    @pytest.fixture
    def api_config(self):
        """API設定の取得"""
        base_url = os.getenv("API_BASE_URL")
        api_key = os.getenv("VITE_API_KEY")
        api_key_parameter_name = os.getenv("RSS_READER_API_KEY_PARAMETER_NAME")

        if not base_url or not (api_key or api_key_parameter_name):
            pytest.skip("API_BASE_URLまたはVITE_API_KEYが設定されていません")

        return {"base_url": base_url, "api_key": api_key}

    async def test_api_health_check(self, api_config):
        """APIヘルスチェックテスト"""
        async with DeploymentHealthChecker(
            api_config["base_url"], api_config["api_key"]
        ) as checker:
            health_results = await checker.check_api_health()

            # すべてのエンドポイントが正常に応答することを確認
            assert health_results["basic_connectivity"], (
                "基本的な接続に失敗しました"
            )
            assert health_results["feeds_endpoint"], (
                "フィードエンドポイントに問題があります"
            )
            assert health_results["articles_endpoint"], (
                "記事エンドポイントに問題があります"
            )
            assert health_results["keywords_endpoint"], (
                "キーワードエンドポイントに問題があります"
            )

    async def test_authentication_verification(self, api_config):
        """認証機能の検証テスト"""
        async with DeploymentHealthChecker(
            api_config["base_url"], api_config["api_key"]
        ) as checker:
            auth_results = await checker.check_authentication()

            # 認証機能が正常に動作することを確認
            assert auth_results["valid_auth"], (
                "有効なAPI Keyでの認証に失敗しました"
            )
            assert auth_results["invalid_auth_rejected"], (
                "無効なAPI Keyが拒否されませんでした"
            )
            assert auth_results["no_auth_rejected"], (
                "認証なしのアクセスが拒否されませんでした"
            )

    async def test_crud_operations(self, api_config):
        """CRUD操作の統合テスト"""
        async with DeploymentHealthChecker(
            api_config["base_url"], api_config["api_key"]
        ) as checker:
            crud_results = await checker.check_crud_operations()

            # 基本的なCRUD操作が正常に動作することを確認
            assert crud_results["feed_creation"], "フィード作成に失敗しました"
            assert crud_results["feed_retrieval"], "フィード取得に失敗しました"
            assert crud_results["feed_deletion"], "フィード削除に失敗しました"

    async def test_performance_requirements(self, api_config):
        """パフォーマンス要件のテスト"""
        async with DeploymentHealthChecker(
            api_config["base_url"], api_config["api_key"]
        ) as checker:
            perf_results = await checker.check_performance()

            # レスポンス時間が許容範囲内であることを確認
            for endpoint, response_time in perf_results.items():
                assert (
                    response_time
                    < DeploymentHealthChecker.MAX_RESPONSE_TIME_SECONDS
                ), (
                    f"{endpoint}のレスポンス時間が"
                    f"{DeploymentHealthChecker.MAX_RESPONSE_TIME_SECONDS}秒を超えています: "
                    f"{response_time}秒"
                )
                assert response_time != float("inf"), (
                    f"{endpoint}でエラーが発生しました"
                )

    @pytest.mark.property
    @given(concurrent_requests=st.integers(min_value=1, max_value=10))
    async def test_concurrent_access(self, api_config, concurrent_requests):
        """同時アクセステスト"""

        async def make_request():
            async with DeploymentHealthChecker(
                api_config["base_url"], api_config["api_key"]
            ) as checker:
                response = await checker.client.get(
                    f"{api_config['base_url']}/api/feeds"
                )
                return response.status_code == 200

        # 複数の同時リクエストを実行
        tasks = [make_request() for _ in range(concurrent_requests)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # すべてのリクエストが成功することを確認
        success_count = sum(1 for result in results if result is True)
        success_rate = success_count / len(results)

        assert success_rate >= DeploymentHealthChecker.MIN_SUCCESS_RATE, (
            f"同時アクセステストの成功率が低すぎます: {success_rate:.2%}"
        )


class HealthCheckScript:
    """デプロイメント後のヘルスチェックスクリプト"""

    @staticmethod
    async def run_health_check(base_url: str, api_key: str) -> dict[str, any]:
        """ヘルスチェックの実行"""
        results = {
            "timestamp": time.time(),
            "base_url": base_url,
            "overall_status": "unknown",
            "checks": {},
        }

        try:
            async with DeploymentHealthChecker(base_url, api_key) as checker:
                # 各種ヘルスチェックを実行
                results["checks"][
                    "api_health"
                ] = await checker.check_api_health()
                results["checks"][
                    "authentication"
                ] = await checker.check_authentication()
                results["checks"][
                    "crud_operations"
                ] = await checker.check_crud_operations()
                results["checks"][
                    "performance"
                ] = await checker.check_performance()

                # 全体的なステータスを判定
                all_checks_passed = True

                for check_category, check_results in results["checks"].items():
                    if check_category == "performance":
                        # パフォーマンスチェックは時間が5秒以内であることを確認
                        for _metric, value in check_results.items():
                            if (
                                value
                                >= DeploymentHealthChecker.MAX_RESPONSE_TIME_SECONDS
                                or value == float("inf")
                            ):
                                all_checks_passed = False
                                break
                    else:
                        # その他のチェックはすべてTrueであることを確認
                        for _check_name, check_result in check_results.items():
                            if not check_result:
                                all_checks_passed = False
                                break

                    if not all_checks_passed:
                        break

                results["overall_status"] = (
                    "healthy" if all_checks_passed else "unhealthy"
                )

        except (TimeoutError, httpx.HTTPError, ValueError) as e:
            results["overall_status"] = "error"
            results["error"] = str(e)

        return results

    @staticmethod
    def print_health_report(results: dict[str, any]):
        """ヘルスチェック結果の表示"""
        print("=" * 60)
        print("RSS Reader デプロイメントヘルスチェック結果")
        print("=" * 60)
        print(f"URL: {results['base_url']}")
        print(
            f"実行時刻: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(results['timestamp']))}"
        )
        print(f"全体ステータス: {results['overall_status'].upper()}")
        print()

        if "error" in results:
            print(f"エラー: {results['error']}")
            return

        for check_category, check_results in results["checks"].items():
            print(f"【{check_category.upper()}】")

            if check_category == "performance":
                for metric, value in check_results.items():
                    status = (
                        "✅"
                        if value
                        < DeploymentHealthChecker.MAX_RESPONSE_TIME_SECONDS
                        and value != float("inf")
                        else "❌"
                    )
                    if value == float("inf"):
                        print(f"  {status} {metric}: エラー")
                    else:
                        print(f"  {status} {metric}: {value:.3f}秒")
            else:
                for check_name, check_result in check_results.items():
                    status = "✅" if check_result else "❌"
                    print(
                        f"  {status} {check_name}: {'成功' if check_result else '失敗'}"
                    )
            print()


if __name__ == "__main__":
    """スクリプトとして実行された場合のヘルスチェック"""
    import sys

    base_url = os.getenv("API_BASE_URL")
    api_key = os.getenv("VITE_API_KEY")
    api_key_parameter_name = os.getenv("RSS_READER_API_KEY_PARAMETER_NAME")

    if not base_url or not (api_key or api_key_parameter_name):
        print("エラー: API_BASE_URLとVITE_API_KEYの環境変数を設定してください")
        sys.exit(1)

    async def main():
        results = await HealthCheckScript.run_health_check(base_url, api_key)
        HealthCheckScript.print_health_report(results)

        if results["overall_status"] != "healthy":
            sys.exit(1)

    asyncio.run(main())
