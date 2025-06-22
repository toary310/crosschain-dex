import { Token } from '@/config/tokens'
import { Address, Hash, TransactionRequest } from 'viem'

// Pool Types
export type PoolType = 'constant_product' | 'stable' | 'weighted' | 'concentrated' | 'meta'
export type PoolStatus = 'active' | 'paused' | 'deprecated' | 'emergency'
export type PoolVersion = 'v2' | 'v3' | 'v4'

// Fee Tiers
export type FeeTier = 100 | 500 | 3000 | 10000 // 0.01%, 0.05%, 0.3%, 1%

// Core Pool Interface
export interface LiquidityPool {
  id: string
  address: Address
  type: PoolType
  version: PoolVersion
  status: PoolStatus
  chainId: number

  // Token Configuration
  tokens: Token[]
  weights?: number[] // For weighted pools
  feeTier: FeeTier

  // Pool State
  reserves: string[]
  totalSupply: string
  tvl: string
  tvlUSD: string

  // Metrics
  volume24h: string
  volume7d: string
  fees24h: string
  fees7d: string
  apr: number
  apy: number

  // Pool Parameters
  swapFee: number
  protocolFee: number
  amplificationParameter?: number // For stable pools
  tickSpacing?: number // For concentrated liquidity

  // Timestamps
  createdAt: number
  lastUpdated: number

  // Additional Data
  metadata?: PoolMetadata
  governance?: PoolGovernance
}

export interface PoolMetadata {
  name: string
  description?: string
  tags: string[]
  verified: boolean
  featured: boolean
  riskLevel: 'low' | 'medium' | 'high'
  category: 'stable' | 'volatile' | 'exotic'
}

export interface PoolGovernance {
  governanceToken?: Token
  votingPower: string
  proposalThreshold: string
  quorum: string
  votingPeriod: number
  executionDelay: number
}

// Liquidity Position
export interface LiquidityPosition {
  id: string
  poolId: string
  userAddress: Address

  // Position Details
  liquidity: string
  shares: string
  sharePercentage: number

  // Token Amounts
  tokenAmounts: string[]
  tokenAmountsUSD: string[]
  totalValueUSD: string

  // Position Metrics
  entryPrice: string[]
  currentPrice: string[]
  pnl: string
  pnlPercentage: number
  impermanentLoss: string
  impermanentLossPercentage: number

  // Rewards
  unclaimedRewards: PositionReward[]
  claimedRewards: PositionReward[]
  totalRewardsUSD: string

  // Timestamps
  createdAt: number
  lastUpdated: number

  // Range (for concentrated liquidity)
  tickLower?: number
  tickUpper?: number
  inRange?: boolean
}

export interface PositionReward {
  token: Token
  amount: string
  amountUSD: string
  apr: number
  source: 'trading_fees' | 'liquidity_mining' | 'governance' | 'boost'
}

// Pool Creation Request
export interface PoolCreationRequest {
  type: PoolType
  tokens: Token[]
  weights?: number[]
  feeTier: FeeTier
  initialAmounts: string[]
  amplificationParameter?: number
  tickSpacing?: number
  metadata?: Partial<PoolMetadata>
}

// Liquidity Operations
export interface AddLiquidityRequest {
  poolId: string
  tokenAmounts: string[]
  minShares: string
  deadline: number
  userAddress: Address
}

export interface RemoveLiquidityRequest {
  poolId: string
  shares: string
  minTokenAmounts: string[]
  deadline: number
  userAddress: Address
}

export interface AddLiquidityResponse {
  success: boolean
  transaction?: TransactionRequest
  expectedShares?: string
  priceImpact?: number
  error?: string
}

export interface RemoveLiquidityResponse {
  success: boolean
  transaction?: TransactionRequest
  expectedAmounts?: string[]
  priceImpact?: number
  error?: string
}

// Pool Analytics
export interface PoolAnalytics {
  poolId: string
  timeframe: '1h' | '24h' | '7d' | '30d' | '90d' | '1y'

  // Volume Metrics
  volume: string
  volumeUSD: string
  volumeChange: number

  // TVL Metrics
  tvl: string
  tvlUSD: string
  tvlChange: number

  // Fee Metrics
  fees: string
  feesUSD: string
  feeAPR: number

  // Trading Metrics
  trades: number
  uniqueTraders: number
  averageTradeSize: string

  // Liquidity Metrics
  liquidityUtilization: number
  liquidityEfficiency: number

  // Price Metrics
  priceChange: number[]
  volatility: number

  // Historical Data
  historicalData: PoolHistoricalData[]
}

export interface PoolHistoricalData {
  timestamp: number
  tvl: string
  volume: string
  fees: string
  price: string[]
  apr: number
}

// Pool Search and Filtering
export interface PoolFilter {
  chainIds?: number[]
  tokens?: Address[]
  types?: PoolType[]
  feeTiers?: FeeTier[]
  minTVL?: string
  maxTVL?: string
  minAPR?: number
  maxAPR?: number
  verified?: boolean
  featured?: boolean
  riskLevels?: ('low' | 'medium' | 'high')[]
}

export interface PoolSort {
  field: 'tvl' | 'volume24h' | 'fees24h' | 'apr' | 'createdAt'
  order: 'asc' | 'desc'
}

export interface PoolSearchRequest {
  query?: string
  filter?: PoolFilter
  sort?: PoolSort
  pagination?: {
    page: number
    limit: number
  }
}

export interface PoolSearchResponse {
  pools: LiquidityPool[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Pool Events
export interface PoolEvent {
  id: string
  poolId: string
  type: 'created' | 'liquidity_added' | 'liquidity_removed' | 'swap' | 'fee_collected' | 'parameter_updated'
  userAddress?: Address
  transactionHash: Hash
  blockNumber: number
  timestamp: number
  data: Record<string, unknown>
}

// Pool Configuration
export interface PoolConfig {
  maxPools: number
  minLiquidity: string
  maxSlippage: number
  defaultFeeTier: FeeTier
  supportedTypes: PoolType[]
  feeRecipient: Address
  protocolFeeRate: number
  emergencyPause: boolean
}

// Pool Factory Interface
export interface PoolFactory {
  createPool(request: PoolCreationRequest): Promise<{ poolId: string; transaction: TransactionRequest }>
  getPool(poolId: string): Promise<LiquidityPool | null>
  getPools(filter?: PoolFilter): Promise<LiquidityPool[]>
  searchPools(request: PoolSearchRequest): Promise<PoolSearchResponse>
}

// Pool Manager Interface
export interface PoolManager {
  addLiquidity(request: AddLiquidityRequest): Promise<AddLiquidityResponse>
  removeLiquidity(request: RemoveLiquidityRequest): Promise<RemoveLiquidityResponse>
  getUserPositions(userAddress: Address, chainId?: number): Promise<LiquidityPosition[]>
  getPosition(positionId: string): Promise<LiquidityPosition | null>
  claimRewards(positionId: string): Promise<{ transaction: TransactionRequest; rewards: PositionReward[] }>
}

// Pool Analytics Interface
export interface PoolAnalyticsService {
  getPoolAnalytics(poolId: string, timeframe: string): Promise<PoolAnalytics>
  getPoolHistory(poolId: string, timeframe: string): Promise<PoolHistoricalData[]>
  getTopPools(metric: 'tvl' | 'volume' | 'fees', limit: number): Promise<LiquidityPool[]>
  getPoolEvents(poolId: string, limit?: number): Promise<PoolEvent[]>
}

// Error Types
export interface PoolError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export type PoolErrorCode =
  | 'POOL_NOT_FOUND'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'SLIPPAGE_EXCEEDED'
  | 'DEADLINE_EXCEEDED'
  | 'INVALID_TOKEN_RATIO'
  | 'POOL_PAUSED'
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_PARAMETERS'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'
