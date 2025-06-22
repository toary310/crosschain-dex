'use client'

import { MainLayout } from '@/components/Layout/MainLayout'
import { useUIStore } from '@/store/useUIStore'
import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Grid,
    GridItem,
    Heading,
    HStack,
    Stat,
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
import { useEffect } from 'react'
import { useAccount } from 'wagmi'

export default function PoolsPage() {
  const { isConnected } = useAccount()
  const { setActiveTab } = useUIStore()
  const cardBg = useColorModeValue('white', 'gray.800')

  // Set active tab
  useEffect(() => {
    setActiveTab('pools')
  }, [setActiveTab])

  // Mock data for pools
  const mockPools = [
    {
      id: 1,
      pair: 'ETH/USDC',
      tvl: '$125.5M',
      apr: '12.5%',
      volume24h: '$2.1M',
      fees24h: '$5,250',
      chain: 'Ethereum',
    },
    {
      id: 2,
      pair: 'MATIC/USDC',
      tvl: '$45.2M',
      apr: '18.3%',
      volume24h: '$890K',
      fees24h: '$2,230',
      chain: 'Polygon',
    },
    {
      id: 3,
      pair: 'ARB/ETH',
      tvl: '$32.1M',
      apr: '15.7%',
      volume24h: '$1.2M',
      fees24h: '$3,000',
      chain: 'Arbitrum',
    },
  ]

  const myPositions = [
    {
      id: 1,
      pair: 'ETH/USDC',
      liquidity: '$1,250',
      fees: '$12.50',
      apr: '12.5%',
      chain: 'Ethereum',
    },
  ]

  return (
    <MainLayout>
      <VStack spacing={8} align="stretch">
        {/* Page Header */}
        <Box textAlign="center">
          <Heading size="xl" mb={2}>
            Liquidity Pools
          </Heading>
          <Text color="gray.500">
            Provide liquidity and earn fees from trading
          </Text>
        </Box>

        {/* Pool Stats */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Total Value Locked</StatLabel>
                  <StatNumber>$203.8M</StatNumber>
                  <StatHelpText>+5.2% from yesterday</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>24h Volume</StatLabel>
                  <StatNumber>$4.2M</StatNumber>
                  <StatHelpText>+12.1% from yesterday</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>24h Fees</StatLabel>
                  <StatNumber>$10,480</StatNumber>
                  <StatHelpText>+8.7% from yesterday</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
          <GridItem>
            <Card bg={cardBg}>
              <CardBody>
                <Stat>
                  <StatLabel>Active Pools</StatLabel>
                  <StatNumber>156</StatNumber>
                  <StatHelpText>Across 5 chains</StatHelpText>
                </Stat>
              </CardBody>
            </Card>
          </GridItem>
        </Grid>

        {/* Tabs */}
        <Tabs>
          <TabList>
            <Tab>All Pools</Tab>
            <Tab>My Positions</Tab>
          </TabList>

          <TabPanels>
            {/* All Pools Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <HStack justify="space-between">
                      <Heading size="md">Available Pools</Heading>
                      <Button colorScheme="primary">
                        Create Pool
                      </Button>
                    </HStack>

                    <Box overflowX="auto">
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Pool</Th>
                            <Th>Chain</Th>
                            <Th isNumeric>TVL</Th>
                            <Th isNumeric>APR</Th>
                            <Th isNumeric>24h Volume</Th>
                            <Th isNumeric>24h Fees</Th>
                            <Th>Action</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {mockPools.map((pool) => (
                            <Tr key={pool.id}>
                              <Td>
                                <Text fontWeight="semibold">{pool.pair}</Text>
                              </Td>
                              <Td>
                                <Badge colorScheme="blue">{pool.chain}</Badge>
                              </Td>
                              <Td isNumeric>{pool.tvl}</Td>
                              <Td isNumeric>
                                <Text color="green.500" fontWeight="semibold">
                                  {pool.apr}
                                </Text>
                              </Td>
                              <Td isNumeric>{pool.volume24h}</Td>
                              <Td isNumeric>{pool.fees24h}</Td>
                              <Td>
                                <Button
                                  size="sm"
                                  colorScheme="primary"
                                  variant="outline"
                                  isDisabled={!isConnected}
                                >
                                  Add Liquidity
                                </Button>
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

            {/* My Positions Tab */}
            <TabPanel px={0}>
              <Card bg={cardBg}>
                <CardBody>
                  <VStack spacing={4} align="stretch">
                    <Heading size="md">My Liquidity Positions</Heading>

                    {!isConnected ? (
                      <Box textAlign="center" py={8}>
                        <Text color="gray.500" mb={4}>
                          Connect your wallet to view your positions
                        </Text>
                        <Button colorScheme="primary">
                          Connect Wallet
                        </Button>
                      </Box>
                    ) : myPositions.length === 0 ? (
                      <Box textAlign="center" py={8}>
                        <Text color="gray.500" mb={4}>
                          You don't have any liquidity positions yet
                        </Text>
                        <Button colorScheme="primary">
                          Add Liquidity
                        </Button>
                      </Box>
                    ) : (
                      <Box overflowX="auto">
                        <Table variant="simple">
                          <Thead>
                            <Tr>
                              <Th>Pool</Th>
                              <Th>Chain</Th>
                              <Th isNumeric>My Liquidity</Th>
                              <Th isNumeric>Fees Earned</Th>
                              <Th isNumeric>APR</Th>
                              <Th>Actions</Th>
                            </Tr>
                          </Thead>
                          <Tbody>
                            {myPositions.map((position) => (
                              <Tr key={position.id}>
                                <Td>
                                  <Text fontWeight="semibold">{position.pair}</Text>
                                </Td>
                                <Td>
                                  <Badge colorScheme="blue">{position.chain}</Badge>
                                </Td>
                                <Td isNumeric>{position.liquidity}</Td>
                                <Td isNumeric>
                                  <Text color="green.500">{position.fees}</Text>
                                </Td>
                                <Td isNumeric>
                                  <Text color="green.500" fontWeight="semibold">
                                    {position.apr}
                                  </Text>
                                </Td>
                                <Td>
                                  <HStack spacing={2}>
                                    <Button size="sm" variant="outline">
                                      Add
                                    </Button>
                                    <Button size="sm" variant="outline" colorScheme="red">
                                      Remove
                                    </Button>
                                  </HStack>
                                </Td>
                              </Tr>
                            ))}
                          </Tbody>
                        </Table>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </MainLayout>
  )
}
