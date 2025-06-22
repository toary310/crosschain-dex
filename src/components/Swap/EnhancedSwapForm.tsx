'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Divider,
  useColorModeValue,
  useToast,
  Tooltip,
  Badge,
  Flex,
  Spinner,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiRefreshCw, FiSettings, FiArrowDown, FiZap } from 'react-icons/fi'
import { Token } from '@/config/tokens'
import { AccessibleButton, AccessibleCard, StatusIndicator, PriceChange } from '@/components/UI/AccessibleComponents'
import { EnhancedSearch, EnhancedProgress } from '@/components/UI/EnhancedComponents'
import { TokenSelector } from './TokenSelector'
import { useScrollAnimation, useHoverAnimation, useFeedbackAnimation } from '@/hooks/useAnimations'

const MotionBox = motion(Box)
const MotionVStack = motion(VStack)

interface SwapFormData {
  fromToken?: Token
  toToken?: Token
  fromAmount: string
  toAmount: string
  slippage: number
  deadline: number
}

interface EnhancedSwapFormProps {
  onSwap: (data: SwapFormData) => Promise<void>
  isLoading?: boolean
  chainId: number
  userAddress?: string
}

export const EnhancedSwapForm: React.FC<EnhancedSwapFormProps> = ({
  onSwap,
  isLoading = false,
  chainId,
  userAddress
}) => {
  const [formData, setFormData] = useState<SwapFormData>({
    fromAmount: '',
    toAmount: '',
    slippage: 0.5,
    deadline: 20
  })
  const [isQuoting, setIsQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [priceImpact, setPriceImpact] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const toast = useToast()
  const { ref, variants, isInView } = useScrollAnimation()
  const { variants: hoverVariants, hoverProps } = useHoverAnimation()
  const { feedbackState, triggerSuccess, triggerError } = useFeedbackAnimation()

  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  // Auto-quote when amounts change
  useEffect(() => {
    const getQuote = async () => {
      if (!formData.fromToken || !formData.toToken || !formData.fromAmount) {
        setFormData(prev => ({ ...prev, toAmount: '' }))
        return
      }

      setIsQuoting(true)
      setQuoteError(null)

      try {
        // Simulate quote API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Mock quote calculation
        const mockRate = 1.05 + Math.random() * 0.1
        const toAmount = (parseFloat(formData.fromAmount) * mockRate).toFixed(6)
        const impact = Math.random() * 2 // 0-2% price impact
        
        setFormData(prev => ({ ...prev, toAmount }))
        setPriceImpact(impact)
      } catch (error) {
        setQuoteError('Failed to get quote')
        console.error('Quote error:', error)
      } finally {
        setIsQuoting(false)
      }
    }

    const debounceTimer = setTimeout(getQuote, 500)
    return () => clearTimeout(debounceTimer)
  }, [formData.fromToken, formData.toToken, formData.fromAmount])

  const handleSwapTokens = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      fromToken: prev.toToken,
      toToken: prev.fromToken,
      fromAmount: prev.toAmount,
      toAmount: prev.fromAmount
    }))
  }, [])

  const handleMaxAmount = useCallback(() => {
    // Mock max balance
    setFormData(prev => ({ ...prev, fromAmount: '1000.0' }))
  }, [])

  const handleSwap = useCallback(async () => {
    if (!formData.fromToken || !formData.toToken || !formData.fromAmount) {
      toast({
        title: 'Invalid swap parameters',
        status: 'error',
        duration: 3000,
      })
      return
    }

    try {
      await onSwap(formData)
      triggerSuccess()
      toast({
        title: 'Swap successful!',
        status: 'success',
        duration: 5000,
      })
    } catch (error) {
      triggerError()
      toast({
        title: 'Swap failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      })
    }
  }, [formData, onSwap, toast, triggerSuccess, triggerError])

  const isSwapDisabled = !formData.fromToken || !formData.toToken || !formData.fromAmount || isLoading || isQuoting

  return (
    <MotionBox
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
    >
      <AccessibleCard variant="elevated" isInteractive={false}>
        <MotionVStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <Text fontSize="xl" fontWeight="bold">
              Swap Tokens
            </Text>
            <HStack spacing={2}>
              <Tooltip label="Refresh quotes">
                <IconButton
                  aria-label="Refresh quotes"
                  icon={<FiRefreshCw />}
                  size="sm"
                  variant="ghost"
                  onClick={() => window.location.reload()}
                />
              </Tooltip>
              <Tooltip label="Settings">
                <IconButton
                  aria-label="Settings"
                  icon={<FiSettings />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSettings(!showSettings)}
                />
              </Tooltip>
            </HStack>
          </HStack>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <MotionBox
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                overflow="hidden"
              >
                <VStack spacing={4} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" fontWeight="medium">Slippage Tolerance</Text>
                    <HStack spacing={2}>
                      {[0.1, 0.5, 1.0].map(value => (
                        <AccessibleButton
                          key={value}
                          size="xs"
                          variant={formData.slippage === value ? 'solid' : 'outline'}
                          onClick={() => setFormData(prev => ({ ...prev, slippage: value }))}
                        >
                          {value}%
                        </AccessibleButton>
                      ))}
                    </HStack>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" fontWeight="medium">Transaction Deadline</Text>
                    <HStack spacing={2}>
                      <Input
                        size="sm"
                        w="80px"
                        value={formData.deadline}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          deadline: parseInt(e.target.value) || 20 
                        }))}
                      />
                      <Text fontSize="sm">minutes</Text>
                    </HStack>
                  </HStack>
                </VStack>
              </MotionBox>
            )}
          </AnimatePresence>

          {/* From Token */}
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium" color="gray.500">From</Text>
              <Text fontSize="sm" color="gray.500">
                Balance: {userAddress ? '1,234.56' : '--'}
              </Text>
            </HStack>
            
            <HStack spacing={3}>
              <Box flex={1}>
                <TokenSelector
                  selectedToken={formData.fromToken}
                  onTokenSelect={(token) => setFormData(prev => ({ ...prev, fromToken: token }))}
                  chainId={chainId}
                  excludeToken={formData.toToken}
                  userAddress={userAddress}
                />
              </Box>
              <Box flex={1}>
                <InputGroup>
                  <Input
                    placeholder="0.0"
                    value={formData.fromAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, fromAmount: e.target.value }))}
                    fontSize="lg"
                    textAlign="right"
                  />
                  <InputRightElement>
                    <AccessibleButton
                      size="xs"
                      variant="ghost"
                      onClick={handleMaxAmount}
                    >
                      MAX
                    </AccessibleButton>
                  </InputRightElement>
                </InputGroup>
              </Box>
            </HStack>
          </VStack>

          {/* Swap Direction Button */}
          <Flex justify="center">
            <MotionBox
              {...hoverProps}
              variants={hoverVariants}
            >
              <IconButton
                aria-label="Swap tokens"
                icon={<FiArrowDown />}
                size="lg"
                variant="outline"
                borderRadius="full"
                onClick={handleSwapTokens}
                bg={cardBg}
                borderColor={borderColor}
                _hover={{
                  transform: 'rotate(180deg)',
                  borderColor: 'primary.500',
                }}
                transition="all 0.3s ease"
              />
            </MotionBox>
          </Flex>

          {/* To Token */}
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium" color="gray.500">To</Text>
              <Text fontSize="sm" color="gray.500">
                Balance: {userAddress ? '567.89' : '--'}
              </Text>
            </HStack>
            
            <HStack spacing={3}>
              <Box flex={1}>
                <TokenSelector
                  selectedToken={formData.toToken}
                  onTokenSelect={(token) => setFormData(prev => ({ ...prev, toToken: token }))}
                  chainId={chainId}
                  excludeToken={formData.fromToken}
                  userAddress={userAddress}
                />
              </Box>
              <Box flex={1}>
                <InputGroup>
                  <Input
                    placeholder="0.0"
                    value={formData.toAmount}
                    isReadOnly
                    fontSize="lg"
                    textAlign="right"
                    bg={useColorModeValue('gray.50', 'gray.700')}
                  />
                  {isQuoting && (
                    <InputRightElement>
                      <Spinner size="sm" />
                    </InputRightElement>
                  )}
                </InputGroup>
              </Box>
            </HStack>
          </VStack>

          {/* Quote Information */}
          {formData.fromToken && formData.toToken && formData.fromAmount && (
            <VStack spacing={2} p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.500">Rate</Text>
                <Text fontSize="sm">
                  1 {formData.fromToken.symbol} = {(parseFloat(formData.toAmount) / parseFloat(formData.fromAmount) || 0).toFixed(6)} {formData.toToken.symbol}
                </Text>
              </HStack>
              
              {priceImpact !== null && (
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.500">Price Impact</Text>
                  <PriceChange value={-priceImpact} percentage={priceImpact} />
                </HStack>
              )}
              
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="gray.500">Network Fee</Text>
                <Text fontSize="sm">~$2.50</Text>
              </HStack>
            </VStack>
          )}

          {/* Error Display */}
          {quoteError && (
            <StatusIndicator status="error" message={quoteError} />
          )}

          {/* Swap Button */}
          <AccessibleButton
            size="lg"
            variant="gradient"
            isLoading={isLoading}
            loadingText="Swapping..."
            disabled={isSwapDisabled}
            onClick={handleSwap}
            leftIcon={<FiZap />}
            animation="bounce"
          >
            {!userAddress ? 'Connect Wallet' : 'Swap Tokens'}
          </AccessibleButton>
        </MotionVStack>
      </AccessibleCard>
    </MotionBox>
  )
}
