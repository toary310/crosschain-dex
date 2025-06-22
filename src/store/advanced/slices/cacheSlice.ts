import { StateCreator } from 'zustand'
import { CacheState, Store } from '../types'

const defaultCacheState: CacheState = {
  queries: {},
  mutations: {},
  invalidations: [],
}

export const createCacheSlice: StateCreator<
  Store,
  [['zustand/immer', never], ['zustand/persist', unknown], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Pick<Store, 
    'cache' | 
    'setQueryData' | 
    'getQueryData' | 
    'invalidateQuery' | 
    'invalidateQueries' | 
    'clearCache' |
    'isQueryStale' |
    'getQueryStatus'
  >
> = (set, get) => ({
  cache: defaultCacheState,

  setQueryData: (key, data, ttl = 300000) => // 5 minutes default TTL
    set((state) => {
      state.cache.queries[key] = {
        data,
        timestamp: Date.now(),
        ttl,
        stale: false,
      }
    }),

  getQueryData: (key) => {
    const query = get().cache.queries[key]
    if (!query) return undefined
    
    const now = Date.now()
    const isExpired = now - query.timestamp > query.ttl
    
    if (isExpired) {
      // Mark as stale but still return data
      set((state) => {
        if (state.cache.queries[key]) {
          state.cache.queries[key].stale = true
        }
      })
    }
    
    return query.data
  },

  invalidateQuery: (key) =>
    set((state) => {
      if (state.cache.queries[key]) {
        state.cache.queries[key].stale = true
      }
      
      if (!state.cache.invalidations.includes(key)) {
        state.cache.invalidations.push(key)
      }
    }),

  invalidateQueries: (pattern) =>
    set((state) => {
      const regex = new RegExp(pattern)
      
      Object.keys(state.cache.queries).forEach(key => {
        if (regex.test(key)) {
          state.cache.queries[key].stale = true
          
          if (!state.cache.invalidations.includes(key)) {
            state.cache.invalidations.push(key)
          }
        }
      })
    }),

  clearCache: () =>
    set((state) => {
      state.cache.queries = {}
      state.cache.mutations = {}
      state.cache.invalidations = []
    }),

  isQueryStale: (key) => {
    const query = get().cache.queries[key]
    if (!query) return true
    
    const now = Date.now()
    const isExpired = now - query.timestamp > query.ttl
    
    return query.stale || isExpired
  },

  getQueryStatus: (key) => {
    const query = get().cache.queries[key]
    if (!query) return 'missing'
    
    const now = Date.now()
    const isExpired = now - query.timestamp > query.ttl
    
    if (query.stale || isExpired) return 'stale'
    return 'fresh'
  },
})

// Auto-cleanup stale cache entries
if (typeof window !== 'undefined') {
  setInterval(() => {
    const store = get()
    if (store) {
      const now = Date.now()
      const queries = store.cache.queries
      
      Object.keys(queries).forEach(key => {
        const query = queries[key]
        const isExpired = now - query.timestamp > query.ttl * 2 // Double TTL for cleanup
        
        if (isExpired) {
          delete queries[key]
        }
      })
      
      // Clear old invalidations
      store.cache.invalidations = store.cache.invalidations.slice(-50)
    }
  }, 5 * 60 * 1000) // Run every 5 minutes
}
