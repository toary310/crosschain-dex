import { StateCreator } from 'zustand'
import { PortfolioState, Store } from '../types'

const defaultPortfolioState: PortfolioState = {
  totalValue: '0',
  totalValueChange24h: 0,
  tokens: [],
  positions: [],
  transactions: [],
  isLoading: false,
  lastUpdated: 0,
}

export const createPortfolioSlice: StateCreator<
  Store,
  [['zustand/immer', never], ['zustand/persist', unknown], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Pick<Store,
    'portfolio' |
    'updatePortfolio' |
    'addTransaction' |
    'updateTransaction' |
    'refreshPortfolio' |
    'getTotalValue' |
    'getTotalValueChange' |
    'getTokenBalances' |
    'getActivePositions' |
    'getPendingTransactions'
  >
> = (set, get) => ({
  portfolio: defaultPortfolioState,

  updatePortfolio: (portfolio: Partial<PortfolioState>) =>
    set((state: Store) => {
      Object.assign(state.portfolio, portfolio)
      state.portfolio.lastUpdated = Date.now()
    }),

  addTransaction: (transaction: any) =>
    set((state: Store) => {
      state.portfolio.transactions.unshift(transaction)

      // Limit to 100 transactions
      if (state.portfolio.transactions.length > 100) {
        state.portfolio.transactions = state.portfolio.transactions.slice(0, 100)
      }

      state.trackEvent('portfolio_transaction_added', {
        type: transaction.type,
        value: transaction.value,
      })
    }),

  updateTransaction: (id: string, updates: any) =>
    set((state: Store) => {
      const transaction = state.portfolio.transactions.find(t => t.id === id)
      if (transaction) {
        Object.assign(transaction, updates)

        state.trackEvent('portfolio_transaction_updated', {
          id,
          status: updates.status,
        })
      }
    }),

  refreshPortfolio: async () => {
    set((state: Store) => {
      state.portfolio.isLoading = true
    })

    try {
      // Mock portfolio refresh
      await new Promise(resolve => setTimeout(resolve, 1000))

      set((state: Store) => {
        state.portfolio.isLoading = false
        state.portfolio.lastUpdated = Date.now()
      })
    } catch (error) {
      set((state: Store) => {
        state.portfolio.isLoading = false
      })
      throw error
    }
  },

  getTotalValue: () => get().portfolio.totalValue,
  getTotalValueChange: () => get().portfolio.totalValueChange24h,
  getTokenBalances: () => get().portfolio.tokens,
  getActivePositions: () => get().portfolio.positions.filter(p => p.status === 'active'),
  getPendingTransactions: () => get().portfolio.transactions.filter(t => t.status === 'pending'),
})
