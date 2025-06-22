import React, { forwardRef, useId } from 'react'
import {
  Box,
  Button,
  ButtonProps,
  Flex,
  Text,
  useColorModeValue,
  VisuallyHidden,
  Spinner,
  Icon,
  HStack,
  VStack,
  Tooltip,
  useTheme,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCheck, FiX, FiAlertCircle, FiInfo } from 'react-icons/fi'

// Motion components
const MotionBox = motion(Box)
const MotionButton = motion(Button)

// Enhanced Button with accessibility and animations
interface AccessibleButtonProps extends ButtonProps {
  isLoading?: boolean
  loadingText?: string
  leftIcon?: React.ReactElement
  rightIcon?: React.ReactElement
  variant?: 'solid' | 'outline' | 'ghost' | 'gradient' | 'success' | 'danger'
  animation?: 'bounce' | 'scale' | 'glow' | 'none'
  ariaLabel?: string
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    isLoading, 
    loadingText, 
    leftIcon, 
    rightIcon, 
    variant = 'solid',
    animation = 'scale',
    ariaLabel,
    disabled,
    ...props 
  }, ref) => {
    const theme = useTheme()
    
    const animationVariants = {
      bounce: {
        whileHover: { scale: 1.05, y: -2 },
        whileTap: { scale: 0.95 },
        transition: { type: 'spring', stiffness: 400, damping: 17 }
      },
      scale: {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.2 }
      },
      glow: {
        whileHover: { 
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
          scale: 1.02 
        },
        whileTap: { scale: 0.98 },
        transition: { duration: 0.3 }
      },
      none: {}
    }

    return (
      <MotionButton
        ref={ref}
        variant={variant}
        disabled={disabled || isLoading}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-busy={isLoading}
        {...(animation !== 'none' && animationVariants[animation])}
        {...props}
      >
        <HStack spacing={2}>
          {isLoading ? (
            <Spinner size="sm" />
          ) : leftIcon ? (
            leftIcon
          ) : null}
          
          <Text>
            {isLoading ? loadingText || 'Loading...' : children}
          </Text>
          
          {!isLoading && rightIcon && rightIcon}
        </HStack>
        
        {isLoading && (
          <VisuallyHidden>
            Loading, please wait
          </VisuallyHidden>
        )}
      </MotionButton>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

// Enhanced Card with hover animations and accessibility
interface AccessibleCardProps {
  children: React.ReactNode
  variant?: 'elevated' | 'outline' | 'filled' | 'gradient'
  isInteractive?: boolean
  onClick?: () => void
  ariaLabel?: string
  role?: string
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  children,
  variant = 'elevated',
  isInteractive = false,
  onClick,
  ariaLabel,
  role,
  ...props
}) => {
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  
  const cardProps = {
    bg: cardBg,
    borderColor,
    borderRadius: '2xl',
    p: 6,
    cursor: isInteractive ? 'pointer' : 'default',
    role: role || (isInteractive ? 'button' : undefined),
    tabIndex: isInteractive ? 0 : undefined,
    'aria-label': ariaLabel,
    onClick,
    onKeyDown: isInteractive ? (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && onClick) {
        e.preventDefault()
        onClick()
      }
    } : undefined,
    ...props
  }

  const animationProps = isInteractive ? {
    whileHover: { 
      y: -4, 
      boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.15)' 
    },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2 }
  } : {}

  return (
    <MotionBox
      {...cardProps}
      {...animationProps}
    >
      {children}
    </MotionBox>
  )
}

// Status indicator with animations
interface StatusIndicatorProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'loading'
  message: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  showIcon = true,
  size = 'md'
}) => {
  const statusConfig = {
    success: {
      color: 'success.500',
      icon: FiCheck,
      bgColor: useColorModeValue('success.50', 'success.900'),
    },
    error: {
      color: 'error.500',
      icon: FiX,
      bgColor: useColorModeValue('error.50', 'error.900'),
    },
    warning: {
      color: 'warning.500',
      icon: FiAlertCircle,
      bgColor: useColorModeValue('warning.50', 'warning.900'),
    },
    info: {
      color: 'primary.500',
      icon: FiInfo,
      bgColor: useColorModeValue('primary.50', 'primary.900'),
    },
    loading: {
      color: 'gray.500',
      icon: null,
      bgColor: useColorModeValue('gray.50', 'gray.800'),
    }
  }

  const config = statusConfig[status]
  const IconComponent = config.icon

  const sizeProps = {
    sm: { p: 2, fontSize: 'sm' },
    md: { p: 3, fontSize: 'md' },
    lg: { p: 4, fontSize: 'lg' }
  }

  return (
    <AnimatePresence>
      <MotionBox
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        bg={config.bgColor}
        color={config.color}
        borderRadius="lg"
        border="1px solid"
        borderColor={config.color}
        {...sizeProps[size]}
        role="status"
        aria-live="polite"
      >
        <HStack spacing={2}>
          {showIcon && (
            <>
              {status === 'loading' ? (
                <Spinner size="sm" color={config.color} />
              ) : IconComponent ? (
                <Icon as={IconComponent} />
              ) : null}
            </>
          )}
          <Text fontWeight="medium">{message}</Text>
        </HStack>
      </MotionBox>
    </AnimatePresence>
  )
}

// Price change indicator with animation
interface PriceChangeProps {
  value: number
  percentage: number
  showAnimation?: boolean
}

export const PriceChange: React.FC<PriceChangeProps> = ({
  value,
  percentage,
  showAnimation = true
}) => {
  const isPositive = value >= 0
  const color = isPositive ? 'success.500' : 'error.500'
  const bgColor = useColorModeValue(
    isPositive ? 'success.50' : 'error.50',
    isPositive ? 'success.900' : 'error.900'
  )

  const animationProps = showAnimation ? {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.1, 1],
      color: isPositive ? '#10b981' : '#ef4444'
    },
    transition: { duration: 0.5 }
  } : {}

  return (
    <MotionBox
      {...animationProps}
      bg={bgColor}
      color={color}
      px={2}
      py={1}
      borderRadius="md"
      fontSize="sm"
      fontWeight="bold"
      role="status"
      aria-label={`Price ${isPositive ? 'increased' : 'decreased'} by ${Math.abs(percentage)}%`}
    >
      {isPositive ? '+' : ''}{percentage.toFixed(2)}%
    </MotionBox>
  )
}

// Loading skeleton with shimmer effect
interface LoadingSkeletonProps {
  height?: string | number
  width?: string | number
  borderRadius?: string
  count?: number
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  height = '20px',
  width = '100%',
  borderRadius = 'md',
  count = 1
}) => {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <MotionBox
      key={i}
      height={height}
      width={width}
      borderRadius={borderRadius}
      bg="gray.200"
      _dark={{ bg: 'gray.700' }}
      position="relative"
      overflow="hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: i * 0.1 }}
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        height: '100%',
        width: '100%',
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        animation: 'shimmer 1.5s infinite',
      }}
      sx={{
        '@keyframes shimmer': {
          '0%': { left: '-100%' },
          '100%': { left: '100%' }
        }
      }}
      role="status"
      aria-label="Loading content"
    />
  ))

  return count > 1 ? (
    <VStack spacing={3} align="stretch">
      {skeletons}
    </VStack>
  ) : (
    skeletons[0]
  )
}
