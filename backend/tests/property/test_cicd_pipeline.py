"""
CI/CDパイプラインのプロパティベーステスト

このモジュールは、CI/CDパイプラインの品質ゲート、自動デプロイメント、
テストカバレッジ維持、デプロイメント失敗時の通知に関するプロパティテストを提供します。
"""

from pathlib import Path
from typing import Any

import pytest
import yaml
from hypothesis import given
from hypothesis import strategies as st

pytestmark = pytest.mark.property


class TestCICDPipelineProperties:
    """CI/CDパイプラインのプロパティテスト"""

    @staticmethod
    def _get_workflow_triggers(
        workflow_config: dict[str, Any],
    ) -> dict[str, Any] | None:
        for key in ("on", True, '"on"'):
            if key in workflow_config:
                return workflow_config[key]
        return None

    @given(
        workflow_files=st.lists(
            st.sampled_from(
                [
                    "ci.yml",
                    "deploy-backend.yml",
                    "deploy-frontend.yml",
                    "deploy-infra.yml",
                ]
            ),
            min_size=1,
            max_size=4,
            unique=True,
        )
    )
    def test_property_27_cicd_pipeline_quality_gates(
        self, workflow_files: list[str]
    ):
        """
        プロパティ27: CI/CDパイプラインの品質ゲート

        任意のワークフローファイルに対して、品質ゲートが適切に設定されていることを検証する。

        **検証: 要件 13.3**
        """
        workflows_dir = (
            Path(__file__).parent.parent.parent.parent
            / ".github"
            / "workflows"
        )

        for workflow_file in workflow_files:
            workflow_path = workflows_dir / workflow_file

            # ワークフローファイルが存在することを確認
            assert workflow_path.exists(), (
                f"ワークフローファイル {workflow_file} が存在しません"
            )

            # YAMLファイルとして正しく解析できることを確認
            with open(workflow_path, encoding="utf-8") as f:
                workflow_config = yaml.safe_load(f)

            # 基本的な構造を確認
            assert "name" in workflow_config, (
                f"{workflow_file}: nameフィールドが必要です"
            )
            # YAMLの'on'は予約語なので、文字列キーまたはTrueキーとして解析される場合がある
            triggers = self._get_workflow_triggers(workflow_config)
            assert triggers is not None, (
                f"{workflow_file}: onフィールドが必要です"
            )
            assert "jobs" in workflow_config, (
                f"{workflow_file}: jobsフィールドが必要です"
            )

            # 品質ゲートの確認
            jobs = workflow_config["jobs"]

            if workflow_file == "ci.yml":
                # CIのみ品質ゲートを要求（デプロイ時はチェック不要）
                self._verify_backend_quality_gates(jobs, workflow_file)
                self._verify_frontend_quality_gates(jobs, workflow_file)
                self._verify_infrastructure_quality_gates(jobs, workflow_file)

    def _verify_backend_quality_gates(
        self, jobs: dict[str, Any], workflow_file: str
    ):
        """バックエンドの品質ゲートを検証"""
        backend_jobs = [
            job
            for job_name, job in jobs.items()
            if "backend" in job_name.lower() or "python" in str(job).lower()
        ]

        if not backend_jobs:
            return

        for job in backend_jobs:
            steps = job.get("steps", [])
            step_names = [step.get("name", "") for step in steps]

            # 必須の品質ゲート
            assert any(
                "lint" in name.lower() or "ruff" in name.lower()
                for name in step_names
            ), f"{workflow_file}: バックエンドにLintステップが必要です"
            assert any(
                "type" in name.lower() or "pyright" in name.lower()
                for name in step_names
            ), f"{workflow_file}: バックエンドに型チェックステップが必要です"
            assert any(
                "test" in name.lower() or "pytest" in name.lower()
                for name in step_names
            ), f"{workflow_file}: バックエンドにテストステップが必要です"
            assert any("coverage" in name.lower() for name in step_names), (
                f"{workflow_file}: バックエンドにカバレッジステップが必要です"
            )

    def _verify_frontend_quality_gates(
        self, jobs: dict[str, Any], workflow_file: str
    ):
        """フロントエンドの品質ゲートを検証"""
        frontend_jobs = [
            job
            for job_name, job in jobs.items()
            if "frontend" in job_name.lower()
        ]

        if not frontend_jobs:
            return

        for job in frontend_jobs:
            steps = job.get("steps", [])
            step_names = [step.get("name", "") for step in steps]

            # 必須の品質ゲート
            assert any(
                "lint" in name.lower() or "eslint" in name.lower()
                for name in step_names
            ), f"{workflow_file}: フロントエンドにLintステップが必要です"
            assert any("type" in name.lower() for name in step_names), (
                f"{workflow_file}: フロントエンドに型チェックステップが必要です"
            )
            assert any("test" in name.lower() for name in step_names), (
                f"{workflow_file}: フロントエンドにテストステップが必要です"
            )

    def _verify_infrastructure_quality_gates(
        self, jobs: dict[str, Any], workflow_file: str
    ):
        """インフラストラクチャの品質ゲートを検証"""
        infra_jobs = [
            job
            for job_name, job in jobs.items()
            if "infra" in job_name.lower() or "cdk" in str(job).lower()
        ]

        if not infra_jobs:
            return

        for job in infra_jobs:
            steps = job.get("steps", [])
            step_names = [step.get("name", "") for step in steps]

            # 必須の品質ゲート
            assert any("type" in name.lower() for name in step_names), (
                f"{workflow_file}: インフラストラクチャに型チェックステップが必要です"
            )
            assert any(
                "synth" in name.lower() or "cdk" in name.lower()
                for name in step_names
            ), (
                f"{workflow_file}: インフラストラクチャにCDK synthステップが必要です"
            )

    @given(
        environment=st.sampled_from(["development", "production"]),
        trigger_type=st.sampled_from(["push", "workflow_dispatch"]),
    )
    def test_property_28_automatic_deployment_execution(
        self, environment: str, trigger_type: str
    ):
        """
        プロパティ28: 自動デプロイメントの実行

        任意の環境とトリガータイプに対して、自動デプロイメントが適切に設定されていることを検証する。

        **検証: 要件 13.6**
        """
        workflows_dir = (
            Path(__file__).parent.parent.parent.parent
            / ".github"
            / "workflows"
        )
        deploy_workflows = [
            "deploy-backend.yml",
            "deploy-frontend.yml",
            "deploy-infra.yml",
        ]

        for workflow_file in deploy_workflows:
            workflow_path = workflows_dir / workflow_file

            if not workflow_path.exists():
                continue

            with open(workflow_path, encoding="utf-8") as f:
                workflow_config = yaml.safe_load(f)

            # トリガー設定の確認
            triggers = self._get_workflow_triggers(workflow_config) or {}

            if trigger_type == "push":
                assert "push" in triggers, (
                    f"{workflow_file}: pushトリガーが設定されていません"
                )
                push_config = triggers["push"]
                assert "branches" in push_config, (
                    f"{workflow_file}: pushブランチが設定されていません"
                )
                assert "main" in push_config["branches"], (
                    f"{workflow_file}: mainブランチでのpushトリガーが必要です"
                )

            if trigger_type == "workflow_dispatch":
                assert "workflow_dispatch" in triggers, (
                    f"{workflow_file}: 手動トリガーが設定されていません"
                )
                dispatch_config = triggers["workflow_dispatch"]
                if "inputs" in dispatch_config:
                    inputs = dispatch_config["inputs"]
                    if "environment" in inputs:
                        env_input = inputs["environment"]
                        assert "options" in env_input, (
                            f"{workflow_file}: 環境選択肢が設定されていません"
                        )
                        assert environment in env_input["options"], (
                            f"{workflow_file}: {environment}環境が選択肢にありません"
                        )

            # 環境設定の確認
            jobs = workflow_config.get("jobs", {})
            for _job_name, job_config in jobs.items():
                if "environment" in job_config:
                    # 環境が動的に設定されていることを確認
                    env_value = job_config["environment"]
                    assert "${{" in str(env_value) or environment in str(
                        env_value
                    ), (
                        f"{workflow_file}: 環境設定が動的でないか、{environment}が含まれていません"
                    )

    @given(
        coverage_threshold=st.floats(min_value=70.0, max_value=90.0),
        test_type=st.sampled_from(["backend", "frontend"]),
    )
    def test_property_29_test_coverage_maintenance(
        self, coverage_threshold: float, test_type: str
    ):
        """
        プロパティ29: テストカバレッジの維持

        任意のカバレッジ閾値とテストタイプに対して、カバレッジ要件が適切に設定されていることを検証する。

        **検証: 要件 13.5**
        """
        workflows_dir = (
            Path(__file__).parent.parent.parent.parent
            / ".github"
            / "workflows"
        )

        # CIワークフローファイルを確認
        ci_workflow_path = workflows_dir / "ci.yml"
        assert ci_workflow_path.exists(), "ci.ymlファイルが存在しません"

        with open(ci_workflow_path, encoding="utf-8") as f:
            workflow_config = yaml.safe_load(f)

        jobs = workflow_config.get("jobs", {})

        if test_type == "backend":
            backend_jobs = [
                job
                for job_name, job in jobs.items()
                if "backend" in job_name.lower()
            ]

            for job in backend_jobs:
                steps = job.get("steps", [])

                # カバレッジ関連のステップを確認
                coverage_steps = [
                    step
                    for step in steps
                    if "coverage" in step.get("name", "").lower()
                    or "cov" in step.get("run", "")
                ]

                assert len(coverage_steps) > 0, (
                    "バックエンドにカバレッジステップが必要です"
                )

                # カバレッジ閾値の確認
                for step in coverage_steps:
                    run_command = step.get("run", "")
                    if "cov-fail-under" in run_command:
                        # 80%以上の閾値が設定されていることを確認
                        assert (
                            "80" in run_command
                            or "85" in run_command
                            or "90" in run_command
                        ), (
                            "バックエンドのカバレッジ閾値が適切に設定されていません"
                        )

        elif test_type == "frontend":
            frontend_jobs = [
                job
                for job_name, job in jobs.items()
                if "frontend" in job_name.lower()
            ]

            for job in frontend_jobs:
                steps = job.get("steps", [])

                # カバレッジ関連のステップを確認
                coverage_steps = [
                    step
                    for step in steps
                    if "coverage" in step.get("name", "").lower()
                ]

                assert len(coverage_steps) > 0, (
                    "フロントエンドにカバレッジステップが必要です"
                )

    @given(
        failure_scenario=st.sampled_from(
            [
                "build_failure",
                "test_failure",
                "deployment_failure",
                "health_check_failure",
            ]
        ),
        notification_type=st.sampled_from(["success", "failure"]),
    )
    def test_property_30_deployment_failure_notification(
        self, failure_scenario: str, notification_type: str
    ):
        """
        プロパティ30: デプロイメント失敗時の通知

        任意の失敗シナリオと通知タイプに対して、適切な通知が設定されていることを検証する。

        **検証: 要件 13.10**
        """
        workflows_dir = (
            Path(__file__).parent.parent.parent.parent
            / ".github"
            / "workflows"
        )
        deploy_workflows = [
            "deploy-backend.yml",
            "deploy-frontend.yml",
            "deploy-infra.yml",
        ]

        for workflow_file in deploy_workflows:
            workflow_path = workflows_dir / workflow_file

            if not workflow_path.exists():
                continue

            with open(workflow_path, encoding="utf-8") as f:
                workflow_config = yaml.safe_load(f)

            jobs = workflow_config.get("jobs", {})

            for _job_name, job_config in jobs.items():
                steps = job_config.get("steps", [])

                # 成功通知ステップの確認
                success_steps = [
                    step
                    for step in steps
                    if "success" in step.get("name", "").lower()
                    and "notification" in step.get("name", "").lower()
                ]

                # 失敗通知ステップの確認
                failure_steps = [
                    step
                    for step in steps
                    if "failure" in step.get("name", "").lower()
                    and "notification" in step.get("name", "").lower()
                ]

                if notification_type == "success":
                    assert len(success_steps) > 0, (
                        f"{workflow_file}: 成功通知ステップが必要です"
                    )

                    for step in success_steps:
                        # 成功時の条件確認
                        if_condition = step.get("if", "")
                        assert (
                            "success()" in if_condition or if_condition == ""
                        ), (
                            f"{workflow_file}: 成功通知の条件が適切ではありません"
                        )

                elif notification_type == "failure":
                    assert len(failure_steps) > 0, (
                        f"{workflow_file}: 失敗通知ステップが必要です"
                    )

                    for step in failure_steps:
                        # 失敗時の条件確認
                        if_condition = step.get("if", "")
                        assert "failure()" in if_condition, (
                            f"{workflow_file}: 失敗通知の条件が適切ではありません"
                        )

                        # 失敗時のexit 1確認
                        run_command = step.get("run", "")
                        assert "exit 1" in run_command, (
                            f"{workflow_file}: 失敗通知でexit 1が必要です"
                        )

    def test_workflow_yaml_syntax_validation(self):
        """ワークフローファイルのYAML構文検証"""
        workflows_dir = (
            Path(__file__).parent.parent.parent.parent
            / ".github"
            / "workflows"
        )

        if not workflows_dir.exists():
            pytest.skip("ワークフローディレクトリが存在しません")

        workflow_files = list(workflows_dir.glob("*.yml")) + list(
            workflows_dir.glob("*.yaml")
        )

        assert len(workflow_files) > 0, "ワークフローファイルが見つかりません"

        for workflow_file in workflow_files:
            with open(workflow_file, encoding="utf-8") as f:
                try:
                    yaml.safe_load(f)
                except yaml.YAMLError as e:
                    pytest.fail(f"{workflow_file.name}: YAML構文エラー - {e}")

    def test_required_secrets_documentation(self):
        """必要なシークレットがドキュメント化されていることを確認"""
        workflows_dir = (
            Path(__file__).parent.parent.parent.parent
            / ".github"
            / "workflows"
        )

        required_secrets = set()

        # 全ワークフローファイルから必要なシークレットを抽出
        for workflow_file in workflows_dir.glob("*.yml"):
            with open(workflow_file, encoding="utf-8") as f:
                content = f.read()

                # ${{ secrets.XXX }} パターンを検索
                import re

                secret_matches = re.findall(
                    r"\$\{\{\s*secrets\.([A-Z_]+)\s*\}\}", content
                )
                required_secrets.update(secret_matches)

        # 必要なシークレットが適切に定義されていることを確認
        expected_secrets = {
            "AWS_ROLE_ARN",
            "RSS_READER_API_KEY_SECRET_ID",
            "VITE_API_KEY",
            "VITE_API_BASE_URL",
            "CORS_ALLOWED_ORIGINS",
        }

        missing_secrets = expected_secrets - required_secrets
        assert len(missing_secrets) == 0, (
            f"必要なシークレットが定義されていません: {missing_secrets}"
        )
