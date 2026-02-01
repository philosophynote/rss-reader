# syntax=docker/dockerfile:1.6
FROM public.ecr.aws/lambda/python:3.14 AS builder

# uv（公式バイナリ）
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 作業ディレクトリ
WORKDIR ${LAMBDA_TASK_ROOT}

# 依存定義のみ先にコピー（キャッシュ最適化）
COPY pyproject.toml uv.lock README.md ./

# アプリケーションコード
COPY app ./app

# uv キャッシュを build cache として利用
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync \
      --frozen \
      --no-dev \
      --python-preference=system \
      --compile-bytecode

FROM public.ecr.aws/lambda/python:3.14

# AWS Lambda Web Adapter（最新版推奨）
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
  /lambda-adapter /opt/extensions/lambda-adapter

# 作業ディレクトリ
WORKDIR ${LAMBDA_TASK_ROOT}

# 依存関係とアプリケーションをコピー
COPY --from=builder ${LAMBDA_TASK_ROOT} ${LAMBDA_TASK_ROOT}

# venv を有効化
ENV VIRTUAL_ENV=${LAMBDA_TASK_ROOT}/.venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

# Lambda Web Adapter 設定
ENV AWS_LWA_ENABLE_COMPRESSION=true
ENV AWS_LWA_INVOKE_MODE=buffered
ENV PORT=8000

# uv は使わず、python を直接起動（Lambdaの既定entrypointを上書き）
ENTRYPOINT ["python", "-m", "uvicorn", "app.main:app", "--host=0.0.0.0", "--port=8000"]
