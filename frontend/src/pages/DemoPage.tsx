import {
  Box,
  Heading,
  VStack,
  Card,
  Text,
  Tabs,
  Badge,
  HStack,
} from "@chakra-ui/react";
import { FeedForm } from "../components/feeds/FeedForm";
import { KeywordForm } from "../components/keywords/KeywordForm";
import { ArticleStatusBadge } from "../components/articles/ArticleStatusBadge";
import type { Article } from "../api";

/**
 * 動作確認用デモページ
 *
 * 実装済みのコンポーネントを表示して動作確認できます
 */
export function DemoPage() {
  // デモ用の記事データ
  const demoArticles: Article[] = [
    {
      article_id: "1",
      feed_id: "feed1",
      title: "高重要度の記事",
      link: "https://example.com/article1",
      content: "This is a sample article with high importance score.",
      published_at: "2024-01-01T00:00:00Z",
      is_read: false,
      is_saved: false,
      importance_score: 0.85,
      created_at: "2024-01-01T00:00:00Z",
    },
    {
      article_id: "2",
      feed_id: "feed1",
      title: "中重要度の記事（既読・保存済み）",
      link: "https://example.com/article2",
      content: "This is a sample article with medium importance score.",
      published_at: "2024-01-02T00:00:00Z",
      is_read: true,
      is_saved: true,
      importance_score: 0.55,
      created_at: "2024-01-02T00:00:00Z",
    },
    {
      article_id: "3",
      feed_id: "feed1",
      title: "低重要度の記事（既読）",
      link: "https://example.com/article3",
      content: "This is a sample article with low importance score.",
      published_at: "2024-01-03T00:00:00Z",
      is_read: true,
      is_saved: false,
      importance_score: 0.25,
      created_at: "2024-01-03T00:00:00Z",
    },
  ];

  return (
    <Box p={6}>
      <VStack gap={6} align="stretch">
        {/* ヘッダー */}
        <Box>
          <Heading size="2xl" mb={2}>
            動作確認デモページ
          </Heading>
          <Text color="gray.600">
            実装済みのコンポーネントを確認できます（バックエンド未実装のため、フォーム送信は機能しません）
          </Text>
        </Box>

        {/* タブでコンポーネントを切り替え */}
        <Tabs.Root defaultValue="forms" variant="enclosed">
          <Tabs.List>
            <Tabs.Trigger value="forms">フォーム</Tabs.Trigger>
            <Tabs.Trigger value="badges">バッジ</Tabs.Trigger>
            <Tabs.Trigger value="about">このページについて</Tabs.Trigger>
          </Tabs.List>

          {/* フォームタブ */}
          <Tabs.Content value="forms">
            <VStack gap={6} align="stretch" mt={6}>
              {/* フィード追加フォーム */}
              <Card.Root>
                <Card.Header>
                  <Heading size="lg">フィード追加フォーム</Heading>
                  <Text color="gray.600" mt={2}>
                    バリデーション、ローディング状態、エラー表示を確認できます
                  </Text>
                </Card.Header>
                <Card.Body>
                  <FeedForm
                    onSuccess={() =>
                      alert("成功コールバックが呼ばれました（実際のAPI呼び出しは失敗します）")
                    }
                    onCancel={() => alert("キャンセルされました")}
                  />
                </Card.Body>
              </Card.Root>

              {/* キーワード追加フォーム */}
              <Card.Root>
                <Card.Header>
                  <Heading size="lg">キーワード追加フォーム</Heading>
                  <Text color="gray.600" mt={2}>
                    NumberInput、バリデーション、エラー表示を確認できます
                  </Text>
                </Card.Header>
                <Card.Body>
                  <KeywordForm
                    onSuccess={() =>
                      alert("成功コールバックが呼ばれました（実際のAPI呼び出しは失敗します）")
                    }
                    onCancel={() => alert("キャンセルされました")}
                  />
                </Card.Body>
              </Card.Root>
            </VStack>
          </Tabs.Content>

          {/* バッジタブ */}
          <Tabs.Content value="badges">
            <VStack gap={6} align="stretch" mt={6}>
              <Card.Root>
                <Card.Header>
                  <Heading size="lg">記事ステータスバッジ</Heading>
                  <Text color="gray.600" mt={2}>
                    記事の状態（未読/既読、保存、重要度スコア）を表示します
                  </Text>
                </Card.Header>
                <Card.Body>
                  <VStack gap={4} align="stretch">
                    {demoArticles.map((article) => (
                      <Box
                        key={article.article_id}
                        p={4}
                        borderWidth="1px"
                        borderRadius="md"
                      >
                        <VStack align="stretch" gap={2}>
                          <Text fontWeight="bold">{article.title}</Text>
                          <ArticleStatusBadge article={article} />
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </Card.Body>
              </Card.Root>
            </VStack>
          </Tabs.Content>

          {/* このページについてタブ */}
          <Tabs.Content value="about">
            <VStack gap={6} align="stretch" mt={6}>
              <Card.Root>
                <Card.Header>
                  <Heading size="lg">このページについて</Heading>
                </Card.Header>
                <Card.Body>
                  <VStack gap={4} align="stretch">
                    <Box>
                      <Heading size="md" mb={2}>
                        実装状況
                      </Heading>
                      <VStack gap={2} align="stretch">
                        <HStack>
                          <Badge colorPalette="green">完了</Badge>
                          <Text>フロントエンドUI実装</Text>
                        </HStack>
                        <HStack>
                          <Badge colorPalette="green">完了</Badge>
                          <Text>Chakra UI v3 移行</Text>
                        </HStack>
                        <HStack>
                          <Badge colorPalette="green">完了</Badge>
                          <Text>ユニットテスト（59/59 passed）</Text>
                        </HStack>
                        <HStack>
                          <Badge colorPalette="yellow">未実装</Badge>
                          <Text>バックエンドAPI</Text>
                        </HStack>
                        <HStack>
                          <Badge colorPalette="yellow">未実装</Badge>
                          <Text>インフラストラクチャ（AWS CDK）</Text>
                        </HStack>
                      </VStack>
                    </Box>

                    <Box>
                      <Heading size="md" mb={2}>
                        確認できる機能
                      </Heading>
                      <VStack gap={2} align="stretch">
                        <Text>✅ Chakra UI v3 コンポーネント表示</Text>
                        <Text>✅ フォームバリデーション</Text>
                        <Text>✅ エラー表示</Text>
                        <Text>✅ ローディング状態</Text>
                        <Text>✅ レスポンシブデザイン</Text>
                        <Text>⚠️ API通信（バックエンド未実装のためエラーになります）</Text>
                      </VStack>
                    </Box>

                    <Box>
                      <Heading size="md" mb={2}>
                        技術スタック
                      </Heading>
                      <VStack gap={2} align="stretch">
                        <Text>• React 19.2.3</Text>
                        <Text>• TypeScript 5.9</Text>
                        <Text>• Chakra UI v3.30</Text>
                        <Text>• TanStack Query v5</Text>
                        <Text>• React Router v7</Text>
                        <Text>• Vitest + Testing Library</Text>
                      </VStack>
                    </Box>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </VStack>
          </Tabs.Content>
        </Tabs.Root>
      </VStack>
    </Box>
  );
}
