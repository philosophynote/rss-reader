# AWS Lambda Web Adapter用のDockerfile
FROM public.ecr.aws/lambda/python:3.14

# AWS Lambda Web Adapterをインストール
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.7.2 /lambda-adapter /opt/extensions/lambda-adapter

# 作業ディレクトリを設定
WORKDIR ${LAMBDA_TASK_ROOT}

# セキュリティ強化: 非rootユーザーでの実行準備
# Lambda環境では既にsbx_user1051が使用されるため、追加設定は不要

# uvをインストール（最新版を使用）
RUN pip install --no-cache-dir uv

# 依存関係ファイルをコピー
COPY pyproject.toml uv.lock* ./

# 依存関係をインストール（本番環境用、開発依存関係を除外）
RUN uv sync --frozen --no-dev --no-cache

# アプリケーションコードをコピー
COPY app/ ./app/

# AWS Lambda Web Adapterの環境変数を設定
ENV AWS_LWA_ENABLE_COMPRESSION=true
ENV AWS_LWA_INVOKE_MODE=response_stream
ENV AWS_LWA_READINESS_CHECK_PATH=/health
ENV AWS_LWA_READINESS_CHECK_PORT=8000
ENV PORT=8000

# アプリケーション環境変数（デフォルト値、実行時に上書き可能）
# 認証関連の環境変数
ENV API_KEY=""
ENV CORS_ORIGINS="http://localhost:3000"
ENV ENVIRONMENT="production"

# DynamoDB関連の環境変数
ENV DYNAMODB_TABLE_NAME=""
ENV AWS_REGION="us-east-1"

# AWS Bedrock関連の環境変数
ENV BEDROCK_REGION="us-east-1"
ENV BEDROCK_MODEL_ID="amazon.nova-2-multimodal-embeddings-v1:0"
ENV EMBEDDING_DIMENSION="1024"

# セキュリティヘッダーの設定
ENV SECURITY_HEADERS_ENABLED="true"

# ログレベルの設定
ENV LOG_LEVEL="INFO"

# ヘルスチェック（Lambda環境では使用されないが、ローカルテスト用）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# FastAPIアプリケーションを起動
# uvicornのワーカー数は1（Lambdaは単一リクエスト処理）
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--log-level", "info"]