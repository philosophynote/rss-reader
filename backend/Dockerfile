# AWS Lambda Web Adapter用のDockerfile
FROM public.ecr.aws/lambda/python:3.14

# AWS Lambda Web Adapterをインストール
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.7.2 /lambda-adapter /opt/extensions/lambda-adapter

# 作業ディレクトリを設定
WORKDIR ${LAMBDA_TASK_ROOT}

# uvをインストール
RUN pip install uv

# 依存関係ファイルをコピー
COPY pyproject.toml uv.lock* ./

# 依存関係をインストール
RUN uv sync --frozen --no-dev

# アプリケーションコードをコピー
COPY app/ ./app/

# 環境変数を設定
ENV AWS_LWA_ENABLE_COMPRESSION=true
ENV AWS_LWA_INVOKE_MODE=response_stream
ENV PORT=8000

# FastAPIアプリケーションを起動
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
