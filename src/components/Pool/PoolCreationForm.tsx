'use client'

import { TokenSelector } from '@/components/Swap/TokenSelector'
import { Token } from '@/config/tokens'
import { poolManager } from '@/services/pool/poolManager'
import { FeeTier, PoolCreationRequest, PoolType } from '@/services/pool/types'
import {
    Box,
    Button,
    Divider,
    FormControl,
    FormErrorMessage,
    FormLabel,
    HStack,
    Input,
    NumberDecrementStepper,
    NumberIncrementStepper,
    NumberInput,
    NumberInputField,
    NumberInputStepper,
    Select,
    Switch,
    Text,
    useColorModeValue,
    useToast,
    VStack
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

interface PoolCreationFormProps {
  onPoolCreated?: (poolId: string) => void
  onCancel?: () => void
}

interface FormData {
  type: PoolType
  tokens: Token[]
  weights: number[]
  feeTier: FeeTier
  initialAmounts: string[]
  amplificationParameter?: number
  tickSpacing?: number
  name: string
  description: string
  featured: boolean
}

const POOL_TYPES: { value: PoolType; label: string; description: string }[] = [
  {
    value: 'constant_product',
    label: 'Constant Product (50/50)',
    description: 'Standard AMM pool with equal token weights',
  },
  {
    value: 'weighted',
    label: 'Weighted Pool',
    description: 'Custom token weights (e.g., 80/20)',
  },
  {
    value: 'stable',
    label: 'Stable Pool',
    description: 'Low slippage for similar-priced assets',
  },
  {
    value: 'concentrated',
    label: 'Concentrated Liquidity',
    description: 'Capital efficient with price ranges',
  },
]

const FEE_TIERS: { value: FeeTier; label: string; description: string }[] = [
  { value: 100, label: '0.01%', description: 'Best for very stable pairs' },
  { value: 500, label: '0.05%', description: 'Best for stable pairs' },
  { value: 3000, label: '0.30%', description: 'Best for most pairs' },
  { value: 10000, label: '1.00%', description: 'Best for exotic pairs' },
]

export function PoolCreationForm({ onPoolCreated, onCancel }: PoolCreationFormProps) {
  const { address, isConnected } = useAccount()
  const toast = useToast()
  const cardBg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  const [formData, setFormData] = useState<FormData>({
    type: 'constant_product',
    tokens: [],
    weights: [50, 50],
    feeTier: 3000,
    initialAmounts: ['', ''],
    name: '',
    description: '',
    featured: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  // Update form when pool type changes
  useEffect(() => {
    if (formData.type === 'constant_product') {
      setFormData(prev => ({
        ...prev,
        weights: [50, 50],
        tokens: prev.tokens.slice(0, 2),
        initialAmounts: prev.initialAmounts.slice(0, 2),
      }))
    } else if (formData.type === 'stable') {
      setFormData(prev => ({
        ...prev,
        amplificationParameter: 100,
      }))
    } else if (formData.type === 'concentrated') {
      setFormData(prev => ({
        ...prev,
        tickSpacing: 60,
      }))
    }
  }, [formData.type])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Validate tokens
    if (formData.tokens.length < 2) {
      newErrors.tokens = 'At least 2 tokens are required'
    }

    if (formData.tokens.length > 8) {
      newErrors.tokens = 'Maximum 8 tokens allowed'
    }

    // Check for duplicate tokens
    const tokenAddresses = formData.tokens.map(t => t.address.toLowerCase())
    const uniqueAddresses = new Set(tokenAddresses)
    if (uniqueAddresses.size !== tokenAddresses.length) {
      newErrors.tokens = 'Duplicate tokens are not allowed'
    }

    // Validate weights
    if (formData.type === 'weighted') {
      const totalWeight = formData.weights.reduce((sum, weight) => sum + weight, 0)
      if (Math.abs(totalWeight - 100) > 0.1) {
        newErrors.weights = 'Weights must sum to 100%'
      }
    }

    // Validate initial amounts
    formData.initialAmounts.forEach((amount, index) => {
      if (!amount || parseFloat(amount) <= 0) {
        newErrors[`amount${index}`] = 'Amount must be greater than 0'
      }
    })

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Pool name is required'
    }

    // Validate amplification parameter for stable pools
    if (formData.type === 'stable' && (!formData.amplificationParameter || formData.amplificationParameter < 1)) {
      newErrors.amplificationParameter = 'Amplification parameter must be at least 1'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTokenSelect = (index: number, token: Token) => {
    const newTokens = [...formData.tokens]
    newTokens[index] = token

    // Ensure all tokens have the same chain ID
    if (newTokens.length > 1) {
      const chainId = newTokens[0].chainId
      if (newTokens.some(t => t && t.chainId !== chainId)) {
        toast({
          title: 'Invalid Token',
          description: 'All tokens must be on the same chain',
          status: 'error',
          duration: 3000,
        })
        return
      }
    }

    setFormData(prev => ({
      ...prev,
      tokens: newTokens,
    }))
  }

  const handleWeightChange = (index: number, value: number) => {
    const newWeights = [...formData.weights]
    newWeights[index] = value

    setFormData(prev => ({
      ...prev,
      weights: newWeights,
    }))
  }

  const handleAmountChange = (index: number, value: string) => {
    const newAmounts = [...formData.initialAmounts]
    newAmounts[index] = value

    setFormData(prev => ({
      ...prev,
      initialAmounts: newAmounts,
    }))
  }

  const addToken = () => {
    if (formData.tokens.length >= 8) return

    setFormData(prev => ({
      ...prev,
      tokens: [...prev.tokens, {} as Token],
      weights: [...prev.weights, 0],
      initialAmounts: [...prev.initialAmounts, ''],
    }))
  }

  const removeToken = (index: number) => {
    if (formData.tokens.length <= 2) return

    setFormData(prev => ({
      ...prev,
      tokens: prev.tokens.filter((_, i) => i !== index),
      weights: prev.weights.filter((_, i) => i !== index),
      initialAmounts: prev.initialAmounts.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to create a pool',
        status: 'error',
        duration: 3000,
      })
      return
    }

    if (!validateForm()) {
      toast({
        title: 'Form Validation Failed',
        description: 'Please fix the errors and try again',
        status: 'error',
        duration: 3000,
      })
      return
    }

    setIsLoading(true)

    try {
      const request: PoolCreationRequest = {
        type: formData.type,
        tokens: formData.tokens,
        weights: formData.type === 'weighted' ? formData.weights.map(w => w / 100) : undefined,
        feeTier: formData.feeTier,
        initialAmounts: formData.initialAmounts,
        amplificationParameter: formData.amplificationParameter,
        tickSpacing: formData.tickSpacing,
        metadata: {
          name: formData.name,
          description: formData.description,
          tags: [formData.type],
          verified: false,
          featured: formData.featured,
          riskLevel: 'medium',
          category: formData.type === 'stable' ? 'stable' : 'volatile',
        },
      }

      const result = await poolManager.createPool(request)

      toast({
        title: 'Pool Created Successfully',
        description: `Pool ID: ${result.poolId}`,
        status: 'success',
        duration: 5000,
      })

      if (onPoolCreated) {
        onPoolCreated(result.poolId)
      }
    } catch (error) {
      toast({
        title: 'Pool Creation Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      p={6}
      bg={cardBg}
      borderRadius="lg"
      border="1px"
      borderColor={borderColor}
      maxW="600px"
      mx="auto"
    >
      <VStack spacing={6} align="stretch">
        <Text fontSize="2xl" fontWeight="bold" textAlign="center">
          Create Liquidity Pool
        </Text>

        {/* Pool Type Selection */}
        <FormControl isInvalid={!!errors.type}>
          <FormLabel>Pool Type</FormLabel>
          <Select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as PoolType }))}
          >
            {POOL_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
          <Text fontSize="sm" color="gray.500" mt={1}>
            {POOL_TYPES.find(t => t.value === formData.type)?.description}
          </Text>
          <FormErrorMessage>{errors.type}</FormErrorMessage>
        </FormControl>

        {/* Token Selection */}
        <FormControl isInvalid={!!errors.tokens}>
          <FormLabel>Tokens</FormLabel>
          <VStack spacing={3} align="stretch">
            {formData.tokens.map((token, index) => (
              <HStack key={index} spacing={3}>
                <Box flex={1}>
                  <TokenSelector
                    selectedToken={token}
                    onTokenSelect={(selectedToken) => handleTokenSelect(index, selectedToken)}
                    chainId={formData.tokens[0]?.chainId || 1}
                    excludeToken={formData.tokens.find((_, i) => i !== index)}
                    label={`Token ${index + 1}`}
                  />
                </Box>

                {formData.type === 'weighted' && (
                  <Box w="100px">
                    <NumberInput
                      value={formData.weights[index]}
                      onChange={(_, value) => handleWeightChange(index, value)}
                      min={1}
                      max={99}
                    >
                      <NumberInputField placeholder="Weight %" />
                    </NumberInput>
                  </Box>
                )}

                <Box w="150px">
                  <Input
                    placeholder="Amount"
                    value={formData.initialAmounts[index]}
                    onChange={(e) => handleAmountChange(index, e.target.value)}
                    isInvalid={!!errors[`amount${index}`]}
                  />
                </Box>

                {formData.tokens.length > 2 && (
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="ghost"
                    onClick={() => removeToken(index)}
                  >
                    ✕
                  </Button>
                )}
              </HStack>
            ))}

            {formData.tokens.length < 8 && formData.type === 'weighted' && (
              <Button variant="outline" onClick={addToken}>
                Add Token
              </Button>
            )}
          </VStack>
          <FormErrorMessage>{errors.tokens}</FormErrorMessage>
        </FormControl>

        {/* Fee Tier */}
        <FormControl>
          <FormLabel>Fee Tier</FormLabel>
          <Select
            value={formData.feeTier}
            onChange={(e) => setFormData(prev => ({ ...prev, feeTier: parseInt(e.target.value) as FeeTier }))}
          >
            {FEE_TIERS.map(tier => (
              <option key={tier.value} value={tier.value}>
                {tier.label} - {tier.description}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* Amplification Parameter (Stable Pools) */}
        {formData.type === 'stable' && (
          <FormControl isInvalid={!!errors.amplificationParameter}>
            <FormLabel>Amplification Parameter</FormLabel>
            <NumberInput
              value={formData.amplificationParameter}
              onChange={(_, value) => setFormData(prev => ({ ...prev, amplificationParameter: value }))}
              min={1}
              max={5000}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
            <Text fontSize="sm" color="gray.500">
              Higher values reduce slippage for similar-priced assets
            </Text>
            <FormErrorMessage>{errors.amplificationParameter}</FormErrorMessage>
          </FormControl>
        )}

        {/* Pool Metadata */}
        <Divider />

        <FormControl isInvalid={!!errors.name}>
          <FormLabel>Pool Name</FormLabel>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., USDC/ETH 0.3%"
          />
          <FormErrorMessage>{errors.name}</FormErrorMessage>
        </FormControl>

        <FormControl>
          <FormLabel>Description (Optional)</FormLabel>
          <Input
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the pool"
          />
        </FormControl>

        <FormControl>
          <HStack justify="space-between">
            <FormLabel mb={0}>Featured Pool</FormLabel>
            <Switch
              isChecked={formData.featured}
              onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
            />
          </HStack>
          <Text fontSize="sm" color="gray.500">
            Featured pools appear prominently in the interface
          </Text>
        </FormControl>



        {/* Action Buttons */}
        <HStack spacing={4}>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} flex={1}>
              Cancel
            </Button>
          )}
          <Button
            colorScheme="blue"
            onClick={handleSubmit}
            isLoading={isLoading}
            loadingText="Creating Pool..."
            flex={1}
            isDisabled={!isConnected}
          >
            {isConnected ? 'Create Pool' : 'Connect Wallet'}
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
