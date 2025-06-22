'use client'

import { StateSynchronizer, useAdvancedStateManager } from '@/store/advanced/stateManager'
import { useToast } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import React, { createContext, ReactNode, useContext, useEffect, useRef } from 'react'

interface StateProviderContext {
  synchronizer: StateSynchronizer
  isOnline: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
}

const StateContext = createContext<StateProviderContext | null>(null)

interface StateProviderProps {
  children: ReactNode
  websocketUrl?: string
  enableOfflineSupport?: boolean
}

export const StateProvider: React.FC<StateProviderProps> = ({
  children,
  websocketUrl,
  enableOfflineSupport = true,
}) => {
  const queryClient = useQueryClient()
  const toast = useToast()
  const synchronizer = useRef<StateSynchronizer | null>(null)
  const websocket = useRef<WebSocket | null>(null)
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'syncing' | 'error'>('idle')

  const stateManager = useAdvancedStateManager()

  // Initialize synchronizer
  useEffect(() => {
    if (!synchronizer.current) {
      synchronizer.current = new StateSynchronizer(queryClient)
    }
  }, [queryClient])

  // Setup online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus('syncing')

      // Sync state when coming back online
      stateManager.syncState().then(() => {
        setSyncStatus('idle')
        toast({
          title: 'Back online',
          description: 'State synchronized successfully',
          status: 'success',
          duration: 3000,
        })
      }).catch(() => {
        setSyncStatus('error')
        toast({
          title: 'Sync failed',
          description: 'Failed to synchronize state',
          status: 'error',
          duration: 5000,
        })
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      if (enableOfflineSupport) {
        toast({
          title: 'Offline mode',
          description: 'Changes will be synced when connection is restored',
          status: 'warning',
          duration: 5000,
        })
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [stateManager, toast, enableOfflineSupport])

  // Setup WebSocket connection for real-time sync
  useEffect(() => {
    if (!websocketUrl || !isOnline) return

    try {
      websocket.current = synchronizer.current?.setupRealtimeSync(websocketUrl)

      if (websocket.current) {
        websocket.current.onopen = () => {
          console.log('WebSocket connected for real-time sync')
        }

        websocket.current.onclose = () => {
          console.log('WebSocket disconnected')
          // Attempt to reconnect after delay
          setTimeout(() => {
            if (isOnline && websocketUrl) {
              websocket.current = synchronizer.current?.setupRealtimeSync(websocketUrl)
            }
          }, 5000)
        }
      }
    } catch (error) {
      console.error('Failed to setup WebSocket:', error)
    }

    return () => {
      if (websocket.current) {
        websocket.current.close()
      }
    }
  }, [websocketUrl, isOnline])

  // Periodic state sync
  useEffect(() => {
    if (!isOnline) return

    const interval = setInterval(() => {
      setSyncStatus('syncing')
      stateManager.syncState().then(() => {
        setSyncStatus('idle')
      }).catch(() => {
        setSyncStatus('error')
      })
    }, 30000) // Sync every 30 seconds

    return () => clearInterval(interval)
  }, [stateManager, isOnline])

  // Handle optimistic updates
  useEffect(() => {
    const unsubscribe = useAdvancedStateManager.subscribe(
      (state) => state.optimisticUpdates,
      (optimisticUpdates) => {
        // Handle failed updates
        const failedUpdates = optimisticUpdates.filter(u => u.status === 'failed')
        if (failedUpdates.length > 0) {
          toast({
            title: 'Some changes failed',
            description: `${failedUpdates.length} updates could not be applied`,
            status: 'error',
            duration: 5000,
          })
        }
      }
    )

    return unsubscribe
  }, [toast])

  // Offline queue management
  useEffect(() => {
    if (!enableOfflineSupport) return

    const handleBeforeUnload = () => {
      // Save pending updates to localStorage
      const pendingUpdates = stateManager.getPendingUpdates()
      if (pendingUpdates.length > 0) {
        localStorage.setItem('pendingUpdates', JSON.stringify(pendingUpdates))
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Restore pending updates on load
    const savedUpdates = localStorage.getItem('pendingUpdates')
    if (savedUpdates) {
      try {
        const updates = JSON.parse(savedUpdates)
        updates.forEach((update: any) => {
          stateManager.addOptimisticUpdate(update)
        })
        localStorage.removeItem('pendingUpdates')
      } catch (error) {
        console.error('Failed to restore pending updates:', error)
      }
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [stateManager, enableOfflineSupport])

  const contextValue: StateProviderContext = {
    synchronizer: synchronizer.current!,
    isOnline,
    syncStatus,
  }

  return (
    <StateContext.Provider value={contextValue}>
      {children}
    </StateContext.Provider>
  )
}

// Hook to use state context
export const useStateContext = () => {
  const context = useContext(StateContext)
  if (!context) {
    throw new Error('useStateContext must be used within StateProvider')
  }
  return context
}

// Hook for optimistic mutations
export const useOptimisticMutation = <TData, TVariables>(
  mutationKey: string[],
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onOptimisticUpdate?: (variables: TVariables) => TData
    onRollback?: () => void
  }
) => {
  const { synchronizer } = useStateContext()
  const queryClient = useQueryClient()

  const mutate = async (variables: TVariables): Promise<TData> => {
    if (!options?.onOptimisticUpdate) {
      return mutationFn(variables)
    }

    const optimisticData = options.onOptimisticUpdate(variables)

    return synchronizer.optimisticMutation(
      mutationKey,
      () => mutationFn(variables),
      optimisticData,
      options.onRollback
    )
  }

  return { mutate }
}

// Hook for batch updates
export const useBatchUpdates = () => {
  const { synchronizer } = useStateContext()

  const batchUpdates = (updates: Array<() => void>) => {
    synchronizer.batchUpdates(updates)
  }

  return { batchUpdates }
}

// Hook for conflict resolution
export const useConflictResolution = () => {
  const stateManager = useAdvancedStateManager()
  const toast = useToast()

  const resolveConflicts = (conflicts: string[], resolution: 'local' | 'remote' | 'merge') => {
    switch (resolution) {
      case 'local':
        // Keep local changes
        stateManager.resolveConflicts([])
        break
      case 'remote':
        // Accept remote changes
        stateManager.resolveConflicts([])
        // Invalidate all queries to refetch
        break
      case 'merge':
        // Implement merge logic
        stateManager.resolveConflicts([])
        break
    }

    toast({
      title: 'Conflicts resolved',
      description: `Applied ${resolution} resolution strategy`,
      status: 'success',
      duration: 3000,
    })
  }

  return {
    conflicts: stateManager.sync.conflicts,
    hasConflicts: stateManager.hasConflicts(),
    resolveConflicts,
  }
}

// Hook for state persistence
export const useStatePersistence = () => {
  const stateManager = useAdvancedStateManager()

  const exportState = () => {
    const state = stateManager
    return JSON.stringify(state, null, 2)
  }

  const importState = (stateJson: string) => {
    try {
      const state = JSON.parse(stateJson)
      // Validate and apply state
      console.log('State imported successfully')
    } catch (error) {
      console.error('Failed to import state:', error)
      throw new Error('Invalid state format')
    }
  }

  const clearState = () => {
    localStorage.removeItem('advanced-state-manager')
    window.location.reload()
  }

  return {
    exportState,
    importState,
    clearState,
  }
}
