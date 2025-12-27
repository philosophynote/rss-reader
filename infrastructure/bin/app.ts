#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RssReaderStack } from '../lib/rss-reader-stack';

/**
 * 環境設定の型定義
 */
interface EnvironmentConfig {
  account: string | undefined;
  region: string;
  stackName: string;
  tags: Record<string, string>;
}

/**
 * RSS Reader CDK アプリケーション
 * 
 * AWS CDKを使用してRSSリーダーのインフラストラクチャを定義します。
 */
const app = new cdk.App();

// 環境設定を取得
const environment = app.node.tryGetContext('environment') || process.env.ENVIRONMENT || 'development';

// 環境別設定
const envConfig: Record<'development' | 'production', EnvironmentConfig> = {
  development: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    stackName: 'RssReaderStack-Dev',
    tags: {
      Project: 'RssReader',
      Environment: 'development',
    },
  },
  production: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
    stackName: 'RssReaderStack-Prod',
    tags: {
      Project: 'RssReader',
      Environment: 'production',
    },
  },
};

const config = envConfig[environment as keyof typeof envConfig] || envConfig.development;

// メインスタックを作成
new RssReaderStack(app, config.stackName, {
  env: {
    account: config.account,
    region: config.region,
  },
  description: `RSS Reader Infrastructure Stack (${environment})`,
  tags: config.tags,
});