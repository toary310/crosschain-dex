import { StateCreator } from 'zustand'
import { Store, TradingState } from '../types'

// Default trading state
const defaultTradingState: TradingState = {
  fromAmount: '',
  toAmount: '',
  isLoading: false,
  slippage: 0.5,
  deadline: 20,
  expertMode: false,
  multihop: true,
}

export const createTradingSlice: StateCreator<
  Store,
  [['zustand/immer', never], ['zustand/persist', unknown], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Pick<Store,
    'trading' |
    'setFromToken' |
    'setToToken' |
    'setFromAmount' |
    'setToAmount' |
    'swapTokens' |
    'updateQuote' |
    'setSlippage' |
    'setDeadline' |
    'toggleExpertMode' |
    'resetTradingState' |
    'getTradingPair' |
    'getTradeAmounts' |
    'getLastQuote' |
    'canTrade'
  >
> = (set, get) => ({
  // State
  trading: defaultTradingState,

  // Actions
  setFromToken: (token: any) =>
    set((state: Store) => {
      // Prevent setting same token for both from and to
      if (state.trading.toToken?.address === token.address) {
        state.trading.toToken = state.trading.fromToken
      }
      state.trading.fromToken = token

      // Clear amounts when changing tokens
      state.trading.fromAmount = ''
      state.trading.toAmount = ''
      state.trading.lastQuote = undefined

      state.trackEvent('trading_from_token_selected', {
        token: token.symbol,
        address: token.address,
      })
    }),

  setToToken: (token: any) =>
    set((state: Store) => {
      // Prevent setting same token for both from and to
      if (state.trading.fromToken?.address === token.address) {
        state.trading.fromToken = state.trading.toToken
      }
      state.trading.toToken = token

      // Clear amounts when changing tokens
      state.trading.fromAmount = ''
      state.trading.toAmount = ''
      state.trading.lastQuote = undefined

      state.trackEvent('trading_to_token_selected', {
        token: token.symbol,
        address: token.address,
      })
    }),

  setFromAmount: (amount: string) =>
    set((state: Store) => {
      state.trading.fromAmount = amount

      // Clear quote when amount changes
      if (state.trading.lastQuote) {
        state.trading.lastQuote = undefined
      }
    }),

  setToAmount: (amount: string) =>
    set((state: Store) => {
      state.trading.toAmount = amount
    }),

  swapTokens: () =>
    set((state: Store) => {
      const { fromToken, toToken, fromAmount, toAmount } = state.trading

      state.trading.fromToken = toToken
      state.trading.toToken = fromToken
      state.trading.fromAmount = toAmount
      state.trading.toAmount = fromAmount
      state.trading.lastQuote = undefined

      state.trackEvent('trading_tokens_swapped', {
        fromToken: fromToken?.symbol,
        toToken: toToken?.symbol,
      })
    }),

  updateQuote: (quote: any) =>
    set((state: Store) => {
      state.trading.lastQuote = quote

      if (quote) {
        state.trading.toAmount = quote.minimumReceived

        state.trackEvent('trading_quote_updated', {
          rate: quote.rate,
          priceImpact: quote.priceImpact,
          fromToken: state.trading.fromToken?.symbol,
          toToken: state.trading.toToken?.symbol,
        })
      }
    }),

  setSlippage: (slippage: number) =>
    set((state: Store) => {
      state.trading.slippage = slippage

      // Update user preferences if different
      if (state.user.slippageTolerance !== slippage) {
        state.user.slippageTolerance = slippage
      }

      state.trackEvent('trading_slippage_changed', {
        slippage,
      })
    }),

  setDeadline: (deadline: number) =>
    set((state: Store) => {
      state.trading.deadline = deadline

      // Update user preferences if different
      if (state.user.transactionDeadline !== deadline) {
        state.user.transactionDeadline = deadline
      }

      state.trackEvent('trading_deadline_changed', {
        deadline,
      })
    }),

  toggleExpertMode: () =>
    set((state: Store) => {
      state.trading.expertMode = !state.trading.expertMode

      state.trackEvent('trading_expert_mode_toggled', {
        enabled: state.trading.expertMode,
      })

      // Show warning notification when enabling expert mode
      if (state.trading.expertMode) {
        state.addNotification({
          type: 'warning',
          title: 'Expert Mode Enabled',
          message: 'You can now access advanced trading features. Use with caution.',
          read: false,
          persistent: false,
        })
      }
    }),

  resetTradingState: () =>
    set((state: Store) => {
      const currentSlippage = state.trading.slippage
      const currentDeadline = state.trading.deadline
      const currentExpertMode = state.trading.expertMode

      state.trading = {
        ...defaultTradingState,
        slippage: currentSlippage,
        deadline: currentDeadline,
        expertMode: currentExpertMode,
      }

      state.trackEvent('trading_state_reset')
    }),

  // Selectors
  getTradingPair: () => {
    const { fromToken, toToken } = get().trading
    return { from: fromToken, to: toToken }
  },

  getTradeAmounts: () => {
    const { fromAmount, toAmount } = get().trading
    return { from: fromAmount, to: toAmount }
  },

  getLastQuote: () => get().trading.lastQuote,

  canTrade: () => {
    const { fromToken, toToken, fromAmount, isLoading } = get().trading
    const { isConnected } = get().connection

    return !!(
      fromToken &&
      toToken &&
      fromAmount &&
      parseFloat(fromAmount) > 0 &&
      !isLoading &&
      isConnected
    )
  },
})
