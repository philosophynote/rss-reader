import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

/**
 * RSS Reader メインスタック
 * 
 * RSSリーダーアプリケーションのすべてのAWSリソースを定義します。
 * DynamoDB、Lambda、EventBridge、S3、CloudFrontを含みます。
 */
export class RssReaderStack extends cdk.Stack {
  public readonly table: dynamodb.Table;
  public readonly apiFunction: lambda.DockerImageFunction;
  public readonly frontendBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB テーブル（シングルテーブル設計）
    this.table = new dynamodb.Table(this, 'RssReaderTable', {
      tableName: 'rss-reader',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
      pointInTimeRecovery: true, // バックアップ有効化
    });

    // GSI1: 時系列順ソート用
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: 重要度順ソート用（逆順ソートキーで高スコア順を実現）
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: 作成日時順ソート用（効率的な削除クエリ用）
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI3',
      partitionKey: { name: 'GSI3PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI3SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI4: 既読記事削除用
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI4',
      partitionKey: { name: 'GSI4PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI4SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI5: フィード別記事クエリ用（カスケード削除用）
    this.table.addGlobalSecondaryIndex({
      indexName: 'GSI5',
      partitionKey: { name: 'GSI5PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI5SK', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // TTL設定（自動削除用）
    this.table.addTimeToLive({
      attributeName: 'ttl',
    });

    // Lambda 関数（Python + FastAPI）
    this.apiFunction = new lambda.DockerImageFunction(this, 'ApiFunction', {
      code: lambda.DockerImageCode.fromImageAsset('../backend', {
        file: 'Dockerfile',
      }),
      functionName: 'rss-reader-api',
      description: 'RSS Reader API using FastAPI',
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      architecture: lambda.Architecture.X86_64,
      environment: {
        DYNAMODB_TABLE_NAME: this.table.tableName,
        AWS_REGION: this.region,
        BEDROCK_REGION: 'us-east-1',
        BEDROCK_MODEL_ID: 'amazon.nova-2-multimodal-embeddings-v1:0',
        EMBEDDING_DIMENSION: '1024',
        // 認証関連の環境変数（本番環境では適切な値に変更）
        API_KEY: process.env.RSS_READER_API_KEY || 'default-api-key-change-in-production',
        CORS_ORIGINS: process.env.CORS_ORIGINS || 'https://localhost:3000',
      },
    });

    // DynamoDB 権限
    this.table.grantReadWriteData(this.apiFunction);

    // Bedrock 権限
    this.apiFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
      ],
      resources: ['*'],
    }));

    // Lambda 関数 URL（AWS IAM認証を使用）
    const functionUrl = this.apiFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE, // API Key認証をアプリケーションレベルで実装
      cors: {
        allowedOrigins: [
          'https://localhost:3000',  // 開発環境
          'https://localhost:5173',  // Vite開発サーバー
        ],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ['*'],
        allowCredentials: true,  // 認証情報を含むリクエストを許可
        maxAge: cdk.Duration.hours(1),
      },
    });

    // EventBridge ルール: フィード取得（1時間ごと）
    const fetchRule = new events.Rule(this, 'FeedFetchRule', {
      ruleName: 'rss-reader-feed-fetch',
      description: 'Trigger RSS feed fetching every hour',
      schedule: events.Schedule.rate(cdk.Duration.hours(1)),
      targets: [new targets.LambdaFunction(this.apiFunction, {
        event: events.RuleTargetInput.fromObject({
          action: 'fetch_feeds'
        })
      })],
    });

    // EventBridge ルール: 記事削除（1日1回、深夜2時）
    const cleanupRule = new events.Rule(this, 'CleanupRule', {
      ruleName: 'rss-reader-cleanup',
      description: 'Trigger article cleanup daily at 2 AM JST',
      schedule: events.Schedule.cron({
        hour: '17',  // UTC時間（JST 2:00 AM = UTC 17:00）
        minute: '0',
      }),
      targets: [new targets.LambdaFunction(this.apiFunction, {
        event: events.RuleTargetInput.fromObject({
          action: 'cleanup_articles'
        })
      })],
    });

    // S3 バケット（フロントエンド）
    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `rss-reader-frontend-${this.account}-${this.region}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront ディストリビューション
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // 最も安価な価格クラス
      comment: 'RSS Reader Frontend Distribution',
    });

    // 出力
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB Table ARN',
    });

    new cdk.CfnOutput(this, 'ApiFunctionName', {
      value: this.apiFunction.functionName,
      description: 'Lambda Function Name for API',
    });

    new cdk.CfnOutput(this, 'ApiFunctionArn', {
      value: this.apiFunction.functionArn,
      description: 'Lambda Function ARN for API',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: functionUrl.url,
      description: 'Lambda Function URL for API',
    });

    new cdk.CfnOutput(this, 'FeedFetchRuleName', {
      value: fetchRule.ruleName,
      description: 'EventBridge Rule Name for Feed Fetching',
    });

    new cdk.CfnOutput(this, 'CleanupRuleName', {
      value: cleanupRule.ruleName,
      description: 'EventBridge Rule Name for Article Cleanup',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.frontendBucket.bucketName,
      description: 'S3 Bucket Name for Frontend',
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${this.distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL for Frontend',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });
  }
}