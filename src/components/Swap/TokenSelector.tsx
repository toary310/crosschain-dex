'use client'

import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Avatar,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  InputGroup,
  InputLeftElement,
  useColorModeValue,
  Skeleton,
  Divider,
} from '@chakra-ui/react'
import { useState, useEffect, useMemo } from 'react'
import { Token } from '@/config/tokens'
import { tokenRegistry } from '@/services/tokenRegistry'
import { priceService } from '@/services/priceService'

interface TokenSelectorProps {
  selectedToken?: Token
  onTokenSelect: (token: Token) => void
  chainId: number
  excludeToken?: Token
  label?: string
  showBalance?: boolean
  userAddress?: string
}

interface TokenWithPrice extends Token {
  price?: number
  balance?: string
  change24h?: number
}

export function TokenSelector({
  selectedToken,
  onTokenSelect,
  chainId,
  excludeToken,
  label = 'Select Token',
  showBalance = false,
  userAddress,
}: TokenSelectorProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [searchQuery, setSearchQuery] = useState('')
  const [tokens, setTokens] = useState<TokenWithPrice[]>([])
  const [loading, setLoading] = useState(false)
  const [popularTokens, setPopularTokens] = useState<TokenWithPrice[]>([])

  const cardBg = useColorModeValue('white', 'gray.800')
  const hoverBg = useColorModeValue('gray.50', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  // Load tokens for the chain
  useEffect(() => {
    const loadTokens = async () => {
      setLoading(true)
      try {
        const chainTokens = tokenRegistry.getTokensForChain(chainId)
        const tokensWithPrices = await Promise.all(
          chainTokens.map(async (token) => {
            try {
              const price = await priceService.getPrice(token)
              return {
                ...token,
                price: price?.priceUsd,
                change24h: price?.change24h,
              }
            } catch {
              return token
            }
          })
        )
        
        setTokens(tokensWithPrices)
        
        // Set popular tokens (verified and with good liquidity)
        const popular = tokensWithPrices
          .filter(token => token.verified && token.tags?.includes('stablecoin') || token.isNative)
          .slice(0, 6)
        setPopularTokens(popular)
      } catch (error) {
        console.error('Failed to load tokens:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      loadTokens()
    }
  }, [chainId, isOpen])

  // Filter tokens based on search query
  const filteredTokens = useMemo(() => {
    if (!searchQuery.trim()) {
      return tokens
    }

    const results = tokenRegistry.searchTokens(searchQuery, chainId, 20)
    return results.map(result => {
      const existing = tokens.find(t => t.address === result.token.address)
      return existing || result.token
    })
  }, [searchQuery, tokens, chainId])

  // Exclude selected token from other selector
  const availableTokens = useMemo(() => {
    return filteredTokens.filter(token => 
      !excludeToken || token.address !== excludeToken.address
    )
  }, [filteredTokens, excludeToken])

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token)
    onClose()
    setSearchQuery('')
  }

  const formatPrice = (price?: number) => {
    if (!price) return null
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toFixed(2)}`
  }

  const formatChange = (change?: number) => {
    if (!change) return null
    const color = change >= 0 ? 'green.500' : 'red.500'
    const sign = change >= 0 ? '+' : ''
    return (
      <Text color={color} fontSize="sm">
        {sign}{change.toFixed(2)}%
      </Text>
    )
  }

  return (
    <>
      <Button
        onClick={onOpen}
        variant="outline"
        justifyContent="space-between"
        h="auto"
        p={3}
        borderColor={borderColor}
        _hover={{ bg: hoverBg }}
      >
        {selectedToken ? (
          <HStack spacing={3}>
            <Avatar size="sm" name={selectedToken.symbol} src={selectedToken.logoURI} />
            <VStack align="start" spacing={0}>
              <Text fontWeight="semibold">{selectedToken.symbol}</Text>
              <Text fontSize="xs" color="gray.500">{selectedToken.name}</Text>
            </VStack>
          </HStack>
        ) : (
          <Text color="gray.500">{label}</Text>
        )}
        <Text fontSize="sm">▼</Text>
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader>Select Token</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              {/* Search Input */}
              <InputGroup>
                <InputLeftElement>
                  <Text>🔍</Text>
                </InputLeftElement>
                <Input
                  placeholder="Search by name, symbol, or address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>

              {/* Popular Tokens */}
              {!searchQuery && popularTokens.length > 0 && (
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.500">
                    Popular Tokens
                  </Text>
                  <VStack spacing={1} align="stretch">
                    {popularTokens.map((token) => (
                      <Button
                        key={token.address}
                        variant="ghost"
                        justifyContent="space-between"
                        h="auto"
                        p={3}
                        onClick={() => handleTokenSelect(token)}
                        _hover={{ bg: hoverBg }}
                      >
                        <HStack spacing={3}>
                          <Avatar size="sm" name={token.symbol} src={token.logoURI} />
                          <VStack align="start" spacing={0}>
                            <HStack>
                              <Text fontWeight="semibold">{token.symbol}</Text>
                              {token.verified && (
                                <Badge colorScheme="green" size="sm">✓</Badge>
                              )}
                            </HStack>
                            <Text fontSize="xs" color="gray.500">{token.name}</Text>
                          </VStack>
                        </HStack>
                        <VStack align="end" spacing={0}>
                          {token.price && (
                            <Text fontSize="sm">{formatPrice(token.price)}</Text>
                          )}
                          {formatChange(token.change24h)}
                        </VStack>
                      </Button>
                    ))}
                  </VStack>
                  <Divider my={4} />
                </Box>
              )}

              {/* Token List */}
              <Box>
                {searchQuery && (
                  <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.500">
                    Search Results
                  </Text>
                )}
                
                {loading ? (
                  <VStack spacing={2}>
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} height="60px" borderRadius="md" />
                    ))}
                  </VStack>
                ) : availableTokens.length === 0 ? (
                  <Alert status="info">
                    <AlertIcon />
                    {searchQuery ? 'No tokens found matching your search.' : 'No tokens available.'}
                  </Alert>
                ) : (
                  <VStack spacing={1} align="stretch" maxH="300px" overflowY="auto">
                    {availableTokens.map((token) => (
                      <Button
                        key={token.address}
                        variant="ghost"
                        justifyContent="space-between"
                        h="auto"
                        p={3}
                        onClick={() => handleTokenSelect(token)}
                        _hover={{ bg: hoverBg }}
                      >
                        <HStack spacing={3}>
                          <Avatar size="sm" name={token.symbol} src={token.logoURI} />
                          <VStack align="start" spacing={0}>
                            <HStack>
                              <Text fontWeight="semibold">{token.symbol}</Text>
                              {token.verified && (
                                <Badge colorScheme="green" size="sm">✓</Badge>
                              )}
                              {token.riskLevel === 'high' && (
                                <Badge colorScheme="red" size="sm">⚠️</Badge>
                              )}
                            </HStack>
                            <Text fontSize="xs" color="gray.500" noOfLines={1}>
                              {token.name}
                            </Text>
                          </VStack>
                        </HStack>
                        <VStack align="end" spacing={0}>
                          {token.price && (
                            <Text fontSize="sm">{formatPrice(token.price)}</Text>
                          )}
                          {formatChange(token.change24h)}
                          {showBalance && token.balance && (
                            <Text fontSize="xs" color="gray.500">
                              Balance: {token.balance}
                            </Text>
                          )}
                        </VStack>
                      </Button>
                    ))}
                  </VStack>
                )}
              </Box>

              {/* Add Custom Token */}
              {searchQuery && searchQuery.startsWith('0x') && searchQuery.length === 42 && (
                <Box>
                  <Divider mb={4} />
                  <Alert status="warning">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                      <Text fontSize="sm">Custom Token Detected</Text>
                      <Text fontSize="xs">
                        Make sure you trust this token before adding it.
                      </Text>
                    </VStack>
                  </Alert>
                </Box>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}
