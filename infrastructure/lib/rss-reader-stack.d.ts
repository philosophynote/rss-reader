import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
/**
 * RSS Reader メインスタック
 *
 * RSSリーダーアプリケーションのすべてのAWSリソースを定義します。
 * DynamoDB、Lambda、EventBridge、S3、CloudFrontを含みます。
 */
export declare class RssReaderStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
