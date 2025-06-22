import { config } from '@/config/wagmi'
import { StateProvider } from '@/providers/StateProvider'
import { theme } from '@/theme'
import { ChakraProvider } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, RenderOptions } from '@testing-library/react'
import React, { ReactElement } from 'react'
import { WagmiProvider } from 'wagmi'

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  queryClient = createTestQueryClient()
}) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>
          <StateProvider enableOfflineSupport={false}>
            {children}
          </StateProvider>
        </ChakraProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// Custom render function
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    queryClient?: QueryClient
  }
) => {
  const { queryClient, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <TestWrapper queryClient={queryClient}>
        {children}
      </TestWrapper>
    ),
    ...renderOptions,
  })
}

// Mock data generators
export const mockTokenData = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoUri: 'https://example.com/eth.png',
    chainId: 1,
  },
  USDC: {
    address: '0xA0b86a33E6441b8435b662303c0f218C8F8c0c0c',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUri: 'https://example.com/usdc.png',
    chainId: 1,
  },
}

export const mockSwapQuote = {
  fromToken: mockTokenData.ETH,
  toToken: mockTokenData.USDC,
  fromAmount: '1000000000000000000', // 1 ETH
  toAmount: '2500000000', // 2500 USDC
  estimatedGas: '150000',
  gasPrice: '20000000000',
  protocols: [
    { name: 'Uniswap V3', percentage: 60 },
    { name: '1inch', percentage: 40 },
  ],
  route: [
    {
      protocol: 'Uniswap V3',
      fromToken: mockTokenData.ETH.address,
      toToken: mockTokenData.USDC.address,
      fromAmount: '1000000000000000000',
      toAmount: '2500000000',
    },
  ],
  priceImpact: 0.15,
  minimumReceived: '2475000000',
  validUntil: Date.now() + 30000,
}

export const mockPortfolioData = [
  {
    timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    totalValue: 10000,
    pnl: 0,
    pnlPercent: 0,
    date: '2024-01-01',
  },
  {
    timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000,
    totalValue: 10500,
    pnl: 500,
    pnlPercent: 5,
    date: '2024-01-02',
  },
  {
    timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    totalValue: 11000,
    pnl: 1000,
    pnlPercent: 10,
    date: '2024-01-03',
  },
]

export const mockAssetAllocation = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    value: 5000,
    percentage: 50,
    change24h: 5.2,
    color: '#627EEA',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    value: 3000,
    percentage: 30,
    change24h: 0.1,
    color: '#2775CA',
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    value: 2000,
    percentage: 20,
    change24h: -2.3,
    color: '#FF007A',
  },
]

// Test utilities
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.IntersectionObserver = mockIntersectionObserver
}

export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn()
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.ResizeObserver = mockResizeObserver
}

export const mockMatchMedia = (matches = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now()
  renderFn()
  await waitForLoadingToFinish()
  const end = performance.now()
  return end - start
}

export const measureMemoryUsage = () => {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    }
  }
  return null
}

// Accessibility testing utilities
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe } = await import('@axe-core/react')
  const results = await axe(container)
  return results
}

// Visual regression testing utilities
export const takeScreenshot = async (element: HTMLElement, name: string) => {
  // This would integrate with a visual regression testing tool
  // For now, we'll just return a mock
  return {
    name,
    element: element.outerHTML,
    timestamp: Date.now(),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }

