'use client'

import {
  Box,
  VStack,
  HStack,
  Text,
  Progress,
  Badge,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Alert,
  AlertIcon,
  Link,
  Spinner,
  useColorModeValue,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
  useSteps,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Transaction, TransactionStatus } from '@/services/transaction/types'

interface TransactionProgressProps {
  transaction?: Transaction
  isOpen: boolean
  onClose: () => void
  onRetry?: () => void
  onCancel?: () => void
}

const steps = [
  { title: 'Preparing', description: 'Validating transaction' },
  { title: 'Signing', description: 'Waiting for signature' },
  { title: 'Submitting', description: 'Broadcasting to network' },
  { title: 'Confirming', description: 'Waiting for confirmation' },
  { title: 'Complete', description: 'Transaction successful' },
]

export function TransactionProgress({
  transaction,
  isOpen,
  onClose,
  onRetry,
  onCancel,
}: TransactionProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0)
  const cardBg = useColorModeValue('white', 'gray.800')
  const successColor = useColorModeValue('green.500', 'green.300')
  const errorColor = useColorModeValue('red.500', 'red.300')

  // Determine current step based on transaction status
  const getCurrentStep = (status: TransactionStatus) => {
    switch (status) {
      case 'pending': return 0
      case 'submitted': return 2
      case 'confirmed': return 3
      case 'success': return 4
      case 'failed': return -1
      case 'cancelled': return -1
      default: return 0
    }
  }

  const currentStep = transaction ? getCurrentStep(transaction.status) : 0
  const { activeStep, setActiveStep } = useSteps({
    index: currentStep >= 0 ? currentStep : 0,
    count: steps.length,
  })

  // Update active step when transaction status changes
  useEffect(() => {
    if (transaction && currentStep >= 0) {
      setActiveStep(currentStep)
    }
  }, [transaction?.status, currentStep, setActiveStep])

  // Update elapsed time
  useEffect(() => {
    if (!transaction || !isOpen) return

    const updateTime = () => {
      const start = transaction.submittedAt || transaction.createdAt
      setElapsedTime(Date.now() - start)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [transaction, isOpen])

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
  }

  const getStatusColor = (status: TransactionStatus) => {
    switch (status) {
      case 'success': return successColor
      case 'failed': return errorColor
      case 'cancelled': return 'orange.500'
      default: return 'blue.500'
    }
  }

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'success': return '✅'
      case 'failed': return '❌'
      case 'cancelled': return '⚠️'
      case 'pending': return '⏳'
      case 'submitted': return '📡'
      case 'confirmed': return '⏰'
      default: return '⏳'
    }
  }

  const getExplorerUrl = (hash: string, chainId: number) => {
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      137: 'https://polygonscan.com/tx/',
      42161: 'https://arbiscan.io/tx/',
      10: 'https://optimistic.etherscan.io/tx/',
      43114: 'https://snowtrace.io/tx/',
    }
    
    return explorers[chainId] ? `${explorers[chainId]}${hash}` : '#'
  }

  if (!transaction) {
    return null
  }

  const isCompleted = transaction.status === 'success'
  const isFailed = transaction.status === 'failed' || transaction.status === 'cancelled'
  const isInProgress = !isCompleted && !isFailed

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent bg={cardBg}>
        <ModalHeader>
          <HStack>
            <Text>{getStatusIcon(transaction.status)}</Text>
            <Text>Transaction {transaction.status === 'success' ? 'Complete' : 'Progress'}</Text>
          </HStack>
        </ModalHeader>
        {isCompleted && <ModalCloseButton />}
        
        <ModalBody pb={6}>
          <VStack spacing={6} align="stretch">
            {/* Transaction Info */}
            <Box p={4} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="md">
              <VStack spacing={2} align="stretch">
                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Type</Text>
                  <Badge colorScheme="blue">{transaction.type.toUpperCase()}</Badge>
                </HStack>
                
                {transaction.fromToken && transaction.toToken && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.500">Swap</Text>
                    <Text fontSize="sm">
                      {transaction.fromAmount} {transaction.fromToken.symbol} → {transaction.toAmount} {transaction.toToken.symbol}
                    </Text>
                  </HStack>
                )}

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Status</Text>
                  <Badge colorScheme={transaction.status === 'success' ? 'green' : transaction.status === 'failed' ? 'red' : 'blue'}>
                    {transaction.status.toUpperCase()}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Elapsed Time</Text>
                  <Text fontSize="sm">{formatTime(elapsedTime)}</Text>
                </HStack>

                {transaction.hash && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.500">Transaction</Text>
                    <Link
                      href={getExplorerUrl(transaction.hash, transaction.chainId)}
                      isExternal
                      fontSize="sm"
                      color="blue.500"
                    >
                      View on Explorer ↗
                    </Link>
                  </HStack>
                )}
              </VStack>
            </Box>

            {/* Progress Steps */}
            {!isFailed && (
              <Box>
                <Stepper index={activeStep} orientation="vertical" height="200px" gap="0">
                  {steps.map((step, index) => (
                    <Step key={index}>
                      <StepIndicator>
                        <StepStatus
                          complete={<StepIcon />}
                          incomplete={<StepNumber />}
                          active={isInProgress && index === activeStep ? <Spinner size="sm" /> : <StepNumber />}
                        />
                      </StepIndicator>

                      <Box flexShrink="0">
                        <StepTitle>{step.title}</StepTitle>
                        <StepDescription>{step.description}</StepDescription>
                      </Box>

                      <StepSeparator />
                    </Step>
                  ))}
                </Stepper>
              </Box>
            )}

            {/* Error Display */}
            {transaction.error && (
              <Alert status="error">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">Transaction Failed</Text>
                  <Text fontSize="sm">{transaction.error.message}</Text>
                  {transaction.error.suggestedAction && (
                    <Text fontSize="sm" color="gray.600">
                      Suggestion: {transaction.error.suggestedAction}
                    </Text>
                  )}
                </VStack>
              </Alert>
            )}

            {/* Success Message */}
            {isCompleted && (
              <Alert status="success">
                <AlertIcon />
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold">Transaction Successful!</Text>
                  <Text fontSize="sm">
                    Your {transaction.type} has been completed successfully.
                  </Text>
                </VStack>
              </Alert>
            )}

            {/* Progress Bar for Active Transactions */}
            {isInProgress && (
              <Box>
                <HStack justify="space-between" mb={2}>
                  <Text fontSize="sm" color="gray.500">Progress</Text>
                  <Text fontSize="sm">{Math.round((activeStep / (steps.length - 1)) * 100)}%</Text>
                </HStack>
                <Progress 
                  value={(activeStep / (steps.length - 1)) * 100} 
                  colorScheme="blue" 
                  size="sm" 
                  borderRadius="md"
                />
              </Box>
            )}

            {/* Action Buttons */}
            <HStack spacing={3}>
              {isFailed && onRetry && transaction.retryCount < transaction.maxRetries && (
                <Button colorScheme="blue" onClick={onRetry} flex={1}>
                  Retry Transaction
                </Button>
              )}
              
              {isInProgress && onCancel && (
                <Button variant="outline" onClick={onCancel} flex={1}>
                  Cancel
                </Button>
              )}
              
              {isCompleted && (
                <Button colorScheme="green" onClick={onClose} flex={1}>
                  Done
                </Button>
              )}
              
              {isFailed && !onRetry && (
                <Button variant="outline" onClick={onClose} flex={1}>
                  Close
                </Button>
              )}
            </HStack>

            {/* Additional Info */}
            {transaction.gasLimit && (
              <Box fontSize="xs" color="gray.500">
                <Text>Gas Limit: {parseInt(transaction.gasLimit).toLocaleString()}</Text>
                {transaction.gasPrice && (
                  <Text>Gas Price: {(parseInt(transaction.gasPrice) / 1e9).toFixed(2)} Gwei</Text>
                )}
                {transaction.nonce !== undefined && (
                  <Text>Nonce: {transaction.nonce}</Text>
                )}
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
