import { Token } from '@/config/tokens'
import { Transaction } from '@/services/transaction/types'
import { Address } from 'viem'

// Security Risk Levels
export type SecurityRiskLevel = 'low' | 'medium' | 'high' | 'critical'

// Security Check Types
export type SecurityCheckType =
  | 'contract_verification'
  | 'token_validation'
  | 'amount_validation'
  | 'slippage_validation'
  | 'gas_validation'
  | 'mev_protection'
  | 'sandwich_protection'
  | 'frontrun_protection'
  | 'reentrancy_check'
  | 'approval_validation'
  | 'deadline_validation'
  | 'signature_validation'
  | 'blacklist_check'
  | 'honeypot_check'
  | 'liquidity_check'

// Security Check Result
export interface SecurityCheckResult {
  type: SecurityCheckType
  passed: boolean
  riskLevel: SecurityRiskLevel
  message: string
  details?: any
  recommendation?: string
  timestamp: number
}

// Security Validation Result
export interface SecurityValidationResult {
  overall: SecurityRiskLevel
  passed: boolean
  score: number // 0-100
  checks: SecurityCheckResult[]
  warnings: SecurityWarning[]
  blockers: SecurityBlocker[]
  recommendations: string[]
  timestamp: number
}

// Security Warning
export interface SecurityWarning {
  type: string
  message: string
  severity: 'low' | 'medium' | 'high'
  recommendation?: string
}

// Security Blocker
export interface SecurityBlocker {
  type: string
  message: string
  reason: string
  canOverride: boolean
}

// Contract Security Info
export interface ContractSecurityInfo {
  address: Address
  verified: boolean
  sourceCode?: string
  compiler?: string
  optimization?: boolean
  runs?: number
  constructorArgs?: string
  abi?: any[]
  proxy?: {
    isProxy: boolean
    implementation?: Address
    admin?: Address
  }
  audit?: {
    audited: boolean
    auditor?: string
    date?: number
    report?: string
  }
  riskFactors: string[]
  securityScore: number
}

// Token Security Info
export interface TokenSecurityInfo {
  token: Token
  verified: boolean
  isHoneypot: boolean
  hasBlacklist: boolean
  hasPausable: boolean
  hasMintable: boolean
  hasProxy: boolean
  hasTimelock: boolean
  liquidityLocked: boolean
  ownershipRenounced: boolean
  taxInfo: {
    buyTax: number
    sellTax: number
    transferTax: number
  }
  holders: number
  riskLevel: SecurityRiskLevel
  warnings: string[]
}

// MEV Protection Config
export interface MEVProtectionConfig {
  enabled: boolean
  privateMempool: boolean
  flashbotsProtection: boolean
  slippageBuffer: number
  maxPriceImpact: number
  frontrunDetection: boolean
  sandwichDetection: boolean
}

// Security Configuration
export interface SecurityConfig {
  strictMode: boolean
  allowUnverifiedContracts: boolean
  allowUnverifiedTokens: boolean
  maxSlippage: number
  maxPriceImpact: number
  maxGasPrice: string
  mevProtection: MEVProtectionConfig
  blacklistEnabled: boolean
  honeypotDetection: boolean
  simulationRequired: boolean
  auditRequired: boolean
}

const DEFAULT_CONFIG: SecurityConfig = {
  strictMode: false,
  allowUnverifiedContracts: false,
  allowUnverifiedTokens: false,
  maxSlippage: 5,
  maxPriceImpact: 15,
  maxGasPrice: '100000000000', // 100 gwei
  mevProtection: {
    enabled: true,
    privateMempool: true,
    flashbotsProtection: true,
    slippageBuffer: 0.5,
    maxPriceImpact: 10,
    frontrunDetection: true,
    sandwichDetection: true,
  },
  blacklistEnabled: true,
  honeypotDetection: true,
  simulationRequired: true,
  auditRequired: false,
}

export class SecurityValidator {
  private config: SecurityConfig
  private contractCache: Map<Address, ContractSecurityInfo> = new Map()
  private tokenCache: Map<Address, TokenSecurityInfo> = new Map()
  private blacklist: Set<Address> = new Set()

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.loadBlacklist()
  }

  /**
   * Validate transaction security
   */
  async validateTransaction(transaction: Transaction): Promise<SecurityValidationResult> {
    const checks: SecurityCheckResult[] = []
    const warnings: SecurityWarning[] = []
    const blockers: SecurityBlocker[] = []
    const recommendations: string[] = []

    try {
      // Contract verification check
      const contractCheck = await this.checkContractSecurity(transaction.to)
      checks.push(contractCheck)

      // Token validation checks
      if (transaction.fromToken) {
        const fromTokenCheck = await this.checkTokenSecurity(transaction.fromToken)
        checks.push(fromTokenCheck)
      }

      if (transaction.toToken) {
        const toTokenCheck = await this.checkTokenSecurity(transaction.toToken)
        checks.push(toTokenCheck)
      }

      // Amount validation
      if (transaction.fromAmount) {
        const amountCheck = this.checkAmountSecurity(transaction.fromAmount, transaction.fromToken)
        checks.push(amountCheck)
      }

      // Slippage validation
      if (transaction.slippage !== undefined) {
        const slippageCheck = this.checkSlippageSecurity(transaction.slippage)
        checks.push(slippageCheck)
      }

      // Gas validation
      const gasCheck = this.checkGasSecurity(transaction.gasLimit, transaction.gasPrice)
      checks.push(gasCheck)

      // MEV protection check
      const mevCheck = this.checkMEVProtection(transaction)
      checks.push(mevCheck)

      // Deadline validation
      if (transaction.deadline) {
        const deadlineCheck = this.checkDeadlineSecurity(transaction.deadline)
        checks.push(deadlineCheck)
      }

      // Blacklist check
      const blacklistCheck = this.checkBlacklist(transaction.to, transaction.userAddress)
      checks.push(blacklistCheck)

      // Calculate overall risk and score
      const { overall, score } = this.calculateOverallRisk(checks)

      // Generate warnings and blockers
      this.generateWarningsAndBlockers(checks, warnings, blockers, recommendations)

      return {
        overall,
        passed: blockers.length === 0,
        score,
        checks,
        warnings,
        blockers,
        recommendations,
        timestamp: Date.now(),
      }
    } catch (error) {
      // If validation fails, return critical risk
      return {
        overall: 'critical',
        passed: false,
        score: 0,
        checks,
        warnings: [{
          type: 'validation_error',
          message: 'Security validation failed',
          severity: 'high',
        }],
        blockers: [{
          type: 'validation_error',
          message: 'Security validation could not be completed',
          reason: error instanceof Error ? error.message : 'Unknown error',
          canOverride: false,
        }],
        recommendations: ['Contact support for assistance'],
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Check contract security
   */
  private async checkContractSecurity(address: Address): Promise<SecurityCheckResult> {
    try {
      // Check cache first
      let contractInfo = this.contractCache.get(address)

      if (!contractInfo) {
        contractInfo = await this.fetchContractInfo(address)
        this.contractCache.set(address, contractInfo)
      }

      if (!contractInfo.verified && !this.config.allowUnverifiedContracts) {
        return {
          type: 'contract_verification',
          passed: false,
          riskLevel: 'high',
          message: 'Contract is not verified',
          recommendation: 'Only interact with verified contracts',
          timestamp: Date.now(),
        }
      }

      const riskLevel = this.assessContractRisk(contractInfo)

      return {
        type: 'contract_verification',
        passed: riskLevel !== 'critical',
        riskLevel,
        message: contractInfo.verified ? 'Contract is verified' : 'Contract is not verified',
        details: contractInfo,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        type: 'contract_verification',
        passed: false,
        riskLevel: 'critical',
        message: 'Failed to verify contract',
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Check token security
   */
  private async checkTokenSecurity(token: Token): Promise<SecurityCheckResult> {
    try {
      // Check cache first
      let tokenInfo = this.tokenCache.get(token.address)

      if (!tokenInfo) {
        tokenInfo = await this.fetchTokenInfo(token)
        this.tokenCache.set(token.address, tokenInfo)
      }

      if (tokenInfo.isHoneypot) {
        return {
          type: 'honeypot_check',
          passed: false,
          riskLevel: 'critical',
          message: 'Token is identified as a honeypot',
          recommendation: 'Do not interact with this token',
          timestamp: Date.now(),
        }
      }

      if (!tokenInfo.verified && !this.config.allowUnverifiedTokens) {
        return {
          type: 'token_validation',
          passed: false,
          riskLevel: 'high',
          message: 'Token is not verified',
          recommendation: 'Only trade verified tokens',
          timestamp: Date.now(),
        }
      }

      return {
        type: 'token_validation',
        passed: tokenInfo.riskLevel !== 'critical',
        riskLevel: tokenInfo.riskLevel,
        message: `Token security level: ${tokenInfo.riskLevel}`,
        details: tokenInfo,
        timestamp: Date.now(),
      }
    } catch (error) {
      return {
        type: 'token_validation',
        passed: false,
        riskLevel: 'medium',
        message: 'Could not verify token security',
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Check amount security
   */
  private checkAmountSecurity(amount: string, token?: Token): SecurityCheckResult {
    const amountNum = parseFloat(amount)

    if (amountNum <= 0) {
      return {
        type: 'amount_validation',
        passed: false,
        riskLevel: 'high',
        message: 'Invalid amount',
        timestamp: Date.now(),
      }
    }

    // Check for suspiciously large amounts
    if (amountNum > 1000000) {
      return {
        type: 'amount_validation',
        passed: false,
        riskLevel: 'medium',
        message: 'Unusually large amount detected',
        recommendation: 'Verify the amount is correct',
        timestamp: Date.now(),
      }
    }

    return {
      type: 'amount_validation',
      passed: true,
      riskLevel: 'low',
      message: 'Amount validation passed',
      timestamp: Date.now(),
    }
  }

  /**
   * Check slippage security
   */
  private checkSlippageSecurity(slippage: number): SecurityCheckResult {
    if (slippage > this.config.maxSlippage) {
      return {
        type: 'slippage_validation',
        passed: false,
        riskLevel: 'medium',
        message: `High slippage: ${slippage}%`,
        recommendation: `Consider reducing slippage below ${this.config.maxSlippage}%`,
        timestamp: Date.now(),
      }
    }

    if (slippage > 10) {
      return {
        type: 'slippage_validation',
        passed: false,
        riskLevel: 'high',
        message: `Very high slippage: ${slippage}%`,
        recommendation: 'High slippage increases MEV risk',
        timestamp: Date.now(),
      }
    }

    return {
      type: 'slippage_validation',
      passed: true,
      riskLevel: 'low',
      message: 'Slippage is within acceptable range',
      timestamp: Date.now(),
    }
  }

  /**
   * Check gas security
   */
  private checkGasSecurity(gasLimit: string, gasPrice?: string): SecurityCheckResult {
    const gasLimitNum = parseFloat(gasLimit)
    const gasPriceNum = gasPrice ? parseFloat(gasPrice) : 0

    if (gasLimitNum > 10000000) {
      return {
        type: 'gas_validation',
        passed: false,
        riskLevel: 'medium',
        message: 'Very high gas limit',
        recommendation: 'Verify gas limit is reasonable',
        timestamp: Date.now(),
      }
    }

    if (gasPriceNum > parseFloat(this.config.maxGasPrice)) {
      return {
        type: 'gas_validation',
        passed: false,
        riskLevel: 'medium',
        message: 'Gas price exceeds maximum',
        recommendation: 'Wait for lower gas prices',
        timestamp: Date.now(),
      }
    }

    return {
      type: 'gas_validation',
      passed: true,
      riskLevel: 'low',
      message: 'Gas parameters are reasonable',
      timestamp: Date.now(),
    }
  }

  /**
   * Check MEV protection
   */
  private checkMEVProtection(transaction: Transaction): SecurityCheckResult {
    if (!this.config.mevProtection.enabled) {
      return {
        type: 'mev_protection',
        passed: true,
        riskLevel: 'medium',
        message: 'MEV protection is disabled',
        recommendation: 'Enable MEV protection for better security',
        timestamp: Date.now(),
      }
    }

    // Check if transaction is vulnerable to MEV
    const isVulnerable = this.assessMEVVulnerability(transaction)

    if (isVulnerable) {
      return {
        type: 'mev_protection',
        passed: false,
        riskLevel: 'medium',
        message: 'Transaction may be vulnerable to MEV',
        recommendation: 'Use private mempool or adjust parameters',
        timestamp: Date.now(),
      }
    }

    return {
      type: 'mev_protection',
      passed: true,
      riskLevel: 'low',
      message: 'MEV protection is active',
      timestamp: Date.now(),
    }
  }

  /**
   * Check deadline security
   */
  private checkDeadlineSecurity(deadline: number): SecurityCheckResult {
    const now = Date.now()
    const timeUntilDeadline = deadline - now

    if (timeUntilDeadline < 60000) { // Less than 1 minute
      return {
        type: 'deadline_validation',
        passed: false,
        riskLevel: 'medium',
        message: 'Deadline is too soon',
        recommendation: 'Extend deadline to allow for network delays',
        timestamp: Date.now(),
      }
    }

    if (timeUntilDeadline > 3600000) { // More than 1 hour
      return {
        type: 'deadline_validation',
        passed: false,
        riskLevel: 'low',
        message: 'Deadline is very far in the future',
        recommendation: 'Consider shorter deadline for better price protection',
        timestamp: Date.now(),
      }
    }

    return {
      type: 'deadline_validation',
      passed: true,
      riskLevel: 'low',
      message: 'Deadline is appropriate',
      timestamp: Date.now(),
    }
  }

  /**
   * Check blacklist
   */
  private checkBlacklist(contractAddress: Address, userAddress: Address): SecurityCheckResult {
    if (!this.config.blacklistEnabled) {
      return {
        type: 'blacklist_check',
        passed: true,
        riskLevel: 'low',
        message: 'Blacklist check disabled',
        timestamp: Date.now(),
      }
    }

    if (this.blacklist.has(contractAddress) || this.blacklist.has(userAddress)) {
      return {
        type: 'blacklist_check',
        passed: false,
        riskLevel: 'critical',
        message: 'Address is blacklisted',
        recommendation: 'Do not proceed with this transaction',
        timestamp: Date.now(),
      }
    }

    return {
      type: 'blacklist_check',
      passed: true,
      riskLevel: 'low',
      message: 'No blacklisted addresses detected',
      timestamp: Date.now(),
    }
  }

  /**
   * Private helper methods
   */
  private async fetchContractInfo(address: Address): Promise<ContractSecurityInfo> {
    // Placeholder - would integrate with Etherscan, Sourcify, etc.
    return {
      address,
      verified: Math.random() > 0.3, // 70% chance of being verified
      riskFactors: [],
      securityScore: Math.floor(Math.random() * 100),
    }
  }

  private async fetchTokenInfo(token: Token): Promise<TokenSecurityInfo> {
    // Placeholder - would integrate with token security APIs
    return {
      token,
      verified: token.verified || false,
      isHoneypot: false,
      hasBlacklist: false,
      hasPausable: false,
      hasMintable: false,
      hasProxy: false,
      hasTimelock: false,
      liquidityLocked: true,
      ownershipRenounced: false,
      taxInfo: {
        buyTax: 0,
        sellTax: 0,
        transferTax: 0,
      },
      holders: 1000,
      riskLevel: (token.riskLevel === 'unverified' ? 'high' : token.riskLevel) || 'medium',
      warnings: [],
    }
  }

  private assessContractRisk(contractInfo: ContractSecurityInfo): SecurityRiskLevel {
    if (!contractInfo.verified) return 'high'
    if (contractInfo.securityScore < 30) return 'high'
    if (contractInfo.securityScore < 60) return 'medium'
    return 'low'
  }

  private assessMEVVulnerability(transaction: Transaction): boolean {
    // Simple heuristic - large amounts or high slippage are more vulnerable
    const amount = parseFloat(transaction.fromAmount || '0')
    const slippage = transaction.slippage || 0

    return amount > 10000 || slippage > 2
  }

  private calculateOverallRisk(checks: SecurityCheckResult[]): { overall: SecurityRiskLevel; score: number } {
    const criticalCount = checks.filter(c => c.riskLevel === 'critical').length
    const highCount = checks.filter(c => c.riskLevel === 'high').length
    const mediumCount = checks.filter(c => c.riskLevel === 'medium').length
    const passedCount = checks.filter(c => c.passed).length

    if (criticalCount > 0) {
      return { overall: 'critical', score: 0 }
    }

    if (highCount > 0) {
      return { overall: 'high', score: 25 }
    }

    if (mediumCount > 2) {
      return { overall: 'medium', score: 50 }
    }

    const score = Math.floor((passedCount / checks.length) * 100)
    const overall: SecurityRiskLevel = score > 80 ? 'low' : 'medium'

    return { overall, score }
  }

  private generateWarningsAndBlockers(
    checks: SecurityCheckResult[],
    warnings: SecurityWarning[],
    blockers: SecurityBlocker[],
    recommendations: string[]
  ): void {
    checks.forEach(check => {
      if (!check.passed) {
        if (check.riskLevel === 'critical') {
          blockers.push({
            type: check.type,
            message: check.message,
            reason: check.details?.reason || 'Critical security risk detected',
            canOverride: false,
          })
        } else {
          warnings.push({
            type: check.type,
            message: check.message,
            severity: check.riskLevel === 'high' ? 'high' : 'medium',
            recommendation: check.recommendation,
          })
        }
      }

      if (check.recommendation) {
        recommendations.push(check.recommendation)
      }
    })
  }

  private loadBlacklist(): void {
    // Placeholder - would load from external blacklist sources
    // OFAC, Chainalysis, etc.
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.contractCache.clear()
    this.tokenCache.clear()
    this.blacklist.clear()
  }
}

// Export singleton instance
export const securityValidator = new SecurityValidator()
