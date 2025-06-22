import {
    LiquidityPool,
    LiquidityPosition
} from './types'

export interface RiskAssessment {
  poolId: string
  overallRisk: 'low' | 'medium' | 'high' | 'critical'
  riskScore: number // 0-100
  riskFactors: RiskFactor[]
  recommendations: string[]
  warnings: RiskWarning[]
  lastUpdated: number
}

export interface RiskFactor {
  type: RiskFactorType
  severity: 'low' | 'medium' | 'high' | 'critical'
  score: number // 0-100
  description: string
  impact: string
  mitigation?: string
}

export type RiskFactorType =
  | 'impermanent_loss'
  | 'liquidity_risk'
  | 'smart_contract_risk'
  | 'token_risk'
  | 'volatility_risk'
  | 'concentration_risk'
  | 'governance_risk'
  | 'oracle_risk'
  | 'regulatory_risk'
  | 'technical_risk'

export interface RiskWarning {
  type: 'price_deviation' | 'low_liquidity' | 'high_volatility' | 'smart_contract' | 'regulatory'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  threshold: number
  currentValue: number
  action: string
}

export interface ImpermanentLossCalculation {
  positionId: string
  currentLoss: number
  currentLossUSD: string
  projectedLoss: {
    scenario: string
    priceChange: number
    projectedLoss: number
    probability: number
  }[]
  historicalLoss: {
    timestamp: number
    loss: number
  }[]
}

export interface RiskAlert {
  id: string
  poolId?: string
  positionId?: string
  type: RiskFactorType
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  threshold: number
  currentValue: number
  triggered: boolean
  triggeredAt?: number
  acknowledged: boolean
  acknowledgedAt?: number
  createdAt: number
}

export interface RiskManagementConfig {
  enableRealTimeMonitoring: boolean
  alertThresholds: Record<RiskFactorType, number>
  maxRiskScore: number
  enableAutomaticActions: boolean
  riskUpdateInterval: number
}

const DEFAULT_CONFIG: RiskManagementConfig = {
  enableRealTimeMonitoring: true,
  alertThresholds: {
    impermanent_loss: 5, // 5%
    liquidity_risk: 70,
    smart_contract_risk: 60,
    token_risk: 70,
    volatility_risk: 80,
    concentration_risk: 75,
    governance_risk: 50,
    oracle_risk: 60,
    regulatory_risk: 40,
    technical_risk: 65,
  },
  maxRiskScore: 75,
  enableAutomaticActions: false,
  riskUpdateInterval: 300000, // 5 minutes
}

export class PoolRiskManagement {
  private config: RiskManagementConfig
  private riskAssessments: Map<string, RiskAssessment> = new Map()
  private alerts: Map<string, RiskAlert[]> = new Map()
  private ilCalculations: Map<string, ImpermanentLossCalculation> = new Map()
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: Partial<RiskManagementConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Assess risk for a liquidity pool
   */
  async assessPoolRisk(pool: LiquidityPool): Promise<RiskAssessment> {
    try {
      const riskFactors = await this.calculateRiskFactors(pool)
      const overallScore = this.calculateOverallRiskScore(riskFactors)
      const overallRisk = this.determineRiskLevel(overallScore)
      const warnings = this.generateWarnings(riskFactors)
      const recommendations = this.generateRecommendations(riskFactors)

      const assessment: RiskAssessment = {
        poolId: pool.id,
        overallRisk,
        riskScore: overallScore,
        riskFactors,
        recommendations,
        warnings,
        lastUpdated: Date.now(),
      }

      this.riskAssessments.set(pool.id, assessment)

      // Check for alerts
      this.checkRiskAlerts(pool.id, assessment)

      return assessment
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to assess pool risk')
    }
  }

  /**
   * Calculate impermanent loss for a position
   */
  async calculateImpermanentLoss(
    position: LiquidityPosition,
    pool: LiquidityPool
  ): Promise<ImpermanentLossCalculation> {
    try {
      const currentLoss = this.calculateCurrentIL(position)
      const projectedLoss = this.calculateProjectedIL(position, pool)
      const historicalLoss = this.getHistoricalIL(position.id)

      const calculation: ImpermanentLossCalculation = {
        positionId: position.id,
        currentLoss,
        currentLossUSD: (parseFloat(position.totalValueUSD) * currentLoss / 100).toString(),
        projectedLoss,
        historicalLoss,
      }

      this.ilCalculations.set(position.id, calculation)
      return calculation
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to calculate impermanent loss')
    }
  }

  /**
   * Start monitoring a pool for risk changes
   */
  startRiskMonitoring(poolId: string): void {
    if (!this.config.enableRealTimeMonitoring) return

    // Clear existing monitoring
    this.stopRiskMonitoring(poolId)

    const interval = setInterval(async () => {
      try {
        // In real implementation, this would fetch updated pool data
        // and recalculate risk assessment
        console.log(`Monitoring risk for pool ${poolId}`)
      } catch (error) {
        console.error(`Risk monitoring error for pool ${poolId}:`, error)
      }
    }, this.config.riskUpdateInterval)

    this.monitoringIntervals.set(poolId, interval)
  }

  /**
   * Stop monitoring a pool
   */
  stopRiskMonitoring(poolId: string): void {
    const interval = this.monitoringIntervals.get(poolId)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(poolId)
    }
  }

  /**
   * Get risk assessment for a pool
   */
  getRiskAssessment(poolId: string): RiskAssessment | null {
    return this.riskAssessments.get(poolId) || null
  }

  /**
   * Get alerts for a pool or position
   */
  getAlerts(poolId?: string, positionId?: string): RiskAlert[] {
    if (positionId) {
      return Array.from(this.alerts.values())
        .flat()
        .filter(alert => alert.positionId === positionId)
    }

    if (poolId) {
      return this.alerts.get(poolId) || []
    }

    return Array.from(this.alerts.values()).flat()
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    for (const alerts of this.alerts.values()) {
      const alert = alerts.find(a => a.id === alertId)
      if (alert) {
        alert.acknowledged = true
        alert.acknowledgedAt = Date.now()
        return true
      }
    }
    return false
  }

  /**
   * Private helper methods
   */
  private async calculateRiskFactors(pool: LiquidityPool): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = []

    // Impermanent Loss Risk
    factors.push(this.assessImpermanentLossRisk(pool))

    // Liquidity Risk
    factors.push(this.assessLiquidityRisk(pool))

    // Smart Contract Risk
    factors.push(this.assessSmartContractRisk(pool))

    // Token Risk
    factors.push(this.assessTokenRisk(pool))

    // Volatility Risk
    factors.push(this.assessVolatilityRisk(pool))

    // Concentration Risk
    factors.push(this.assessConcentrationRisk(pool))

    return factors
  }

  private assessImpermanentLossRisk(pool: LiquidityPool): RiskFactor {
    // Calculate IL risk based on token volatility and correlation
    let score = 0

    if (pool.type === 'stable') {
      score = 10 // Low IL risk for stable pools
    } else if (pool.type === 'constant_product') {
      // Higher risk for volatile pairs
      score = 60
    } else if (pool.type === 'weighted') {
      // Risk depends on weights
      score = 40
    }

    return {
      type: 'impermanent_loss',
      severity: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
      score,
      description: 'Risk of impermanent loss due to price divergence',
      impact: 'Potential loss compared to holding tokens',
      mitigation: 'Consider stable pairs or weighted pools with less volatile tokens',
    }
  }

  private assessLiquidityRisk(pool: LiquidityPool): RiskFactor {
    const tvl = parseFloat(pool.tvlUSD)
    let score = 0

    if (tvl < 100000) score = 80 // High risk
    else if (tvl < 1000000) score = 50 // Medium risk
    else if (tvl < 10000000) score = 30 // Low-medium risk
    else score = 10 // Low risk

    return {
      type: 'liquidity_risk',
      severity: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
      score,
      description: 'Risk of insufficient liquidity for large trades',
      impact: 'Higher slippage and difficulty exiting positions',
      mitigation: 'Monitor TVL and consider pools with higher liquidity',
    }
  }

  private assessSmartContractRisk(pool: LiquidityPool): RiskFactor {
    let score = 30 // Base score

    // Increase risk for unverified pools
    if (!pool.metadata?.verified) score += 30

    // Decrease risk for audited protocols
    if (pool.version === 'v3') score -= 10 // Uniswap V3 is well-audited

    // Age factor
    const ageInDays = (Date.now() - pool.createdAt) / (1000 * 60 * 60 * 24)
    if (ageInDays < 30) score += 20
    else if (ageInDays > 365) score -= 10

    return {
      type: 'smart_contract_risk',
      severity: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
      score: Math.max(0, Math.min(100, score)),
      description: 'Risk of smart contract vulnerabilities or bugs',
      impact: 'Potential loss of funds due to contract exploits',
      mitigation: 'Use verified and audited protocols, start with small amounts',
    }
  }

  private assessTokenRisk(pool: LiquidityPool): RiskFactor {
    let score = 0

    pool.tokens.forEach(token => {
      if (token.riskLevel === 'high') score += 30
      else if (token.riskLevel === 'medium') score += 15
      else score += 5
    })

    score = score / pool.tokens.length // Average risk

    return {
      type: 'token_risk',
      severity: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
      score,
      description: 'Risk associated with underlying tokens',
      impact: 'Token-specific risks like depegging, regulatory issues',
      mitigation: 'Research tokens thoroughly, diversify across different assets',
    }
  }

  private assessVolatilityRisk(pool: LiquidityPool): RiskFactor {
    // Simplified volatility assessment
    let score = 40 // Base volatility

    if (pool.type === 'stable') score = 15
    else if (pool.metadata?.category === 'volatile') score = 70

    return {
      type: 'volatility_risk',
      severity: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
      score,
      description: 'Risk from price volatility of pool tokens',
      impact: 'Higher impermanent loss and value fluctuations',
      mitigation: 'Consider stable pools or use hedging strategies',
    }
  }

  private assessConcentrationRisk(pool: LiquidityPool): RiskFactor {
    // Risk of being too concentrated in one pool/protocol
    const score = 30 // Base score

    // This would be calculated based on user's total portfolio
    // For now, use a simplified approach

    return {
      type: 'concentration_risk',
      severity: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
      score,
      description: 'Risk of over-concentration in single pool or protocol',
      impact: 'Lack of diversification increases overall portfolio risk',
      mitigation: 'Diversify across multiple pools and protocols',
    }
  }

  private calculateOverallRiskScore(factors: RiskFactor[]): number {
    // Weighted average of risk factors
    const weights: Record<RiskFactorType, number> = {
      impermanent_loss: 0.25,
      liquidity_risk: 0.20,
      smart_contract_risk: 0.20,
      token_risk: 0.15,
      volatility_risk: 0.10,
      concentration_risk: 0.05,
      governance_risk: 0.02,
      oracle_risk: 0.02,
      regulatory_risk: 0.01,
      technical_risk: 0.00,
    }

    let weightedScore = 0
    let totalWeight = 0

    factors.forEach(factor => {
      const weight = weights[factor.type] || 0
      weightedScore += factor.score * weight
      totalWeight += weight
    })

    return totalWeight > 0 ? weightedScore / totalWeight : 0
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }

  private generateWarnings(factors: RiskFactor[]): RiskWarning[] {
    const warnings: RiskWarning[] = []

    factors.forEach(factor => {
      if (factor.severity === 'high' || factor.severity === 'critical') {
        warnings.push({
          type: this.mapFactorToWarningType(factor.type),
          severity: factor.severity,
          message: factor.description,
          threshold: this.config.alertThresholds[factor.type],
          currentValue: factor.score,
          action: factor.mitigation || 'Monitor closely',
        })
      }
    })

    return warnings
  }

  private generateRecommendations(factors: RiskFactor[]): string[] {
    const recommendations: string[] = []

    factors.forEach(factor => {
      if (factor.mitigation && factor.severity !== 'low') {
        recommendations.push(factor.mitigation)
      }
    })

    // Add general recommendations
    recommendations.push('Monitor positions regularly')
    recommendations.push('Consider setting stop-loss levels')
    recommendations.push('Diversify across multiple pools')

    return [...new Set(recommendations)] // Remove duplicates
  }

  private mapFactorToWarningType(factorType: RiskFactorType): RiskWarning['type'] {
    switch (factorType) {
      case 'liquidity_risk':
        return 'low_liquidity'
      case 'volatility_risk':
        return 'high_volatility'
      case 'smart_contract_risk':
        return 'smart_contract'
      case 'regulatory_risk':
        return 'regulatory'
      default:
        return 'price_deviation'
    }
  }

  private checkRiskAlerts(poolId: string, assessment: RiskAssessment): void {
    const poolAlerts = this.alerts.get(poolId) || []

    assessment.riskFactors.forEach(factor => {
      const threshold = this.config.alertThresholds[factor.type]

      if (factor.score >= threshold) {
        const existingAlert = poolAlerts.find(
          alert => alert.type === factor.type && !alert.acknowledged
        )

        if (!existingAlert) {
          const alert: RiskAlert = {
            id: this.generateAlertId(),
            poolId,
            type: factor.type,
            severity: factor.severity,
            message: `${factor.type} risk threshold exceeded`,
            threshold,
            currentValue: factor.score,
            triggered: true,
            triggeredAt: Date.now(),
            acknowledged: false,
            createdAt: Date.now(),
          }

          poolAlerts.push(alert)
        }
      }
    })

    this.alerts.set(poolId, poolAlerts)
  }

  private calculateCurrentIL(position: LiquidityPosition): number {
    return position.impermanentLossPercentage
  }

  private calculateProjectedIL(position: LiquidityPosition, pool: LiquidityPool): any[] {
    // Simplified projection scenarios
    return [
      { scenario: '10% price change', priceChange: 10, projectedLoss: -0.5, probability: 0.3 },
      { scenario: '25% price change', priceChange: 25, projectedLoss: -1.2, probability: 0.2 },
      { scenario: '50% price change', priceChange: 50, projectedLoss: -2.0, probability: 0.1 },
    ]
  }

  private getHistoricalIL(positionId: string): any[] {
    // Would fetch from position tracker
    return []
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      assessments: this.riskAssessments.size,
      alerts: Array.from(this.alerts.values()).flat().length,
      activeMonitoring: this.monitoringIntervals.size,
      config: this.config,
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear monitoring intervals
    this.monitoringIntervals.forEach(interval => clearInterval(interval))
    this.monitoringIntervals.clear()

    // Clear data
    this.riskAssessments.clear()
    this.alerts.clear()
    this.ilCalculations.clear()
  }
}

// Export singleton instance
export const poolRiskManagement = new PoolRiskManagement()
