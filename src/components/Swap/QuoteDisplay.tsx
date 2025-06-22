'use client'

import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  Progress,
  Tooltip,
  useColorModeValue,
  Collapse,
  Button,
  Divider,
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { Token } from '@/config/tokens'
import { UnifiedQuote } from '@/services/quote/quoteEngine'
import { SecurityValidationResult } from '@/services/security/securityValidator'

interface QuoteDisplayProps {
  quote?: UnifiedQuote
  loading?: boolean
  error?: string
  fromToken?: Token
  toToken?: Token
  fromAmount?: string
  security?: SecurityValidationResult
  onRefresh?: () => void
}

export function QuoteDisplay({
  quote,
  loading = false,
  error,
  fromToken,
  toToken,
  fromAmount,
  security,
  onRefresh,
}: QuoteDisplayProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const successColor = useColorModeValue('green.500', 'green.300')
  const warningColor = useColorModeValue('orange.500', 'orange.300')
  const errorColor = useColorModeValue('red.500', 'red.300')

  // Update countdown timer
  useEffect(() => {
    if (!quote) return

    const updateTimer = () => {
      const remaining = Math.max(0, quote.validUntil - Date.now())
      setTimeLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [quote])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    return `${seconds}s`
  }

  const formatAmount = (amount: string, decimals: number = 6) => {
    const num = parseFloat(amount)
    if (num === 0) return '0'
    if (num < 0.000001) return '<0.000001'
    if (num < 1) return num.toFixed(decimals)
    if (num < 1000) return num.toFixed(4)
    if (num < 1000000) return `${(num / 1000).toFixed(2)}K`
    return `${(num / 1000000).toFixed(2)}M`
  }

  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'low': return successColor
      case 'medium': return warningColor
      case 'high': return errorColor
      case 'critical': return errorColor
      default: return 'gray.500'
    }
  }

  const getSecurityIcon = (level: string) => {
    switch (level) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🟠'
      case 'critical': return '🔴'
      default: return '⚪'
    }
  }

  if (loading) {
    return (
      <Box
        p={4}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        bg={cardBg}
      >
        <VStack spacing={3}>
          <HStack>
            <Spinner size="sm" />
            <Text>Getting best quote...</Text>
          </HStack>
          <Progress size="sm" isIndeterminate w="100%" />
        </VStack>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert status="error" borderRadius="lg">
        <AlertIcon />
        <VStack align="start" spacing={1}>
          <Text fontWeight="semibold">Quote Error</Text>
          <Text fontSize="sm">{error}</Text>
        </VStack>
      </Alert>
    )
  }

  if (!quote || !fromToken || !toToken) {
    return (
      <Box
        p={4}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        bg={cardBg}
        textAlign="center"
      >
        <Text color="gray.500">Enter amount to see quote</Text>
      </Box>
    )
  }

  return (
    <Box
      p={4}
      border="1px"
      borderColor={borderColor}
      borderRadius="lg"
      bg={cardBg}
    >
      <VStack spacing={4} align="stretch">
        {/* Quote Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={1}>
            <Text fontSize="lg" fontWeight="semibold">
              {formatAmount(quote.toAmount)} {toToken.symbol}
            </Text>
            <Text fontSize="sm" color="gray.500">
              ≈ ${(parseFloat(quote.toAmount) * 1).toFixed(2)} {/* Would use real price */}
            </Text>
          </VStack>
          <VStack align="end" spacing={1}>
            <Badge colorScheme={quote.type === 'swap' ? 'blue' : 'purple'}>
              {quote.type.toUpperCase()}
            </Badge>
            {timeLeft > 0 && (
              <Text fontSize="xs" color="gray.500">
                Valid for {formatTime(timeLeft)}
              </Text>
            )}
          </VStack>
        </HStack>

        {/* Security Status */}
        {security && (
          <HStack justify="space-between" p={2} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
            <HStack>
              <Text>{getSecurityIcon(security.overall)}</Text>
              <Text fontSize="sm" fontWeight="semibold">
                Security: {security.overall.toUpperCase()}
              </Text>
            </HStack>
            <Text fontSize="sm" color={getSecurityColor(security.overall)}>
              Score: {security.score}/100
            </Text>
          </HStack>
        )}

        {/* Key Metrics */}
        <VStack spacing={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.500">Price Impact</Text>
            <Text 
              fontSize="sm" 
              color={quote.priceImpact > 5 ? errorColor : quote.priceImpact > 2 ? warningColor : successColor}
              fontWeight="semibold"
            >
              {quote.priceImpact.toFixed(2)}%
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.500">Estimated Time</Text>
            <Text fontSize="sm">
              {quote.estimatedTime < 60 ? `${quote.estimatedTime}s` : `${Math.floor(quote.estimatedTime / 60)}m`}
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.500">Network Fee</Text>
            <Text fontSize="sm">
              {formatAmount(quote.totalGas)} {fromToken.symbol}
            </Text>
          </HStack>

          <HStack justify="space-between">
            <Text fontSize="sm" color="gray.500">Minimum Received</Text>
            <Text fontSize="sm" fontWeight="semibold">
              {formatAmount(quote.toAmountMin)} {toToken.symbol}
            </Text>
          </HStack>
        </VStack>

        {/* Warnings */}
        {quote.warnings.length > 0 && (
          <VStack spacing={2} align="stretch">
            {quote.warnings.map((warning, index) => (
              <Alert key={index} status={warning.severity === 'high' ? 'error' : 'warning'} size="sm">
                <AlertIcon />
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="semibold">
                    {warning.message}
                  </Text>
                  {warning.recommendation && (
                    <Text fontSize="xs">
                      {warning.recommendation}
                    </Text>
                  )}
                </VStack>
              </Alert>
            ))}
          </VStack>
        )}

        {/* Route Details Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          rightIcon={<Text>{showDetails ? '▲' : '▼'}</Text>}
        >
          Route Details
        </Button>

        {/* Route Details */}
        <Collapse in={showDetails}>
          <VStack spacing={3} align="stretch">
            <Divider />
            
            {/* Route Steps */}
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" fontWeight="semibold">Route</Text>
              {quote.route.map((step, index) => (
                <HStack key={index} justify="space-between" p={2} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="semibold">
                      Step {step.step}: {step.action.toUpperCase()}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      via {step.protocol}
                    </Text>
                  </VStack>
                  <VStack align="end" spacing={0}>
                    <Text fontSize="sm">
                      {formatAmount(step.fromAmount)} {step.fromToken.symbol} → {formatAmount(step.toAmount)} {step.toToken.symbol}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Fee: {formatAmount(step.fee)}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </VStack>

            {/* Additional Info */}
            <VStack spacing={2} align="stretch">
              <Text fontSize="sm" fontWeight="semibold">Additional Information</Text>
              
              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Confidence</Text>
                <Text fontSize="sm">{(quote.confidence * 100).toFixed(1)}%</Text>
              </HStack>

              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">MEV Protected</Text>
                <Badge colorScheme={quote.mevProtected ? 'green' : 'red'}>
                  {quote.mevProtected ? 'Yes' : 'No'}
                </Badge>
              </HStack>

              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Gas Optimized</Text>
                <Badge colorScheme={quote.gasOptimized ? 'green' : 'yellow'}>
                  {quote.gasOptimized ? 'Yes' : 'No'}
                </Badge>
              </HStack>

              <HStack justify="space-between">
                <Text fontSize="sm" color="gray.500">Quote ID</Text>
                <Text fontSize="xs" fontFamily="mono" color="gray.500">
                  {quote.id}
                </Text>
              </HStack>
            </VStack>

            {/* Refresh Button */}
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh}>
                Refresh Quote
              </Button>
            )}
          </VStack>
        </Collapse>
      </VStack>
    </Box>
  )
}
