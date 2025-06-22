import { Address, Hash } from 'viem'
import { Token } from '@/config/tokens'

// Transaction Types
export type TransactionType = 'swap' | 'bridge' | 'approve' | 'wrap' | 'unwrap' | 'add_liquidity' | 'remove_liquidity'

export type TransactionStatus = 
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'replaced'

export type TransactionPriority = 'low' | 'medium' | 'high' | 'urgent'

// Core Transaction Interface
export interface Transaction {
  id: string
  type: TransactionType
  status: TransactionStatus
  priority: TransactionPriority
  chainId: number
  userAddress: Address
  hash?: Hash
  nonce?: number
  
  // Transaction data
  to: Address
  data: `0x${string}`
  value: string
  gasLimit: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  
  // Metadata
  fromToken?: Token
  toToken?: Token
  fromAmount?: string
  toAmount?: string
  slippage?: number
  deadline?: number
  
  // Timing
  createdAt: number
  submittedAt?: number
  confirmedAt?: number
  completedAt?: number
  
  // Error handling
  error?: TransactionError
  retryCount: number
  maxRetries: number
  
  // Dependencies
  dependsOn?: string[] // Transaction IDs this depends on
  blockedBy?: string[] // Transaction IDs blocking this one
  
  // Simulation results
  simulation?: TransactionSimulation
  
  // User preferences
  userSettings?: TransactionSettings
}

export interface TransactionError {
  code: string
  message: string
  details?: any
  recoverable: boolean
  suggestedAction?: string
  timestamp: number
}

export interface TransactionSimulation {
  success: boolean
  gasUsed: string
  gasPrice: string
  effectiveGasPrice: string
  balanceChanges: BalanceChange[]
  events: SimulatedEvent[]
  revertReason?: string
  warnings: string[]
}

export interface BalanceChange {
  token: Token
  address: Address
  before: string
  after: string
  delta: string
}

export interface SimulatedEvent {
  address: Address
  topics: string[]
  data: string
  decoded?: {
    name: string
    args: Record<string, any>
  }
}

export interface TransactionSettings {
  gasStrategy: 'slow' | 'standard' | 'fast' | 'custom'
  slippageProtection: boolean
  mevProtection: boolean
  autoRetry: boolean
  maxRetries: number
  retryDelay: number
  deadline: number
}

// Transaction Request
export interface TransactionRequest {
  type: TransactionType
  chainId: number
  userAddress: Address
  to: Address
  data: `0x${string}`
  value?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  priority?: TransactionPriority
  fromToken?: Token
  toToken?: Token
  fromAmount?: string
  toAmount?: string
  slippage?: number
  deadline?: number
  dependsOn?: string[]
  settings?: Partial<TransactionSettings>
  simulate?: boolean
}

// Transaction Response
export interface TransactionResponse {
  success: boolean
  transaction?: Transaction
  error?: TransactionError
  simulation?: TransactionSimulation
  estimatedGas?: string
  estimatedTime?: number
}

// Batch Transaction
export interface BatchTransaction {
  id: string
  transactions: Transaction[]
  status: TransactionStatus
  createdAt: number
  completedAt?: number
  failedTransactions: string[]
  successfulTransactions: string[]
}

// Transaction Events
export interface TransactionEvent {
  type: 'created' | 'submitted' | 'confirmed' | 'completed' | 'failed' | 'cancelled' | 'replaced'
  transactionId: string
  hash?: Hash
  blockNumber?: number
  gasUsed?: string
  effectiveGasPrice?: string
  timestamp: number
  error?: TransactionError
}

// Gas Estimation
export interface GasEstimation {
  gasLimit: string
  gasPrice: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  estimatedCost: string
  estimatedCostUSD?: string
  confidence: number
  strategy: 'slow' | 'standard' | 'fast'
}

// Transaction Pool
export interface TransactionPool {
  pending: Transaction[]
  confirmed: Transaction[]
  failed: Transaction[]
  total: number
  oldestPending?: number
  averageConfirmationTime: number
}

// Nonce Management
export interface NonceManager {
  getNextNonce(address: Address, chainId: number): Promise<number>
  reserveNonce(address: Address, chainId: number, transactionId: string): Promise<number>
  releaseNonce(address: Address, chainId: number, nonce: number): void
  getPendingNonces(address: Address, chainId: number): number[]
}

// Transaction Analytics
export interface TransactionAnalytics {
  totalTransactions: number
  successRate: number
  averageGasUsed: string
  averageConfirmationTime: number
  failureReasons: Record<string, number>
  gasEfficiency: number
  mevProtectionRate: number
  timeRange: {
    start: number
    end: number
  }
}

// Recovery Options
export interface RecoveryOption {
  type: 'retry' | 'replace' | 'cancel' | 'speedup'
  description: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  estimatedCost?: string
  probability: number
}

// Transaction Configuration
export interface TransactionConfig {
  defaultGasMultiplier: number
  maxGasPrice: string
  maxRetries: number
  retryDelay: number
  confirmationBlocks: number
  timeoutDuration: number
  simulationEnabled: boolean
  mevProtectionEnabled: boolean
  batchingEnabled: boolean
  maxBatchSize: number
}

// Webhook Configuration
export interface WebhookConfig {
  url: string
  events: TransactionEvent['type'][]
  secret?: string
  retryAttempts: number
  timeout: number
}

// Transaction Filter
export interface TransactionFilter {
  status?: TransactionStatus[]
  type?: TransactionType[]
  chainId?: number[]
  userAddress?: Address[]
  fromDate?: number
  toDate?: number
  minAmount?: string
  maxAmount?: string
  token?: Address[]
}

// Transaction Sort
export interface TransactionSort {
  field: 'createdAt' | 'submittedAt' | 'confirmedAt' | 'gasPrice' | 'value'
  order: 'asc' | 'desc'
}

// Pagination
export interface TransactionPagination {
  page: number
  limit: number
  total?: number
}

// Transaction Query
export interface TransactionQuery {
  filter?: TransactionFilter
  sort?: TransactionSort
  pagination?: TransactionPagination
}

// Transaction List Response
export interface TransactionListResponse {
  transactions: Transaction[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Error Codes
export type TransactionErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'GAS_LIMIT_EXCEEDED'
  | 'NONCE_TOO_LOW'
  | 'NONCE_TOO_HIGH'
  | 'REPLACEMENT_UNDERPRICED'
  | 'TRANSACTION_UNDERPRICED'
  | 'INTRINSIC_GAS_TOO_LOW'
  | 'EXECUTION_REVERTED'
  | 'DEADLINE_EXCEEDED'
  | 'SLIPPAGE_EXCEEDED'
  | 'SIMULATION_FAILED'
  | 'NETWORK_ERROR'
  | 'USER_REJECTED'
  | 'UNKNOWN_ERROR'

// Recovery Strategy
export interface RecoveryStrategy {
  errorCode: TransactionErrorCode
  action: 'retry' | 'replace' | 'cancel' | 'manual'
  delay: number
  gasAdjustment?: number
  maxAttempts: number
}
