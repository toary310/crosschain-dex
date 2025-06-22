'use client'

import { MainLayout } from '@/components/Layout/MainLayout'
import {
    CardComponents,
    InteractiveElements,
    StatusIndicators,
} from '@/components/UI/EnhancedUIComponents'
import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    Container,
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
    useToast
} from '@chakra-ui/react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    FiActivity,
    FiArrowRight,
    FiDollarSign,
    FiGlobe,
    FiShield,
    FiTrendingUp,
    FiUsers,
    FiZap,
} from 'react-icons/fi'
import { useAccount, useBalance } from 'wagmi'

const MotionBox = motion(Box)
const MotionContainer = motion(Container)

export default function Home() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({ address })
  const router = useRouter()
  const toast = useToast()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 300], [0, -50])

  const [marketStats, setMarketStats] = useState({
    totalVolume: '$2.4B',
    totalUsers: '150K+',
    totalTrades: '1.2M+',
    supportedChains: 8,
  })

  const cardBg = useColorModeValue('white', 'gray.800')
  const gradientBg = useColorModeValue(
    'linear(to-br, primary.50, accent.50)',
    'linear(to-br, primary.900, accent.900)'
  )

  // Mock data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setMarketStats({
        totalVolume: '$2.4B',
        totalUsers: '150K+',
        totalTrades: '1.2M+',
        supportedChains: 8,
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'swap':
        router.push('/swap')
        break
      case 'pools':
        router.push('/pools')
        break
      case 'portfolio':
        router.push('/portfolio')
        break
      case 'analytics':
        router.push('/analytics')
        break
      default:
        toast({
          title: 'Coming Soon',
          description: `${action} feature is coming soon!`,
          status: 'info',
          duration: 3000,
        })
    }
  }

  return (
    <MainLayout>
      <VStack spacing={12} align="stretch">
        {/* Enhanced Hero Section */}
        <MotionContainer
          maxW="6xl"
          style={{ y }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <VStack spacing={8} textAlign="center" py={16}>
            <Badge
              colorScheme="primary"
              variant="subtle"
              px={4}
              py={2}
              borderRadius="full"
              fontSize="sm"
            >
              ? Next-Generation DeFi Platform
            </Badge>

            <Heading
              size="4xl"
              bgGradient="linear(to-r, primary.400, accent.400)"
              bgClip="text"
              lineHeight="shorter"
            >
              Trade Across All Chains
            </Heading>

            <Text fontSize="xl" color="gray.500" maxW="2xl">
              Experience seamless cross-chain trading with the most advanced DEX aggregator.
              Best prices, lowest fees, maximum security.
            </Text>

            <HStack spacing={4} flexWrap="wrap" justify="center">
              <Button
                size="lg"
                colorScheme="primary"
                rightIcon={<FiArrowRight />}
                onClick={() => handleQuickAction('swap')}
                _hover={{ transform: 'translateY(-2px)' }}
              >
                Start Trading
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleQuickAction('pools')}
              >
                Explore Pools
              </Button>
            </HStack>

            {/* Connection Status */}
            <StatusIndicators.ConnectionStatus
              isConnected={isConnected}
              chainName={isConnected ? 'Ethereum' : undefined}
            />
          </VStack>
        </MotionContainer>

        {/* Market Stats */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={6}>
          <CardComponents.StatsCard
            title="Total Volume"
            value={marketStats.totalVolume}
            change={12.5}
            icon={FiTrendingUp}
            colorScheme="primary"
          />
          <CardComponents.StatsCard
            title="Active Users"
            value={marketStats.totalUsers}
            change={8.3}
            icon={FiUsers}
            colorScheme="success"
          />
          <CardComponents.StatsCard
            title="Total Trades"
            value={marketStats.totalTrades}
            change={-2.1}
            icon={FiActivity}
            colorScheme="warning"
          />
          <CardComponents.StatsCard
            title="Supported Chains"
            value={marketStats.supportedChains.toString()}
            icon={FiGlobe}
            colorScheme="accent"
          />
        </Grid>

        {/* Portfolio Summary */}
        {isConnected && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card bg={cardBg} variant="elevated">
              <CardBody>
                <HStack justify="space-between" mb={6}>
                  <Heading size="lg">Portfolio Summary</Heading>
                  <InteractiveElements.RefreshButton
                    onRefresh={() => {
                      toast({
                        title: 'Portfolio Refreshed',
                        status: 'success',
                        duration: 2000,
                      })
                    }}
                  />
                </HStack>
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
                      <StatusIndicators.TradingStatus
                        status="profit"
                        value="+$124.56"
                        change={2.34}
                      />
                      <StatHelpText>24h Change</StatHelpText>
                    </Stat>
                  </GridItem>
                  <GridItem>
                    <Stat>
                      <StatLabel>Active Positions</StatLabel>
                      <StatNumber>3</StatNumber>
                      <StatHelpText>Liquidity Pools</StatHelpText>
                    </Stat>
                  </GridItem>
                </Grid>
              </CardBody>
            </Card>
          </MotionBox>
        )}

        {/* Features Section */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <VStack spacing={8}>
            <VStack spacing={4} textAlign="center">
              <Heading size="xl">Why Choose ChainBridge DEX?</Heading>
              <Text fontSize="lg" color="gray.500" maxW="2xl">
                Built for the future of DeFi with cutting-edge technology and user-centric design
              </Text>
            </VStack>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={8}>
              <CardComponents.HoverCard>
                <CardBody textAlign="center">
                  <VStack spacing={4}>
                    <Box
                      p={4}
                      borderRadius="full"
                      bg={useColorModeValue('primary.50', 'primary.900')}
                    >
                      <FiZap size={24} color="var(--chakra-colors-primary-500)" />
                    </Box>
                    <Heading size="md">Lightning Fast</Heading>
                    <Text color="gray.500">
                      Execute trades in milliseconds with our optimized routing engine
                    </Text>
                  </VStack>
                </CardBody>
              </CardComponents.HoverCard>

              <CardComponents.HoverCard>
                <CardBody textAlign="center">
                  <VStack spacing={4}>
                    <Box
                      p={4}
                      borderRadius="full"
                      bg={useColorModeValue('success.50', 'success.900')}
                    >
                      <FiShield size={24} color="var(--chakra-colors-success-500)" />
                    </Box>
                    <Heading size="md">Secure & Audited</Heading>
                    <Text color="gray.500">
                      Multi-layer security with smart contract audits by leading firms
                    </Text>
                  </VStack>
                </CardBody>
              </CardComponents.HoverCard>

              <CardComponents.HoverCard>
                <CardBody textAlign="center">
                  <VStack spacing={4}>
                    <Box
                      p={4}
                      borderRadius="full"
                      bg={useColorModeValue('accent.50', 'accent.900')}
                    >
                      <FiGlobe size={24} color="var(--chakra-colors-accent-500)" />
                    </Box>
                    <Heading size="md">Cross-Chain Native</Heading>
                    <Text color="gray.500">
                      Trade across 8+ blockchains with unified liquidity
                    </Text>
                  </VStack>
                </CardBody>
              </CardComponents.HoverCard>
            </Grid>
          </VStack>
        </MotionBox>

        {/* Quick Actions */}
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card bg={cardBg} variant="gradient">
            <CardBody>
              <VStack spacing={6}>
                <VStack spacing={2} textAlign="center">
                  <Heading size="lg">Ready to Start Trading?</Heading>
                  <Text color="gray.500">
                    Join thousands of traders already using ChainBridge DEX
                  </Text>
                </VStack>
                <HStack spacing={4} flexWrap="wrap" justify="center">
                  <Button
                    colorScheme="primary"
                    size="lg"
                    onClick={() => handleQuickAction('swap')}
                    leftIcon={<FiDollarSign />}
                  >
                    Swap Tokens
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleQuickAction('pools')}
                  >
                    Add Liquidity
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleQuickAction('portfolio')}
                  >
                    View Portfolio
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => handleQuickAction('analytics')}
                  >
                    Analytics
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </MotionBox>
      </VStack>
    </MainLayout>
  )
}
