'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import {
  Box,
  VStack,
  Text,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Collapse,
  useDisclosure,
} from '@chakra-ui/react'
import { envConfig, isDevelopment } from '@/config/env'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    })

    // Log error to console in development
    if (isDevelopment) {
      console.group('🚨 Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.groupEnd()
    }

    // Send error to monitoring service
    this.reportError(error, errorInfo)

    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // Send to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        (window as any).Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack,
            },
          },
        })
      }

      // Send to custom error endpoint
      if (envConfig.NEXT_PUBLIC_ERROR_ENDPOINT) {
        await fetch(envConfig.NEXT_PUBLIC_ERROR_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'react_error_boundary',
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            errorInfo: {
              componentStack: errorInfo.componentStack,
            },
            timestamp: Date.now(),
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          }),
        })
      }
    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return <ErrorFallback 
        error={this.state.error} 
        errorInfo={this.state.errorInfo}
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
  onRetry: () => void
  onReload: () => void
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onReload,
}) => {
  const { isOpen, onToggle } = useDisclosure()

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={8}
      bg="gray.50"
      _dark={{ bg: 'gray.900' }}
    >
      <Box maxW="600px" w="full">
        <VStack spacing={6} align="stretch">
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            <Box>
              <AlertTitle>Something went wrong!</AlertTitle>
              <AlertDescription>
                An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
              </AlertDescription>
            </Box>
          </Alert>

          <VStack spacing={4}>
            <Button colorScheme="blue" onClick={onRetry}>
              Try Again
            </Button>
            <Button variant="outline" onClick={onReload}>
              Reload Page
            </Button>
          </VStack>

          {isDevelopment && error && (
            <Box>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                {isOpen ? 'Hide' : 'Show'} Error Details
              </Button>
              
              <Collapse in={isOpen} animateOpacity>
                <VStack spacing={4} align="stretch" mt={4}>
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={2}>
                      Error Message:
                    </Text>
                    <Code p={3} borderRadius="md" display="block" whiteSpace="pre-wrap">
                      {error.message}
                    </Code>
                  </Box>

                  {error.stack && (
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" mb={2}>
                        Stack Trace:
                      </Text>
                      <Code 
                        p={3} 
                        borderRadius="md" 
                        display="block" 
                        whiteSpace="pre-wrap"
                        fontSize="xs"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {error.stack}
                      </Code>
                    </Box>
                  )}

                  {errorInfo?.componentStack && (
                    <Box>
                      <Text fontSize="sm" fontWeight="bold" mb={2}>
                        Component Stack:
                      </Text>
                      <Code 
                        p={3} 
                        borderRadius="md" 
                        display="block" 
                        whiteSpace="pre-wrap"
                        fontSize="xs"
                        maxH="200px"
                        overflowY="auto"
                      >
                        {errorInfo.componentStack}
                      </Code>
                    </Box>
                  )}
                </VStack>
              </Collapse>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  )
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook for error reporting
export const useErrorHandler = () => {
  const reportError = React.useCallback((error: Error, context?: Record<string, any>) => {
    console.error('Error reported:', error, context)

    // Send to monitoring service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        extra: context,
      })
    }

    // Send to custom error endpoint
    if (envConfig.NEXT_PUBLIC_ERROR_ENDPOINT) {
      fetch(envConfig.NEXT_PUBLIC_ERROR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'manual_error_report',
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          context,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch((reportingError) => {
        console.warn('Failed to report error:', reportingError)
      })
    }
  }, [])

  return { reportError }
}
