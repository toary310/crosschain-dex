import { Address } from 'viem'
import { Token } from '@/config/tokens'

// DEX Protocol Types
export type DexProtocol = 
  | 'uniswap-v2' 
  | 'uniswap-v3' 
  | 'sushiswap' 
  | 'pancakeswap' 
  | 'curve' 
  | 'balancer'
  | '1inch'
  | '0x'
  | 'paraswap'
  | 'kyberswap'

export type DexType = 'amm' | 'aggregator' | 'orderbook' | 'hybrid'

export interface DexInfo {
  protocol: DexProtocol
  name: string
  type: DexType
  chainIds: number[]
  website: string
  logoURI: string
  enabled: boolean
  priority: number
  gasMultiplier: number
  feeStructure: FeeStructure
}

export interface FeeStructure {
  type: 'fixed' | 'percentage' | 'dynamic'
  value: number // basis points for percentage, wei for fixed
  recipient?: Address
}

// Quote and Route Types
export interface SwapQuote {
  protocol: DexProtocol
  fromToken: Token
  toToken: Token
  fromAmount: string
  toAmount: string
  toAmountMin: string
  priceImpact: number
  gasEstimate: string
  gasPrice: string
  route: SwapRoute[]
  validUntil: number
  confidence: number
  slippage: number
}

export interface SwapRoute {
  protocol: DexProtocol
  poolAddress: Address
  fromToken: Token
  toToken: Token
  percentage: number // percentage of total amount through this route
  fee: number // pool fee in basis points
  liquidity: string
}

export interface QuoteRequest {
  fromToken: Token
  toToken: Token
  amount: string
  slippage: number
  userAddress?: Address
  chainId: number
  protocols?: DexProtocol[]
  gasPrice?: string
}

export interface QuoteResponse {
  quotes: SwapQuote[]
  bestQuote?: SwapQuote
  error?: string
  timestamp: number
  requestId: string
}

// Transaction Types
export interface SwapTransaction {
  to: Address
  data: `0x${string}`
  value: string
  gasLimit: string
  gasPrice: string
  chainId: number
}

export interface SwapParams {
  quote: SwapQuote
  userAddress: Address
  deadline?: number
  permitSignature?: string
}

// DEX-specific interfaces
export interface UniswapV2Quote extends SwapQuote {
  path: Address[]
  reserves: string[]
}

export interface UniswapV3Quote extends SwapQuote {
  path: `0x${string}` // encoded path
  pools: {
    address: Address
    fee: number
    token0: Address
    token1: Address
    sqrtPriceX96: string
    liquidity: string
    tick: number
  }[]
}

export interface CurveQuote extends SwapQuote {
  poolAddress: Address
  i: number // token index in pool
  j: number // token index in pool
  dy: string // expected output amount
}

export interface OneInchQuote extends SwapQuote {
  tx: {
    from: Address
    to: Address
    data: string
    value: string
    gasPrice: string
    gas: string
  }
}

// Aggregator Response Types
export interface AggregatorQuote {
  aggregator: '1inch' | '0x' | 'paraswap'
  quote: SwapQuote
  transaction?: SwapTransaction
  metadata: {
    apiVersion: string
    requestTime: number
    responseTime: number
    cached: boolean
  }
}

// Error Types
export interface DexError {
  code: string
  message: string
  protocol?: DexProtocol
  details?: any
}

export type DexErrorCode = 
  | 'INSUFFICIENT_LIQUIDITY'
  | 'PRICE_IMPACT_TOO_HIGH'
  | 'SLIPPAGE_TOO_HIGH'
  | 'TOKEN_NOT_SUPPORTED'
  | 'CHAIN_NOT_SUPPORTED'
  | 'AMOUNT_TOO_SMALL'
  | 'AMOUNT_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR'

// Configuration Types
export interface DexConfig {
  apiKey?: string
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  rateLimit: {
    requests: number
    window: number // in milliseconds
  }
  gasMultiplier: number
  maxPriceImpact: number
  maxSlippage: number
}

export interface AggregatorConfig extends DexConfig {
  protocols: DexProtocol[]
  excludeProtocols?: DexProtocol[]
  gasOptimization: boolean
  complexityLimit: number
  parts: number
  mainRouteParts: number
}

// Pool and Liquidity Types
export interface PoolInfo {
  address: Address
  protocol: DexProtocol
  token0: Token
  token1: Token
  fee: number
  liquidity: string
  volume24h: string
  tvl: string
  apr: number
  version: string
}

export interface LiquiditySource {
  protocol: DexProtocol
  pools: PoolInfo[]
  totalLiquidity: string
  enabled: boolean
}

// Market Data Types
export interface MarketData {
  price: number
  priceChange24h: number
  volume24h: number
  liquidity: number
  marketCap: number
  lastUpdated: number
}

export interface TokenPair {
  token0: Token
  token1: Token
  chainId: number
}

export interface PairMarketData extends MarketData {
  pair: TokenPair
  bestPrice: number
  bestProtocol: DexProtocol
  spread: number
}

// Analytics Types
export interface SwapAnalytics {
  totalSwaps: number
  totalVolume: string
  averageSlippage: number
  successRate: number
  averageGasUsed: string
  protocolDistribution: Record<DexProtocol, number>
  popularPairs: TokenPair[]
  timeRange: {
    start: number
    end: number
  }
}

// Webhook and Event Types
export interface SwapEvent {
  type: 'swap_initiated' | 'swap_completed' | 'swap_failed'
  transactionHash?: string
  quote: SwapQuote
  actualOutput?: string
  gasUsed?: string
  timestamp: number
  error?: DexError
}

export interface PriceUpdateEvent {
  type: 'price_update'
  pair: TokenPair
  oldPrice: number
  newPrice: number
  change: number
  timestamp: number
}

// Utility Types
export type SortBy = 'output' | 'gas' | 'priceImpact' | 'confidence'
export type SortOrder = 'asc' | 'desc'

export interface QuoteFilters {
  minOutput?: string
  maxPriceImpact?: number
  maxGas?: string
  protocols?: DexProtocol[]
  excludeProtocols?: DexProtocol[]
}

export interface QuoteSorting {
  sortBy: SortBy
  order: SortOrder
}

// Response wrapper for API consistency
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: DexError
  timestamp: number
  requestId: string
}
