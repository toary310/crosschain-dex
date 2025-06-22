import {
    LiquidityPool,
    LiquidityPosition,
    PositionReward
} from './types'

export interface PositionSnapshot {
  positionId: string
  timestamp: number
  liquidity: string
  tokenAmounts: string[]
  tokenPrices: string[]
  totalValueUSD: string
  pnl: string
  pnlPercentage: number
  impermanentLoss: string
  impermanentLossPercentage: number
  unclaimedRewards: PositionReward[]
}

export interface PositionMetrics {
  positionId: string
  totalReturn: string
  totalReturnPercentage: number
  annualizedReturn: number
  maxDrawdown: number
  sharpeRatio: number
  volatility: number
  timeWeightedReturn: number
  daysActive: number
  averageLiquidity: string
  totalFeesEarned: string
  totalRewardsClaimed: string
  impermanentLossHistory: Array<{
    timestamp: number
    loss: number
  }>
}

export interface PositionAlert {
  id: string
  positionId: string
  type: 'price_range' | 'impermanent_loss' | 'reward_threshold' | 'pnl_threshold'
  condition: 'above' | 'below' | 'equals'
  threshold: number
  active: boolean
  triggered: boolean
  createdAt: number
  triggeredAt?: number
  message: string
}

export interface PositionTrackerConfig {
  snapshotInterval: number // milliseconds
  maxSnapshots: number
  alertCheckInterval: number
  enableRealTimeTracking: boolean
  enablePnLCalculation: boolean
  enableILCalculation: boolean
}

const DEFAULT_CONFIG: PositionTrackerConfig = {
  snapshotInterval: 300000, // 5 minutes
  maxSnapshots: 1000,
  alertCheckInterval: 60000, // 1 minute
  enableRealTimeTracking: true,
  enablePnLCalculation: true,
  enableILCalculation: true,
}

export class PositionTracker {
  private config: PositionTrackerConfig
  private positions: Map<string, LiquidityPosition> = new Map()
  private snapshots: Map<string, PositionSnapshot[]> = new Map()
  private alerts: Map<string, PositionAlert[]> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private subscribers: Map<string, Set<(position: LiquidityPosition) => void>> = new Map()

  constructor(config: Partial<PositionTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startAlertChecker()
  }

  /**
   * Start tracking a position
   */
  startTracking(position: LiquidityPosition): void {
    const positionId = position.id

    // Store position
    this.positions.set(positionId, position)

    // Initialize snapshots array
    if (!this.snapshots.has(positionId)) {
      this.snapshots.set(positionId, [])
    }

    // Take initial snapshot
    this.takeSnapshot(position)

    // Start real-time tracking if enabled
    if (this.config.enableRealTimeTracking) {
      this.startRealTimeTracking(positionId)
    }
  }

  /**
   * Stop tracking a position
   */
  stopTracking(positionId: string): void {
    // Clear interval
    const interval = this.intervals.get(positionId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(positionId)
    }

    // Remove from tracking
    this.positions.delete(positionId)
    this.subscribers.delete(positionId)
  }

  /**
   * Update position data
   */
  updatePosition(position: LiquidityPosition): void {
    const positionId = position.id

    if (!this.positions.has(positionId)) {
      this.startTracking(position)
      return
    }

    // Update stored position
    this.positions.set(positionId, position)

    // Take snapshot
    this.takeSnapshot(position)

    // Check alerts
    this.checkPositionAlerts(position)

    // Notify subscribers
    this.notifySubscribers(positionId, position)
  }

  /**
   * Get position snapshots
   */
  getSnapshots(positionId: string, limit?: number): PositionSnapshot[] {
    const snapshots = this.snapshots.get(positionId) || []

    if (limit) {
      return snapshots.slice(-limit)
    }

    return snapshots
  }

  /**
   * Get position metrics
   */
  getPositionMetrics(positionId: string): PositionMetrics | null {
    const position = this.positions.get(positionId)
    const snapshots = this.snapshots.get(positionId)

    if (!position || !snapshots || snapshots.length === 0) {
      return null
    }

    return this.calculateMetrics(position, snapshots)
  }

  /**
   * Create position alert
   */
  createAlert(alert: Omit<PositionAlert, 'id' | 'createdAt' | 'triggered'>): string {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const fullAlert: PositionAlert = {
      ...alert,
      id,
      createdAt: Date.now(),
      triggered: false,
    }

    const positionAlerts = this.alerts.get(alert.positionId) || []
    positionAlerts.push(fullAlert)
    this.alerts.set(alert.positionId, positionAlerts)

    return id
  }

  /**
   * Remove alert
   */
  removeAlert(alertId: string): boolean {
    for (const [positionId, alerts] of this.alerts) {
      const index = alerts.findIndex(alert => alert.id === alertId)
      if (index !== -1) {
        alerts.splice(index, 1)
        this.alerts.set(positionId, alerts)
        return true
      }
    }
    return false
  }

  /**
   * Get alerts for position
   */
  getAlerts(positionId: string): PositionAlert[] {
    return this.alerts.get(positionId) || []
  }

  /**
   * Subscribe to position updates
   */
  subscribe(positionId: string, callback: (position: LiquidityPosition) => void): () => void {
    if (!this.subscribers.has(positionId)) {
      this.subscribers.set(positionId, new Set())
    }

    this.subscribers.get(positionId)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.subscribers.get(positionId)?.delete(callback)
    }
  }

  /**
   * Calculate position PnL
   */
  calculatePnL(position: LiquidityPosition, pool: LiquidityPool): {
    pnl: string
    pnlPercentage: number
  } {
    try {
      if (!this.config.enablePnLCalculation) {
        return { pnl: '0', pnlPercentage: 0 }
      }

      // Calculate current value
      const currentValue = parseFloat(position.totalValueUSD)

      // Calculate initial investment value
      const entryValue = position.tokenAmounts.reduce((total, amount, index) => {
        const entryPrice = parseFloat(position.entryPrice[index])
        return total + (parseFloat(amount) * entryPrice)
      }, 0)

      // Add claimed rewards
      const claimedRewardsValue = position.claimedRewards.reduce((total, reward) => {
        return total + parseFloat(reward.amountUSD)
      }, 0)

      // Add unclaimed rewards
      const unclaimedRewardsValue = position.unclaimedRewards.reduce((total, reward) => {
        return total + parseFloat(reward.amountUSD)
      }, 0)

      const totalCurrentValue = currentValue + claimedRewardsValue + unclaimedRewardsValue
      const pnl = totalCurrentValue - entryValue
      const pnlPercentage = entryValue > 0 ? (pnl / entryValue) * 100 : 0

      return {
        pnl: pnl.toString(),
        pnlPercentage,
      }
    } catch (error) {
      console.error('Failed to calculate PnL:', error)
      return { pnl: '0', pnlPercentage: 0 }
    }
  }

  /**
   * Calculate impermanent loss
   */
  calculateImpermanentLoss(position: LiquidityPosition, pool: LiquidityPool): {
    impermanentLoss: string
    impermanentLossPercentage: number
  } {
    try {
      if (!this.config.enableILCalculation) {
        return { impermanentLoss: '0', impermanentLossPercentage: 0 }
      }

      const entryPrices = position.entryPrice.map(p => parseFloat(p))
      const currentPrices = position.currentPrice.map(p => parseFloat(p))

      if (entryPrices.length !== currentPrices.length) {
        return { impermanentLoss: '0', impermanentLossPercentage: 0 }
      }

      // For constant product pools (simplified calculation)
      if (entryPrices.length === 2) {
        const priceRatio = (currentPrices[1] / currentPrices[0]) / (entryPrices[1] / entryPrices[0])
        const holdValue = 1
        const poolValue = 2 * Math.sqrt(priceRatio) / (1 + priceRatio)
        const ilPercentage = (poolValue / holdValue - 1) * 100

        const entryValue = parseFloat(position.totalValueUSD)
        const ilAmount = (entryValue * ilPercentage) / 100

        return {
          impermanentLoss: ilAmount.toString(),
          impermanentLossPercentage: ilPercentage,
        }
      }

      return { impermanentLoss: '0', impermanentLossPercentage: 0 }
    } catch (error) {
      console.error('Failed to calculate impermanent loss:', error)
      return { impermanentLoss: '0', impermanentLossPercentage: 0 }
    }
  }

  /**
   * Private methods
   */
  private startRealTimeTracking(positionId: string): void {
    const interval = setInterval(() => {
      const position = this.positions.get(positionId)
      if (position) {
        // In real implementation, this would fetch updated position data
        this.takeSnapshot(position)
      }
    }, this.config.snapshotInterval)

    this.intervals.set(positionId, interval)
  }

  private takeSnapshot(position: LiquidityPosition): void {
    const snapshot: PositionSnapshot = {
      positionId: position.id,
      timestamp: Date.now(),
      liquidity: position.liquidity,
      tokenAmounts: [...position.tokenAmounts],
      tokenPrices: [...position.currentPrice],
      totalValueUSD: position.totalValueUSD,
      pnl: position.pnl,
      pnlPercentage: position.pnlPercentage,
      impermanentLoss: position.impermanentLoss,
      impermanentLossPercentage: position.impermanentLossPercentage,
      unclaimedRewards: [...position.unclaimedRewards],
    }

    const snapshots = this.snapshots.get(position.id) || []
    snapshots.push(snapshot)

    // Limit snapshots to max count
    if (snapshots.length > this.config.maxSnapshots) {
      snapshots.shift()
    }

    this.snapshots.set(position.id, snapshots)
  }

  private calculateMetrics(position: LiquidityPosition, snapshots: PositionSnapshot[]): PositionMetrics {
    const firstSnapshot = snapshots[0]
    const lastSnapshot = snapshots[snapshots.length - 1]

    const daysActive = (lastSnapshot.timestamp - firstSnapshot.timestamp) / (1000 * 60 * 60 * 24)
    const totalReturn = parseFloat(lastSnapshot.pnl)
    const totalReturnPercentage = lastSnapshot.pnlPercentage
    const annualizedReturn = daysActive > 0 ? (totalReturnPercentage / daysActive) * 365 : 0

    // Calculate volatility
    const returns = snapshots.slice(1).map((snapshot, index) => {
      const prevValue = parseFloat(snapshots[index].totalValueUSD)
      const currentValue = parseFloat(snapshot.totalValueUSD)
      return prevValue > 0 ? (currentValue - prevValue) / prevValue : 0
    })

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    const volatility = Math.sqrt(variance) * Math.sqrt(365) * 100 // Annualized volatility

    // Calculate max drawdown
    let maxValue = 0
    let maxDrawdown = 0

    snapshots.forEach(snapshot => {
      const value = parseFloat(snapshot.totalValueUSD)
      if (value > maxValue) {
        maxValue = value
      } else {
        const drawdown = (maxValue - value) / maxValue
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown
        }
      }
    })

    // Calculate Sharpe ratio (simplified)
    const riskFreeRate = 0.02 // 2% annual risk-free rate
    const excessReturn = annualizedReturn - riskFreeRate
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0

    // Calculate average liquidity
    const avgLiquidity = snapshots.reduce((sum, snapshot) => {
      return sum + parseFloat(snapshot.liquidity)
    }, 0) / snapshots.length

    return {
      positionId: position.id,
      totalReturn: totalReturn.toString(),
      totalReturnPercentage,
      annualizedReturn,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio,
      volatility,
      timeWeightedReturn: totalReturnPercentage, // Simplified
      daysActive,
      averageLiquidity: avgLiquidity.toString(),
      totalFeesEarned: position.claimedRewards
        .filter(r => r.source === 'trading_fees')
        .reduce((sum, r) => sum + parseFloat(r.amountUSD), 0)
        .toString(),
      totalRewardsClaimed: position.totalRewardsUSD,
      impermanentLossHistory: snapshots.map(s => ({
        timestamp: s.timestamp,
        loss: s.impermanentLossPercentage,
      })),
    }
  }

  private checkPositionAlerts(position: LiquidityPosition): void {
    const alerts = this.alerts.get(position.id) || []

    alerts.forEach(alert => {
      if (!alert.active || alert.triggered) return

      let shouldTrigger = false
      let currentValue = 0

      switch (alert.type) {
        case 'pnl_threshold':
          currentValue = position.pnlPercentage
          break
        case 'impermanent_loss':
          currentValue = Math.abs(position.impermanentLossPercentage)
          break
        case 'reward_threshold':
          currentValue = parseFloat(position.totalRewardsUSD)
          break
        default:
          return
      }

      switch (alert.condition) {
        case 'above':
          shouldTrigger = currentValue >= alert.threshold
          break
        case 'below':
          shouldTrigger = currentValue <= alert.threshold
          break
        case 'equals':
          shouldTrigger = Math.abs(currentValue - alert.threshold) < 0.01
          break
      }

      if (shouldTrigger) {
        alert.triggered = true
        alert.triggeredAt = Date.now()

        // In real implementation, this would send notifications
        console.log(`Alert triggered: ${alert.message}`)
      }
    })
  }

  private notifySubscribers(positionId: string, position: LiquidityPosition): void {
    const subscribers = this.subscribers.get(positionId)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(position)
        } catch (error) {
          console.error('Error in position subscriber callback:', error)
        }
      })
    }
  }

  private startAlertChecker(): void {
    setInterval(() => {
      for (const position of this.positions.values()) {
        this.checkPositionAlerts(position)
      }
    }, this.config.alertCheckInterval)
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals.clear()

    // Clear data
    this.positions.clear()
    this.snapshots.clear()
    this.alerts.clear()
    this.subscribers.clear()
  }
}

// Export singleton instance
export const positionTracker = new PositionTracker()
