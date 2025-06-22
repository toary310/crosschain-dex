import { StateCreator } from 'zustand'
import { ConnectionState, Store } from '../types'

const defaultConnectionState: ConnectionState = {
  isConnected: false,
  isConnecting: false,
  isReconnecting: false,
  supportedChains: [1, 137, 42161], // Ethereum, Polygon, Arbitrum
}

export const createConnectionSlice: StateCreator<
  Store,
  [['zustand/immer', never], ['zustand/persist', unknown], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Pick<Store, 
    'connection' | 
    'setConnection' | 
    'disconnect' | 
    'switchChain' |
    'isConnected' |
    'getAddress' |
    'getChainId' |
    'getBalance'
  >
> = (set, get) => ({
  connection: defaultConnectionState,

  setConnection: (connection) =>
    set((state) => {
      Object.assign(state.connection, connection)
      
      if (connection.isConnected && connection.address) {
        state.trackEvent('wallet_connected', {
          address: connection.address,
          chainId: connection.chainId,
          connector: connection.connector,
        })
        
        state.addNotification({
          type: 'success',
          title: 'Wallet Connected',
          message: `Connected to ${connection.connector || 'wallet'}`,
          read: false,
          persistent: false,
        })
      }
    }),

  disconnect: () =>
    set((state) => {
      const wasConnected = state.connection.isConnected
      
      state.connection = {
        ...defaultConnectionState,
        supportedChains: state.connection.supportedChains,
      }
      
      if (wasConnected) {
        state.trackEvent('wallet_disconnected')
        
        state.addNotification({
          type: 'info',
          title: 'Wallet Disconnected',
          message: 'Your wallet has been disconnected',
          read: false,
          persistent: false,
        })
      }
    }),

  switchChain: async (chainId) => {
    set((state) => {
      state.connection.pendingChainId = chainId
    })
    
    try {
      // Mock chain switch
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      set((state) => {
        state.connection.chainId = chainId
        state.connection.pendingChainId = undefined
        
        state.trackEvent('chain_switched', {
          chainId,
        })
        
        state.addNotification({
          type: 'success',
          title: 'Network Switched',
          message: `Switched to chain ${chainId}`,
          read: false,
          persistent: false,
        })
      })
    } catch (error) {
      set((state) => {
        state.connection.pendingChainId = undefined
        state.connection.error = error instanceof Error ? error.message : 'Failed to switch chain'
        
        state.addNotification({
          type: 'error',
          title: 'Network Switch Failed',
          message: error instanceof Error ? error.message : 'Failed to switch network',
          read: false,
          persistent: false,
        })
      })
      throw error
    }
  },

  isConnected: () => get().connection.isConnected,
  getAddress: () => get().connection.address,
  getChainId: () => get().connection.chainId,
  getBalance: () => get().connection.balance,
})
