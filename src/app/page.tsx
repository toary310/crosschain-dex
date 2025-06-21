'use client'

import { MainLayout } from '@/components/Layout/MainLayout'
import {
    Box,
    Button,
    Card,
    CardBody,
    Grid,
    GridItem,
    HStack,
    Heading,
    Stat,
    StatHelpText,
    StatLabel,
    StatNumber,
    Text,
    VStack,
    useColorModeValue,
} from '@chakra-ui/react'
import { useAccount, useBalance } from 'wagmi'

export default function Home() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({
    address,
  })

  const cardBg = useColorModeValue('white', 'gray.800')

  return (
    <MainLayout>
      <VStack spacing={8} align="stretch">
        {/* Hero Section */}
        <Box textAlign="center" py={10}>
          <Heading size="2xl" mb={4}>
            Welcome to ChainBridge DEX
          </Heading>
          <Text fontSize="xl" color="gray.500" mb={8}>
            Trade cryptocurrencies seamlessly across multiple blockchains
          </Text>
          {!isConnected && (
            <Text fontSize="lg" color="gray.600">
              Connect your wallet to get started
            </Text>
          )}
        </Box>

        {/* Portfolio Summary */}
        {isConnected && (
          <Card bg={cardBg}>
            <CardBody>
              <Heading size="lg" mb={6}>
                Portfolio Summary
              </Heading>
              <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={6}>
                <GridItem>
                  <Stat>
                    <StatLabel>Total Value</StatLabel>
                    <StatNumber>
                      {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '$0.00'}
                    </StatNumber>
                    <StatHelpText>Connected Wallet</StatHelpText>
                  </Stat>
                </GridItem>
                <GridItem>
                  <Stat>
                    <StatLabel>Today's P&L</StatLabel>
                    <StatNumber color="success.500">+$0.00</StatNumber>
                    <StatHelpText>0.00%</StatHelpText>
                  </Stat>
                </GridItem>
                <GridItem>
                  <Stat>
                    <StatLabel>Active Positions</StatLabel>
                    <StatNumber>0</StatNumber>
                    <StatHelpText>Liquidity Pools</StatHelpText>
                  </Stat>
                </GridItem>
              </Grid>
            </CardBody>
          </Card>
        )}

        {/* Quick Actions */}
        <Card bg={cardBg}>
          <CardBody>
            <Heading size="lg" mb={6}>
              Quick Actions
            </Heading>
            <HStack spacing={4} flexWrap="wrap">
              <Button colorScheme="primary" size="lg">
                Swap Tokens
              </Button>
              <Button variant="outline" size="lg">
                Add Liquidity
              </Button>
              <Button variant="outline" size="lg">
                View Portfolio
              </Button>
              <Button variant="outline" size="lg">
                Analytics
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {/* Market Overview */}
        <Card bg={cardBg}>
          <CardBody>
            <Heading size="lg" mb={6}>
              Market Overview
            </Heading>
            <Text color="gray.500">
              Market data and top tokens will be displayed here.
            </Text>
          </CardBody>
        </Card>
      </VStack>
    </MainLayout>
  )
}
