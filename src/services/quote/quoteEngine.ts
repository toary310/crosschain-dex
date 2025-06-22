import { Token } from '@/config/tokens'
import { bridgeAggregator } from '@/services/bridge/bridgeAggregator'
import {
    BridgeQuote,
    BridgeRequest,
} from '@/services/bridge/types'
import { dexAggregator } from '@/services/dex/dexAggregator'
import {
    QuoteRequest as DexQuoteRequest,
    SwapQuote,
} from '@/services/dex/types'
import { Address } from 'viem'

export interface UnifiedQuoteRequest {
  fromToken: Token
  toToken: Token
  amount: string
  userAddress: string
  slippage: number
  deadline?: number
  gasPrice?: string
  priorityFee?: string
  crossChain?: boolean
  protocols?: string[]
  optimization?: QuoteOptimization
}

export interface QuoteOptimization {
  optimizeFor: 'output' | 'gas' | 'time' | 'security' | 'balanced'
  maxSlippage: number
  maxPriceImpact: number
  maxGasCost?: string
  maxTime?: number
  mevProtection: boolean
  gasOptimization: boolean
}

export interface UnifiedQuote {
  id: string
  type: 'swap' | 'bridge' | 'hybrid'
  fromToken: Token
  toToken: Token
  fromAmount: string
  toAmount: string
  toAmountMin: string
  route: QuoteRoute[]
  totalGas: string
  totalFee: string
  priceImpact: number
  slippage: number
  estimatedTime: number
  confidence: number
  validUntil: number
  mevProtected: boolean
  gasOptimized: boolean
  warnings: QuoteWarning[]
  metadata: QuoteMetadata
}

export interface QuoteRoute {
  step: number
  protocol: string
  action: 'swap' | 'bridge' | 'wrap' | 'unwrap'
  fromToken: Token
  toToken: Token
  fromAmount: string
  toAmount: string
  gasEstimate: string
  fee: string
  priceImpact: number
  chainId: number
  contractAddress: string
  data?: string
}

export interface QuoteWarning {
  type: 'high_slippage' | 'high_price_impact' | 'low_liquidity' | 'high_gas' | 'mev_risk' | 'time_risk'
  message: string
  severity: 'low' | 'medium' | 'high'
  recommendation?: string
}

export interface QuoteMetadata {
  requestId: string
  timestamp: number
  processingTime: number
  quoteSources: string[]
  marketConditions: {
    volatility: number
    liquidity: number
    gasPrice: string
    networkCongestion: number
  }
  riskAssessment: {
    overall: 'low' | 'medium' | 'high'
    factors: string[]
    score: number
  }
}

export interface QuoteResponse {
  quotes: UnifiedQuote[]
  bestQuote?: UnifiedQuote
  error?: string
  timestamp: number
  requestId: string
}

const DEFAULT_OPTIMIZATION: QuoteOptimization = {
  optimizeFor: 'balanced',
  maxSlippage: 5,
  maxPriceImpact: 15,
  mevProtection: true,
  gasOptimization: true,
}

export class QuoteEngine {
  private requestCache: Map<string, { quote: UnifiedQuote; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 30000 // 30 seconds

  /**
   * Get unified quote for any token pair (same chain or cross-chain)
   */
  async getQuote(request: UnifiedQuoteRequest): Promise<QuoteResponse> {
    const requestId = this.generateRequestId()
    const startTime = Date.now()

    try {
      // Validate request
      this.validateRequest(request)

      // Check cache
      const cacheKey = this.getCacheKey(request)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return {
          quotes: [cached],
          bestQuote: cached,
          timestamp: Date.now(),
          requestId,
        }
      }

      // Determine if cross-chain or same-chain
      const isCrossChain = request.fromToken.chainId !== request.toToken.chainId || request.crossChain

      let quotes: UnifiedQuote[]

      if (isCrossChain) {
        quotes = await this.getCrossChainQuotes(request, requestId)
      } else {
        quotes = await this.getSameChainQuotes(request, requestId)
      }

      // Apply optimizations and filters
      const optimizedQuotes = await this.optimizeQuotes(quotes, request.optimization || DEFAULT_OPTIMIZATION)

      // Select best quote
      const bestQuote = this.selectBestQuote(optimizedQuotes, request.optimization || DEFAULT_OPTIMIZATION)

      // Cache best quote
      if (bestQuote) {
        this.setCache(cacheKey, bestQuote)
      }

      const processingTime = Date.now() - startTime

      return {
        quotes: optimizedQuotes,
        bestQuote,
        timestamp: Date.now(),
        requestId,
      }
    } catch (error) {
      return {
        quotes: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId,
      }
    }
  }

  /**
   * Get quotes for same-chain swaps
   */
  private async getSameChainQuotes(request: UnifiedQuoteRequest, requestId: string): Promise<UnifiedQuote[]> {
    const dexRequest: DexQuoteRequest = {
      fromToken: request.fromToken,
      toToken: request.toToken,
      amount: request.amount,
      slippage: request.slippage,
      userAddress: request.userAddress as Address,
      chainId: request.fromToken.chainId,
      protocols: request.protocols as any[],
      gasPrice: request.gasPrice,
    }

    const dexResponse = await dexAggregator.getBestQuote(dexRequest)

    if (!dexResponse.quotes || dexResponse.quotes.length === 0) {
      return []
    }

    return Promise.all(
      dexResponse.quotes.map(quote => this.convertDexQuoteToUnified(quote, requestId))
    )
  }

  /**
   * Get quotes for cross-chain transfers
   */
  private async getCrossChainQuotes(request: UnifiedQuoteRequest, requestId: string): Promise<UnifiedQuote[]> {
    const bridgeRequest: BridgeRequest = {
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromChain: request.fromToken.chainId,
      toChain: request.toToken.chainId,
      amount: request.amount,
      userAddress: request.userAddress as Address,
      slippage: request.slippage,
      deadline: request.deadline,
      protocols: request.protocols as any[],
    }

    const bridgeResponse = await bridgeAggregator.getBestQuote(bridgeRequest)

    if (!bridgeResponse.quotes || bridgeResponse.quotes.length === 0) {
      return []
    }

    return Promise.all(
      bridgeResponse.quotes.map(quote => this.convertBridgeQuoteToUnified(quote, requestId))
    )
  }

  /**
   * Convert DEX quote to unified format
   */
  private async convertDexQuoteToUnified(dexQuote: SwapQuote, requestId: string): Promise<UnifiedQuote> {
    const route: QuoteRoute[] = dexQuote.route.map((step, index) => ({
      step: index + 1,
      protocol: step.protocol,
      action: 'swap' as const,
      fromToken: step.fromToken,
      toToken: step.toToken,
      fromAmount: index === 0 ? dexQuote.fromAmount : '0', // Only first step has input amount
      toAmount: index === dexQuote.route.length - 1 ? dexQuote.toAmount : '0', // Only last step has output
      gasEstimate: dexQuote.gasEstimate,
      fee: step.fee?.toString() || '0',
      priceImpact: dexQuote.priceImpact,
      chainId: step.fromToken.chainId,
      contractAddress: step.poolAddress,
    }))

    const warnings = await this.generateWarnings(dexQuote, 'swap')
    const metadata = await this.generateMetadata(requestId, [dexQuote.protocol], 'swap')

    return {
      id: this.generateQuoteId(),
      type: 'swap',
      fromToken: dexQuote.fromToken,
      toToken: dexQuote.toToken,
      fromAmount: dexQuote.fromAmount,
      toAmount: dexQuote.toAmount,
      toAmountMin: dexQuote.toAmountMin,
      route,
      totalGas: dexQuote.gasEstimate,
      totalFee: this.calculateTotalFee(route),
      priceImpact: dexQuote.priceImpact,
      slippage: dexQuote.slippage,
      estimatedTime: 60, // 1 minute for DEX swaps
      confidence: dexQuote.confidence,
      validUntil: dexQuote.validUntil,
      mevProtected: this.assessMevProtection(dexQuote),
      gasOptimized: true,
      warnings,
      metadata,
    }
  }

  /**
   * Convert bridge quote to unified format
   */
  private async convertBridgeQuoteToUnified(bridgeQuote: BridgeQuote, requestId: string): Promise<UnifiedQuote> {
    const route: QuoteRoute[] = bridgeQuote.route.steps.map((step, index) => ({
      step: index + 1,
      protocol: step.protocol,
      action: step.action,
      fromToken: step.fromToken,
      toToken: step.toToken,
      fromAmount: step.fromAmount,
      toAmount: step.toAmount,
      gasEstimate: step.gasEstimate,
      fee: step.fee,
      priceImpact: 0, // Bridge steps typically don't have price impact
      chainId: step.fromToken.chainId,
      contractAddress: step.contractAddress,
      data: step.data,
    }))

    const warnings = await this.generateWarnings(bridgeQuote, 'bridge')
    const metadata = await this.generateMetadata(requestId, [bridgeQuote.route.protocol], 'bridge')

    return {
      id: this.generateQuoteId(),
      type: 'bridge',
      fromToken: bridgeQuote.route.fromToken,
      toToken: bridgeQuote.route.toToken,
      fromAmount: bridgeQuote.fromAmount,
      toAmount: bridgeQuote.toAmount,
      toAmountMin: bridgeQuote.toAmountMin,
      route,
      totalGas: bridgeQuote.totalGas,
      totalFee: bridgeQuote.totalFee,
      priceImpact: bridgeQuote.priceImpact,
      slippage: bridgeQuote.route.steps[0]?.fromToken.chainId === bridgeQuote.route.steps[0]?.toToken.chainId ? 0 : 0.1,
      estimatedTime: bridgeQuote.estimatedTime,
      confidence: bridgeQuote.route.confidence,
      validUntil: bridgeQuote.validUntil,
      mevProtected: true, // Bridge transactions are generally MEV protected
      gasOptimized: false,
      warnings,
      metadata,
    }
  }

  /**
   * Optimize quotes based on criteria
   */
  private async optimizeQuotes(quotes: UnifiedQuote[], optimization: QuoteOptimization): Promise<UnifiedQuote[]> {
    // Filter quotes based on optimization criteria
    const filtered = quotes.filter(quote => {
      if (quote.priceImpact > optimization.maxPriceImpact) return false
      if (quote.slippage > optimization.maxSlippage) return false
      if (optimization.maxGasCost && parseFloat(quote.totalGas) > parseFloat(optimization.maxGasCost)) return false
      if (optimization.maxTime && quote.estimatedTime > optimization.maxTime) return false
      return true
    })

    // Sort quotes based on optimization preference
    filtered.sort((a, b) => {
      switch (optimization.optimizeFor) {
        case 'output':
          return parseFloat(b.toAmount) - parseFloat(a.toAmount)
        case 'gas':
          return parseFloat(a.totalGas) - parseFloat(b.totalGas)
        case 'time':
          return a.estimatedTime - b.estimatedTime
        case 'security':
          return b.confidence - a.confidence
        case 'balanced':
        default:
          return this.calculateBalancedScore(b) - this.calculateBalancedScore(a)
      }
    })

    return filtered
  }

  /**
   * Calculate balanced score for quote ranking
   */
  private calculateBalancedScore(quote: UnifiedQuote): number {
    const outputScore = parseFloat(quote.toAmount) * 0.3
    const gasScore = (1000000 / parseFloat(quote.totalGas)) * 0.2
    const timeScore = (3600 / quote.estimatedTime) * 0.2
    const confidenceScore = quote.confidence * 100 * 0.2
    const impactScore = (15 - quote.priceImpact) * 0.1

    return outputScore + gasScore + timeScore + confidenceScore + impactScore
  }

  /**
   * Select best quote from optimized list
   */
  private selectBestQuote(quotes: UnifiedQuote[], optimization: QuoteOptimization): UnifiedQuote | undefined {
    if (quotes.length === 0) return undefined

    // First quote is already the best after optimization
    return quotes[0]
  }

  /**
   * Generate warnings for quote
   */
  private async generateWarnings(quote: SwapQuote | BridgeQuote, type: 'swap' | 'bridge'): Promise<QuoteWarning[]> {
    const warnings: QuoteWarning[] = []

    // High slippage warning
    const slippage = 'slippage' in quote ? quote.slippage : 0
    if (slippage > 2) {
      warnings.push({
        type: 'high_slippage',
        message: `High slippage of ${slippage.toFixed(2)}% detected`,
        severity: slippage > 5 ? 'high' : 'medium',
        recommendation: 'Consider reducing trade size or waiting for better market conditions',
      })
    }

    // High price impact warning
    if (quote.priceImpact > 5) {
      warnings.push({
        type: 'high_price_impact',
        message: `High price impact of ${quote.priceImpact.toFixed(2)}% detected`,
        severity: quote.priceImpact > 10 ? 'high' : 'medium',
        recommendation: 'Large trades may significantly affect token price',
      })
    }

    // High gas warning
    const gasEstimate = 'gasEstimate' in quote ? parseFloat(quote.gasEstimate) : parseFloat(quote.totalGas)
    if (gasEstimate > 500000) {
      warnings.push({
        type: 'high_gas',
        message: `High gas cost of ${gasEstimate.toLocaleString()} gas units`,
        severity: gasEstimate > 1000000 ? 'high' : 'medium',
        recommendation: 'Consider waiting for lower gas prices',
      })
    }

    return warnings
  }

  /**
   * Generate metadata for quote
   */
  private async generateMetadata(requestId: string, protocols: string[], type: 'swap' | 'bridge'): Promise<QuoteMetadata> {
    return {
      requestId,
      timestamp: Date.now(),
      processingTime: 0, // Will be calculated by caller
      quoteSources: protocols,
      marketConditions: {
        volatility: 0.1, // Placeholder
        liquidity: 0.8, // Placeholder
        gasPrice: '20', // Placeholder
        networkCongestion: 0.3, // Placeholder
      },
      riskAssessment: {
        overall: 'medium',
        factors: ['market_volatility', 'smart_contract_risk'],
        score: 75,
      },
    }
  }

  /**
   * Utility methods
   */
  private validateRequest(request: UnifiedQuoteRequest): void {
    if (!request.fromToken || !request.toToken) {
      throw new Error('From and to tokens are required')
    }

    if (!request.amount || parseFloat(request.amount) <= 0) {
      throw new Error('Amount must be greater than 0')
    }

    if (!request.userAddress) {
      throw new Error('User address is required')
    }

    if (request.slippage < 0 || request.slippage > 50) {
      throw new Error('Slippage must be between 0 and 50%')
    }
  }

  private calculateTotalFee(route: QuoteRoute[]): string {
    return route.reduce((total, step) => total + parseFloat(step.fee), 0).toString()
  }

  private assessMevProtection(quote: SwapQuote): boolean {
    // Simple heuristic: private mempools and certain protocols offer MEV protection
    return quote.protocol === '1inch' || quote.gasEstimate === '0'
  }

  private getCacheKey(request: UnifiedQuoteRequest): string {
    return `${request.fromToken.address}-${request.toToken.address}-${request.amount}-${request.slippage}-${request.fromToken.chainId}-${request.toToken.chainId}`
  }

  private getFromCache(key: string): UnifiedQuote | null {
    const cached = this.requestCache.get(key)
    if (!cached) return null

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.requestCache.delete(key)
      return null
    }

    return cached.quote
  }

  private setCache(key: string, quote: UnifiedQuote): void {
    this.requestCache.set(key, {
      quote,
      timestamp: Date.now(),
    })
  }

  private generateRequestId(): string {
    return `quote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateQuoteId(): string {
    return `q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.requestCache.clear()
  }
}

// Export singleton instance
export const quoteEngine = new QuoteEngine()
