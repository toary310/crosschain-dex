'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  IconButton,
  Progress,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  useToast,
  useColorModeValue,
  Tooltip,
  Badge,
  Flex,
  Center,
  Spinner,
  Card,
  CardBody,
  Divider,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiInfo,
  FiLoader,
  FiClock,
  FiTrendingUp,
  FiTrendingDown,
  FiActivity,
} from 'react-icons/fi'
import { useHapticFeedback } from '@/hooks/useMobile'

const MotionBox = motion(Box)
const MotionCard = motion(Card)

// Enhanced Toast System
export interface CustomToastProps {
  id: string
  title: string
  description?: string
  status: 'success' | 'error' | 'warning' | 'info' | 'loading'
  duration?: number
  isClosable?: boolean
  action?: {
    label: string
    onClick: () => void
  }
  progress?: number
  onClose?: () => void
}

export const CustomToast: React.FC<CustomToastProps> = ({
  id,
  title,
  description,
  status,
  duration = 5000,
  isClosable = true,
  action,
  progress,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(duration)
  const { lightImpact } = useHapticFeedback()

  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const statusConfig = {
    success: {
      icon: FiCheck,
      color: 'success.500',
      bgColor: useColorModeValue('success.50', 'success.900'),
      borderColor: 'success.500',
    },
    error: {
      icon: FiX,
      color: 'error.500',
      bgColor: useColorModeValue('error.50', 'error.900'),
      borderColor: 'error.500',
    },
    warning: {
      icon: FiAlertTriangle,
      color: 'warning.500',
      bgColor: useColorModeValue('warning.50', 'warning.900'),
      borderColor: 'warning.500',
    },
    info: {
      icon: FiInfo,
      color: 'primary.500',
      bgColor: useColorModeValue('primary.50', 'primary.900'),
      borderColor: 'primary.500',
    },
    loading: {
      icon: FiLoader,
      color: 'gray.500',
      bgColor: useColorModeValue('gray.50', 'gray.900'),
      borderColor: 'gray.500',
    },
  }

  const config = statusConfig[status]
  const IconComponent = config.icon

  useEffect(() => {
    if (duration > 0 && status !== 'loading') {
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 100) {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 300)
            return 0
          }
          return prev - 100
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [duration, status, onClose])

  const handleClose = () => {
    lightImpact()
    setIsVisible(false)
    setTimeout(() => onClose?.(), 300)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <MotionBox
          initial={{ opacity: 0, x: 300, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 300, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          position="relative"
          w="full"
          maxW="400px"
        >
          <Card
            bg={config.bgColor}
            border="1px solid"
            borderColor={config.borderColor}
            borderRadius="lg"
            boxShadow="lg"
            overflow="hidden"
          >
            <CardBody p={4}>
              <HStack spacing={3} align="start">
                <Center
                  w={8}
                  h={8}
                  borderRadius="full"
                  bg={config.color}
                  color="white"
                  flexShrink={0}
                >
                  {status === 'loading' ? (
                    <Spinner size="sm" />
                  ) : (
                    <IconComponent size={16} />
                  )}
                </Center>

                <VStack spacing={1} align="start" flex={1}>
                  <Text fontWeight="bold" fontSize="sm">
                    {title}
                  </Text>
                  {description && (
                    <Text fontSize="xs" color="gray.600">
                      {description}
                    </Text>
                  )}
                  
                  {progress !== undefined && (
                    <Progress
                      value={progress}
                      size="sm"
                      colorScheme={status === 'error' ? 'red' : 'primary'}
                      w="full"
                      mt={2}
                    />
                  )}

                  {action && (
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme={status === 'error' ? 'red' : 'primary'}
                      onClick={action.onClick}
                      mt={2}
                    >
                      {action.label}
                    </Button>
                  )}
                </VStack>

                {isClosable && (
                  <IconButton
                    aria-label="Close"
                    icon={<FiX />}
                    size="sm"
                    variant="ghost"
                    onClick={handleClose}
                    flexShrink={0}
                  />
                )}
              </HStack>
            </CardBody>

            {/* Progress bar for auto-dismiss */}
            {duration > 0 && status !== 'loading' && (
              <Box
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                h="2px"
                bg={config.color}
                transform={`scaleX(${timeLeft / duration})`}
                transformOrigin="left"
                transition="transform 0.1s linear"
              />
            )}
          </Card>
        </MotionBox>
      )}
    </AnimatePresence>
  )
}

// Transaction Status Tracker
export interface TransactionStatusProps {
  txHash?: string
  status: 'pending' | 'confirmed' | 'failed'
  confirmations?: number
  requiredConfirmations?: number
  estimatedTime?: number
  onViewTransaction?: () => void
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  txHash,
  status,
  confirmations = 0,
  requiredConfirmations = 12,
  estimatedTime,
  onViewTransaction,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (status === 'pending') {
      const interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [status])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: FiClock,
          color: 'warning.500',
          bgColor: useColorModeValue('warning.50', 'warning.900'),
          title: 'Transaction Pending',
          description: `Waiting for confirmations (${confirmations}/${requiredConfirmations})`,
        }
      case 'confirmed':
        return {
          icon: FiCheck,
          color: 'success.500',
          bgColor: useColorModeValue('success.50', 'success.900'),
          title: 'Transaction Confirmed',
          description: 'Your transaction has been successfully processed',
        }
      case 'failed':
        return {
          icon: FiX,
          color: 'error.500',
          bgColor: useColorModeValue('error.50', 'error.900'),
          title: 'Transaction Failed',
          description: 'Your transaction could not be processed',
        }
    }
  }

  const config = getStatusConfig()
  const IconComponent = config.icon
  const progress = status === 'pending' ? (confirmations / requiredConfirmations) * 100 : 100

  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      bg={config.bgColor}
      border="1px solid"
      borderColor={config.color}
      borderRadius="lg"
    >
      <CardBody>
        <VStack spacing={4} align="stretch">
          <HStack spacing={3}>
            <Center
              w={10}
              h={10}
              borderRadius="full"
              bg={config.color}
              color="white"
            >
              {status === 'pending' ? (
                <Spinner size="sm" />
              ) : (
                <IconComponent size={20} />
              )}
            </Center>

            <VStack spacing={1} align="start" flex={1}>
              <Text fontWeight="bold">{config.title}</Text>
              <Text fontSize="sm" color="gray.600">
                {config.description}
              </Text>
            </VStack>

            {status === 'pending' && (
              <VStack spacing={1} align="end">
                <Text fontSize="sm" fontWeight="medium">
                  {formatTime(elapsedTime)}
                </Text>
                {estimatedTime && (
                  <Text fontSize="xs" color="gray.500">
                    ~{estimatedTime}s
                  </Text>
                )}
              </VStack>
            )}
          </HStack>

          {status === 'pending' && (
            <VStack spacing={2} align="stretch">
              <Progress
                value={progress}
                colorScheme="primary"
                borderRadius="full"
                bg={useColorModeValue('gray.200', 'gray.700')}
              />
              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.500">
                  {confirmations} confirmations
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {requiredConfirmations} required
                </Text>
              </HStack>
            </VStack>
          )}

          {txHash && onViewTransaction && (
            <>
              <Divider />
              <Button
                size="sm"
                variant="outline"
                onClick={onViewTransaction}
                leftIcon={<FiActivity />}
              >
                View on Explorer
              </Button>
            </>
          )}
        </VStack>
      </CardBody>
    </MotionCard>
  )
}

// Price Change Indicator
export interface PriceChangeProps {
  currentPrice: number
  previousPrice: number
  symbol: string
  showPercentage?: boolean
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const PriceChange: React.FC<PriceChangeProps> = ({
  currentPrice,
  previousPrice,
  symbol,
  showPercentage = true,
  showIcon = true,
  size = 'md',
}) => {
  const change = currentPrice - previousPrice
  const changePercent = (change / previousPrice) * 100
  const isPositive = change > 0
  const isNegative = change < 0

  const color = isPositive ? 'success.500' : isNegative ? 'error.500' : 'gray.500'
  const icon = isPositive ? FiTrendingUp : isNegative ? FiTrendingDown : FiActivity

  const sizeConfig = {
    sm: { fontSize: 'sm', iconSize: 14 },
    md: { fontSize: 'md', iconSize: 16 },
    lg: { fontSize: 'lg', iconSize: 18 },
  }

  return (
    <HStack spacing={1} color={color}>
      {showIcon && <Box as={icon} size={sizeConfig[size].iconSize} />}
      <Text fontSize={sizeConfig[size].fontSize} fontWeight="medium">
        {isPositive ? '+' : ''}{change.toFixed(4)} {symbol}
      </Text>
      {showPercentage && (
        <Text fontSize={sizeConfig[size].fontSize} fontWeight="medium">
          ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
        </Text>
      )}
    </HStack>
  )
}
