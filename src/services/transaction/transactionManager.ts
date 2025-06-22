import { Address, Hash } from 'viem'
import {
    BatchTransaction,
    NonceManager,
    RecoveryOption,
    Transaction,
    TransactionConfig,
    TransactionError,
    TransactionEvent,
    TransactionListResponse,
    TransactionQuery,
    TransactionRequest,
    TransactionResponse
} from './types'

export interface TransactionManagerConfig extends TransactionConfig {
  enableWebhooks: boolean
  webhookUrl?: string
  enableAnalytics: boolean
  persistTransactions: boolean
  maxStoredTransactions: number
}

const DEFAULT_CONFIG: TransactionManagerConfig = {
  defaultGasMultiplier: 1.2,
  maxGasPrice: '100000000000', // 100 gwei
  maxRetries: 3,
  retryDelay: 5000,
  confirmationBlocks: 1,
  timeoutDuration: 300000, // 5 minutes
  simulationEnabled: true,
  mevProtectionEnabled: true,
  batchingEnabled: true,
  maxBatchSize: 10,
  enableWebhooks: false,
  enableAnalytics: true,
  persistTransactions: true,
  maxStoredTransactions: 1000,
}

export class TransactionManager {
  private config: TransactionManagerConfig
  private transactions: Map<string, Transaction> = new Map()
  private batches: Map<string, BatchTransaction> = new Map()
  private eventListeners: Map<string, Set<(event: TransactionEvent) => void>> = new Map()
  private nonceManager: NonceManager
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: Partial<TransactionManagerConfig> = {}, nonceManager: NonceManager) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.nonceManager = nonceManager
    this.startCleanupInterval()
  }

  /**
   * Create and submit a new transaction
   */
  async createTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    try {
      // Validate request
      this.validateTransactionRequest(request)

      // Create transaction object
      const transaction = await this.buildTransaction(request)

      // Simulate transaction if enabled
      if (request.simulate !== false && this.config.simulationEnabled) {
        const simulation = await this.simulateTransaction(transaction)
        transaction.simulation = simulation

        if (!simulation.success) {
          return {
            success: false,
            error: {
              code: 'SIMULATION_FAILED',
              message: simulation.revertReason || 'Transaction simulation failed',
              details: simulation,
              recoverable: false,
              timestamp: Date.now(),
            },
            simulation,
          }
        }
      }

      // Store transaction
      this.transactions.set(transaction.id, transaction)

      // Emit created event
      this.emitEvent({
        type: 'created',
        transactionId: transaction.id,
        timestamp: Date.now(),
      })

      return {
        success: true,
        transaction,
        simulation: transaction.simulation,
      }
    } catch (error) {
      return {
        success: false,
        error: this.createError('UNKNOWN_ERROR', error instanceof Error ? error.message : 'Unknown error'),
      }
    }
  }

  /**
   * Submit transaction to blockchain
   */
  async submitTransaction(transactionId: string): Promise<TransactionResponse> {
    const transaction = this.transactions.get(transactionId)
    if (!transaction) {
      return {
        success: false,
        error: this.createError('UNKNOWN_ERROR', 'Transaction not found'),
      }
    }

    try {
      // Check dependencies
      if (transaction.dependsOn && transaction.dependsOn.length > 0) {
        const dependenciesMet = await this.checkDependencies(transaction.dependsOn)
        if (!dependenciesMet) {
          return {
            success: false,
            error: this.createError('UNKNOWN_ERROR', 'Transaction dependencies not met'),
          }
        }
      }

      // Reserve nonce
      const nonce = await this.nonceManager.reserveNonce(
        transaction.userAddress,
        transaction.chainId,
        transaction.id
      )
      transaction.nonce = nonce

      // Submit to blockchain (placeholder - would integrate with wagmi/viem)
      const hash = await this.submitToBlockchain(transaction)

      // Update transaction
      transaction.hash = hash
      transaction.status = 'submitted'
      transaction.submittedAt = Date.now()

      // Start monitoring
      this.startTransactionMonitoring(transaction)

      // Emit submitted event
      this.emitEvent({
        type: 'submitted',
        transactionId: transaction.id,
        hash,
        timestamp: Date.now(),
      })

      return {
        success: true,
        transaction,
      }
    } catch (error) {
      // Release nonce on failure
      if (transaction.nonce !== undefined) {
        this.nonceManager.releaseNonce(transaction.userAddress, transaction.chainId, transaction.nonce)
      }

      const txError = this.createError('NETWORK_ERROR', error instanceof Error ? error.message : 'Submission failed')
      transaction.error = txError
      transaction.status = 'failed'

      this.emitEvent({
        type: 'failed',
        transactionId: transaction.id,
        error: txError,
        timestamp: Date.now(),
      })

      return {
        success: false,
        error: txError,
        transaction,
      }
    }
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): Transaction | undefined {
    return this.transactions.get(id)
  }

  /**
   * Query transactions with filters
   */
  queryTransactions(query: TransactionQuery = {}): TransactionListResponse {
    let filtered = Array.from(this.transactions.values())

    // Apply filters
    if (query.filter) {
      const filter = query.filter

      if (filter.status) {
        filtered = filtered.filter(tx => filter.status!.includes(tx.status))
      }

      if (filter.type) {
        filtered = filtered.filter(tx => filter.type!.includes(tx.type))
      }

      if (filter.chainId) {
        filtered = filtered.filter(tx => filter.chainId!.includes(tx.chainId))
      }

      if (filter.userAddress) {
        filtered = filtered.filter(tx => filter.userAddress!.includes(tx.userAddress))
      }

      if (filter.fromDate) {
        filtered = filtered.filter(tx => tx.createdAt >= filter.fromDate!)
      }

      if (filter.toDate) {
        filtered = filtered.filter(tx => tx.createdAt <= filter.toDate!)
      }
    }

    // Apply sorting
    if (query.sort) {
      const { field, order } = query.sort
      filtered.sort((a, b) => {
        const aVal = a[field] || 0
        const bVal = b[field] || 0
        return order === 'desc' ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal)
      })
    }

    // Apply pagination
    const pagination = query.pagination || { page: 1, limit: 50 }
    const start = (pagination.page - 1) * pagination.limit
    const end = start + pagination.limit
    const paginatedResults = filtered.slice(start, end)

    return {
      transactions: paginatedResults,
      total: filtered.length,
      page: pagination.page,
      limit: pagination.limit,
      hasMore: end < filtered.length,
    }
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(transactionId: string): Promise<TransactionResponse> {
    const transaction = this.transactions.get(transactionId)
    if (!transaction) {
      return {
        success: false,
        error: this.createError('UNKNOWN_ERROR', 'Transaction not found'),
      }
    }

    if (transaction.status !== 'pending' && transaction.status !== 'submitted') {
      return {
        success: false,
        error: this.createError('UNKNOWN_ERROR', 'Transaction cannot be cancelled'),
      }
    }

    try {
      // If transaction was submitted, send cancellation transaction
      if (transaction.status === 'submitted' && transaction.hash) {
        await this.sendCancellationTransaction(transaction)
      }

      // Update status
      transaction.status = 'cancelled'
      transaction.completedAt = Date.now()

      // Release nonce
      if (transaction.nonce !== undefined) {
        this.nonceManager.releaseNonce(transaction.userAddress, transaction.chainId, transaction.nonce)
      }

      // Clear retry timer
      this.clearRetryTimer(transactionId)

      // Emit cancelled event
      this.emitEvent({
        type: 'cancelled',
        transactionId: transaction.id,
        timestamp: Date.now(),
      })

      return {
        success: true,
        transaction,
      }
    } catch (error) {
      return {
        success: false,
        error: this.createError('NETWORK_ERROR', error instanceof Error ? error.message : 'Cancellation failed'),
      }
    }
  }

  /**
   * Retry failed transaction
   */
  async retryTransaction(transactionId: string): Promise<TransactionResponse> {
    const transaction = this.transactions.get(transactionId)
    if (!transaction) {
      return {
        success: false,
        error: this.createError('UNKNOWN_ERROR', 'Transaction not found'),
      }
    }

    if (transaction.status !== 'failed') {
      return {
        success: false,
        error: this.createError('UNKNOWN_ERROR', 'Transaction is not in failed state'),
      }
    }

    if (transaction.retryCount >= transaction.maxRetries) {
      return {
        success: false,
        error: this.createError('UNKNOWN_ERROR', 'Maximum retry attempts exceeded'),
      }
    }

    // Reset transaction state
    transaction.status = 'pending'
    transaction.hash = undefined
    transaction.error = undefined
    transaction.retryCount++

    // Adjust gas price for retry
    if (transaction.gasPrice) {
      const newGasPrice = Math.floor(parseFloat(transaction.gasPrice) * 1.1).toString()
      transaction.gasPrice = newGasPrice
    }

    return this.submitTransaction(transactionId)
  }

  /**
   * Get recovery options for failed transaction
   */
  getRecoveryOptions(transactionId: string): RecoveryOption[] {
    const transaction = this.transactions.get(transactionId)
    if (!transaction || !transaction.error) {
      return []
    }

    const options: RecoveryOption[] = []

    // Retry option
    if (transaction.retryCount < transaction.maxRetries) {
      options.push({
        type: 'retry',
        description: 'Retry transaction with same parameters',
        probability: 0.7,
      })
    }

    // Replace with higher gas
    if (transaction.status === 'submitted') {
      options.push({
        type: 'replace',
        description: 'Replace with higher gas price',
        gasPrice: Math.floor(parseFloat(transaction.gasPrice || '0') * 1.2).toString(),
        probability: 0.9,
      })

      options.push({
        type: 'speedup',
        description: 'Speed up transaction',
        gasPrice: Math.floor(parseFloat(transaction.gasPrice || '0') * 1.5).toString(),
        probability: 0.95,
      })
    }

    // Cancel option
    if (transaction.status === 'submitted' || transaction.status === 'pending') {
      options.push({
        type: 'cancel',
        description: 'Cancel transaction',
        probability: 0.8,
      })
    }

    return options
  }

  /**
   * Event subscription
   */
  addEventListener(eventType: TransactionEvent['type'], callback: (event: TransactionEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }

    this.eventListeners.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventType)?.delete(callback)
    }
  }

  /**
   * Private methods
   */
  private async buildTransaction(request: TransactionRequest): Promise<Transaction> {
    const id = this.generateTransactionId()
    const settings = {
      gasStrategy: 'standard' as const,
      slippageProtection: true,
      mevProtection: this.config.mevProtectionEnabled,
      autoRetry: true,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      deadline: request.deadline || Date.now() + 1800000, // 30 minutes
      ...request.settings,
    }

    return {
      id,
      type: request.type,
      status: 'pending',
      priority: request.priority || 'medium',
      chainId: request.chainId,
      userAddress: request.userAddress,
      to: request.to,
      data: request.data,
      value: request.value || '0',
      gasLimit: request.gasLimit || '0',
      gasPrice: request.gasPrice,
      maxFeePerGas: request.maxFeePerGas,
      maxPriorityFeePerGas: request.maxPriorityFeePerGas,
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.fromAmount,
      toAmount: request.toAmount,
      slippage: request.slippage,
      deadline: request.deadline,
      createdAt: Date.now(),
      retryCount: 0,
      maxRetries: settings.maxRetries,
      dependsOn: request.dependsOn,
      userSettings: settings,
    }
  }

  private validateTransactionRequest(request: TransactionRequest): void {
    if (!request.userAddress) {
      throw new Error('User address is required')
    }

    if (!request.to) {
      throw new Error('To address is required')
    }

    if (!request.data) {
      throw new Error('Transaction data is required')
    }

    if (!request.chainId) {
      throw new Error('Chain ID is required')
    }
  }

  private async simulateTransaction(transaction: Transaction): Promise<any> {
    // Placeholder for transaction simulation
    // Would integrate with Tenderly, Alchemy, or similar service
    return {
      success: true,
      gasUsed: transaction.gasLimit,
      gasPrice: transaction.gasPrice || '0',
      effectiveGasPrice: transaction.gasPrice || '0',
      balanceChanges: [],
      events: [],
      warnings: [],
    }
  }

  private async submitToBlockchain(transaction: Transaction): Promise<Hash> {
    // Placeholder for blockchain submission
    // Would integrate with wagmi/viem
    return `0x${Math.random().toString(16).slice(2)}` as Hash
  }

  private async checkDependencies(dependencyIds: string[]): Promise<boolean> {
    return dependencyIds.every(id => {
      const dep = this.transactions.get(id)
      return dep && dep.status === 'success'
    })
  }

  private startTransactionMonitoring(transaction: Transaction): void {
    // Placeholder for transaction monitoring
    // Would poll blockchain for transaction status
    setTimeout(() => {
      transaction.status = 'confirmed'
      transaction.confirmedAt = Date.now()

      this.emitEvent({
        type: 'confirmed',
        transactionId: transaction.id,
        hash: transaction.hash,
        timestamp: Date.now(),
      })

      setTimeout(() => {
        transaction.status = 'success'
        transaction.completedAt = Date.now()

        this.emitEvent({
          type: 'completed',
          transactionId: transaction.id,
          hash: transaction.hash,
          timestamp: Date.now(),
        })
      }, 2000)
    }, 5000)
  }

  private async sendCancellationTransaction(transaction: Transaction): Promise<void> {
    // Placeholder for sending cancellation transaction
    // Would send transaction with same nonce but higher gas price to cancel
  }

  private emitEvent(event: TransactionEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event)
        } catch (error) {
          console.error('Error in transaction event listener:', error)
        }
      })
    }
  }

  private createError(code: string, message: string): TransactionError {
    return {
      code,
      message,
      recoverable: code !== 'USER_REJECTED',
      timestamp: Date.now(),
    }
  }

  private generateTransactionId(): string {
    return `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private clearRetryTimer(transactionId: string): void {
    const timer = this.retryTimers.get(transactionId)
    if (timer) {
      clearTimeout(timer)
      this.retryTimers.delete(transactionId)
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupOldTransactions()
    }, 3600000) // 1 hour
  }

  private cleanupOldTransactions(): void {
    if (this.transactions.size <= this.config.maxStoredTransactions) {
      return
    }

    const transactions = Array.from(this.transactions.entries())
      .sort(([, a], [, b]) => b.createdAt - a.createdAt)

    const toRemove = transactions.slice(this.config.maxStoredTransactions)
    toRemove.forEach(([id]) => {
      this.transactions.delete(id)
      this.clearRetryTimer(id)
    })
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.retryTimers.forEach(timer => clearTimeout(timer))
    this.retryTimers.clear()
    this.eventListeners.clear()
    this.transactions.clear()
    this.batches.clear()
  }
}

// Simple nonce manager implementation
class SimpleNonceManager implements NonceManager {
  private nonces: Map<string, number> = new Map()
  private reserved: Map<string, Set<number>> = new Map()

  async getNextNonce(address: Address, chainId: number): Promise<number> {
    const key = `${chainId}-${address.toLowerCase()}`
    const current = this.nonces.get(key) || 0
    return current
  }

  async reserveNonce(address: Address, chainId: number, transactionId: string): Promise<number> {
    const key = `${chainId}-${address.toLowerCase()}`
    const nonce = await this.getNextNonce(address, chainId)

    if (!this.reserved.has(key)) {
      this.reserved.set(key, new Set())
    }

    this.reserved.get(key)!.add(nonce)
    this.nonces.set(key, nonce + 1)

    return nonce
  }

  releaseNonce(address: Address, chainId: number, nonce: number): void {
    const key = `${chainId}-${address.toLowerCase()}`
    this.reserved.get(key)?.delete(nonce)
  }

  getPendingNonces(address: Address, chainId: number): number[] {
    const key = `${chainId}-${address.toLowerCase()}`
    return Array.from(this.reserved.get(key) || [])
  }
}

// Export singleton instance
export const transactionManager = new TransactionManager({}, new SimpleNonceManager())
