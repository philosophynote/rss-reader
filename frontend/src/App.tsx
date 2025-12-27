import { Routes, Route } from 'react-router-dom'
import { Box } from '@chakra-ui/react'
import Layout from './components/Layout'

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
          <Route path="/feeds" element={<div>フィード管理画面（実装予定）</div>} />
          <Route path="/articles" element={<div>記事一覧画面（実装予定）</div>} />
          <Route path="/keywords" element={<div>キーワード管理画面（実装予定）</div>} />
        </Routes>
      </Layout>
    </Box>
  )
}

export default App