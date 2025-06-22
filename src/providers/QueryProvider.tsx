'use client'

import React, { useState } from 'react'
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useNotificationStore, useAnalyticsStore } from '@/store/advanced/store'

// Enhanced Query Client configuration
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time - how long data is considered fresh
        staleTime: 5 * 60 * 1000, // 5 minutes
        
        // Cache time - how long data stays in cache after component unmounts
        cacheTime: 10 * 60 * 1000, // 10 minutes
        
        // Retry configuration
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch on window focus
        refetchOnWindowFocus: true,
        
        // Refetch on reconnect
        refetchOnReconnect: true,
        
        // Refetch on mount if data is stale
        refetchOnMount: true,
        
        // Background refetch interval
        refetchInterval: false, // Disabled by default, can be enabled per query
        
        // Network mode
        networkMode: 'online',
      },
      mutations: {
        // Retry mutations on network errors
        retry: (failureCount, error: any) => {
          // Only retry on network errors
          if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
            return failureCount < 2
          }
          return false
        },
        
        // Network mode for mutations
        networkMode: 'online',
      },
    },
    
    // Global query cache configuration
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Global error handling
        console.error('Query error:', error, query)
        
        // Track error analytics
        if (typeof window !== 'undefined') {
          const analyticsStore = useAnalyticsStore.getState()
          analyticsStore.trackError(error instanceof Error ? error : new Error('Query failed'))
          analyticsStore.trackEvent('query_global_error', {
            queryKey: query.queryKey,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
        
        // Show notification for critical errors
        if (error instanceof Error && error.message.includes('network')) {
          const notificationStore = useNotificationStore.getState()
          notificationStore.addNotification({
            type: 'error',
            title: 'Network Error',
            message: 'Please check your internet connection and try again.',
            read: false,
            persistent: false,
          })
        }
      },
      
      onSuccess: (data, query) => {
        // Global success handling
        if (process.env.NODE_ENV === 'development') {
          console.log('Query success:', query.queryKey, data)
        }
        
        // Track successful queries
        if (typeof window !== 'undefined') {
          const analyticsStore = useAnalyticsStore.getState()
          analyticsStore.trackEvent('query_global_success', {
            queryKey: query.queryKey,
            dataSize: JSON.stringify(data).length,
          })
        }
      },
    }),
    
    // Global mutation cache configuration
    mutationCache: new MutationCache({
      onError: (error, variables, context, mutation) => {
        // Global mutation error handling
        console.error('Mutation error:', error, mutation)
        
        // Track error analytics
        if (typeof window !== 'undefined') {
          const analyticsStore = useAnalyticsStore.getState()
          analyticsStore.trackError(error instanceof Error ? error : new Error('Mutation failed'))
          analyticsStore.trackEvent('mutation_global_error', {
            mutationKey: mutation.options.mutationKey,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
        
        // Show error notification
        const notificationStore = useNotificationStore.getState()
        notificationStore.addNotification({
          type: 'error',
          title: 'Operation Failed',
          message: error instanceof Error ? error.message : 'An unexpected error occurred.',
          read: false,
          persistent: false,
        })
      },
      
      onSuccess: (data, variables, context, mutation) => {
        // Global mutation success handling
        if (process.env.NODE_ENV === 'development') {
          console.log('Mutation success:', mutation.options.mutationKey, data)
        }
        
        // Track successful mutations
        if (typeof window !== 'undefined') {
          const analyticsStore = useAnalyticsStore.getState()
          analyticsStore.trackEvent('mutation_global_success', {
            mutationKey: mutation.options.mutationKey,
          })
        }
      },
    }),
  })
}

interface QueryProviderProps {
  children: React.ReactNode
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  // Create query client with stable reference
  const [queryClient] = useState(() => createQueryClient())
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {/* Development tools */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          toggleButtonProps={{
            style: {
              marginLeft: '5px',
              transform: 'scale(0.8)',
              transformOrigin: 'bottom right',
            },
          }}
        />
      )}
    </QueryClientProvider>
  )
}

// Query client utilities
export const queryClientUtils = {
  // Prefetch data
  prefetchQuery: async (queryKey: string[], queryFn: () => Promise<any>) => {
    const queryClient = new QueryClient()
    await queryClient.prefetchQuery({
      queryKey,
      queryFn,
      staleTime: 5 * 60 * 1000,
    })
  },
  
  // Invalidate queries by pattern
  invalidateQueriesByPattern: (pattern: string) => {
    const queryClient = new QueryClient()
    queryClient.invalidateQueries({
      predicate: (query) => {
        return query.queryKey.some(key => 
          typeof key === 'string' && key.includes(pattern)
        )
      },
    })
  },
  
  // Clear all cache
  clearAllCache: () => {
    const queryClient = new QueryClient()
    queryClient.clear()
  },
  
  // Get cache stats
  getCacheStats: () => {
    const queryClient = new QueryClient()
    const cache = queryClient.getQueryCache()
    
    return {
      totalQueries: cache.getAll().length,
      activeQueries: cache.getAll().filter(query => query.getObserversCount() > 0).length,
      staleQueries: cache.getAll().filter(query => query.isStale()).length,
      errorQueries: cache.getAll().filter(query => query.state.status === 'error').length,
    }
  },
}

// Performance monitoring for React Query
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Monitor query performance
  let queryCount = 0
  let mutationCount = 0
  
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    const startTime = Date.now()
    
    try {
      const response = await originalFetch(...args)
      const duration = Date.now() - startTime
      
      if (args[0]?.toString().includes('api')) {
        queryCount++
        console.log(`Query #${queryCount} took ${duration}ms:`, args[0])
      }
      
      return response
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Query failed after ${duration}ms:`, args[0], error)
      throw error
    }
  }
  
  // Log cache statistics periodically
  setInterval(() => {
    const stats = queryClientUtils.getCacheStats()
    console.log('React Query Cache Stats:', stats)
  }, 30000) // Every 30 seconds
}
