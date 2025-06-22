import { Address } from 'viem'
import { Token } from '@/config/tokens'

// Bridge Protocol Types
export type BridgeProtocol = 
  | 'layerzero'
  | 'wormhole' 
  | 'axelar'
  | 'hop'
  | 'across'
  | 'stargate'
  | 'multichain'
  | 'cbridge'
  | 'synapse'

export type BridgeType = 'lock-mint' | 'burn-mint' | 'liquidity' | 'atomic' | 'optimistic'

export interface BridgeInfo {
  protocol: BridgeProtocol
  name: string
  type: BridgeType
  supportedChains: number[]
  website: string
  logoURI: string
  enabled: boolean
  security: SecurityLevel
  avgTime: number // in seconds
  maxAmount: string
  minAmount: string
  feeStructure: BridgeFeeStructure
}

export type SecurityLevel = 'high' | 'medium' | 'low'

export interface BridgeFeeStructure {
  type: 'fixed' | 'percentage' | 'dynamic'
  baseFee: string // in native token
  protocolFee: number // in basis points
  relayerFee?: string // for some protocols
  gasOnDestination?: string
}

// Bridge Route and Quote Types
export interface BridgeRoute {
  protocol: BridgeProtocol
  fromChain: number
  toChain: number
  fromToken: Token
  toToken: Token
  steps: BridgeStep[]
  estimatedTime: number
  confidence: number
}

export interface BridgeStep {
  protocol: BridgeProtocol
  action: 'bridge' | 'swap' | 'wrap' | 'unwrap'
  fromToken: Token
  toToken: Token
  fromAmount: string
  toAmount: string
  gasEstimate: string
  fee: string
  contractAddress: Address
  data?: `0x${string}`
}

export interface BridgeQuote {
  route: BridgeRoute
  fromAmount: string
  toAmount: string
  toAmountMin: string
  totalFee: string
  totalGas: string
  estimatedTime: number
  priceImpact: number
  validUntil: number
  requestId: string
}

export interface BridgeRequest {
  fromToken: Token
  toToken: Token
  fromChain: number
  toChain: number
  amount: string
  userAddress: Address
  slippage: number
  deadline?: number
  protocols?: BridgeProtocol[]
}

export interface BridgeResponse {
  quotes: BridgeQuote[]
  bestQuote?: BridgeQuote
  error?: string
  timestamp: number
  requestId: string
}

// Transaction Types
export interface BridgeTransaction {
  chainId: number
  to: Address
  data: `0x${string}`
  value: string
  gasLimit: string
  gasPrice: string
}

export interface BridgeParams {
  quote: BridgeQuote
  userAddress: Address
  deadline?: number
  permitSignature?: string
}

// Bridge Status and Tracking
export interface BridgeStatus {
  id: string
  status: BridgeStatusType
  fromTxHash?: string
  toTxHash?: string
  fromChain: number
  toChain: number
  fromAmount: string
  toAmount?: string
  estimatedTime: number
  actualTime?: number
  error?: string
  updatedAt: number
}

export type BridgeStatusType = 
  | 'pending'
  | 'confirmed'
  | 'bridging'
  | 'completed'
  | 'failed'
  | 'refunded'

// Protocol-specific types
export interface LayerZeroConfig {
  endpoint: Address
  chainId: number
  confirmations: number
  oracle: Address
  relayer: Address
}

export interface WormholeConfig {
  coreBridge: Address
  tokenBridge: Address
  chainId: number
  consistencyLevel: number
}

export interface AxelarConfig {
  gateway: Address
  gasService: Address
  chainName: string
}

// Bridge Analytics
export interface BridgeAnalytics {
  totalVolume: string
  totalTransactions: number
  averageTime: number
  successRate: number
  popularRoutes: {
    fromChain: number
    toChain: number
    volume: string
    count: number
  }[]
  protocolDistribution: Record<BridgeProtocol, number>
  timeRange: {
    start: number
    end: number
  }
}

// Error Types
export interface BridgeError {
  code: BridgeErrorCode
  message: string
  protocol?: BridgeProtocol
  details?: any
}

export type BridgeErrorCode =
  | 'ROUTE_NOT_FOUND'
  | 'INSUFFICIENT_LIQUIDITY'
  | 'AMOUNT_TOO_SMALL'
  | 'AMOUNT_TOO_LARGE'
  | 'CHAIN_NOT_SUPPORTED'
  | 'TOKEN_NOT_SUPPORTED'
  | 'SLIPPAGE_TOO_HIGH'
  | 'DEADLINE_EXCEEDED'
  | 'BRIDGE_PAUSED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR'

// Configuration Types
export interface BridgeConfig {
  apiKey?: string
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  maxSlippage: number
  defaultDeadline: number
  gasMultiplier: number
}

// Utility Types
export interface ChainInfo {
  chainId: number
  name: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpcUrls: string[]
  blockExplorerUrls: string[]
  iconUrl?: string
}

export interface TokenMapping {
  [chainId: number]: {
    [tokenSymbol: string]: Address
  }
}

// Event Types
export interface BridgeEvent {
  type: 'bridge_initiated' | 'bridge_completed' | 'bridge_failed'
  bridgeId: string
  fromChain: number
  toChain: number
  fromTxHash?: string
  toTxHash?: string
  amount: string
  timestamp: number
  error?: BridgeError
}

// API Response wrapper
export interface BridgeApiResponse<T> {
  success: boolean
  data?: T
  error?: BridgeError
  timestamp: number
  requestId: string
}

// Route optimization types
export interface RouteOptimization {
  optimizeFor: 'speed' | 'cost' | 'security' | 'balanced'
  maxHops: number
  excludeProtocols?: BridgeProtocol[]
  preferredProtocols?: BridgeProtocol[]
}

export interface OptimizedRoute extends BridgeRoute {
  score: number
  reasoning: string[]
  alternatives: BridgeRoute[]
}

// Liquidity and capacity types
export interface LiquidityInfo {
  protocol: BridgeProtocol
  fromChain: number
  toChain: number
  token: Token
  available: string
  capacity: string
  utilization: number
  lastUpdated: number
}

export interface CapacityCheck {
  sufficient: boolean
  available: string
  requested: string
  alternatives?: {
    protocol: BridgeProtocol
    available: string
  }[]
}

// Gas estimation types
export interface GasEstimate {
  chainId: number
  gasLimit: string
  gasPrice: string
  gasCost: string
  gasCostUSD?: number
}

export interface CrossChainGasEstimate {
  sourceChain: GasEstimate
  destinationChain?: GasEstimate
  total: string
  totalUSD?: number
}
