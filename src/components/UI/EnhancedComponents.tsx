import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Button,
  Flex,
  Text,
  VStack,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  useColorModeValue,
  useTheme,
  Tooltip,
  Badge,
  Avatar,
  AvatarGroup,
  Progress,
  CircularProgress,
  CircularProgressLabel,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Switch,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiX, FiChevronDown, FiCheck, FiCopy, FiExternalLink } from 'react-icons/fi'
import { useScrollAnimation, useHoverAnimation, useFeedbackAnimation } from '@/hooks/useAnimations'

const MotionBox = motion(Box)
const MotionFlex = motion(Flex)

// Enhanced Search Input with animations
interface EnhancedSearchProps {
  placeholder?: string
  onSearch: (query: string) => void
  suggestions?: string[]
  isLoading?: boolean
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  placeholder = 'Search...',
  onSearch,
  suggestions = [],
  isLoading = false
}) => {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const suggestionBg = useColorModeValue('gray.50', 'gray.700')

  const filteredSuggestions = suggestions.filter(s => 
    s.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5)

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    onSearch(searchQuery)
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0) {
        handleSearch(filteredSuggestions[focusedIndex])
      } else {
        handleSearch(query)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setFocusedIndex(-1)
    }
  }

  return (
    <Box position="relative" w="full">
      <InputGroup>
        <InputLeftElement>
          <FiSearch color="gray.400" />
        </InputLeftElement>
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowSuggestions(true)
            setFocusedIndex(-1)
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          bg={bg}
          borderColor={borderColor}
          _focus={{
            borderColor: 'primary.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-primary-500)',
          }}
        />
        <InputRightElement>
          {isLoading ? (
            <CircularProgress size="20px" isIndeterminate color="primary.500" />
          ) : query ? (
            <IconButton
              aria-label="Clear search"
              icon={<FiX />}
              size="sm"
              variant="ghost"
              onClick={() => {
                setQuery('')
                onSearch('')
                inputRef.current?.focus()
              }}
            />
          ) : null}
        </InputRightElement>
      </InputGroup>

      <AnimatePresence>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <MotionBox
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            position="absolute"
            top="100%"
            left={0}
            right={0}
            bg={bg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="md"
            boxShadow="lg"
            zIndex={10}
            mt={1}
          >
            {filteredSuggestions.map((suggestion, index) => (
              <Box
                key={suggestion}
                px={4}
                py={2}
                cursor="pointer"
                bg={index === focusedIndex ? suggestionBg : 'transparent'}
                _hover={{ bg: suggestionBg }}
                onClick={() => handleSearch(suggestion)}
              >
                <Text fontSize="sm">{suggestion}</Text>
              </Box>
            ))}
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  )
}

// Enhanced Progress Bar with animations
interface EnhancedProgressProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  colorScheme?: string
  size?: 'sm' | 'md' | 'lg'
  isAnimated?: boolean
}

export const EnhancedProgress: React.FC<EnhancedProgressProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  colorScheme = 'primary',
  size = 'md',
  isAnimated = true
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  const percentage = Math.min((value / max) * 100, 100)

  useEffect(() => {
    if (isAnimated) {
      const timer = setTimeout(() => {
        setAnimatedValue(percentage)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setAnimatedValue(percentage)
    }
  }, [percentage, isAnimated])

  const sizeProps = {
    sm: { height: '6px', fontSize: 'xs' },
    md: { height: '8px', fontSize: 'sm' },
    lg: { height: '12px', fontSize: 'md' }
  }

  return (
    <VStack spacing={2} align="stretch">
      {label && (
        <HStack justify="space-between">
          <Text fontSize={sizeProps[size].fontSize} fontWeight="medium">
            {label}
          </Text>
          {showPercentage && (
            <Text fontSize={sizeProps[size].fontSize} color="gray.500">
              {Math.round(animatedValue)}%
            </Text>
          )}
        </HStack>
      )}
      <Box position="relative">
        <Progress
          value={animatedValue}
          colorScheme={colorScheme}
          size={size}
          borderRadius="full"
          bg={useColorModeValue('gray.200', 'gray.700')}
          transition="all 0.3s ease-out"
        />
        {isAnimated && (
          <MotionBox
            position="absolute"
            top={0}
            left={0}
            height="100%"
            bg={`${colorScheme}.500`}
            borderRadius="full"
            initial={{ width: 0 }}
            animate={{ width: `${animatedValue}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        )}
      </Box>
    </VStack>
  )
}

// Enhanced Token Selector with search and animations
interface Token {
  symbol: string
  name: string
  address: string
  logoURI?: string
  balance?: string
}

interface TokenSelectorProps {
  tokens: Token[]
  selectedToken?: Token
  onSelect: (token: Token) => void
  placeholder?: string
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  tokens,
  selectedToken,
  onSelect,
  placeholder = 'Select token'
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [searchQuery, setSearchQuery] = useState('')
  const { variants, hoverProps } = useHoverAnimation()

  const filteredTokens = tokens.filter(token =>
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <MotionBox
        {...hoverProps}
        variants={variants}
        animate={hoverProps.onMouseEnter ? 'hover' : 'rest'}
        onClick={onOpen}
        cursor="pointer"
        p={3}
        border="2px solid"
        borderColor={useColorModeValue('gray.200', 'gray.600')}
        borderRadius="lg"
        bg={useColorModeValue('white', 'gray.800')}
        _hover={{
          borderColor: 'primary.500',
        }}
      >
        <HStack justify="space-between">
          {selectedToken ? (
            <HStack>
              <Avatar size="sm" src={selectedToken.logoURI} name={selectedToken.symbol} />
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold">{selectedToken.symbol}</Text>
                <Text fontSize="xs" color="gray.500">{selectedToken.name}</Text>
              </VStack>
            </HStack>
          ) : (
            <Text color="gray.500">{placeholder}</Text>
          )}
          <FiChevronDown />
        </HStack>
      </MotionBox>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select Token</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4} align="stretch">
              <EnhancedSearch
                placeholder="Search tokens..."
                onSearch={setSearchQuery}
              />
              
              <VStack spacing={2} align="stretch" maxH="300px" overflowY="auto">
                <AnimatePresence>
                  {filteredTokens.map((token, index) => (
                    <MotionBox
                      key={token.address}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      p={3}
                      borderRadius="lg"
                      cursor="pointer"
                      _hover={{
                        bg: useColorModeValue('gray.50', 'gray.700')
                      }}
                      onClick={() => {
                        onSelect(token)
                        onClose()
                      }}
                    >
                      <HStack justify="space-between">
                        <HStack>
                          <Avatar size="sm" src={token.logoURI} name={token.symbol} />
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold">{token.symbol}</Text>
                            <Text fontSize="xs" color="gray.500">{token.name}</Text>
                          </VStack>
                        </HStack>
                        {token.balance && (
                          <Text fontSize="sm" color="gray.500">
                            {parseFloat(token.balance).toFixed(4)}
                          </Text>
                        )}
                      </HStack>
                    </MotionBox>
                  ))}
                </AnimatePresence>
              </VStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

// Copy to clipboard button with feedback
interface CopyButtonProps {
  text: string
  label?: string
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, label = 'Copy' }) => {
  const { feedbackState, triggerSuccess, variants } = useFeedbackAnimation()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      triggerSuccess()
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <Tooltip label={feedbackState === 'success' ? 'Copied!' : label}>
      <MotionBox
        as={IconButton}
        aria-label={label}
        icon={feedbackState === 'success' ? <FiCheck /> : <FiCopy />}
        size="sm"
        variant="ghost"
        onClick={handleCopy}
        variants={variants}
        animate={feedbackState}
      />
    </Tooltip>
  )
}
