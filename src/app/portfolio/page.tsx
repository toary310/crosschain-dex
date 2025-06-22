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
    Progress,
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
import { useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'

export default function PortfolioPage() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const { setActiveTab } = useUIStore()
  const cardBg = useColorModeValue('white', 'gray.800')

  // Set active tab
  useEffect(() => {
    setActiveTab('portfolio')
  }, [setActiveTab])

  // Mock portfolio data
  const mockTokens = [
    {
      symbol: 'ETH',
      name: 'Ethereum',
      balance: '2.5',
      value: '$6,250.00',
      price: '$2,500.00',
      change24h: '+5.2%',
      changeValue: '+$312.50',
      chain: 'Ethereum',
      logo: '/tokens/eth.svg',
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '1,500',
      value: '$1,500.00',
      price: '$1.00',
      change24h: '+0.1%',
      changeValue: '+$1.50',
      chain: 'Polygon',
      logo: '/tokens/usdc.svg',
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      balance: '1,000',
      value: '$850.00',
      price: '$0.85',
      change24h: '-2.3%',
      changeValue: '-$19.55',
      chain: 'Polygon',
      logo: '/tokens/matic.svg',
    },
  ]

  const mockTransactions = [
    {
      id: 1,
      type: 'Swap',
      from: 'ETH',
      to: 'USDC',
      amount: '0.5 ETH → 1,250 USDC',
      time: '2 hours ago',
      status: 'Completed',
      hash: '0x1234...5678',
    },
    {
      id: 2,
      type: 'Add Liquidity',
      from: 'ETH',
      to: 'USDC',
      amount: '1.0 ETH + 2,500 USDC',
      time: '1 day ago',
      status: 'Completed',
      hash: '0x2345...6789',
    },
  ]

  const totalValue = mockTokens.reduce((sum, token) =>
    sum + parseFloat(token.value.replace('$', '').replace(',', '')), 0
  )

  const totalChange = mockTokens.reduce((sum, token) =>
    sum + parseFloat(token.changeValue.replace('$', '').replace('+', '')), 0
  )

  return (
    <MainLayout>
      <VStack spacing={8} align="stretch">
        {/* Page Header */}
        <Box textAlign="center">
          <Heading size="xl" mb={2}>
            Portfolio
          </Heading>
          <Text color="gray.500">
            Track your assets and transaction history
          </Text>
        </Box>

        {!isConnected ? (
          <Card bg={cardBg}>
            <CardBody textAlign="center" py={12}>
              <VStack spacing={4}>
                <Text fontSize="lg" color="gray.500">
                  Connect your wallet to view your portfolio
                </Text>
                <Button colorScheme="primary" size="lg">
                  Connect Wallet
                </Button>
              </VStack>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Portfolio Summary */}
            <Grid templateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={6}>
              <GridItem>
                <Card bg={cardBg}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Total Portfolio Value</StatLabel>
                      <StatNumber>${totalValue.toLocaleString()}</StatNumber>
                      <StatHelpText>
                        <StatArrow type={totalChange >= 0 ? 'increase' : 'decrease'} />
                        ${Math.abs(totalChange).toFixed(2)} (24h)
                      </StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem>
                <Card bg={cardBg}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Native Balance</StatLabel>
                      <StatNumber>
                        {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
                      </StatNumber>
                      <StatHelpText>Connected wallet</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem>
                <Card bg={cardBg}>
                  <CardBody>
                    <Stat>
                      <StatLabel>Active Positions</StatLabel>
                      <StatNumber>3</StatNumber>
                      <StatHelpText>Across 2 chains</StatHelpText>
                    </Stat>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>

            {/* Portfolio Allocation */}
            <Card bg={cardBg}>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Heading size="md">Portfolio Allocation</Heading>
                  {mockTokens.map((token, index) => {
                    const percentage = (parseFloat(token.value.replace('$', '').replace(',', '')) / totalValue) * 100
                    return (
                      <Box key={token.symbol}>
                        <HStack justify="space-between" mb={2}>
                          <HStack>
                            <Avatar size="sm" name={token.symbol} src={token.logo} />
                            <Text fontWeight="semibold">{token.symbol}</Text>
                            <Badge colorScheme="blue">{token.chain}</Badge>
                          </HStack>
                          <Text fontWeight="semibold">{percentage.toFixed(1)}%</Text>
                        </HStack>
                        <Progress
                          value={percentage}
                          colorScheme={index === 0 ? 'blue' : index === 1 ? 'green' : 'purple'}
                          size="sm"
                          borderRadius="md"
                        />
                      </Box>
                    )
                  })}
                </VStack>
              </CardBody>
            </Card>

            {/* Tabs */}
            <Tabs>
              <TabList>
                <Tab>Assets</Tab>
                <Tab>Transactions</Tab>
              </TabList>

              <TabPanels>
                {/* Assets Tab */}
                <TabPanel px={0}>
                  <Card bg={cardBg}>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">Your Assets</Heading>
                        <Box overflowX="auto">
                          <Table variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Asset</Th>
                                <Th>Chain</Th>
                                <Th isNumeric>Balance</Th>
                                <Th isNumeric>Price</Th>
                                <Th isNumeric>Value</Th>
                                <Th isNumeric>24h Change</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {mockTokens.map((token) => (
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
                                  <Td>
                                    <Badge colorScheme="blue">{token.chain}</Badge>
                                  </Td>
                                  <Td isNumeric>{token.balance}</Td>
                                  <Td isNumeric>{token.price}</Td>
                                  <Td isNumeric fontWeight="semibold">{token.value}</Td>
                                  <Td isNumeric>
                                    <VStack align="end" spacing={0}>
                                      <Text
                                        color={token.change24h.startsWith('+') ? 'green.500' : 'red.500'}
                                        fontWeight="semibold"
                                      >
                                        {token.change24h}
                                      </Text>
                                      <Text
                                        fontSize="sm"
                                        color={token.changeValue.startsWith('+') ? 'green.500' : 'red.500'}
                                      >
                                        {token.changeValue}
                                      </Text>
                                    </VStack>
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

                {/* Transactions Tab */}
                <TabPanel px={0}>
                  <Card bg={cardBg}>
                    <CardBody>
                      <VStack spacing={4} align="stretch">
                        <Heading size="md">Recent Transactions</Heading>
                        <Box overflowX="auto">
                          <Table variant="simple">
                            <Thead>
                              <Tr>
                                <Th>Type</Th>
                                <Th>Details</Th>
                                <Th>Time</Th>
                                <Th>Status</Th>
                                <Th>Hash</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {mockTransactions.map((tx) => (
                                <Tr key={tx.id}>
                                  <Td>
                                    <Badge
                                      colorScheme={tx.type === 'Swap' ? 'blue' : 'green'}
                                    >
                                      {tx.type}
                                    </Badge>
                                  </Td>
                                  <Td>{tx.amount}</Td>
                                  <Td>{tx.time}</Td>
                                  <Td>
                                    <Badge colorScheme="green">{tx.status}</Badge>
                                  </Td>
                                  <Td>
                                    <Text
                                      color="blue.500"
                                      cursor="pointer"
                                      _hover={{ textDecoration: 'underline' }}
                                    >
                                      {tx.hash}
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
              </TabPanels>
            </Tabs>
          </>
        )}
      </VStack>
    </MainLayout>
  )
}
