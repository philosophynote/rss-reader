"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RssReaderStack = void 0;
const cdk = require("aws-cdk-lib");
/**
 * RSS Reader メインスタック
 *
 * RSSリーダーアプリケーションのすべてのAWSリソースを定義します。
 * DynamoDB、Lambda、EventBridge、S3、CloudFrontを含みます。
 */
class RssReaderStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // TODO: 次のタスクでDynamoDB、Lambda、EventBridge等のリソースを実装
        // 現在は基本的なスタック構造のみ定義
        new cdk.CfnOutput(this, 'StackName', {
            value: this.stackName,
            description: 'RSS Reader Stack Name',
        });
    }
}
exports.RssReaderStack = RssReaderStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnNzLXJlYWRlci1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJzcy1yZWFkZXItc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBR25DOzs7OztHQUtHO0FBQ0gsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixtREFBbUQ7UUFFbkQsb0JBQW9CO1FBQ3BCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ25DLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUztZQUNyQixXQUFXLEVBQUUsdUJBQXVCO1NBQ3JDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQVpELHdDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG4vKipcbiAqIFJTUyBSZWFkZXIg44Oh44Kk44Oz44K544K/44OD44KvXG4gKiBcbiAqIFJTU+ODquODvOODgOODvOOCouODl+ODquOCseODvOOCt+ODp+ODs+OBruOBmeOBueOBpuOBrkFXU+ODquOCveODvOOCueOCkuWumue+qeOBl+OBvuOBmeOAglxuICogRHluYW1vRELjgIFMYW1iZGHjgIFFdmVudEJyaWRnZeOAgVMz44CBQ2xvdWRGcm9udOOCkuWQq+OBv+OBvuOBmeOAglxuICovXG5leHBvcnQgY2xhc3MgUnNzUmVhZGVyU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBUT0RPOiDmrKHjga7jgr/jgrnjgq/jgadEeW5hbW9EQuOAgUxhbWJkYeOAgUV2ZW50QnJpZGdl562J44Gu44Oq44K944O844K544KS5a6f6KOFXG4gICAgXG4gICAgLy8g54++5Zyo44Gv5Z+65pys55qE44Gq44K544K/44OD44Kv5qeL6YCg44Gu44G/5a6a576pXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1N0YWNrTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnN0YWNrTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUlNTIFJlYWRlciBTdGFjayBOYW1lJyxcbiAgICB9KTtcbiAgfVxufSJdfQ==