'use client'

import React, { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Card,
  CardBody,
  Grid,
  GridItem,
  Heading,
  useColorModeValue,
  useToast,
  Badge,
  Progress,
  Divider,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { FiStar, FiHeart, FiTrendingUp, FiZap } from 'react-icons/fi'
import {
  LoadingStates,
  StatusIndicators,
  InteractiveElements,
  ProgressIndicators,
  AlertComponents,
  CardComponents,
} from './EnhancedUIComponents'
import { CustomToast, TransactionStatus, PriceChange } from './FeedbackSystem'
import { AccessibleButton } from './AccessibleComponents'
import { 
  useScrollAnimation, 
  useStaggerAnimation, 
  usePriceAnimation,
  useAdvancedScrollAnimation,
  useMorphAnimation,
} from '@/hooks/useAnimations'

const MotionBox = motion(Box)

export const UIShowcase: React.FC = () => {
  const [showToast, setShowToast] = useState(false)
  const [txStatus, setTxStatus] = useState<'pending' | 'confirmed' | 'failed'>('pending')
  const [progress, setProgress] = useState(0)
  const toast = useToast()

  const { ref, variants, isInView } = useScrollAnimation()
  const { staggerVariants, childVariants } = useStaggerAnimation()
  const { animatePrice } = usePriceAnimation()
  const { morphState, morphVariants, nextMorph } = useMorphAnimation()

  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const handleProgressDemo = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleTxStatusDemo = () => {
    setTxStatus('pending')
    setTimeout(() => setTxStatus('confirmed'), 3000)
  }

  const handlePriceDemo = () => {
    const newPrice = Math.random() * 1000 + 500
    animatePrice(newPrice)
  }

  return (
    <MotionBox
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      p={8}
      maxW="6xl"
      mx="auto"
    >
      <VStack spacing={12} align="stretch">
        {/* Header */}
        <VStack spacing={4} textAlign="center">
          <Heading size="2xl" bgGradient="linear(to-r, primary.400, accent.400)" bgClip="text">
            UI/UX Component Showcase
          </Heading>
          <Text fontSize="lg" color="gray.500">
            Demonstrating enhanced UI components with advanced animations and interactions
          </Text>
        </VStack>

        {/* Loading States Section */}
        <MotionBox
          variants={staggerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <VStack spacing={6} align="stretch">
            <Heading size="lg">Loading States</Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
              <MotionBox variants={childVariants}>
                <Card bg={bg} border="1px solid" borderColor={borderColor}>
                  <CardBody>
                    <VStack spacing={4}>
                      <Text fontWeight="bold">Skeleton Loading</Text>
                      <LoadingStates.SkeletonCard lines={3} />
                    </VStack>
                  </CardBody>
                </Card>
              </MotionBox>

              <MotionBox variants={childVariants}>
                <Card bg={bg} border="1px solid" borderColor={borderColor}>
                  <CardBody>
                    <VStack spacing={4}>
                      <Text fontWeight="bold">Pulse Loader</Text>
                      <LoadingStates.PulseLoader size="lg" />
                    </VStack>
                  </CardBody>
                </Card>
              </MotionBox>

              <MotionBox variants={childVariants}>
                <Card bg={bg} border="1px solid" borderColor={borderColor}>
                  <CardBody>
                    <VStack spacing={4}>
                      <Text fontWeight="bold">Dots Loader</Text>
                      <LoadingStates.DotsLoader />
                    </VStack>
                  </CardBody>
                </Card>
              </MotionBox>
            </Grid>
          </VStack>
        </MotionBox>

        {/* Status Indicators Section */}
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Status Indicators</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Trading Status</Text>
                  <StatusIndicators.TradingStatus
                    status="profit"
                    value="+$1,234.56"
                    change={12.5}
                  />
                  <StatusIndicators.TradingStatus
                    status="loss"
                    value="-$567.89"
                    change={-8.3}
                  />
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Connection Status</Text>
                  <StatusIndicators.ConnectionStatus
                    isConnected={true}
                    chainName="Ethereum"
                  />
                  <StatusIndicators.ConnectionStatus
                    isConnected={false}
                  />
                </VStack>
              </CardBody>
            </Card>
          </Grid>
        </VStack>

        {/* Interactive Elements Section */}
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Interactive Elements</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={6}>
            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Copy Button</Text>
                  <InteractiveElements.CopyButton
                    text="0x1234567890abcdef"
                    label="Copy Address"
                  />
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Refresh Button</Text>
                  <InteractiveElements.RefreshButton
                    onRefresh={() => toast({
                      title: 'Refreshed!',
                      status: 'success',
                      duration: 2000,
                    })}
                  />
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Visibility Toggle</Text>
                  <InteractiveElements.VisibilityToggle
                    isVisible={true}
                    onToggle={() => {}}
                  />
                </VStack>
              </CardBody>
            </Card>
          </Grid>
        </VStack>

        {/* Progress Indicators Section */}
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Progress Indicators</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Animated Progress</Text>
                  <ProgressIndicators.AnimatedProgress
                    value={progress}
                    max={100}
                    colorScheme="primary"
                  />
                  <Button size="sm" onClick={handleProgressDemo}>
                    Demo Progress
                  </Button>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Circular Progress</Text>
                  <ProgressIndicators.CircularProgress
                    value={75}
                    max={100}
                    size={80}
                  />
                </VStack>
              </CardBody>
            </Card>
          </Grid>
        </VStack>

        {/* Enhanced Cards Section */}
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Enhanced Cards</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <CardComponents.HoverCard hoverScale={1.05}>
              <CardBody>
                <VStack spacing={3}>
                  <FiStar size={24} color="var(--chakra-colors-primary-500)" />
                  <Text fontWeight="bold">Hover Card</Text>
                  <Text fontSize="sm" color="gray.500" textAlign="center">
                    This card has enhanced hover interactions
                  </Text>
                </VStack>
              </CardBody>
            </CardComponents.HoverCard>

            <CardComponents.StatsCard
              title="Total Volume"
              value="$2.4B"
              change={12.5}
              icon={FiTrendingUp}
              colorScheme="success"
            />
          </Grid>
        </VStack>

        {/* Feedback System Section */}
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Feedback System</Heading>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6}>
            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Transaction Status</Text>
                  <TransactionStatus
                    txHash="0x1234...abcd"
                    status={txStatus}
                    confirmations={8}
                    requiredConfirmations={12}
                    estimatedTime={30}
                    onViewTransaction={() => {}}
                  />
                  <Button size="sm" onClick={handleTxStatusDemo}>
                    Demo Transaction
                  </Button>
                </VStack>
              </CardBody>
            </Card>

            <Card bg={bg} border="1px solid" borderColor={borderColor}>
              <CardBody>
                <VStack spacing={4}>
                  <Text fontWeight="bold">Price Change</Text>
                  <PriceChange
                    currentPrice={1234.56}
                    previousPrice={1100.00}
                    symbol="ETH"
                    showPercentage={true}
                    showIcon={true}
                    size="lg"
                  />
                  <Button size="sm" onClick={handlePriceDemo}>
                    Demo Price Change
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          </Grid>
        </VStack>

        {/* Enhanced Buttons Section */}
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Enhanced Buttons</Heading>
          <HStack spacing={4} flexWrap="wrap" justify="center">
            <AccessibleButton
              animation="bounce"
              colorScheme="primary"
              leftIcon={<FiZap />}
              showTooltip
              tooltipLabel="Bounce animation"
            >
              Bounce Button
            </AccessibleButton>

            <AccessibleButton
              animation="glow"
              colorScheme="success"
              leftIcon={<FiHeart />}
              showTooltip
              tooltipLabel="Glow animation"
            >
              Glow Button
            </AccessibleButton>

            <AccessibleButton
              animation="pulse"
              colorScheme="warning"
              leftIcon={<FiStar />}
              showTooltip
              tooltipLabel="Pulse animation"
            >
              Pulse Button
            </AccessibleButton>
          </HStack>
        </VStack>

        {/* Morphing Animation Demo */}
        <VStack spacing={6} align="stretch">
          <Heading size="lg">Morphing Animations</Heading>
          <Card bg={bg} border="1px solid" borderColor={borderColor}>
            <CardBody>
              <VStack spacing={4}>
                <MotionBox
                  w={20}
                  h={20}
                  bg="primary.500"
                  animate={morphVariants[morphState]}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                />
                <Button onClick={nextMorph}>
                  Next Morph
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </VStack>
      </VStack>
    </MotionBox>
  )
}
