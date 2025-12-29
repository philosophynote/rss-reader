import { Routes, Route } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import Layout from './components/Layout'
import ArticleManagementPage from './features/articles/ArticleManagementPage'
import FeedManagementPage from './features/feeds/FeedManagementPage'

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
          <Route path="/" element={<div>ホーム画面（実装予定）</div>} />
          <Route path="/feeds" element={<FeedManagementPage />} />
          <Route path="/articles" element={<ArticleManagementPage />} />
          <Route path="/keywords" element={<div>キーワード管理画面（実装予定）</div>} />
        </Routes>
      </Layout>
    </Box>
  )
}

export default App
