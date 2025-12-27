import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChakraProvider } from '@chakra-ui/react'
import Layout from './Layout'
import chakraSystem from '../theme'

/**
 * Layoutコンポーネントのテスト
 * 
 * Chakra UIコンポーネントのテスト例
 */
describe('Layout', () => {
  const renderLayout = (children: React.ReactNode) => {
    return render(
      <ChakraProvider value={chakraSystem}>
        <Layout>{children}</Layout>
      </ChakraProvider>
    )
  }

  it('renders children correctly', () => {
    const testContent = 'Test Content'
    renderLayout(<div>{testContent}</div>)
    
    expect(screen.getByText(testContent)).toBeInTheDocument()
  })

  it('applies container styling', () => {
    renderLayout(<div>Content</div>)
    
    // Chakra UIのContainerコンポーネントが適用されていることを確認
    const container = screen.getByText('Content').closest('.chakra-container')
    expect(container).toBeInTheDocument()
  })
})
