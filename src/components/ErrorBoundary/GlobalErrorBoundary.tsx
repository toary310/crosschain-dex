'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  Code,
  Collapse,
  Container,
  Heading,
  Text,
  VStack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'

const MotionBox = motion(Box)

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      hasError: true,
      error,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    
    // Log error to monitoring service
    this.logError(error, errorInfo)
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Error Data:', errorData)
      console.groupEnd()
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silently fail if error reporting fails
      })
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback 
        error={this.state.error}
        errorInfo={this.state.errorInfo}
        errorId={this.state.errorId}
        onRetry={this.handleRetry}
        onReload={this.handleReload}
      />
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  onRetry: () => void
  onReload: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  onRetry,
  onReload,
}) => {
  const { isOpen, onToggle } = useDisclosure()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('red.200', 'red.600')

  return (
    <Container maxW="2xl" py={10}>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <VStack spacing={6} align="stretch">
          <Box textAlign="center">
            <Heading size="lg" color="red.500" mb={2}>
              Something went wrong
            </Heading>
            <Text color="gray.600">
              We're sorry, but something unexpected happened. Our team has been notified.
            </Text>
          </Box>

          <Alert status="error" borderRadius="md" border="1px solid" borderColor={borderColor}>
            <AlertIcon />
            <Box flex="1">
              <AlertTitle>Error Details</AlertTitle>
              <AlertDescription display="block">
                <Text mb={2}>
                  {error?.message || 'An unexpected error occurred'}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Error ID: <Code>{errorId}</Code>
                </Text>
              </AlertDescription>
            </Box>
          </Alert>

          <VStack spacing={3}>
            <Button colorScheme="blue" onClick={onRetry} size="lg" width="full">
              Try Again
            </Button>
            <Button variant="outline" onClick={onReload} size="md" width="full">
              Reload Page
            </Button>
          </VStack>

          {process.env.NODE_ENV === 'development' && (
            <Box>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                {isOpen ? 'Hide' : 'Show'} Technical Details
              </Button>
              <Collapse in={isOpen} animateOpacity>
                <Box
                  mt={4}
                  p={4}
                  bg={bg}
                  border="1px solid"
                  borderColor={borderColor}
                  borderRadius="md"
                  fontSize="sm"
                  fontFamily="mono"
                  maxH="300px"
                  overflowY="auto"
                >
                  <Text fontWeight="bold" mb={2}>Stack Trace:</Text>
                  <Text whiteSpace="pre-wrap" mb={4}>
                    {error?.stack}
                  </Text>
                  {errorInfo && (
                    <>
                      <Text fontWeight="bold" mb={2}>Component Stack:</Text>
                      <Text whiteSpace="pre-wrap">
                        {errorInfo.componentStack}
                      </Text>
                    </>
                  )}
                </Box>
              </Collapse>
            </Box>
          )}
        </VStack>
      </MotionBox>
    </Container>
  )
}

// Hook for manual error reporting
export const useErrorReporting = () => {
  const reportError = (error: Error, context?: Record<string, any>) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('Manual Error Report:', errorData)
    }

    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Silently fail if error reporting fails
      })
    }
  }

  return { reportError }
}
