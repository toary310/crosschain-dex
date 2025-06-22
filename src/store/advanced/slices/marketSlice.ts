import { StateCreator } from 'zustand'
import { MarketState, Store } from '../types'

const defaultMarketState: MarketState = {
  prices: {},
  trending: [],
  topGainers: [],
  topLosers: [],
  isLoading: false,
  lastUpdated: 0,
}

export const createMarketSlice: StateCreator<
  Store,
  [['zustand/immer', never], ['zustand/persist', unknown], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Pick<Store,
    'market' |
    'updatePrices' |
    'updateTrending' |
    'refreshMarketData' |
    'getTokenPrice' |
    'getTrendingTokens' |
    'getTopGainers' |
    'getTopLosers'
  >
> = (set, get) => ({
  market: defaultMarketState,

  updatePrices: (prices: Record<string, any>) =>
    set((state: Store) => {
      Object.assign(state.market.prices, prices)
      state.market.lastUpdated = Date.now()
    }),

  updateTrending: (trending: any[]) =>
    set((state: Store) => {
      state.market.trending = trending
      state.market.lastUpdated = Date.now()
    }),

  refreshMarketData: async () => {
    set((state: Store) => {
      state.market.isLoading = true
    })

    try {
      // Mock market data refresh
      await new Promise(resolve => setTimeout(resolve, 1000))

      set((state: Store) => {
        state.market.isLoading = false
        state.market.lastUpdated = Date.now()
      })
    } catch (error) {
      set((state: Store) => {
        state.market.isLoading = false
      })
      throw error
    }
  },

  getTokenPrice: (address: string) => get().market.prices[address]?.price,
  getTrendingTokens: () => get().market.trending,
  getTopGainers: () => get().market.topGainers,
  getTopLosers: () => get().market.topLosers,
})
