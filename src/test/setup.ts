import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = 'test-project-id'
process.env.NEXT_PUBLIC_ALCHEMY_API_KEY = 'test-alchemy-key'
process.env.NEXT_PUBLIC_1INCH_API_KEY = 'test-1inch-key'
process.env.NEXT_PUBLIC_ENVIRONMENT = 'test'

// Mock Web3 APIs
global.fetch = vi.fn()

// Mock crypto.getRandomValues for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    },
  },
})

// Mock WebSocket for real-time features
global.WebSocket = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1, // OPEN
}))

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: undefined,
    isConnected: false,
    isConnecting: false,
    isDisconnected: true,
  }),
  useBalance: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
  useChainId: () => 1,
  useConnect: () => ({
    connect: vi.fn(),
    connectors: [],
    isLoading: false,
    error: null,
  }),
  useDisconnect: () => ({
    disconnect: vi.fn(),
  }),
  WagmiProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock RainbowKit
vi.mock('@rainbow-me/rainbowkit', () => ({
  ConnectButton: () => 'Connect Wallet',
  RainbowKitProvider: ({ children }: { children: any }) => children,
  lightTheme: () => ({}),
  darkTheme: () => ({}),
}))

// Suppress console warnings in tests
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = vi.fn()
  console.error = vi.fn()
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null
  rootMargin = ''
  thresholds = []

  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() { return [] }
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
