import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { Token } from '@/config/tokens'

interface SwapState {
  fromToken: Token | null
  toToken: Token | null
  fromAmount: string
  toAmount: string
  slippageTolerance: number
  isLoading: boolean
}

interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  language: 'en' | 'ja' | 'zh'
  slippageTolerance: number
  notifications: {
    transactions: boolean
    priceAlerts: boolean
    news: boolean
  }
}

interface AppState {
  // Swap state
  swap: SwapState
  setFromToken: (token: Token | null) => void
  setToToken: (token: Token | null) => void
  setFromAmount: (amount: string) => void
  setToAmount: (amount: string) => void
  setSlippageTolerance: (tolerance: number) => void
  setSwapLoading: (loading: boolean) => void
  swapTokens: () => void
  resetSwap: () => void

  // User settings
  settings: UserSettings
  updateSettings: (settings: Partial<UserSettings>) => void

  // UI state
  isSidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

const initialSwapState: SwapState = {
  fromToken: null,
  toToken: null,
  fromAmount: '',
  toAmount: '',
  slippageTolerance: 0.5,
  isLoading: false,
}

const initialSettings: UserSettings = {
  theme: 'auto',
  language: 'en',
  slippageTolerance: 0.5,
  notifications: {
    transactions: true,
    priceAlerts: true,
    news: false,
  },
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Swap state
        swap: initialSwapState,
        setFromToken: (token) =>
          set((state) => ({
            swap: { ...state.swap, fromToken: token },
          })),
        setToToken: (token) =>
          set((state) => ({
            swap: { ...state.swap, toToken: token },
          })),
        setFromAmount: (amount) =>
          set((state) => ({
            swap: { ...state.swap, fromAmount: amount },
          })),
        setToAmount: (amount) =>
          set((state) => ({
            swap: { ...state.swap, toAmount: amount },
          })),
        setSlippageTolerance: (tolerance) =>
          set((state) => ({
            swap: { ...state.swap, slippageTolerance: tolerance },
          })),
        setSwapLoading: (loading) =>
          set((state) => ({
            swap: { ...state.swap, isLoading: loading },
          })),
        swapTokens: () =>
          set((state) => ({
            swap: {
              ...state.swap,
              fromToken: state.swap.toToken,
              toToken: state.swap.fromToken,
              fromAmount: state.swap.toAmount,
              toAmount: state.swap.fromAmount,
            },
          })),
        resetSwap: () =>
          set((state) => ({
            swap: initialSwapState,
          })),

        // User settings
        settings: initialSettings,
        updateSettings: (newSettings) =>
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          })),

        // UI state
        isSidebarOpen: false,
        setSidebarOpen: (open) => set({ isSidebarOpen: open }),
      }),
      {
        name: 'chainbridge-dex-storage',
        partialize: (state) => ({
          settings: state.settings,
          swap: {
            slippageTolerance: state.swap.slippageTolerance,
          },
        }),
      }
    ),
    {
      name: 'chainbridge-dex-store',
    }
  )
)
