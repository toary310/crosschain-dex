import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface NotificationSettings {
  transactions: boolean
  priceAlerts: boolean
  news: boolean
}

interface SettingsState {
  theme: 'light' | 'dark' | 'auto'
  language: 'en' | 'ja' | 'zh'
  slippageTolerance: number
  notifications: NotificationSettings
}

interface SettingsActions {
  updateTheme: (theme: SettingsState['theme']) => void
  updateLanguage: (language: SettingsState['language']) => void
  updateSlippageTolerance: (tolerance: number) => void
  updateNotifications: (notifications: Partial<NotificationSettings>) => void
  updateSettings: (settings: Partial<SettingsState>) => void
  resetSettings: () => void
}

type SettingsStore = SettingsState & SettingsActions

const initialState: SettingsState = {
  theme: 'auto',
  language: 'en',
  slippageTolerance: 0.5,
  notifications: {
    transactions: true,
    priceAlerts: true,
    news: false,
  },
}

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        
        updateTheme: (theme) =>
          set((state) => ({ theme }), false, 'updateTheme'),
        
        updateLanguage: (language) =>
          set((state) => ({ language }), false, 'updateLanguage'),
        
        updateSlippageTolerance: (slippageTolerance) =>
          set((state) => ({ slippageTolerance }), false, 'updateSlippageTolerance'),
        
        updateNotifications: (newNotifications) =>
          set((state) => ({
            notifications: { ...state.notifications, ...newNotifications }
          }), false, 'updateNotifications'),
        
        updateSettings: (newSettings) =>
          set((state) => ({ ...state, ...newSettings }), false, 'updateSettings'),
        
        resetSettings: () =>
          set(initialState, false, 'resetSettings'),
      }),
      {
        name: 'settings-store',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          slippageTolerance: state.slippageTolerance,
          notifications: state.notifications,
        }),
      }
    ),
    {
      name: 'settings-store',
    }
  )
)
