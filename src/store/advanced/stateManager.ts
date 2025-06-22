'use client'

import { create } from 'zustand'
import { subscribeWithSelector, persist, devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { QueryClient } from '@tanstack/react-query'

// State synchronization types
export interface StateSync {
  lastSync: number
  version: string
  conflicts: string[]
}

export interface OptimisticUpdate<T = any> {
  id: string
  type: string
  data: T
  timestamp: number
  status: 'pending' | 'confirmed' | 'failed'
  rollback?: () => void
}

// Advanced state manager interface
export interface AdvancedStateManager {
  // State synchronization
  sync: StateSync
  optimisticUpdates: OptimisticUpdate[]
  
  // Actions
  addOptimisticUpdate: (update: Omit<OptimisticUpdate, 'timestamp'>) => void
  confirmOptimisticUpdate: (id: string) => void
  rollbackOptimisticUpdate: (id: string) => void
  syncState: () => Promise<void>
  resolveConflicts: (conflicts: string[]) => void
  
  // Selectors
  getPendingUpdates: () => OptimisticUpdate[]
  getFailedUpdates: () => OptimisticUpdate[]
  hasConflicts: () => boolean
}

// Create advanced state manager
export const useAdvancedStateManager = create<AdvancedStateManager>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          sync: {
            lastSync: Date.now(),
            version: '1.0.0',
            conflicts: [],
          },
          optimisticUpdates: [],

          // Add optimistic update
          addOptimisticUpdate: (update) => {
            set((state) => {
              state.optimisticUpdates.push({
                ...update,
                timestamp: Date.now(),
                status: 'pending',
              })
            })
          },

          // Confirm optimistic update
          confirmOptimisticUpdate: (id) => {
            set((state) => {
              const update = state.optimisticUpdates.find(u => u.id === id)
              if (update) {
                update.status = 'confirmed'
              }
            })
          },

          // Rollback optimistic update
          rollbackOptimisticUpdate: (id) => {
            set((state) => {
              const updateIndex = state.optimisticUpdates.findIndex(u => u.id === id)
              if (updateIndex >= 0) {
                const update = state.optimisticUpdates[updateIndex]
                update.status = 'failed'
                
                // Execute rollback if available
                if (update.rollback) {
                  update.rollback()
                }
              }
            })
          },

          // Sync state with server
          syncState: async () => {
            try {
              set((state) => {
                state.sync.lastSync = Date.now()
              })
              
              // Implement actual sync logic here
              console.log('State synchronized')
            } catch (error) {
              console.error('State sync failed:', error)
            }
          },

          // Resolve conflicts
          resolveConflicts: (conflicts) => {
            set((state) => {
              state.sync.conflicts = conflicts
            })
          },

          // Selectors
          getPendingUpdates: () => {
            return get().optimisticUpdates.filter(u => u.status === 'pending')
          },

          getFailedUpdates: () => {
            return get().optimisticUpdates.filter(u => u.status === 'failed')
          },

          hasConflicts: () => {
            return get().sync.conflicts.length > 0
          },
        }))
      ),
      {
        name: 'advanced-state-manager',
        partialize: (state) => ({
          sync: state.sync,
          optimisticUpdates: state.optimisticUpdates.filter(u => u.status === 'pending'),
        }),
      }
    ),
    { name: 'AdvancedStateManager' }
  )
)

// State synchronization utilities
export class StateSynchronizer {
  private queryClient: QueryClient
  private stateManager: ReturnType<typeof useAdvancedStateManager.getState>

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
    this.stateManager = useAdvancedStateManager.getState()
  }

  // Optimistic mutation with rollback
  async optimisticMutation<T>(
    mutationKey: string[],
    mutationFn: () => Promise<T>,
    optimisticData: T,
    rollbackFn?: () => void
  ): Promise<T> {
    const updateId = `${mutationKey.join('-')}-${Date.now()}`

    // Add optimistic update
    this.stateManager.addOptimisticUpdate({
      id: updateId,
      type: 'mutation',
      data: optimisticData,
      status: 'pending',
      rollback: rollbackFn,
    })

    // Apply optimistic update to cache
    this.queryClient.setQueryData(mutationKey, optimisticData)

    try {
      // Execute actual mutation
      const result = await mutationFn()
      
      // Confirm optimistic update
      this.stateManager.confirmOptimisticUpdate(updateId)
      
      // Update cache with real data
      this.queryClient.setQueryData(mutationKey, result)
      
      return result
    } catch (error) {
      // Rollback optimistic update
      this.stateManager.rollbackOptimisticUpdate(updateId)
      
      // Invalidate cache to refetch
      this.queryClient.invalidateQueries({ queryKey: mutationKey })
      
      throw error
    }
  }

  // Batch state updates
  batchUpdates(updates: Array<() => void>) {
    // Use React's unstable_batchedUpdates if available
    if (typeof window !== 'undefined' && (window as any).React?.unstable_batchedUpdates) {
      (window as any).React.unstable_batchedUpdates(() => {
        updates.forEach(update => update())
      })
    } else {
      // Fallback: execute updates in sequence
      updates.forEach(update => update())
    }
  }

  // Real-time state synchronization
  setupRealtimeSync(websocketUrl: string) {
    const ws = new WebSocket(websocketUrl)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'state_update':
            this.handleStateUpdate(data.payload)
            break
          case 'conflict':
            this.handleConflict(data.payload)
            break
          default:
            console.warn('Unknown message type:', data.type)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return ws
  }

  private handleStateUpdate(payload: any) {
    // Update relevant queries
    if (payload.queryKey) {
      this.queryClient.setQueryData(payload.queryKey, payload.data)
    }

    // Trigger state sync
    this.stateManager.syncState()
  }

  private handleConflict(payload: any) {
    // Handle state conflicts
    this.stateManager.resolveConflicts(payload.conflicts)
  }
}

// Hook for using state synchronizer
export const useStateSynchronizer = (queryClient: QueryClient) => {
  const synchronizer = new StateSynchronizer(queryClient)
  return synchronizer
}

// Middleware for automatic state persistence
export const createPersistentStore = <T>(
  name: string,
  initialState: T,
  options?: {
    version?: number
    migrate?: (persistedState: any, version: number) => T
    partialize?: (state: T) => Partial<T>
  }
) => {
  return create<T>()(
    devtools(
      persist(
        (set, get) => ({
          ...initialState,
          // Add common methods
          reset: () => set(initialState),
          update: (updater: (state: T) => void) => set(immer(updater)),
        }),
        {
          name,
          version: options?.version || 1,
          migrate: options?.migrate,
          partialize: options?.partialize,
        }
      ),
      { name }
    )
  )
}

// State validation utilities
export const validateState = <T>(state: T, schema: any): boolean => {
  try {
    // Implement validation logic (could use Zod, Joi, etc.)
    return true
  } catch (error) {
    console.error('State validation failed:', error)
    return false
  }
}

// State migration utilities
export const migrateState = (oldState: any, newVersion: number): any => {
  // Implement state migration logic
  switch (newVersion) {
    case 2:
      // Migration from v1 to v2
      return {
        ...oldState,
        version: 2,
      }
    default:
      return oldState
  }
}
