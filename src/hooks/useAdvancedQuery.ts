import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { useCacheStore, useNotificationStore, useAnalyticsStore } from '@/store/advanced/store'

// Enhanced query options
export interface AdvancedQueryOptions<TData, TError = Error> extends Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> {
  // Custom options
  optimisticUpdate?: boolean
  backgroundRefetch?: boolean
  retryOnNetworkError?: boolean
  cacheToStore?: boolean
  showErrorNotification?: boolean
  showSuccessNotification?: boolean
  trackAnalytics?: boolean
  
  // Performance options
  debounceMs?: number
  throttleMs?: number
  batchRequests?: boolean
  
  // Cache options
  customCacheKey?: string
  invalidateOnWindowFocus?: boolean
  invalidateOnReconnect?: boolean
}

// Enhanced mutation options
export interface AdvancedMutationOptions<TData, TError = Error, TVariables = void> extends Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> {
  // Custom options
  optimisticUpdate?: (variables: TVariables) => void
  rollbackOnError?: boolean
  showErrorNotification?: boolean
  showSuccessNotification?: boolean
  trackAnalytics?: boolean
  
  // Related queries to invalidate
  invalidateQueries?: string[]
  refetchQueries?: string[]
  
  // Retry options
  retryOnNetworkError?: boolean
  exponentialBackoff?: boolean
}

// Query factory for consistent query creation
export class QueryFactory {
  private static instance: QueryFactory
  private queryClient: ReturnType<typeof useQueryClient> | null = null

  static getInstance(): QueryFactory {
    if (!QueryFactory.instance) {
      QueryFactory.instance = new QueryFactory()
    }
    return QueryFactory.instance
  }

  setQueryClient(client: ReturnType<typeof useQueryClient>) {
    this.queryClient = client
  }

  // Create standardized query keys
  createKey(entity: string, params?: Record<string, any>): string[] {
    const baseKey = [entity]
    if (params) {
      baseKey.push(params)
    }
    return baseKey
  }

  // Create query with automatic error handling and caching
  createQuery<TData, TError = Error>(
    key: string[],
    queryFn: () => Promise<TData>,
    options: AdvancedQueryOptions<TData, TError> = {}
  ) {
    const {
      optimisticUpdate = false,
      backgroundRefetch = true,
      retryOnNetworkError = true,
      cacheToStore = false,
      showErrorNotification = true,
      showSuccessNotification = false,
      trackAnalytics = true,
      debounceMs,
      throttleMs,
      customCacheKey,
      ...queryOptions
    } = options

    return {
      queryKey: customCacheKey ? [customCacheKey] : key,
      queryFn: async () => {
        const startTime = Date.now()
        
        try {
          const result = await queryFn()
          
          if (trackAnalytics) {
            // Track successful query
            const duration = Date.now() - startTime
            // Analytics tracking would be implemented here
          }
          
          if (showSuccessNotification) {
            // Show success notification
          }
          
          return result
        } catch (error) {
          if (trackAnalytics) {
            // Track failed query
            const duration = Date.now() - startTime
            // Analytics tracking would be implemented here
          }
          
          if (showErrorNotification) {
            // Show error notification
          }
          
          throw error
        }
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: options.invalidateOnWindowFocus ?? true,
      refetchOnReconnect: options.invalidateOnReconnect ?? true,
      retry: retryOnNetworkError ? 3 : false,
      ...queryOptions,
    }
  }

  // Create mutation with automatic error handling and optimistic updates
  createMutation<TData, TError = Error, TVariables = void>(
    mutationFn: (variables: TVariables) => Promise<TData>,
    options: AdvancedMutationOptions<TData, TError, TVariables> = {}
  ) {
    const {
      optimisticUpdate,
      rollbackOnError = true,
      showErrorNotification = true,
      showSuccessNotification = true,
      trackAnalytics = true,
      invalidateQueries = [],
      refetchQueries = [],
      retryOnNetworkError = false,
      exponentialBackoff = false,
      ...mutationOptions
    } = options

    return {
      mutationFn: async (variables: TVariables) => {
        const startTime = Date.now()
        
        try {
          const result = await mutationFn(variables)
          
          if (trackAnalytics) {
            const duration = Date.now() - startTime
            // Track successful mutation
          }
          
          if (showSuccessNotification) {
            // Show success notification
          }
          
          // Invalidate related queries
          if (this.queryClient && invalidateQueries.length > 0) {
            invalidateQueries.forEach(queryKey => {
              this.queryClient!.invalidateQueries({ queryKey: [queryKey] })
            })
          }
          
          // Refetch related queries
          if (this.queryClient && refetchQueries.length > 0) {
            refetchQueries.forEach(queryKey => {
              this.queryClient!.refetchQueries({ queryKey: [queryKey] })
            })
          }
          
          return result
        } catch (error) {
          if (trackAnalytics) {
            const duration = Date.now() - startTime
            // Track failed mutation
          }
          
          if (showErrorNotification) {
            // Show error notification
          }
          
          throw error
        }
      },
      retry: retryOnNetworkError ? (exponentialBackoff ? 3 : 1) : false,
      ...mutationOptions,
    }
  }
}

// Enhanced useQuery hook
export function useAdvancedQuery<TData, TError = Error>(
  key: string[],
  queryFn: () => Promise<TData>,
  options: AdvancedQueryOptions<TData, TError> = {}
) {
  const queryClient = useQueryClient()
  const { setQueryData, getQueryData, isQueryStale } = useCacheStore()
  const { addNotification } = useNotificationStore()
  const { trackEvent, trackError } = useAnalyticsStore()
  
  const factory = QueryFactory.getInstance()
  factory.setQueryClient(queryClient)
  
  const queryConfig = factory.createQuery(key, queryFn, options)
  
  // Debounce/throttle logic
  const debounceRef = useRef<NodeJS.Timeout>()
  const throttleRef = useRef<number>(0)
  
  const debouncedQueryFn = useCallback(
    async () => {
      if (options.debounceMs) {
        return new Promise<TData>((resolve, reject) => {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current)
          }
          debounceRef.current = setTimeout(async () => {
            try {
              const result = await queryFn()
              resolve(result)
            } catch (error) {
              reject(error)
            }
          }, options.debounceMs)
        })
      }
      
      if (options.throttleMs) {
        const now = Date.now()
        if (now - throttleRef.current < options.throttleMs) {
          throw new Error('Request throttled')
        }
        throttleRef.current = now
      }
      
      return queryFn()
    },
    [queryFn, options.debounceMs, options.throttleMs]
  )
  
  const query = useQuery({
    ...queryConfig,
    queryFn: debouncedQueryFn,
    onSuccess: (data) => {
      if (options.cacheToStore) {
        setQueryData(key.join(':'), data)
      }
      
      if (options.showSuccessNotification) {
        addNotification({
          type: 'success',
          title: 'Data loaded successfully',
          message: `${key[0]} data has been updated`,
          read: false,
          persistent: false,
        })
      }
      
      if (options.trackAnalytics) {
        trackEvent('query_success', {
          queryKey: key.join(':'),
          dataSize: JSON.stringify(data).length,
        })
      }
      
      queryConfig.onSuccess?.(data)
    },
    onError: (error) => {
      if (options.showErrorNotification) {
        addNotification({
          type: 'error',
          title: 'Failed to load data',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          read: false,
          persistent: false,
        })
      }
      
      if (options.trackAnalytics) {
        trackError(error instanceof Error ? error : new Error('Query failed'))
        trackEvent('query_error', {
          queryKey: key.join(':'),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
      
      queryConfig.onError?.(error)
    },
  })
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])
  
  return {
    ...query,
    // Additional utilities
    isStale: isQueryStale(key.join(':')),
    invalidate: () => queryClient.invalidateQueries({ queryKey: key }),
    refetch: () => queryClient.refetchQueries({ queryKey: key }),
    remove: () => queryClient.removeQueries({ queryKey: key }),
  }
}

// Enhanced useMutation hook
export function useAdvancedMutation<TData, TError = Error, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: AdvancedMutationOptions<TData, TError, TVariables> = {}
) {
  const queryClient = useQueryClient()
  const { addNotification } = useNotificationStore()
  const { trackEvent, trackError } = useAnalyticsStore()
  
  const factory = QueryFactory.getInstance()
  factory.setQueryClient(queryClient)
  
  const mutationConfig = factory.createMutation(mutationFn, options)
  
  const mutation = useMutation({
    ...mutationConfig,
    onMutate: async (variables) => {
      // Optimistic update
      if (options.optimisticUpdate) {
        options.optimisticUpdate(variables)
      }
      
      if (options.trackAnalytics) {
        trackEvent('mutation_start', {
          mutationKey: mutationFn.name || 'unknown',
        })
      }
      
      return mutationConfig.onMutate?.(variables)
    },
    onSuccess: (data, variables, context) => {
      if (options.showSuccessNotification) {
        addNotification({
          type: 'success',
          title: 'Operation completed',
          message: 'Your action was completed successfully',
          read: false,
          persistent: false,
        })
      }
      
      if (options.trackAnalytics) {
        trackEvent('mutation_success', {
          mutationKey: mutationFn.name || 'unknown',
        })
      }
      
      mutationConfig.onSuccess?.(data, variables, context)
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (options.rollbackOnError && context) {
        // Rollback logic would be implemented here
      }
      
      if (options.showErrorNotification) {
        addNotification({
          type: 'error',
          title: 'Operation failed',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          read: false,
          persistent: false,
        })
      }
      
      if (options.trackAnalytics) {
        trackError(error instanceof Error ? error : new Error('Mutation failed'))
        trackEvent('mutation_error', {
          mutationKey: mutationFn.name || 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
      
      mutationConfig.onError?.(error, variables, context)
    },
  })
  
  return mutation
}
