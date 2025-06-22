import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Token } from '@/config/tokens'

interface SwapState {
  fromToken: Token | null
  toToken: Token | null
  fromAmount: string
  toAmount: string
  slippageTolerance: number
  isLoading: boolean
}

interface SwapActions {
  setFromToken: (token: Token | null) => void
  setToToken: (token: Token | null) => void
  setFromAmount: (amount: string) => void
  setToAmount: (amount: string) => void
  setSlippageTolerance: (tolerance: number) => void
  setSwapLoading: (loading: boolean) => void
  swapTokens: () => void
  resetSwap: () => void
}

type SwapStore = SwapState & SwapActions

const initialState: SwapState = {
  fromToken: null,
  toToken: null,
  fromAmount: '',
  toAmount: '',
  slippageTolerance: 0.5,
  isLoading: false,
}

export const useSwapStore = create<SwapStore>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setFromToken: (token) =>
        set((state) => ({ fromToken: token }), false, 'setFromToken'),
      
      setToToken: (token) =>
        set((state) => ({ toToken: token }), false, 'setToToken'),
      
      setFromAmount: (amount) =>
        set((state) => ({ fromAmount: amount }), false, 'setFromAmount'),
      
      setToAmount: (amount) =>
        set((state) => ({ toAmount: amount }), false, 'setToAmount'),
      
      setSlippageTolerance: (tolerance) =>
        set((state) => ({ slippageTolerance: tolerance }), false, 'setSlippageTolerance'),
      
      setSwapLoading: (loading) =>
        set((state) => ({ isLoading: loading }), false, 'setSwapLoading'),
      
      swapTokens: () =>
        set((state) => ({
          fromToken: state.toToken,
          toToken: state.fromToken,
          fromAmount: state.toAmount,
          toAmount: state.fromAmount,
        }), false, 'swapTokens'),
      
      resetSwap: () =>
        set(initialState, false, 'resetSwap'),
    }),
    {
      name: 'swap-store',
    }
  )
)
