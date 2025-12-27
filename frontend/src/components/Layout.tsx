import { ReactNode } from 'react'
import { Box, Container } from '@chakra-ui/react'

interface LayoutProps {
  children: ReactNode
}

/**
 * アプリケーション全体のレイアウトコンポーネント
 * 
 * ヘッダー、サイドバー、メインコンテンツエリアを提供します。
 */
function Layout({ children }: LayoutProps) {
  return (
    <Box minH="100vh">
      <Container maxW="container.xl" py={4}>
        {children}
      </Container>
    </Box>
  )
}

export default Layout