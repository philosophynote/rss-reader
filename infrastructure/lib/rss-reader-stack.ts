import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * RSS Reader メインスタック
 * 
 * RSSリーダーアプリケーションのすべてのAWSリソースを定義します。
 * DynamoDB、Lambda、EventBridge、S3、CloudFrontを含みます。
 */
export class RssReaderStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TODO: 次のタスクでDynamoDB、Lambda、EventBridge等のリソースを実装
    
    // 現在は基本的なスタック構造のみ定義
    new cdk.CfnOutput(this, 'StackName', {
      value: this.stackName,
      description: 'RSS Reader Stack Name',
    });
  }
}