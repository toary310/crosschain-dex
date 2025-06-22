import { Token } from '@/config/tokens'
import { Address } from 'viem'

export interface GovernanceProposal {
  id: string
  title: string
  description: string
  proposer: Address
  poolId?: string

  // Proposal Type
  type: ProposalType
  category: ProposalCategory

  // Proposal Data
  targets: Address[]
  values: string[]
  calldatas: `0x${string}`[]

  // Voting Parameters
  votingPower: string
  quorum: string
  threshold: string

  // Timing
  createdAt: number
  startTime: number
  endTime: number
  executionDelay: number

  // Status
  status: ProposalStatus
  executed: boolean
  executedAt?: number
  cancelled: boolean
  cancelledAt?: number

  // Voting Results
  forVotes: string
  againstVotes: string
  abstainVotes: string
  totalVotes: string
  participationRate: number

  // Metadata
  tags: string[]
  urgency: 'low' | 'medium' | 'high' | 'critical'
  impact: 'low' | 'medium' | 'high'

  // Discussion
  discussionUrl?: string
  snapshotUrl?: string
}

export type ProposalType =
  | 'parameter_change'
  | 'fee_adjustment'
  | 'protocol_upgrade'
  | 'treasury_action'
  | 'emergency_action'
  | 'pool_creation'
  | 'pool_deprecation'
  | 'incentive_program'
  | 'partnership'
  | 'general'

export type ProposalCategory =
  | 'technical'
  | 'economic'
  | 'governance'
  | 'security'
  | 'partnership'
  | 'treasury'
  | 'emergency'

export type ProposalStatus =
  | 'pending'
  | 'active'
  | 'succeeded'
  | 'defeated'
  | 'queued'
  | 'executed'
  | 'cancelled'
  | 'expired'

export interface Vote {
  id: string
  proposalId: string
  voter: Address
  support: VoteSupport
  votingPower: string
  reason?: string
  timestamp: number
  transactionHash: string
}

export type VoteSupport = 'for' | 'against' | 'abstain'

export interface VotingPower {
  address: Address
  totalPower: string
  sources: VotingPowerSource[]
  delegatedTo?: Address
  delegatedFrom: Address[]
  lastUpdated: number
}

export interface VotingPowerSource {
  type: 'token_balance' | 'liquidity_position' | 'staking' | 'delegation'
  token?: Token
  poolId?: string
  amount: string
  weight: number
  lockPeriod?: number
  multiplier: number
}

export interface Delegation {
  id: string
  delegator: Address
  delegatee: Address
  votingPower: string
  createdAt: number
  expiresAt?: number
  active: boolean
}

export interface GovernanceConfig {
  governanceToken: Token
  votingDelay: number // blocks
  votingPeriod: number // blocks
  proposalThreshold: string
  quorum: string
  executionDelay: number // seconds
  gracePeriod: number // seconds
  enableDelegation: boolean
  enableLiquidityVoting: boolean
  liquidityVotingWeight: number
  maxProposalsPerUser: number
}

export interface GovernanceStats {
  totalProposals: number
  activeProposals: number
  totalVoters: number
  totalVotingPower: string
  participationRate: number
  proposalSuccessRate: number
  averageVotingPower: string
  topDelegates: Array<{
    address: Address
    delegatedPower: string
    delegatorCount: number
  }>
}

const DEFAULT_CONFIG: GovernanceConfig = {
  governanceToken: {
    address: '0x0000000000000000000000000000000000000000' as Address,
    symbol: 'GOV',
    name: 'Governance Token',
    decimals: 18,
    chainId: 1,
    verified: true,
    riskLevel: 'low',
  },
  votingDelay: 1, // 1 block
  votingPeriod: 17280, // ~3 days
  proposalThreshold: '100000000000000000000000', // 100k tokens
  quorum: '400000000000000000000000', // 400k tokens
  executionDelay: 172800, // 2 days
  gracePeriod: 1209600, // 14 days
  enableDelegation: true,
  enableLiquidityVoting: true,
  liquidityVotingWeight: 0.5,
  maxProposalsPerUser: 5,
}

export class PoolGovernanceService {
  private config: GovernanceConfig
  private proposals: Map<string, GovernanceProposal> = new Map()
  private votes: Map<string, Vote[]> = new Map()
  private votingPowers: Map<Address, VotingPower> = new Map()
  private delegations: Map<Address, Delegation[]> = new Map()

  constructor(config: Partial<GovernanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Create a new governance proposal
   */
  async createProposal(
    proposal: Omit<GovernanceProposal, 'id' | 'createdAt' | 'status' | 'forVotes' | 'againstVotes' | 'abstainVotes' | 'totalVotes' | 'participationRate'>
  ): Promise<string> {
    try {
      // Check proposer's voting power
      const proposerPower = await this.getVotingPower(proposal.proposer)
      if (parseFloat(proposerPower.totalPower) < parseFloat(this.config.proposalThreshold)) {
        throw new Error('Insufficient voting power to create proposal')
      }

      // Check proposal limits
      const userProposals = Array.from(this.proposals.values())
        .filter(p => p.proposer === proposal.proposer && p.status === 'active')

      if (userProposals.length >= this.config.maxProposalsPerUser) {
        throw new Error('Maximum active proposals per user exceeded')
      }

      const proposalId = this.generateProposalId()
      const now = Date.now()

      const fullProposal: GovernanceProposal = {
        ...proposal,
        id: proposalId,
        createdAt: now,
        startTime: now + (this.config.votingDelay * 12000), // Assuming 12s block time
        endTime: now + ((this.config.votingDelay + this.config.votingPeriod) * 12000),
        status: 'pending',
        executed: false,
        cancelled: false,
        forVotes: '0',
        againstVotes: '0',
        abstainVotes: '0',
        totalVotes: '0',
        participationRate: 0,
      }

      this.proposals.set(proposalId, fullProposal)
      this.votes.set(proposalId, [])

      return proposalId
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create proposal')
    }
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(
    proposalId: string,
    voter: Address,
    support: VoteSupport,
    reason?: string
  ): Promise<string> {
    try {
      const proposal = this.proposals.get(proposalId)
      if (!proposal) {
        throw new Error('Proposal not found')
      }

      if (proposal.status !== 'active') {
        throw new Error('Proposal is not active')
      }

      const now = Date.now()
      if (now < proposal.startTime || now > proposal.endTime) {
        throw new Error('Voting period has ended')
      }

      // Check if user already voted
      const existingVotes = this.votes.get(proposalId) || []
      const existingVote = existingVotes.find(v => v.voter === voter)
      if (existingVote) {
        throw new Error('User has already voted')
      }

      // Get voter's voting power
      const votingPower = await this.getVotingPower(voter)
      if (parseFloat(votingPower.totalPower) === 0) {
        throw new Error('No voting power')
      }

      const voteId = this.generateVoteId()
      const vote: Vote = {
        id: voteId,
        proposalId,
        voter,
        support,
        votingPower: votingPower.totalPower,
        reason,
        timestamp: now,
        transactionHash: `0x${Math.random().toString(16).slice(2)}`,
      }

      // Add vote
      existingVotes.push(vote)
      this.votes.set(proposalId, existingVotes)

      // Update proposal vote counts
      this.updateProposalVotes(proposalId)

      return voteId
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to cast vote')
    }
  }

  /**
   * Delegate voting power
   */
  async delegateVotingPower(
    delegator: Address,
    delegatee: Address,
    expiresAt?: number
  ): Promise<string> {
    try {
      if (!this.config.enableDelegation) {
        throw new Error('Delegation is not enabled')
      }

      if (delegator === delegatee) {
        throw new Error('Cannot delegate to yourself')
      }

      // Check if already delegated
      const existingDelegations = this.delegations.get(delegator) || []
      const activeDelegation = existingDelegations.find(d => d.active)

      if (activeDelegation) {
        // Revoke existing delegation
        activeDelegation.active = false
      }

      const votingPower = await this.getVotingPower(delegator)
      const delegationId = this.generateDelegationId()

      const delegation: Delegation = {
        id: delegationId,
        delegator,
        delegatee,
        votingPower: votingPower.totalPower,
        createdAt: Date.now(),
        expiresAt,
        active: true,
      }

      existingDelegations.push(delegation)
      this.delegations.set(delegator, existingDelegations)

      // Update voting powers
      await this.updateVotingPowers([delegator, delegatee])

      return delegationId
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to delegate voting power')
    }
  }

  /**
   * Revoke delegation
   */
  async revokeDelegation(delegator: Address): Promise<boolean> {
    try {
      const delegations = this.delegations.get(delegator) || []
      const activeDelegation = delegations.find(d => d.active)

      if (!activeDelegation) {
        throw new Error('No active delegation found')
      }

      activeDelegation.active = false

      // Update voting powers
      await this.updateVotingPowers([delegator, activeDelegation.delegatee])

      return true
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to revoke delegation')
    }
  }

  /**
   * Execute a proposal
   */
  async executeProposal(proposalId: string): Promise<boolean> {
    try {
      const proposal = this.proposals.get(proposalId)
      if (!proposal) {
        throw new Error('Proposal not found')
      }

      if (proposal.status !== 'succeeded') {
        throw new Error('Proposal has not succeeded')
      }

      if (proposal.executed) {
        throw new Error('Proposal already executed')
      }

      const now = Date.now()
      if (now < proposal.endTime + (proposal.executionDelay * 1000)) {
        throw new Error('Execution delay has not passed')
      }

      // Execute proposal (placeholder)
      // In real implementation, this would execute the proposal's calldata

      proposal.executed = true
      proposal.executedAt = now
      proposal.status = 'executed'

      return true
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to execute proposal')
    }
  }

  /**
   * Get proposal by ID
   */
  getProposal(proposalId: string): GovernanceProposal | null {
    return this.proposals.get(proposalId) || null
  }

  /**
   * Get all proposals
   */
  getProposals(filter?: {
    status?: ProposalStatus[]
    type?: ProposalType[]
    category?: ProposalCategory[]
    proposer?: Address
  }): GovernanceProposal[] {
    let proposals = Array.from(this.proposals.values())

    if (filter) {
      if (filter.status) {
        proposals = proposals.filter(p => filter.status!.includes(p.status))
      }
      if (filter.type) {
        proposals = proposals.filter(p => filter.type!.includes(p.type))
      }
      if (filter.category) {
        proposals = proposals.filter(p => filter.category!.includes(p.category))
      }
      if (filter.proposer) {
        proposals = proposals.filter(p => p.proposer === filter.proposer)
      }
    }

    return proposals.sort((a, b) => b.createdAt - a.createdAt)
  }

  /**
   * Get votes for a proposal
   */
  getProposalVotes(proposalId: string): Vote[] {
    return this.votes.get(proposalId) || []
  }

  /**
   * Get voting power for an address
   */
  async getVotingPower(address: Address): Promise<VotingPower> {
    try {
      // Check cache first
      const cached = this.votingPowers.get(address)
      if (cached && Date.now() - cached.lastUpdated < 300000) { // 5 minutes
        return cached
      }

      // Calculate voting power
      const sources: VotingPowerSource[] = []
      let totalPower = 0

      // Token balance voting power
      const tokenBalance = await this.getTokenBalance(address)
      if (tokenBalance > 0) {
        sources.push({
          type: 'token_balance',
          token: this.config.governanceToken,
          amount: tokenBalance.toString(),
          weight: 1,
          multiplier: 1,
        })
        totalPower += tokenBalance
      }

      // Liquidity position voting power
      if (this.config.enableLiquidityVoting) {
        const liquidityPower = await this.getLiquidityVotingPower(address)
        if (liquidityPower > 0) {
          sources.push({
            type: 'liquidity_position',
            amount: liquidityPower.toString(),
            weight: this.config.liquidityVotingWeight,
            multiplier: 1,
          })
          totalPower += liquidityPower * this.config.liquidityVotingWeight
        }
      }

      // Delegated power
      const delegatedPower = await this.getDelegatedPower(address)
      if (delegatedPower > 0) {
        sources.push({
          type: 'delegation',
          amount: delegatedPower.toString(),
          weight: 1,
          multiplier: 1,
        })
        totalPower += delegatedPower
      }

      const votingPower: VotingPower = {
        address,
        totalPower: totalPower.toString(),
        sources,
        delegatedFrom: await this.getDelegatorsFor(address),
        lastUpdated: Date.now(),
      }

      this.votingPowers.set(address, votingPower)
      return votingPower
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get voting power')
    }
  }

  /**
   * Get governance statistics
   */
  async getGovernanceStats(): Promise<GovernanceStats> {
    try {
      const proposals = Array.from(this.proposals.values())
      const activeProposals = proposals.filter(p => p.status === 'active')
      const succeededProposals = proposals.filter(p => p.status === 'succeeded' || p.status === 'executed')

      const allVotes = Array.from(this.votes.values()).flat()
      const uniqueVoters = new Set(allVotes.map(v => v.voter)).size

      const totalVotingPower = Array.from(this.votingPowers.values())
        .reduce((sum, vp) => sum + parseFloat(vp.totalPower), 0)

      const participationRate = proposals.length > 0
        ? proposals.reduce((sum, p) => sum + p.participationRate, 0) / proposals.length
        : 0

      const proposalSuccessRate = proposals.length > 0
        ? (succeededProposals.length / proposals.length) * 100
        : 0

      const topDelegates = await this.getTopDelegates()

      return {
        totalProposals: proposals.length,
        activeProposals: activeProposals.length,
        totalVoters: uniqueVoters,
        totalVotingPower: totalVotingPower.toString(),
        participationRate,
        proposalSuccessRate,
        averageVotingPower: uniqueVoters > 0 ? (totalVotingPower / uniqueVoters).toString() : '0',
        topDelegates,
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to get governance stats')
    }
  }

  /**
   * Private helper methods
   */
  private updateProposalVotes(proposalId: string): void {
    const proposal = this.proposals.get(proposalId)
    const votes = this.votes.get(proposalId)

    if (!proposal || !votes) return

    let forVotes = 0
    let againstVotes = 0
    let abstainVotes = 0

    votes.forEach(vote => {
      const power = parseFloat(vote.votingPower)
      switch (vote.support) {
        case 'for':
          forVotes += power
          break
        case 'against':
          againstVotes += power
          break
        case 'abstain':
          abstainVotes += power
          break
      }
    })

    const totalVotes = forVotes + againstVotes + abstainVotes
    const totalSupply = parseFloat(this.config.quorum) * 2.5 // Estimate total supply

    proposal.forVotes = forVotes.toString()
    proposal.againstVotes = againstVotes.toString()
    proposal.abstainVotes = abstainVotes.toString()
    proposal.totalVotes = totalVotes.toString()
    proposal.participationRate = totalSupply > 0 ? (totalVotes / totalSupply) * 100 : 0

    // Update proposal status
    const now = Date.now()
    if (now > proposal.endTime) {
      const quorum = parseFloat(this.config.quorum)
      if (totalVotes >= quorum && forVotes > againstVotes) {
        proposal.status = 'succeeded'
      } else {
        proposal.status = 'defeated'
      }
    }
  }

  private async updateVotingPowers(addresses: Address[]): Promise<void> {
    for (const address of addresses) {
      await this.getVotingPower(address) // This will recalculate and cache
    }
  }

  private async getTokenBalance(address: Address): Promise<number> {
    // Placeholder - would query actual token balance
    return Math.random() * 1000000
  }

  private async getLiquidityVotingPower(address: Address): Promise<number> {
    // Placeholder - would calculate based on liquidity positions
    return Math.random() * 500000
  }

  private async getDelegatedPower(address: Address): Promise<number> {
    let delegatedPower = 0

    for (const delegations of this.delegations.values()) {
      const activeDelegation = delegations.find(d => d.active && d.delegatee === address)
      if (activeDelegation) {
        delegatedPower += parseFloat(activeDelegation.votingPower)
      }
    }

    return delegatedPower
  }

  private async getDelegatorsFor(address: Address): Promise<Address[]> {
    const delegators: Address[] = []

    for (const [delegator, delegations] of this.delegations) {
      const activeDelegation = delegations.find(d => d.active && d.delegatee === address)
      if (activeDelegation) {
        delegators.push(delegator)
      }
    }

    return delegators
  }

  private async getTopDelegates(): Promise<GovernanceStats['topDelegates']> {
    const delegateMap = new Map<Address, { power: number; count: number }>()

    for (const [delegator, delegations] of this.delegations) {
      const activeDelegation = delegations.find(d => d.active)
      if (activeDelegation) {
        const current = delegateMap.get(activeDelegation.delegatee) || { power: 0, count: 0 }
        current.power += parseFloat(activeDelegation.votingPower)
        current.count += 1
        delegateMap.set(activeDelegation.delegatee, current)
      }
    }

    return Array.from(delegateMap.entries())
      .map(([address, data]) => ({
        address,
        delegatedPower: data.power.toString(),
        delegatorCount: data.count,
      }))
      .sort((a, b) => parseFloat(b.delegatedPower) - parseFloat(a.delegatedPower))
      .slice(0, 10)
  }

  private generateProposalId(): string {
    return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateVoteId(): string {
    return `vote-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateDelegationId(): string {
    return `del-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.proposals.clear()
    this.votes.clear()
    this.votingPowers.clear()
    this.delegations.clear()
  }
}

// Export singleton instance
export const poolGovernanceService = new PoolGovernanceService()
