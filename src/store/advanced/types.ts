// Advanced Store Types for ChainBridge DEX
import { Token } from '@/config/tokens'
import { Address } from 'viem'
import { StateCreator } from 'zustand'

// Base store slice interface
export interface StoreSlice<T> {
  state: T
  actions: Record<string, (...args: any[]) => void>
  selectors: Record<string, (state: any) => any>
}

// User preferences and settings
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'ja' | 'zh' | 'ko'
  currency: 'USD' | 'EUR' | 'JPY' | 'ETH' | 'BTC'
  slippageTolerance: number
  transactionDeadline: number
  gasPrice: 'slow' | 'standard' | 'fast' | 'custom'
  customGasPrice?: string
  notifications: {
    browser: boolean
    email: boolean
    priceAlerts: boolean
    transactionUpdates: boolean
  }
  privacy: {
    analytics: boolean
    crashReports: boolean
    performanceData: boolean
  }
}

// Trading state
export interface TradingState {
  fromToken?: Token
  toToken?: Token
  fromAmount: string
  toAmount: string
  isLoading: boolean
  lastQuote?: {
    rate: number
    priceImpact: number
    minimumReceived: string
    fees: {
      network: string
      protocol: string
    }
    route: Array<{
      protocol: string
      tokenIn: Token
      tokenOut: Token
      percentage: number
    }>
    timestamp: number
  }
  slippage: number
  deadline: number
  expertMode: boolean
  multihop: boolean
}

// Portfolio state
export interface PortfolioState {
  totalValue: string
  totalValueChange24h: number
  tokens: Array<{
    token: Token
    balance: string
    value: string
    change24h: number
    allocation: number
  }>
  positions: Array<{
    id: string
    protocol: string
    type: 'liquidity' | 'lending' | 'staking' | 'farming'
    tokens: Token[]
    value: string
    apy: number
    rewards: Array<{
      token: Token
      amount: string
      value: string
    }>
    status: 'active' | 'inactive' | 'pending'
  }>
  transactions: Array<{
    id: string
    type: 'swap' | 'add_liquidity' | 'remove_liquidity' | 'stake' | 'unstake'
    tokens: Token[]
    amounts: string[]
    value: string
    fee: string
    timestamp: number
    status: 'pending' | 'confirmed' | 'failed'
    hash?: string
  }>
  isLoading: boolean
  lastUpdated: number
}

// Market data state
export interface MarketState {
  prices: Record<string, {
    price: number
    change24h: number
    volume24h: number
    marketCap: number
    lastUpdated: number
  }>
  trending: Array<{
    token: Token
    change24h: number
    volume24h: number
    rank: number
  }>
  topGainers: Array<{
    token: Token
    change24h: number
    volume24h: number
  }>
  topLosers: Array<{
    token: Token
    change24h: number
    volume24h: number
  }>
  isLoading: boolean
  lastUpdated: number
}

// Notification types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: number
  read: boolean
  persistent: boolean
  actions?: Array<{
    label: string
    action: () => void
  }>
}

// Notification state
export interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  settings: {
    enabled: boolean
    sound: boolean
    desktop: boolean
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  }
}

// Connection state
export interface ConnectionState {
  isConnected: boolean
  address?: Address
  chainId?: number
  connector?: string
  balance?: string
  ensName?: string
  avatar?: string
  isConnecting: boolean
  isReconnecting: boolean
  error?: string
  supportedChains: number[]
  pendingChainId?: number
}

// Analytics state
export interface AnalyticsState {
  pageViews: Record<string, number>
  events: Array<{
    name: string
    properties: Record<string, any>
    timestamp: number
  }>
  performance: {
    loadTime: number
    renderTime: number
    interactionTime: number
    errors: Array<{
      message: string
      stack: string
      timestamp: number
    }>
  }
  userJourney: Array<{
    page: string
    timestamp: number
    duration: number
    actions: Array<{
      type: string
      target: string
      timestamp: number
    }>
  }>
}

// Cache state
export interface CacheState {
  queries: Record<string, {
    data: any
    timestamp: number
    ttl: number
    stale: boolean
  }>
  mutations: Record<string, {
    status: 'idle' | 'loading' | 'success' | 'error'
    data?: any
    error?: string
    timestamp: number
  }>
  invalidations: string[]
}

// Root store state
export interface RootState {
  user: UserPreferences
  trading: TradingState
  portfolio: PortfolioState
  market: MarketState
  notifications: NotificationState
  connection: ConnectionState
  analytics: AnalyticsState
  cache: CacheState
}

// Store actions
export interface StoreActions {
  // User actions
  updateUserPreferences: (preferences: Partial<UserPreferences>) => void
  resetUserPreferences: () => void

  // Trading actions
  setFromToken: (token: Token) => void
  setToToken: (token: Token) => void
  setFromAmount: (amount: string) => void
  setToAmount: (amount: string) => void
  swapTokens: () => void
  updateQuote: (quote: TradingState['lastQuote']) => void
  setSlippage: (slippage: number) => void
  setDeadline: (deadline: number) => void
  toggleExpertMode: () => void
  resetTradingState: () => void

  // Portfolio actions
  updatePortfolio: (portfolio: Partial<PortfolioState>) => void
  addTransaction: (transaction: PortfolioState['transactions'][0]) => void
  updateTransaction: (id: string, updates: Partial<PortfolioState['transactions'][0]>) => void
  refreshPortfolio: () => Promise<void>

  // Market actions
  updatePrices: (prices: MarketState['prices']) => void
  updateTrending: (trending: MarketState['trending']) => void
  refreshMarketData: () => Promise<void>

  // Notification actions
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotifications: () => void
  updateNotificationSettings: (settings: Partial<NotificationState['settings']>) => void

  // Connection actions
  setConnection: (connection: Partial<ConnectionState>) => void
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>

  // Analytics actions
  trackPageView: (page: string) => void
  trackEvent: (name: string, properties?: Record<string, any>) => void
  trackError: (error: Error) => void
  updatePerformance: (metrics: Partial<AnalyticsState['performance']>) => void

  // Cache actions
  setQueryData: (key: string, data: any, ttl?: number) => void
  getQueryData: (key: string) => any
  invalidateQuery: (key: string) => void
  invalidateQueries: (pattern: string) => void
  clearCache: () => void
}

// Store selectors
export interface StoreSelectors {
  // User selectors
  getTheme: () => UserPreferences['theme']
  getLanguage: () => UserPreferences['language']
  getSlippageTolerance: () => number

  // Trading selectors
  getTradingPair: () => { from?: Token; to?: Token }
  getTradeAmounts: () => { from: string; to: string }
  getLastQuote: () => TradingState['lastQuote']
  canTrade: () => boolean

  // Portfolio selectors
  getTotalValue: () => string
  getTotalValueChange: () => number
  getTokenBalances: () => PortfolioState['tokens']
  getActivePositions: () => PortfolioState['positions']
  getPendingTransactions: () => PortfolioState['transactions']

  // Market selectors
  getTokenPrice: (address: string) => number | undefined
  getTrendingTokens: () => MarketState['trending']
  getTopGainers: () => MarketState['topGainers']
  getTopLosers: () => MarketState['topLosers']

  // Notification selectors
  getUnreadNotifications: () => NotificationState['notifications']
  getUnreadCount: () => number

  // Connection selectors
  isConnected: () => boolean
  getAddress: () => Address | undefined
  getChainId: () => number | undefined
  getBalance: () => string | undefined

  // Analytics selectors
  getPageViews: () => Record<string, number>
  getRecentEvents: () => AnalyticsState['events']
  getPerformanceMetrics: () => AnalyticsState['performance']

  // Cache selectors
  isQueryStale: (key: string) => boolean
  getQueryStatus: (key: string) => 'fresh' | 'stale' | 'missing'
}

// Combined store interface
export interface Store extends RootState, StoreActions, StoreSelectors {
  getState: () => Store
  setState: (partial: Partial<Store> | ((state: Store) => Partial<Store>)) => void
  subscribe: (listener: (state: Store, prevState: Store) => void) => () => void
}

// Store slice creator type
export type StoreSliceCreator<T> = StateCreator<
  Store,
  [],
  [],
  T
>
