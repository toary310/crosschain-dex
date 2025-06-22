'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Box p={8} textAlign="center">
          <VStack spacing={4}>
            <Heading size="lg" color="error.500">
              Something went wrong
            </Heading>
            <Text color="gray.600">
              We apologize for the inconvenience. Please try refreshing the page.
            </Text>
            <Button
              onClick={() => window.location.reload()}
              colorScheme="primary"
            >
              Refresh Page
            </Button>
          </VStack>
        </Box>
      )
    }

    return this.props.children
  }
}
