'use client'

import { MainLayout } from '@/components/Layout/MainLayout'
import { useUIStore } from '@/store/useUIStore'
import {
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Grid,
    GridItem,
    Heading,
    HStack,
    Select,
    Stat,
    StatArrow,
    StatHelpText,
    StatLabel,
    StatNumber,
    Tab,
    Table,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useColorModeValue,
    VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export default function AnalyticsPage() {
  const { setActiveTab } = useUIStore()
  const cardBg = useColorModeValue('white', 'gray.800')
  const [timeframe, setTimeframe] = useState('24h')

  // Set active tab
  useEffect(() => {
    setActiveTab('analytics')
  }, [setActiveTab])

  // Mock analytics data
  const protocolStats = {
    totalValueLocked: '$203.8M',
    totalVolume24h: '$4.2M',
    totalFees24h: '$10,480',
    activeUsers24h: '1,247',
    totalTransactions: '45,892',
    avgTransactionSize: '$2,150',
  }

  const topTokens = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: '$2,500.00',
      change24h: '+5.2%',
      volume24h: '$1.8M',
      tvl: '$125.5M',
      logo: '/tokens/eth.svg',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      price: '$1.00',
      change24h: '+0.1%',
      volume24h: '$1.2M',
      tvl: '$89.3M',
      logo: '/tokens/usdc.svg',
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      price: '$0.85',
      change24h: '-2.3%',
      volume24h: '$650K',
      tvl: '$45.2M',
      logo: '/tokens/matic.svg',
    },
    {
      symbol: 'ARB',
      name: 'Arbitrum',
      price: '$1.25',
      change24h: '+8.7%',
      volume24h: '$420K',
      tvl: '$32.1M',
      logo: '/tokens/arb.svg',
    },
  ]

  const topPools = [
    {
      pair: 'ETH/USDC',
      tvl: '$125.5M',
      volume24h: '$2.1M',
      fees24h: '$5,250',
      apr: '12.5%',
      chain: 'Ethereum',
    },
    {
      pair: 'MATIC/USDC',
      tvl: '$45.2M',
      volume24h: '$890K',
      fees24h: '$2,230',
      apr: '18.3%',
      chain: 'Polygon',
    },
    {
      pair: 'ARB/ETH',
      tvl: '$32.1M',
      volume24h: '$1.2M',
      fees24h: '$3,000',
      apr: '15.7%',
      chain: 'Arbitrum',
    },
  ]

  const chainStats = [
    {
      name: 'Ethereum',
      tvl: '$125.5M',
      volume24h: '$2.1M',
      transactions24h: '1,250',
      avgGasFee: '$12.50',
      color: 'blue',
    },
    {
      name: 'Polygon',
      tvl: '$45.2M',
      volume24h: '$890K',
      transactions24h: '3,420',
      avgGasFee: '$0.05',
      color: 'purple',
    },
    {
      name: 'Arbitrum',
      tvl: '$32.1M',
      volume24h: '$1.2M',
      transactions24h: '2,180',
      avgGasFee: '$0.25',
      color: 'cyan',
    },
  ]

  return (
    <MainLayout>
      <VStack spacing={8} align="stretch">
        {/* Page Header */}
        <HStack justify="space-between" align="center">
          <Box>
            <Heading size="xl" mb={2}>
              Analytics
            </Heading>
            <Text color="gray.500">
              Protocol metrics and market insights
            </Text>
          </Box>
          <Select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} w="auto">
            <option value="24h">24 Hours</option>
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </Select>
        </HStack>

        {/* Protocol Overview */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Total Value Locked</StatLabel>
                  <StatNumber>{protocolStats.totalValueLocked}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    +12.3% from yesterday
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>24h Volume</StatLabel>
                  <StatNumber>{protocolStats.totalVolume24h}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    +8.7% from yesterday
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>24h Fees</StatLabel>
                  <StatNumber>{protocolStats.totalFees24h}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    +15.2% from yesterday
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Active Users</StatLabel>
                  <StatNumber>{protocolStats.activeUsers24h}</StatNumber>
                  <StatHelpText>
                    <StatArrow type="increase" />
                    +5.8% from yesterday
                  </StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Tabs */}
        <Tabs>
          <TabList>
            <Tab>Tokens</Tab>
            <Tab>Pools</Tab>
            <Tab>Chains</Tab>
          </TabList>

          <TabPanels>
            {/* Tokens Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Top Tokens by Volume</Heading>
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Token</Th>
                            <Th isNumeric>Price</Th>
                            <Th isNumeric>24h Change</Th>
                            <Th isNumeric>24h Volume</Th>
                            <Th isNumeric>TVL</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {topTokens.map((token) => (
                            <Tr key={token.symbol}>
                              <Td>
                                <HStack>
                                  <Avatar size="sm" name={token.symbol} src={token.logo} />
                                  <VStack align="start" spacing={0}>
                                    <Text fontWeight="semibold">{token.symbol}</Text>
                                    <Text fontSize="sm" color="gray.500">{token.name}</Text>
                                  </VStack>
                                </HStack>
                              </Td>
                              <Td isNumeric fontWeight="semibold">{token.price}</Td>
                              <Td isNumeric>
                                <Text
                                  color={token.change24h.startsWith('+') ? 'green.500' : 'red.500'}
                                  fontWeight="semibold"
                                >
                                  {token.change24h}
                                </Text>
                              </Td>
                              <Td isNumeric>{token.volume24h}</Td>
                              <Td isNumeric>{token.tvl}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Pools Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Top Pools by TVL</Heading>
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Pool</Th>
                            <Th>Chain</Th>
                            <Th isNumeric>TVL</Th>
                            <Th isNumeric>24h Volume</Th>
                            <Th isNumeric>24h Fees</Th>
                            <Th isNumeric>APR</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {topPools.map((pool, index) => (
                            <Tr key={index}>
                              <Td>
                                <Text fontWeight="semibold">{pool.pair}</Text>
                              </Td>
                              <Td>
                                <Badge colorScheme="blue">{pool.chain}</Badge>
                              </Td>
                              <Td isNumeric fontWeight="semibold">{pool.tvl}</Td>
                              <Td isNumeric>{pool.volume24h}</Td>
                              <Td isNumeric>{pool.fees24h}</Td>
                              <Td isNumeric>
                                <Text color="green.500" fontWeight="semibold">
                                  {pool.apr}
                                </Text>
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>

            {/* Chains Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">Chain Statistics</Heading>
                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Chain</Th>
                            <Th isNumeric>TVL</Th>
                            <Th isNumeric>24h Volume</Th>
                            <Th isNumeric>24h Transactions</Th>
                            <Th isNumeric>Avg Gas Fee</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {chainStats.map((chain) => (
                            <Tr key={chain.name}>
                              <Td>
                                <HStack>
                                  <Badge colorScheme={chain.color}>{chain.name}</Badge>
                                </HStack>
                              </Td>
                              <Td isNumeric fontWeight="semibold">{chain.tvl}</Td>
                              <Td isNumeric>{chain.volume24h}</Td>
                              <Td isNumeric>{chain.transactions24h}</Td>
                              <Td isNumeric>{chain.avgGasFee}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Additional Metrics */}
        <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6}>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Protocol Metrics</Heading>
                  <HStack justify="space-between">
                    <Text color="gray.500">Total Transactions</Text>
                    <Text fontWeight="semibold">{protocolStats.totalTransactions}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.500">Avg Transaction Size</Text>
                    <Text fontWeight="semibold">{protocolStats.avgTransactionSize}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.500">Supported Chains</Text>
                    <Text fontWeight="semibold">5</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="gray.500">Active Pools</Text>
                    <Text fontWeight="semibold">156</Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody textAlign="center">
                <VStack spacing={4}>
                  <Heading size="md">Coming Soon</Heading>
                  <Text color="gray.500">
                    Advanced charts and analytics will be available in the next update
                  </Text>
                  <Button colorScheme="primary" variant="outline">
                    Request Feature
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>
      </VStack>
    </MainLayout>
  )
}
