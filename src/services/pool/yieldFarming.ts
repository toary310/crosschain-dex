import { Token } from '@/config/tokens'
import { Address } from 'viem'
import {
    PositionReward
} from './types'

export interface YieldFarm {
  id: string
  name: string
  poolId: string
  farmAddress: Address
  chainId: number

  // Reward Configuration
  rewardTokens: Token[]
  rewardRates: string[] // Rewards per second for each token
  totalRewards: string[] // Total rewards allocated
  distributedRewards: string[] // Already distributed

  // Farm Parameters
  startTime: number
  endTime: number
  lockPeriod: number // Seconds
  minStakeAmount: string
  maxStakeAmount?: string

  // Farm State
  totalStaked: string
  totalStakers: number
  apr: number
  apy: number

  // Multipliers and Boosts
  baseMultiplier: number
  maxMultiplier: number
  boostFactors: BoostFactor[]

  // Status
  active: boolean
  paused: boolean

  // Metadata
  description?: string
  tags: string[]
  verified: boolean
  featured: boolean

  createdAt: number
  lastUpdated: number
}

export interface BoostFactor {
  type: 'time_lock' | 'token_holding' | 'nft_holding' | 'referral' | 'loyalty'
  description: string
  multiplier: number
  requirements: {
    token?: Token
    amount?: string
    duration?: number
    nftCollection?: Address
    referralCount?: number
  }
}

export interface StakePosition {
  id: string
  farmId: string
  userAddress: Address

  // Stake Details
  stakedAmount: string
  stakedAt: number
  lockUntil?: number

  // Rewards
  pendingRewards: PositionReward[]
  claimedRewards: PositionReward[]
  totalRewardsUSD: string

  // Multipliers
  currentMultiplier: number
  appliedBoosts: BoostFactor[]

  // Metrics
  apr: number
  apy: number

  lastUpdated: number
}

export interface FarmingStrategy {
  id: string
  name: string
  description: string
  farms: string[] // Farm IDs
  allocation: number[] // Percentage allocation to each farm
  rebalanceThreshold: number
  autoCompound: boolean
  riskLevel: 'low' | 'medium' | 'high'
  expectedAPY: number
}

export interface YieldFarmingConfig {
  enableAutoCompound: boolean
  defaultLockPeriod: number
  maxFarmsPerUser: number
  rewardClaimThreshold: string
  gasOptimization: boolean
  enableStrategies: boolean
}

const DEFAULT_CONFIG: YieldFarmingConfig = {
  enableAutoCompound: true,
  defaultLockPeriod: 0,
  maxFarmsPerUser: 50,
  rewardClaimThreshold: '10', // $10 USD minimum
  gasOptimization: true,
  enableStrategies: true,
}

export class YieldFarmingService {
  private config: YieldFarmingConfig
  private farms: Map<string, YieldFarm> = new Map()
  private positions: Map<string, StakePosition> = new Map()
  private strategies: Map<string, FarmingStrategy> = new Map()
  private rewardCalculators: Map<string, (position: StakePosition, farm: YieldFarm) => PositionReward[]> = new Map()

  constructor(config: Partial<YieldFarmingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeRewardCalculators()
  }

  /**
   * Get all available farms
   */
  async getFarms(chainId?: number): Promise<YieldFarm[]> {
    try {
      let farms = Array.from(this.farms.values())

      if (chainId) {
        farms = farms.filter(farm => farm.chainId === chainId)
      }

      // Sort by APR (descending)
      return farms.sort((a, b) => b.apr - a.apr)
    } catch (error) {
      console.error('Failed to get farms:', error)
      return []
    }
  }

  /**
   * Get farm by ID
   */
  async getFarm(farmId: string): Promise<YieldFarm | null> {
    return this.farms.get(farmId) || null
  }

  /**
   * Stake tokens in a farm
   */
  async stake(
    farmId: string,
    amount: string,
    userAddress: Address,
    lockPeriod?: number
  ): Promise<{ transaction: any; positionId: string }> {
    try {
      const farm = this.farms.get(farmId)
      if (!farm) {
        throw new Error('Farm not found')
      }

      if (!farm.active || farm.paused) {
        throw new Error('Farm is not active')
      }

      // Validate amount
      const stakeAmount = parseFloat(amount)
      const minStake = parseFloat(farm.minStakeAmount)
      const maxStake = farm.maxStakeAmount ? parseFloat(farm.maxStakeAmount) : Infinity

      if (stakeAmount < minStake) {
        throw new Error(`Minimum stake amount is ${farm.minStakeAmount}`)
      }

      if (stakeAmount > maxStake) {
        throw new Error(`Maximum stake amount is ${farm.maxStakeAmount}`)
      }

      // Create position
      const positionId = this.generatePositionId()
      const lockUntil = lockPeriod ? Date.now() + (lockPeriod * 1000) : undefined

      const position: StakePosition = {
        id: positionId,
        farmId,
        userAddress,
        stakedAmount: amount,
        stakedAt: Date.now(),
        lockUntil,
        pendingRewards: [],
        claimedRewards: [],
        totalRewardsUSD: '0',
        currentMultiplier: this.calculateMultiplier(farm, lockPeriod),
        appliedBoosts: this.getApplicableBoosts(farm, userAddress, lockPeriod),
        apr: farm.apr,
        apy: farm.apy,
        lastUpdated: Date.now(),
      }

      this.positions.set(positionId, position)

      // Create transaction
      const transaction = {
        to: farm.farmAddress,
        data: this.encodeStakeData(amount, lockPeriod),
        value: '0',
        gasLimit: '200000',
      }

      return { transaction, positionId }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to stake')
    }
  }

  /**
   * Unstake tokens from a farm
   */
  async unstake(positionId: string): Promise<{ transaction: any; rewards: PositionReward[] }> {
    try {
      const position = this.positions.get(positionId)
      if (!position) {
        throw new Error('Position not found')
      }

      const farm = this.farms.get(position.farmId)
      if (!farm) {
        throw new Error('Farm not found')
      }

      // Check lock period
      if (position.lockUntil && Date.now() < position.lockUntil) {
        throw new Error('Position is still locked')
      }

      // Calculate pending rewards
      const pendingRewards = this.calculatePendingRewards(position, farm)

      // Create transaction
      const transaction = {
        to: farm.farmAddress,
        data: this.encodeUnstakeData(position.stakedAmount),
        value: '0',
        gasLimit: '250000',
      }

      // Update position
      position.claimedRewards.push(...pendingRewards)
      position.pendingRewards = []
      position.lastUpdated = Date.now()

      return { transaction, rewards: pendingRewards }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to unstake')
    }
  }

  /**
   * Claim rewards without unstaking
   */
  async claimRewards(positionId: string): Promise<{ transaction: any; rewards: PositionReward[] }> {
    try {
      const position = this.positions.get(positionId)
      if (!position) {
        throw new Error('Position not found')
      }

      const farm = this.farms.get(position.farmId)
      if (!farm) {
        throw new Error('Farm not found')
      }

      // Calculate pending rewards
      const pendingRewards = this.calculatePendingRewards(position, farm)

      // Check minimum claim threshold
      const totalRewardValue = pendingRewards.reduce((sum, reward) =>
        sum + parseFloat(reward.amountUSD), 0
      )

      if (totalRewardValue < parseFloat(this.config.rewardClaimThreshold)) {
        throw new Error(`Minimum claim amount is $${this.config.rewardClaimThreshold}`)
      }

      // Create transaction
      const transaction = {
        to: farm.farmAddress,
        data: this.encodeClaimData(),
        value: '0',
        gasLimit: '150000',
      }

      // Update position
      position.claimedRewards.push(...pendingRewards)
      position.pendingRewards = []
      position.totalRewardsUSD = (
        parseFloat(position.totalRewardsUSD) + totalRewardValue
      ).toString()
      position.lastUpdated = Date.now()

      return { transaction, rewards: pendingRewards }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to claim rewards')
    }
  }

  /**
   * Compound rewards (restake)
   */
  async compound(positionId: string): Promise<{ transaction: any; newAmount: string }> {
    try {
      if (!this.config.enableAutoCompound) {
        throw new Error('Auto-compound is disabled')
      }

      const position = this.positions.get(positionId)
      if (!position) {
        throw new Error('Position not found')
      }

      const farm = this.farms.get(position.farmId)
      if (!farm) {
        throw new Error('Farm not found')
      }

      // Calculate pending rewards
      const pendingRewards = this.calculatePendingRewards(position, farm)

      // Convert rewards to stake token (simplified)
      const compoundAmount = this.convertRewardsToStakeToken(pendingRewards, farm)

      if (parseFloat(compoundAmount) === 0) {
        throw new Error('No rewards to compound')
      }

      // Create transaction
      const transaction = {
        to: farm.farmAddress,
        data: this.encodeCompoundData(),
        value: '0',
        gasLimit: '300000',
      }

      // Update position
      const newStakedAmount = (
        parseFloat(position.stakedAmount) + parseFloat(compoundAmount)
      ).toString()

      position.stakedAmount = newStakedAmount
      position.claimedRewards.push(...pendingRewards)
      position.pendingRewards = []
      position.lastUpdated = Date.now()

      return { transaction, newAmount: newStakedAmount }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to compound')
    }
  }

  /**
   * Get user positions
   */
  async getUserPositions(userAddress: Address, chainId?: number): Promise<StakePosition[]> {
    try {
      let positions = Array.from(this.positions.values())

      // Filter by user
      positions = positions.filter(pos =>
        pos.userAddress.toLowerCase() === userAddress.toLowerCase()
      )

      // Filter by chain if specified
      if (chainId) {
        positions = positions.filter(pos => {
          const farm = this.farms.get(pos.farmId)
          return farm && farm.chainId === chainId
        })
      }

      // Update pending rewards
      positions.forEach(position => {
        const farm = this.farms.get(position.farmId)
        if (farm) {
          position.pendingRewards = this.calculatePendingRewards(position, farm)
        }
      })

      return positions
    } catch (error) {
      console.error('Failed to get user positions:', error)
      return []
    }
  }

  /**
   * Get farming strategies
   */
  async getStrategies(): Promise<FarmingStrategy[]> {
    if (!this.config.enableStrategies) {
      return []
    }

    return Array.from(this.strategies.values())
  }

  /**
   * Create farming strategy
   */
  async createStrategy(strategy: Omit<FarmingStrategy, 'id'>): Promise<string> {
    if (!this.config.enableStrategies) {
      throw new Error('Strategies are disabled')
    }

    const id = this.generateStrategyId()
    const fullStrategy: FarmingStrategy = {
      ...strategy,
      id,
    }

    this.strategies.set(id, fullStrategy)
    return id
  }

  /**
   * Private helper methods
   */
  private initializeRewardCalculators(): void {
    // Default reward calculator
    this.rewardCalculators.set('default', (position, farm) => {
      const timeStaked = Date.now() - position.stakedAt
      const timeStakedSeconds = timeStaked / 1000

      return farm.rewardTokens.map((token, index) => {
        const rewardRate = parseFloat(farm.rewardRates[index])
        const stakedAmount = parseFloat(position.stakedAmount)
        const totalStaked = parseFloat(farm.totalStaked)

        if (totalStaked === 0) return null

        const userShare = stakedAmount / totalStaked
        const baseReward = rewardRate * timeStakedSeconds * userShare
        const boostedReward = baseReward * position.currentMultiplier

        return {
          token,
          amount: boostedReward.toString(),
          amountUSD: (boostedReward * 1).toString(), // Would use real price
          apr: farm.apr,
          source: 'liquidity_mining' as const,
        }
      }).filter(Boolean) as PositionReward[]
    })
  }

  private calculateMultiplier(farm: YieldFarm, lockPeriod?: number): number {
    let multiplier = farm.baseMultiplier

    // Time lock boost
    if (lockPeriod) {
      const lockBoost = Math.min(lockPeriod / (365 * 24 * 3600), 1) // Max 1x boost for 1 year lock
      multiplier += lockBoost
    }

    return Math.min(multiplier, farm.maxMultiplier)
  }

  private getApplicableBoosts(farm: YieldFarm, userAddress: Address, lockPeriod?: number): BoostFactor[] {
    const applicableBoosts: BoostFactor[] = []

    farm.boostFactors.forEach(boost => {
      switch (boost.type) {
        case 'time_lock':
          if (lockPeriod && lockPeriod >= (boost.requirements.duration || 0)) {
            applicableBoosts.push(boost)
          }
          break
        // Add other boost type checks here
      }
    })

    return applicableBoosts
  }

  private calculatePendingRewards(position: StakePosition, farm: YieldFarm): PositionReward[] {
    const calculator = this.rewardCalculators.get('default')
    if (!calculator) return []

    return calculator(position, farm)
  }

  private convertRewardsToStakeToken(rewards: PositionReward[], farm: YieldFarm): string {
    // Simplified conversion - in real implementation, this would use DEX prices
    const totalRewardValue = rewards.reduce((sum, reward) =>
      sum + parseFloat(reward.amountUSD), 0
    )

    // Assume 1:1 conversion for simplicity
    return totalRewardValue.toString()
  }

  private encodeStakeData(amount: string, lockPeriod?: number): `0x${string}` {
    // Placeholder for actual encoding
    return '0x' as `0x${string}`
  }

  private encodeUnstakeData(amount: string): `0x${string}` {
    // Placeholder for actual encoding
    return '0x' as `0x${string}`
  }

  private encodeClaimData(): `0x${string}` {
    // Placeholder for actual encoding
    return '0x' as `0x${string}`
  }

  private encodeCompoundData(): `0x${string}` {
    // Placeholder for actual encoding
    return '0x' as `0x${string}`
  }

  private generatePositionId(): string {
    return `stake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateStrategyId(): string {
    return `strategy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Add a new farm
   */
  addFarm(farm: YieldFarm): void {
    this.farms.set(farm.id, farm)
  }

  /**
   * Update farm data
   */
  updateFarm(farmId: string, updates: Partial<YieldFarm>): void {
    const farm = this.farms.get(farmId)
    if (farm) {
      Object.assign(farm, updates)
      farm.lastUpdated = Date.now()
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      totalFarms: this.farms.size,
      activeFarms: Array.from(this.farms.values()).filter(f => f.active).length,
      totalPositions: this.positions.size,
      totalStrategies: this.strategies.size,
      config: this.config,
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.farms.clear()
    this.positions.clear()
    this.strategies.clear()
    this.rewardCalculators.clear()
  }
}

// Export singleton instance
export const yieldFarmingService = new YieldFarmingService()
