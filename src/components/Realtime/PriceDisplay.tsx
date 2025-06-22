'use client'

import { PriceAlert, PriceStreamService, PriceUpdate } from '@/services/realtime/priceStream'
import {
    Badge,
    Box,
    HStack,
    IconButton,
    Skeleton,
    Text,
    Tooltip,
    useColorModeValue,
    useToast,
    VStack,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import React, { useEffect, useRef, useState } from 'react'
import { FiBell, FiBellOff, FiTrendingDown, FiTrendingUp } from 'react-icons/fi'

const MotionBox = motion(Box)
const MotionText = motion(Text)

interface PriceDisplayProps {
  token: string
  showChange?: boolean
  showVolume?: boolean
  showAlerts?: boolean
  size?: 'sm' | 'md' | 'lg'
  updateAnimation?: boolean
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  token,
  showChange = true,
  showVolume = false,
  showAlerts = false,
  size = 'md',
  updateAnimation = true,
}) => {
  const [priceData, setPriceData] = useState<PriceUpdate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAlert, setHasAlert] = useState(false)
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral')

  const priceStreamRef = useRef<PriceStreamService | null>(null)
  const previousPriceRef = useRef<number | null>(null)
  const toast = useToast()

  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const positiveColor = useColorModeValue('green.500', 'green.300')
  const negativeColor = useColorModeValue('red.500', 'red.300')

  // Initialize price stream
  useEffect(() => {
    if (!priceStreamRef.current) {
      priceStreamRef.current = new PriceStreamService({
        tokens: [token],
        updateInterval: 10000,
        sources: ['binance', 'coingecko'],
        enableWebSocket: true,
      })

      // Set up event listeners
      priceStreamRef.current.on('priceUpdate', handlePriceUpdate)
      priceStreamRef.current.on('priceAlert', handlePriceAlert)
      priceStreamRef.current.start()
    }

    return () => {
      if (priceStreamRef.current) {
        priceStreamRef.current.stop()
        priceStreamRef.current.removeAllListeners()
      }
    }
  }, [token])

  const handlePriceUpdate = (update: PriceUpdate) => {
    if (update.token.toUpperCase() === token.toUpperCase()) {
      // Determine price direction
      if (previousPriceRef.current !== undefined) {
        if (update.price > previousPriceRef.current) {
          setPriceDirection('up')
        } else if (update.price < previousPriceRef.current) {
          setPriceDirection('down')
        } else {
          setPriceDirection('neutral')
        }
      }

      previousPriceRef.current = update.price
      setPriceData(update)
      setIsLoading(false)

      // Reset direction after animation
      if (updateAnimation) {
        setTimeout(() => setPriceDirection('neutral'), 1000)
      }
    }
  }

  const handlePriceAlert = (alertData: any) => {
    toast({
      title: 'Price Alert',
      description: `${token} has ${alertData.alert.condition} $${alertData.alert.targetPrice}`,
      status: 'info',
      duration: 5000,
      isClosable: true,
    })
  }

  const togglePriceAlert = () => {
    if (!priceStreamRef.current || !priceData) return

    if (hasAlert) {
      // Remove existing alert
      const alerts = priceStreamRef.current.getPriceAlerts()
      const existingAlert = alerts.find(a => a.token === token)
      if (existingAlert) {
        priceStreamRef.current.removePriceAlert(existingAlert.id)
      }
      setHasAlert(false)
    } else {
      // Add new alert (10% above current price)
      const alert: PriceAlert = {
        id: `${token}-${Date.now()}`,
        token,
        condition: 'above',
        targetPrice: priceData.price * 1.1,
        isActive: true,
      }
      priceStreamRef.current.addPriceAlert(alert)
      setHasAlert(true)
    }
  }

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6)
    if (price < 1) return price.toFixed(4)
    if (price < 100) return price.toFixed(2)
    return price.toFixed(0)
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(1)}K`
    return `$${volume.toFixed(0)}`
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { fontSize: 'sm', spacing: 1 }
      case 'lg':
        return { fontSize: 'xl', spacing: 3 }
      default:
        return { fontSize: 'md', spacing: 2 }
    }
  }

  const styles = getSizeStyles()

  if (isLoading) {
    return (
      <Box p={styles.spacing} bg={bg} borderRadius="md" border="1px solid" borderColor={borderColor}>
        <VStack spacing={styles.spacing}>
          <Skeleton height="20px" width="80px" />
          {showChange && <Skeleton height="16px" width="60px" />}
          {showVolume && <Skeleton height="16px" width="70px" />}
        </VStack>
      </Box>
    )
  }

  if (!priceData) {
    return (
      <Box p={styles.spacing} bg={bg} borderRadius="md" border="1px solid" borderColor={borderColor}>
        <Text fontSize={styles.fontSize} color="gray.500">
          No data for {token}
        </Text>
      </Box>
    )
  }

  const changeColor = priceData.change24h >= 0 ? positiveColor : negativeColor
  const directionColor =
    priceDirection === 'up' ? positiveColor :
    priceDirection === 'down' ? negativeColor : 'inherit'

  return (
    <MotionBox
      p={styles.spacing}
      bg={bg}
      borderRadius="md"
      border="1px solid"
      borderColor={borderColor}
      animate={{
        borderColor: updateAnimation && priceDirection !== 'neutral' ? directionColor : borderColor,
      }}
      transition={{ duration: 0.3 }}
    >
      <VStack spacing={styles.spacing} align="stretch">
        {/* Token and Price */}
        <HStack justify="space-between" align="center">
          <HStack spacing={2}>
            <Text fontSize={styles.fontSize} fontWeight="bold">
              {token}
            </Text>
            {showAlerts && (
              <Tooltip label={hasAlert ? 'Remove price alert' : 'Add price alert'}>
                <IconButton
                  aria-label="Toggle price alert"
                  icon={hasAlert ? <FiBell /> : <FiBellOff />}
                  size="xs"
                  variant="ghost"
                  onClick={togglePriceAlert}
                />
              </Tooltip>
            )}
          </HStack>

          <MotionText
            fontSize={styles.fontSize}
            fontWeight="semibold"
            color={directionColor}
            animate={{
              scale: updateAnimation && priceDirection !== 'neutral' ? [1, 1.05, 1] : 1,
            }}
            transition={{ duration: 0.5 }}
          >
            ${formatPrice(priceData.price)}
          </MotionText>
        </HStack>

        {/* Change and Volume */}
        {(showChange || showVolume) && (
          <HStack justify="space-between" align="center">
            {showChange && (
              <HStack spacing={1}>
                {priceData.change24h >= 0 ? (
                  <FiTrendingUp color={positiveColor} />
                ) : (
                  <FiTrendingDown color={negativeColor} />
                )}
                <Badge
                  colorScheme={priceData.change24h >= 0 ? 'green' : 'red'}
                  variant="subtle"
                  fontSize="xs"
                >
                  {priceData.change24h >= 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
                </Badge>
              </HStack>
            )}

            {showVolume && (
              <Text fontSize="xs" color="gray.500">
                Vol: {formatVolume(priceData.volume24h)}
              </Text>
            )}
          </HStack>
        )}

        {/* Source and Timestamp */}
        <HStack justify="space-between" align="center">
          <Badge size="xs" variant="outline">
            {priceData.source}
          </Badge>
          <Text fontSize="xs" color="gray.400">
            {new Date(priceData.timestamp).toLocaleTimeString()}
          </Text>
        </HStack>
      </VStack>
    </MotionBox>
  )
}

// Price ticker component for multiple tokens
interface PriceTickerProps {
  tokens: string[]
  scrollSpeed?: number
}

export const PriceTicker: React.FC<PriceTickerProps> = ({
  tokens,
  scrollSpeed = 50,
}) => {
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map())
  const priceStreamRef = useRef<PriceStreamService | null>(null)

  useEffect(() => {
    if (!priceStreamRef.current) {
      priceStreamRef.current = new PriceStreamService({
        tokens,
        updateInterval: 10000,
        sources: ['binance', 'coingecko'],
        enableWebSocket: true,
      })

      priceStreamRef.current.on('priceUpdate', (update: PriceUpdate) => {
        setPrices(prev => new Map(prev.set(update.token, update)))
      })

      priceStreamRef.current.start()
    }

    return () => {
      if (priceStreamRef.current) {
        priceStreamRef.current.stop()
        priceStreamRef.current.removeAllListeners()
      }
    }
  }, [tokens])

  return (
    <Box
      overflow="hidden"
      whiteSpace="nowrap"
      bg={useColorModeValue('gray.50', 'gray.900')}
      py={2}
    >
      <MotionBox
        display="inline-flex"
        animate={{ x: ['100%', '-100%'] }}
        transition={{
          duration: scrollSpeed,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {tokens.map((token) => {
          const priceData = prices.get(token)
          return (
            <Box key={token} mx={4} minW="120px">
              <PriceDisplay
                token={token}
                size="sm"
                showChange={true}
                updateAnimation={false}
              />
            </Box>
          )
        })}
      </MotionBox>
    </Box>
  )
}
