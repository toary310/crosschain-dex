import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChakraProvider } from '@chakra-ui/react'
import { theme } from '@/theme'
import { WagmiProvider } from 'wagmi'
import { config } from '@/config/wagmi'
import { vi } from 'vitest'

// Mock Web3 Provider for testing
const mockQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

interface AllTheProvidersProps {
  children: ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ChakraProvider theme={theme}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={mockQueryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    </ChakraProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Mock wallet connection
export const mockWalletConnection = {
  address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
  isConnected: true,
  isConnecting: false,
  chain: {
    id: 1,
    name: 'Ethereum',
    network: 'homestead',
    nativeCurrency: {
      decimals: 18,
      name: 'Ether',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: { http: ['https://eth.llamarpc.com'] },
      public: { http: ['https://eth.llamarpc.com'] },
    },
  },
}

// Mock token data
export const mockTokens = {
  ETH: {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: '/tokens/eth.png',
    chainId: 1,
    verified: true,
    riskLevel: 'low' as const,
  },
  USDC: {
    address: '0xA0b86a33E6441b8435b662303c0f4d2b7e5c4F8e',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: '/tokens/usdc.png',
    chainId: 1,
    verified: true,
    riskLevel: 'low' as const,
  },
}

// Mock price data
export const mockPrices = {
  ETH: {
    price: 2500.50,
    change24h: 2.5,
    volume24h: 1000000000,
    marketCap: 300000000000,
    lastUpdated: Date.now(),
  },
  USDC: {
    price: 1.00,
    change24h: 0.01,
    volume24h: 500000000,
    marketCap: 50000000000,
    lastUpdated: Date.now(),
  },
}

// Mock swap quote
export const mockSwapQuote = {
  fromToken: mockTokens.ETH,
  toToken: mockTokens.USDC,
  fromAmount: '1000000000000000000', // 1 ETH
  toAmount: '2500500000', // 2500.5 USDC
  price: '2500.5',
  priceImpact: '0.1',
  gasEstimate: '150000',
  route: [
    {
      protocol: '1inch',
      percentage: 100,
      path: [mockTokens.ETH.address, mockTokens.USDC.address],
    },
  ],
  estimatedGas: '150000',
  minimumReceived: '2475495000', // 99% of expected
}

// Test utilities
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0))

export const createMockIntersectionObserver = () => {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.IntersectionObserver = mockIntersectionObserver
}

export const createMockResizeObserver = () => {
  const mockResizeObserver = vi.fn()
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  })
  window.ResizeObserver = mockResizeObserver
}

// Mock localStorage
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock window.matchMedia
export const mockMatchMedia = (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(), // deprecated
  removeListener: vi.fn(), // deprecated
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})

// Setup function for tests
export const setupTests = () => {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(mockMatchMedia),
  })

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  })

  // Mock IntersectionObserver
  createMockIntersectionObserver()

  // Mock ResizeObserver
  createMockResizeObserver()

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
