import { StateCreator } from 'zustand'
import { UserPreferences, Store } from '../types'

// Default user preferences
const defaultUserPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  currency: 'USD',
  slippageTolerance: 0.5,
  transactionDeadline: 20,
  gasPrice: 'standard',
  notifications: {
    browser: true,
    email: false,
    priceAlerts: true,
    transactionUpdates: true,
  },
  privacy: {
    analytics: true,
    crashReports: true,
    performanceData: true,
  },
}

export const createUserSlice: StateCreator<
  Store,
  [['zustand/immer', never], ['zustand/persist', unknown], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Pick<Store, 'user' | 'updateUserPreferences' | 'resetUserPreferences' | 'getTheme' | 'getLanguage' | 'getSlippageTolerance'>
> = (set, get) => ({
  // State
  user: defaultUserPreferences,

  // Actions
  updateUserPreferences: (preferences) =>
    set((state) => {
      Object.assign(state.user, preferences)
      
      // Track preference changes
      state.trackEvent('user_preferences_updated', {
        changes: Object.keys(preferences),
        timestamp: Date.now(),
      })
    }),

  resetUserPreferences: () =>
    set((state) => {
      state.user = { ...defaultUserPreferences }
      
      state.trackEvent('user_preferences_reset', {
        timestamp: Date.now(),
      })
    }),

  // Selectors
  getTheme: () => get().user.theme,
  getLanguage: () => get().user.language,
  getSlippageTolerance: () => get().user.slippageTolerance,
})
