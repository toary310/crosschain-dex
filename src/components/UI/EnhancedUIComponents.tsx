'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Box,
  Button,
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Skeleton,
  useColorModeValue,
  useToast,
  IconButton,
  Tooltip,
  Flex,
  Center,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  useDisclosure,
  Collapse,
  ScaleFade,
  SlideFade,
  Fade,
} from '@chakra-ui/react'
import { motion, AnimatePresence, useAnimation, useInView } from 'framer-motion'
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiInfo, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiXCircle,
  FiCopy,
  FiExternalLink,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi'
import { useHapticFeedback } from '@/hooks/useMobile'

const MotionBox = motion(Box)
const MotionCard = motion(Card)
const MotionFlex = motion(Flex)

// Enhanced Loading States
export const LoadingStates = {
  // Skeleton with shimmer effect
  SkeletonCard: ({ lines = 3, ...props }: { lines?: number; [key: string]: any }) => {
    const bg = useColorModeValue('gray.100', 'gray.700')
    
    return (
      <Card {...props}>
        <CardBody>
          <VStack spacing={3} align="stretch">
            {Array.from({ length: lines }).map((_, i) => (
              <Skeleton
                key={i}
                height={i === 0 ? '20px' : '16px'}
                bg={bg}
                startColor={useColorModeValue('gray.200', 'gray.600')}
                endColor={useColorModeValue('gray.300', 'gray.500')}
                borderRadius="md"
              />
            ))}
          </VStack>
        </CardBody>
      </Card>
    )
  },

  // Pulse loading indicator
  PulseLoader: ({ size = 'md', color = 'primary.500' }: { size?: string; color?: string }) => (
    <MotionBox
      w={size === 'sm' ? 4 : size === 'lg' ? 8 : 6}
      h={size === 'sm' ? 4 : size === 'lg' ? 8 : 6}
      bg={color}
      borderRadius="full"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [1, 0.7, 1],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  ),

  // Dots loading animation
  DotsLoader: ({ color = 'primary.500' }: { color?: string }) => (
    <HStack spacing={1}>
      {[0, 1, 2].map((i) => (
        <MotionBox
          key={i}
          w={2}
          h={2}
          bg={color}
          borderRadius="full"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </HStack>
  ),
}

// Enhanced Status Indicators
export const StatusIndicators = {
  // Trading status with animation
  TradingStatus: ({ 
    status, 
    value, 
    change, 
    ...props 
  }: { 
    status: 'profit' | 'loss' | 'neutral'
    value: string
    change?: number
    [key: string]: any 
  }) => {
    const isProfit = status === 'profit'
    const isLoss = status === 'loss'
    const color = isProfit ? 'profit.500' : isLoss ? 'loss.500' : 'neutral.500'
    const icon = isProfit ? FiTrendingUp : isLoss ? FiTrendingDown : FiInfo
    
    return (
      <MotionFlex
        align="center"
        gap={2}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        {...props}
      >
        <Box as={icon} color={color} />
        <Text fontWeight="bold" color={color}>
          {value}
        </Text>
        {change !== undefined && (
          <Badge colorScheme={isProfit ? 'green' : isLoss ? 'red' : 'gray'}>
            {change > 0 ? '+' : ''}{change.toFixed(2)}%
          </Badge>
        )}
      </MotionFlex>
    )
  },

  // Connection status indicator
  ConnectionStatus: ({ 
    isConnected, 
    chainName, 
    ...props 
  }: { 
    isConnected: boolean
    chainName?: string
    [key: string]: any 
  }) => (
    <HStack spacing={2} {...props}>
      <MotionBox
        w={2}
        h={2}
        bg={isConnected ? 'success.500' : 'error.500'}
        borderRadius="full"
        animate={{
          scale: isConnected ? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: isConnected ? Infinity : 0,
        }}
      />
      <Text fontSize="sm" color={isConnected ? 'success.500' : 'error.500'}>
        {isConnected ? `Connected${chainName ? ` to ${chainName}` : ''}` : 'Disconnected'}
      </Text>
    </HStack>
  ),
}

// Enhanced Interactive Elements
export const InteractiveElements = {
  // Copy to clipboard button with feedback
  CopyButton: ({ 
    text, 
    label = 'Copy', 
    ...props 
  }: { 
    text: string
    label?: string
    [key: string]: any 
  }) => {
    const [copied, setCopied] = useState(false)
    const { lightImpact } = useHapticFeedback()
    const toast = useToast()

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        lightImpact()
        toast({
          title: 'Copied!',
          status: 'success',
          duration: 2000,
          isClosable: true,
        })
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        toast({
          title: 'Failed to copy',
          status: 'error',
          duration: 2000,
          isClosable: true,
        })
      }
    }

    return (
      <Tooltip label={copied ? 'Copied!' : label}>
        <IconButton
          aria-label={label}
          icon={copied ? <FiCheckCircle /> : <FiCopy />}
          size="sm"
          variant="ghost"
          colorScheme={copied ? 'green' : 'gray'}
          onClick={handleCopy}
          {...props}
        />
      </Tooltip>
    )
  },

  // Enhanced refresh button with loading state
  RefreshButton: ({ 
    onRefresh, 
    isLoading = false, 
    ...props 
  }: { 
    onRefresh: () => void
    isLoading?: boolean
    [key: string]: any 
  }) => {
    const { mediumImpact } = useHapticFeedback()

    const handleRefresh = () => {
      mediumImpact()
      onRefresh()
    }

    return (
      <Tooltip label="Refresh">
        <IconButton
          aria-label="Refresh"
          icon={
            <MotionBox
              as={FiRefreshCw}
              animate={isLoading ? { rotate: 360 } : {}}
              transition={{
                duration: 1,
                repeat: isLoading ? Infinity : 0,
                ease: "linear",
              }}
            />
          }
          size="sm"
          variant="ghost"
          onClick={handleRefresh}
          isLoading={isLoading}
          {...props}
        />
      </Tooltip>
    )
  },

  // Toggle visibility button
  VisibilityToggle: ({ 
    isVisible, 
    onToggle, 
    ...props 
  }: { 
    isVisible: boolean
    onToggle: () => void
    [key: string]: any 
  }) => {
    const { lightImpact } = useHapticFeedback()

    const handleToggle = () => {
      lightImpact()
      onToggle()
    }

    return (
      <Tooltip label={isVisible ? 'Hide' : 'Show'}>
        <IconButton
          aria-label={isVisible ? 'Hide' : 'Show'}
          icon={isVisible ? <FiEyeOff /> : <FiEye />}
          size="sm"
          variant="ghost"
          onClick={handleToggle}
          {...props}
        />
      </Tooltip>
    )
  },
}

// Enhanced Progress Indicators
export const ProgressIndicators = {
  // Animated progress bar
  AnimatedProgress: ({ 
    value, 
    max = 100, 
    colorScheme = 'primary', 
    showValue = true,
    ...props 
  }: { 
    value: number
    max?: number
    colorScheme?: string
    showValue?: boolean
    [key: string]: any 
  }) => {
    const [animatedValue, setAnimatedValue] = useState(0)
    const percentage = (value / max) * 100

    useEffect(() => {
      const timer = setTimeout(() => {
        setAnimatedValue(percentage)
      }, 100)
      return () => clearTimeout(timer)
    }, [percentage])

    return (
      <VStack spacing={2} align="stretch" {...props}>
        {showValue && (
          <HStack justify="space-between">
            <Text fontSize="sm" fontWeight="medium">
              Progress
            </Text>
            <Text fontSize="sm" color="gray.500">
              {value}/{max}
            </Text>
          </HStack>
        )}
        <Progress
          value={animatedValue}
          colorScheme={colorScheme}
          borderRadius="full"
          bg={useColorModeValue('gray.200', 'gray.700')}
          transition="all 0.3s ease"
        />
      </VStack>
    )
  },

  // Circular progress with animation
  CircularProgress: ({ 
    value, 
    max = 100, 
    size = 60, 
    color = 'primary.500',
    ...props 
  }: { 
    value: number
    max?: number
    size?: number
    color?: string
    [key: string]: any 
  }) => {
    const percentage = (value / max) * 100
    const circumference = 2 * Math.PI * 18 // radius = 18
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference

    return (
      <Box position="relative" w={size} h={size} {...props}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={18}
            stroke={useColorModeValue('gray.200', 'gray.700')}
            strokeWidth={4}
            fill="transparent"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={18}
            stroke={color}
            strokeWidth={4}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeInOut" }}
            strokeLinecap="round"
          />
        </svg>
        <Center position="absolute" inset={0}>
          <Text fontSize="sm" fontWeight="bold">
            {Math.round(percentage)}%
          </Text>
        </Center>
      </Box>
    )
  },
}

// Enhanced Alert Components
export const AlertComponents = {
  // Animated alert with auto-dismiss
  AnimatedAlert: ({ 
    status = 'info', 
    title, 
    description, 
    isClosable = true, 
    duration = 5000,
    onClose,
    ...props 
  }: { 
    status?: 'info' | 'warning' | 'success' | 'error'
    title: string
    description?: string
    isClosable?: boolean
    duration?: number
    onClose?: () => void
    [key: string]: any 
  }) => {
    const { isOpen, onClose: handleClose } = useDisclosure({ defaultIsOpen: true })

    useEffect(() => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose()
          onClose?.()
        }, duration)
        return () => clearTimeout(timer)
      }
    }, [duration, handleClose, onClose])

    return (
      <SlideFade in={isOpen} offsetY="20px">
        <Alert
          status={status}
          borderRadius="lg"
          boxShadow="lg"
          {...props}
        >
          <AlertIcon />
          <Box flex="1">
            <AlertTitle>{title}</AlertTitle>
            {description && (
              <AlertDescription>{description}</AlertDescription>
            )}
          </Box>
          {isClosable && (
            <CloseButton
              alignSelf="flex-start"
              position="relative"
              right={-1}
              top={-1}
              onClick={() => {
                handleClose()
                onClose?.()
              }}
            />
          )}
        </Alert>
      </SlideFade>
    )
  },
}

// Enhanced Card Components
export const CardComponents = {
  // Hover card with enhanced interactions
  HoverCard: ({ 
    children, 
    hoverScale = 1.02, 
    hoverShadow = 'xl',
    ...props 
  }: { 
    children: React.ReactNode
    hoverScale?: number
    hoverShadow?: string
    [key: string]: any 
  }) => (
    <MotionCard
      whileHover={{ 
        scale: hoverScale,
        boxShadow: `var(--chakra-shadows-${hoverShadow})`,
      }}
      transition={{ duration: 0.2 }}
      cursor="pointer"
      {...props}
    >
      {children}
    </MotionCard>
  ),

  // Stats card with animation
  StatsCard: ({ 
    title, 
    value, 
    change, 
    icon, 
    colorScheme = 'primary',
    ...props 
  }: { 
    title: string
    value: string
    change?: number
    icon?: React.ElementType
    colorScheme?: string
    [key: string]: any 
  }) => {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true })
    const controls = useAnimation()

    useEffect(() => {
      if (isInView) {
        controls.start("visible")
      }
    }, [isInView, controls])

    return (
      <MotionCard
        ref={ref}
        initial="hidden"
        animate={controls}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { opacity: 1, y: 0 },
        }}
        transition={{ duration: 0.5 }}
        {...props}
      >
        <CardBody>
          <HStack justify="space-between" align="start">
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" color="gray.500">
                {title}
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {value}
              </Text>
              {change !== undefined && (
                <StatusIndicators.TradingStatus
                  status={change > 0 ? 'profit' : change < 0 ? 'loss' : 'neutral'}
                  value={`${change > 0 ? '+' : ''}${change.toFixed(2)}%`}
                />
              )}
            </VStack>
            {icon && (
              <Box
                as={icon}
                w={8}
                h={8}
                color={`${colorScheme}.500`}
              />
            )}
          </HStack>
        </CardBody>
      </MotionCard>
    )
  },
}
