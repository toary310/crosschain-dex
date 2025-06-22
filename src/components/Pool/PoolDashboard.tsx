'use client'

import { poolAnalyticsService } from '@/services/pool/poolAnalytics'
import { poolManager } from '@/services/pool/poolManager'
import { LiquidityPool, LiquidityPosition } from '@/services/pool/types'
import {
    Alert,
    AlertIcon,
    Avatar,
    AvatarGroup,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Grid,
    HStack,
    Skeleton,
    Stat,
    StatArrow,
    StatHelpText,
    StatLabel,
    StatNumber,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    useColorModeValue,
    VStack
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Address } from 'viem'
import { useAccount } from 'wagmi'

interface PoolDashboardProps {
  userAddress?: string
  chainId?: number
}

interface DashboardStats {
  totalValueLocked: string
  totalPositions: number
  totalRewards: string
  totalPnL: string
  totalPnLPercentage: number
}

export function PoolDashboard({ userAddress, chainId }: PoolDashboardProps) {
  const { address, isConnected } = useAccount()
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const successColor = useColorModeValue('green.500', 'green.300')
  const errorColor = useColorModeValue('red.500', 'red.300')

  const [positions, setPositions] = useState<LiquidityPosition[]>([])
  const [topPools, setTopPools] = useState<LiquidityPool[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalValueLocked: '0',
    totalPositions: 0,
    totalRewards: '0',
    totalPnL: '0',
    totalPnLPercentage: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const targetAddress = userAddress || address

  const loadDashboardData = useCallback(async () => {
    if (!targetAddress) return

    setLoading(true)
    setError('')

    try {
      // Load user positions
      const userPositions = await poolManager.getUserPositions(targetAddress as Address, chainId)
      setPositions(userPositions)

      // Calculate stats
      const dashboardStats = calculateStats(userPositions)
      setStats(dashboardStats)

      // Load top pools
      const pools = await poolAnalyticsService.getTopPools('tvl', 5)
      setTopPools(pools)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [targetAddress, chainId])

  useEffect(() => {
    if (targetAddress) {
      loadDashboardData()
    }
  }, [targetAddress, chainId, loadDashboardData])

  const calculateStats = (positions: LiquidityPosition[]): DashboardStats => {
    const totalValueLocked = positions.reduce((sum, pos) =>
      sum + parseFloat(pos.totalValueUSD), 0
    ).toString()

    const totalRewards = positions.reduce((sum, pos) =>
      sum + parseFloat(pos.totalRewardsUSD), 0
    ).toString()

    const totalPnL = positions.reduce((sum, pos) =>
      sum + parseFloat(pos.pnl), 0
    )

    const totalPnLPercentage = positions.length > 0
      ? positions.reduce((sum, pos) => sum + pos.pnlPercentage, 0) / positions.length
      : 0

    return {
      totalValueLocked,
      totalPositions: positions.length,
      totalRewards,
      totalPnL: totalPnL.toString(),
      totalPnLPercentage,
    }
  }

  const formatCurrency = (amount: string, decimals: number = 2) => {
    const num = parseFloat(amount)
    if (num === 0) return '$0.00'
    if (num < 0.01) return '<$0.01'
    if (num < 1000) return `$${num.toFixed(decimals)}`
    if (num < 1000000) return `$${(num / 1000).toFixed(1)}K`
    return `$${(num / 1000000).toFixed(1)}M`
  }

  const formatPercentage = (value: number, decimals: number = 2) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
  }

  if (!isConnected && !userAddress) {
    return (
      <Box p={6} textAlign="center">
        <Alert status="info">
          <AlertIcon />
          <Text>Connect your wallet to view your liquidity positions</Text>
        </Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <VStack spacing={6} align="stretch">
        <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} height="120px" borderRadius="lg" />
          ))}
        </Grid>
        <Skeleton height="400px" borderRadius="lg" />
      </VStack>
    )
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Text>{error}</Text>
      </Alert>
    )
  }

  return (
    <VStack spacing={6} align="stretch">
      {/* Stats Overview */}
      <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>Total Value Locked</StatLabel>
              <StatNumber>{formatCurrency(stats.totalValueLocked)}</StatNumber>
              <StatHelpText>Across {stats.totalPositions} positions</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>Total PnL</StatLabel>
              <StatNumber color={parseFloat(stats.totalPnL) >= 0 ? successColor : errorColor}>
                {formatCurrency(stats.totalPnL)}
              </StatNumber>
              <StatHelpText>
                <StatArrow type={stats.totalPnLPercentage >= 0 ? 'increase' : 'decrease'} />
                {formatPercentage(stats.totalPnLPercentage)}
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>Total Rewards</StatLabel>
              <StatNumber color={successColor}>{formatCurrency(stats.totalRewards)}</StatNumber>
              <StatHelpText>Claimed + Unclaimed</StatHelpText>
            </Stat>
          </CardBody>
        </Card>

        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Stat>
              <StatLabel>Active Positions</StatLabel>
              <StatNumber>{stats.totalPositions}</StatNumber>
              <StatHelpText>
                {positions.filter(p => parseFloat(p.totalValueUSD) > 0).length} with value
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      {/* Main Content */}
      <Tabs variant="enclosed">
        <TabList>
          <Tab>My Positions</Tab>
          <Tab>Top Pools</Tab>
          <Tab>Analytics</Tab>
        </TabList>

        <TabPanels>
          {/* My Positions Tab */}
          <TabPanel p={0} pt={6}>
            {positions.length === 0 ? (
              <Card bg={cardBg} borderColor={borderColor}>
                <CardBody textAlign="center" py={12}>
                  <Text fontSize="lg" color="gray.500" mb={4}>
                    No liquidity positions found
                  </Text>
                  <Button colorScheme="blue" size="lg">
                    Add Liquidity
                  </Button>
                </CardBody>
              </Card>
            ) : (
              <VStack spacing={4} align="stretch">
                {positions.map((position) => (
                  <Card key={position.id} bg={cardBg} borderColor={borderColor}>
                    <CardBody>
                      <HStack justify="space-between" align="start">
                        <VStack align="start" spacing={2}>
                          <HStack>
                            <AvatarGroup size="sm" max={2}>
                              {/* Would show token avatars */}
                              <Avatar name="Token 1" />
                              <Avatar name="Token 2" />
                            </AvatarGroup>
                            <Text fontWeight="semibold">Pool Position</Text>
                            <Badge colorScheme={position.inRange ? 'green' : 'orange'}>
                              {position.inRange ? 'In Range' : 'Out of Range'}
                            </Badge>
                          </HStack>

                          <Grid templateColumns="repeat(3, 1fr)" gap={6} w="full">
                            <Box>
                              <Text fontSize="sm" color="gray.500">Value</Text>
                              <Text fontWeight="semibold">
                                {formatCurrency(position.totalValueUSD)}
                              </Text>
                            </Box>
                            <Box>
                              <Text fontSize="sm" color="gray.500">PnL</Text>
                              <Text
                                fontWeight="semibold"
                                color={position.pnlPercentage >= 0 ? successColor : errorColor}
                              >
                                {formatCurrency(position.pnl)} ({formatPercentage(position.pnlPercentage)})
                              </Text>
                            </Box>
                            <Box>
                              <Text fontSize="sm" color="gray.500">Unclaimed Rewards</Text>
                              <Text fontWeight="semibold" color={successColor}>
                                {position.unclaimedRewards.reduce((sum, reward) =>
                                  sum + parseFloat(reward.amountUSD), 0
                                ).toFixed(2)} USD
                              </Text>
                            </Box>
                          </Grid>

                          {position.impermanentLossPercentage !== 0 && (
                            <Box>
                              <Text fontSize="sm" color="gray.500">Impermanent Loss</Text>
                              <Text
                                fontSize="sm"
                                color={position.impermanentLossPercentage < 0 ? errorColor : successColor}
                              >
                                {formatPercentage(position.impermanentLossPercentage)}
                              </Text>
                            </Box>
                          )}
                        </VStack>

                        <VStack spacing={2}>
                          <Button size="sm" colorScheme="green">
                            Claim Rewards
                          </Button>
                          <Button size="sm" variant="outline">
                            Manage Position
                          </Button>
                        </VStack>
                      </HStack>
                    </CardBody>
                  </Card>
                ))}
              </VStack>
            )}
          </TabPanel>

          {/* Top Pools Tab */}
          <TabPanel p={0} pt={6}>
            <VStack spacing={4} align="stretch">
              {topPools.map((pool) => (
                <Card key={pool.id} bg={cardBg} borderColor={borderColor}>
                  <CardBody>
                    <HStack justify="space-between">
                      <VStack align="start" spacing={2}>
                        <HStack>
                          <AvatarGroup size="sm" max={2}>
                            {pool.tokens.map((token, index) => (
                              <Avatar key={index} name={token.symbol} src={token.logoURI} />
                            ))}
                          </AvatarGroup>
                          <Text fontWeight="semibold">
                            {pool.tokens.map(t => t.symbol).join('/')} {(pool.feeTier / 10000).toFixed(2)}%
                          </Text>
                          {pool.metadata?.verified && (
                            <Badge colorScheme="green">Verified</Badge>
                          )}
                        </HStack>

                        <Grid templateColumns="repeat(4, 1fr)" gap={6}>
                          <Box>
                            <Text fontSize="sm" color="gray.500">TVL</Text>
                            <Text fontWeight="semibold">{formatCurrency(pool.tvlUSD)}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.500">24h Volume</Text>
                            <Text fontWeight="semibold">{formatCurrency(pool.volume24h)}</Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.500">APR</Text>
                            <Text fontWeight="semibold" color={successColor}>
                              {pool.apr.toFixed(2)}%
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.500">24h Fees</Text>
                            <Text fontWeight="semibold">{formatCurrency(pool.fees24h)}</Text>
                          </Box>
                        </Grid>
                      </VStack>

                      <Button colorScheme="blue">
                        Add Liquidity
                      </Button>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </VStack>
          </TabPanel>

          {/* Analytics Tab */}
          <TabPanel p={0} pt={6}>
            <Card bg={cardBg} borderColor={borderColor}>
              <CardBody textAlign="center" py={12}>
                <Text fontSize="lg" color="gray.500">
                  Advanced analytics coming soon
                </Text>
              </CardBody>
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  )
}
