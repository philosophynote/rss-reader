#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("source-map-support/register");
const cdk = require("aws-cdk-lib");
const rss_reader_stack_1 = require("../lib/rss-reader-stack");
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
new rss_reader_stack_1.RssReaderStack(app, 'RssReaderStack', {
    env,
    description: 'RSS Reader Infrastructure Stack',
    tags: {
        Project: 'RssReader',
        Environment: process.env.ENVIRONMENT || 'dev',
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHVDQUFxQztBQUNyQyxtQ0FBbUM7QUFDbkMsOERBQXlEO0FBRXpEOzs7O0dBSUc7QUFDSCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixPQUFPO0FBQ1AsTUFBTSxHQUFHLEdBQUc7SUFDVixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7SUFDeEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksZ0JBQWdCO0NBQzNELENBQUM7QUFFRixhQUFhO0FBQ2IsSUFBSSxpQ0FBYyxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRTtJQUN4QyxHQUFHO0lBQ0gsV0FBVyxFQUFFLGlDQUFpQztJQUM5QyxJQUFJLEVBQUU7UUFDSixPQUFPLEVBQUUsV0FBVztRQUNwQixXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksS0FBSztLQUM5QztDQUNGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAnc291cmNlLW1hcC1zdXBwb3J0L3JlZ2lzdGVyJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBSc3NSZWFkZXJTdGFjayB9IGZyb20gJy4uL2xpYi9yc3MtcmVhZGVyLXN0YWNrJztcblxuLyoqXG4gKiBSU1MgUmVhZGVyIENESyDjgqLjg5fjg6rjgrHjg7zjgrfjg6fjg7NcbiAqIFxuICogQVdTIENES+OCkuS9v+eUqOOBl+OBplJTU+ODquODvOODgOODvOOBruOCpOODs+ODleODqeOCueODiOODqeOCr+ODgeODo+OCkuWumue+qeOBl+OBvuOBmeOAglxuICovXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyDnkrDlooPoqK3lrppcbmNvbnN0IGVudiA9IHtcbiAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfHwgJ2FwLW5vcnRoZWFzdC0xJyxcbn07XG5cbi8vIOODoeOCpOODs+OCueOCv+ODg+OCr+OCkuS9nOaIkFxubmV3IFJzc1JlYWRlclN0YWNrKGFwcCwgJ1Jzc1JlYWRlclN0YWNrJywge1xuICBlbnYsXG4gIGRlc2NyaXB0aW9uOiAnUlNTIFJlYWRlciBJbmZyYXN0cnVjdHVyZSBTdGFjaycsXG4gIHRhZ3M6IHtcbiAgICBQcm9qZWN0OiAnUnNzUmVhZGVyJyxcbiAgICBFbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2RldicsXG4gIH0sXG59KTsiXX0=