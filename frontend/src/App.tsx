import { Routes, Route, Navigate } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import Layout from './components/Layout'
import { ArticleList } from './components/articles'
import { FeedList } from './components/feeds'
import { KeywordList } from './components/keywords'

/**
 * メインアプリケーションコンポーネント
 *
 * ルーティングとレイアウトを管理します。
 */
function App() {
  return (
    <Box minH="100vh" bg="gray.50">
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/articles" replace />} />
          <Route path="/feeds" element={<FeedList />} />
          <Route path="/articles" element={<ArticleList />} />
          <Route path="/keywords" element={<KeywordList />} />
        </Routes>
      </Layout>
    </Box>
  )
}

export default App
