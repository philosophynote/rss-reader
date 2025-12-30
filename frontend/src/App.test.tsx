import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import chakraSystem from './theme'

/**
 * Appコンポーネントのテスト
 *
 * React 19 + Vitest + React Testing Libraryを使用したテスト例
 */
describe('App', () => {
  const renderApp = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    return render(
      <ChakraProvider value={chakraSystem}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ChakraProvider>
    )
  }

  it('renders without crashing', () => {
    renderApp()
    expect(document.body).toBeInTheDocument()
  })

  it('displays home page content', () => {
    renderApp()
    expect(screen.getByText('ホーム画面（実装予定）')).toBeInTheDocument()
  })
})
