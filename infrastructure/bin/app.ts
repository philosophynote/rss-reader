#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RssReaderStack } from '../lib/rss-reader-stack';

/**
 * RSS Reader CDK アプリケーション
 * 
 * AWS CDKを使用してRSSリーダーのインフラストラクチャを定義します。
 */
const app = new cdk.App();

// 環境設定
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'ap-northeast-1',
};

// メインスタックを作成
new RssReaderStack(app, 'RssReaderStack', {
  env,
  description: 'RSS Reader Infrastructure Stack',
  tags: {
    Project: 'RssReader',
    Environment: process.env.ENVIRONMENT || 'dev',
  },
});