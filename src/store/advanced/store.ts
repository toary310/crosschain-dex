import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { RootState, StoreActions, StoreSelectors } from './types'
import { createUserSlice } from './slices/userSlice'
import { createTradingSlice } from './slices/tradingSlice'
import { createPortfolioSlice } from './slices/portfolioSlice'
import { createMarketSlice } from './slices/marketSlice'
import { createNotificationSlice } from './slices/notificationSlice'
import { createConnectionSlice } from './slices/connectionSlice'
import { createAnalyticsSlice } from './slices/analyticsSlice'
import { createCacheSlice } from './slices/cacheSlice'

// Combined store type
export type Store = RootState & StoreActions & StoreSelectors

// Store configuration
const storeConfig = {
  name: 'chainbridge-dex-store',
  version: 1,
  partialize: (state: Store) => ({
    user: state.user,
    trading: {
      ...state.trading,
      isLoading: false, // Don't persist loading states
      lastQuote: undefined, // Don't persist quotes
    },
    notifications: {
      ...state.notifications,
      notifications: state.notifications.notifications.filter(n => n.persistent),
    },
    // Don't persist volatile data
    portfolio: undefined,
    market: undefined,
    connection: undefined,
    analytics: undefined,
    cache: undefined,
  }),
  migrate: (persistedState: any, version: number) => {
    // Handle store migrations
    if (version === 0) {
      // Migration from version 0 to 1
      return {
        ...persistedState,
        user: {
          ...persistedState.user,
          privacy: {
            analytics: true,
            crashReports: true,
            performanceData: true,
          },
        },
      }
    }
    return persistedState
  },
}

// Create the main store
export const useStore = create<Store>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get, api) => ({
          // Combine all slices
          ...createUserSlice(set, get, api),
          ...createTradingSlice(set, get, api),
          ...createPortfolioSlice(set, get, api),
          ...createMarketSlice(set, get, api),
          ...createNotificationSlice(set, get, api),
          ...createConnectionSlice(set, get, api),
          ...createAnalyticsSlice(set, get, api),
          ...createCacheSlice(set, get, api),
        }))
      ),
      storeConfig
    ),
    {
      name: 'ChainBridge DEX Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
)

// Store utilities
export const storeUtils = {
  // Reset entire store
  reset: () => {
    useStore.persist.clearStorage()
    window.location.reload()
  },

  // Get store snapshot
  getSnapshot: () => {
    return useStore.getState()
  },

  // Subscribe to specific slice changes
  subscribeToSlice: <K extends keyof RootState>(
    slice: K,
    callback: (state: RootState[K]) => void
  ) => {
    return useStore.subscribe(
      (state) => state[slice],
      callback,
      {
        equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      }
    )
  },

  // Batch updates
  batch: (updates: (state: Store) => void) => {
    useStore.setState(updates)
  },

  // Time travel (development only)
  timeTravel: process.env.NODE_ENV === 'development' ? {
    undo: () => {
      // Implementation would depend on history tracking
      console.log('Undo not implemented yet')
    },
    redo: () => {
      // Implementation would depend on history tracking
      console.log('Redo not implemented yet')
    },
    getHistory: () => {
      // Return state history
      return []
    },
  } : undefined,
}

// Store hooks for specific slices
export const useUserStore = () => useStore((state) => ({
  user: state.user,
  updateUserPreferences: state.updateUserPreferences,
  resetUserPreferences: state.resetUserPreferences,
  getTheme: state.getTheme,
  getLanguage: state.getLanguage,
  getSlippageTolerance: state.getSlippageTolerance,
}))

export const useTradingStore = () => useStore((state) => ({
  trading: state.trading,
  setFromToken: state.setFromToken,
  setToToken: state.setToToken,
  setFromAmount: state.setFromAmount,
  setToAmount: state.setToAmount,
  swapTokens: state.swapTokens,
  updateQuote: state.updateQuote,
  setSlippage: state.setSlippage,
  setDeadline: state.setDeadline,
  toggleExpertMode: state.toggleExpertMode,
  resetTradingState: state.resetTradingState,
  getTradingPair: state.getTradingPair,
  getTradeAmounts: state.getTradeAmounts,
  getLastQuote: state.getLastQuote,
  canTrade: state.canTrade,
}))

export const usePortfolioStore = () => useStore((state) => ({
  portfolio: state.portfolio,
  updatePortfolio: state.updatePortfolio,
  addTransaction: state.addTransaction,
  updateTransaction: state.updateTransaction,
  refreshPortfolio: state.refreshPortfolio,
  getTotalValue: state.getTotalValue,
  getTotalValueChange: state.getTotalValueChange,
  getTokenBalances: state.getTokenBalances,
  getActivePositions: state.getActivePositions,
  getPendingTransactions: state.getPendingTransactions,
}))

export const useMarketStore = () => useStore((state) => ({
  market: state.market,
  updatePrices: state.updatePrices,
  updateTrending: state.updateTrending,
  refreshMarketData: state.refreshMarketData,
  getTokenPrice: state.getTokenPrice,
  getTrendingTokens: state.getTrendingTokens,
  getTopGainers: state.getTopGainers,
  getTopLosers: state.getTopLosers,
}))

export const useNotificationStore = () => useStore((state) => ({
  notifications: state.notifications,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  markAsRead: state.markAsRead,
  markAllAsRead: state.markAllAsRead,
  clearNotifications: state.clearNotifications,
  updateNotificationSettings: state.updateNotificationSettings,
  getUnreadNotifications: state.getUnreadNotifications,
  getUnreadCount: state.getUnreadCount,
}))

export const useConnectionStore = () => useStore((state) => ({
  connection: state.connection,
  setConnection: state.setConnection,
  disconnect: state.disconnect,
  switchChain: state.switchChain,
  isConnected: state.isConnected,
  getAddress: state.getAddress,
  getChainId: state.getChainId,
  getBalance: state.getBalance,
}))

export const useAnalyticsStore = () => useStore((state) => ({
  analytics: state.analytics,
  trackPageView: state.trackPageView,
  trackEvent: state.trackEvent,
  trackError: state.trackError,
  updatePerformance: state.updatePerformance,
  getPageViews: state.getPageViews,
  getRecentEvents: state.getRecentEvents,
  getPerformanceMetrics: state.getPerformanceMetrics,
}))

export const useCacheStore = () => useStore((state) => ({
  cache: state.cache,
  setQueryData: state.setQueryData,
  getQueryData: state.getQueryData,
  invalidateQuery: state.invalidateQuery,
  invalidateQueries: state.invalidateQueries,
  clearCache: state.clearCache,
  isQueryStale: state.isQueryStale,
  getQueryStatus: state.getQueryStatus,
}))

// Store middleware for logging (development only)
if (process.env.NODE_ENV === 'development') {
  useStore.subscribe(
    (state) => state,
    (state, prevState) => {
      console.group('🏪 Store Update')
      console.log('Previous State:', prevState)
      console.log('New State:', state)
      console.groupEnd()
    }
  )
}

// Store performance monitoring
if (typeof window !== 'undefined') {
  let updateCount = 0
  let lastUpdate = Date.now()

  useStore.subscribe(() => {
    updateCount++
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdate
    lastUpdate = now

    // Warn about frequent updates
    if (timeSinceLastUpdate < 16) { // Less than one frame
      console.warn(`Store updated ${updateCount} times in rapid succession`)
    }

    // Reset counter every second
    setTimeout(() => {
      updateCount = 0
    }, 1000)
  })
}
