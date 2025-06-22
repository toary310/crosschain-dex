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
  Button,
  IconButton,
  Card,
  CardBody,
  useColorModeValue,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertDescription,
} from '@chakra-ui/react'
import { FiArrowDown, FiRefreshCw } from 'react-icons/fi'
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { TokenSelector } from './TokenSelector'
import { Token } from '@/config/tokens'

interface SwapFormData {
  fromToken?: Token
  toToken?: Token
  fromAmount: string
  toAmount: string
  slippage: number
}

interface SimpleSwapFormProps {
  chainId: number
}

export const SimpleSwapForm: React.FC<SimpleSwapFormProps> = ({ chainId }) => {
  const [formData, setFormData] = useState<SwapFormData>({
    fromAmount: '',
    toAmount: '',
    slippage: 0.5,
  })
  const [isQuoting, setIsQuoting] = useState(false)
  const [quoteError, setQuoteError] = useState<string | null>(null)

  const { address, isConnected } = useAccount()
  const toast = useToast()
  
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  // Get balance for from token
  const { data: balance } = useBalance({
    address,
    token: formData.fromToken?.address as `0x${string}` | undefined,
  })

  // Mock quote function (replace with actual DEX aggregator API)
  const getQuote = useCallback(async () => {
    if (!formData.fromToken || !formData.toToken || !formData.fromAmount) {
      setFormData(prev => ({ ...prev, toAmount: '' }))
      return
    }

    setIsQuoting(true)
    setQuoteError(null)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock quote calculation (replace with actual API call)
      const mockRate = 1.05 + Math.random() * 0.1
      const toAmount = (parseFloat(formData.fromAmount) * mockRate).toFixed(6)
      
      setFormData(prev => ({ ...prev, toAmount }))
    } catch (error) {
      setQuoteError('Failed to get quote')
      console.error('Quote error:', error)
    } finally {
      setIsQuoting(false)
    }
  }, [formData.fromToken, formData.toToken, formData.fromAmount])

  // Auto-quote when inputs change
  useEffect(() => {
    const debounceTimer = setTimeout(getQuote, 500)
    return () => clearTimeout(debounceTimer)
  }, [getQuote])

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
    if (balance) {
      setFormData(prev => ({ 
        ...prev, 
        fromAmount: formatEther(balance.value) 
      }))
    }
  }, [balance])

  const handleSwap = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to swap tokens',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    if (!formData.fromToken || !formData.toToken || !formData.fromAmount) {
      toast({
        title: 'Invalid swap parameters',
        description: 'Please select tokens and enter an amount',
        status: 'error',
        duration: 3000,
      })
      return
    }

    try {
      // Mock swap execution (replace with actual swap logic)
      toast({
        title: 'Swap initiated',
        description: 'Your swap transaction has been submitted',
        status: 'info',
        duration: 3000,
      })

      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      toast({
        title: 'Swap successful!',
        description: `Swapped ${formData.fromAmount} ${formData.fromToken.symbol} for ${formData.toAmount} ${formData.toToken.symbol}`,
        status: 'success',
        duration: 5000,
      })

      // Reset form
      setFormData({
        fromAmount: '',
        toAmount: '',
        slippage: 0.5,
      })
    } catch (error) {
      toast({
        title: 'Swap failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      })
    }
  }, [formData, isConnected, toast])

  const isSwapDisabled = !formData.fromToken || !formData.toToken || !formData.fromAmount || isQuoting

  return (
    <Card bg={cardBg} border="1px solid" borderColor={borderColor} maxW="500px" mx="auto">
      <CardBody>
        <VStack spacing={6} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <Text fontSize="xl" fontWeight="bold">
              Swap Tokens
            </Text>
            <IconButton
              aria-label="Refresh quotes"
              icon={<FiRefreshCw />}
              size="sm"
              variant="ghost"
              onClick={getQuote}
              isLoading={isQuoting}
            />
          </HStack>

          {/* From Token */}
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium" color="gray.500">From</Text>
              <Text fontSize="sm" color="gray.500">
                Balance: {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '--'}
              </Text>
            </HStack>
            
            <HStack spacing={3}>
              <Box flex={1}>
                <TokenSelector
                  selectedToken={formData.fromToken}
                  onTokenSelect={(token) => setFormData(prev => ({ ...prev, fromToken: token }))}
                  chainId={chainId}
                  excludeToken={formData.toToken}
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
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={handleMaxAmount}
                      disabled={!balance}
                    >
                      MAX
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </Box>
            </HStack>
          </VStack>

          {/* Swap Direction Button */}
          <HStack justify="center">
            <IconButton
              aria-label="Swap tokens"
              icon={<FiArrowDown />}
              size="lg"
              variant="outline"
              borderRadius="full"
              onClick={handleSwapTokens}
              _hover={{
                transform: 'rotate(180deg)',
                borderColor: 'primary.500',
              }}
              transition="all 0.3s ease"
            />
          </HStack>

          {/* To Token */}
          <VStack spacing={3} align="stretch">
            <HStack justify="space-between">
              <Text fontSize="sm" fontWeight="medium" color="gray.500">To</Text>
              <Text fontSize="sm" color="gray.500">
                Estimated
              </Text>
            </HStack>
            
            <HStack spacing={3}>
              <Box flex={1}>
                <TokenSelector
                  selectedToken={formData.toToken}
                  onTokenSelect={(token) => setFormData(prev => ({ ...prev, toToken: token }))}
                  chainId={chainId}
                  excludeToken={formData.fromToken}
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
          {formData.fromToken && formData.toToken && formData.fromAmount && formData.toAmount && (
            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
              <VStack spacing={2}>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.500">Rate</Text>
                  <Text fontSize="sm">
                    1 {formData.fromToken.symbol} = {(parseFloat(formData.toAmount) / parseFloat(formData.fromAmount) || 0).toFixed(6)} {formData.toToken.symbol}
                  </Text>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.500">Slippage Tolerance</Text>
                  <Text fontSize="sm">{formData.slippage}%</Text>
                </HStack>
                
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm" color="gray.500">Network Fee</Text>
                  <Text fontSize="sm">~$2.50</Text>
                </HStack>
              </VStack>
            </Box>
          )}

          {/* Error Display */}
          {quoteError && (
            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              <AlertDescription>{quoteError}</AlertDescription>
            </Alert>
          )}

          {/* Swap Button */}
          <Button
            size="lg"
            colorScheme="primary"
            isDisabled={isSwapDisabled}
            onClick={handleSwap}
            w="full"
          >
            {!isConnected ? 'Connect Wallet' : 
             !formData.fromToken || !formData.toToken ? 'Select Tokens' :
             !formData.fromAmount ? 'Enter Amount' :
             'Swap Tokens'}
          </Button>
        </VStack>
      </CardBody>
    </Card>
  )
}
