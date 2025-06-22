import { useEffect, useRef, useState, useCallback } from 'react'
import { PriceStreamService, PriceUpdate } from '@/services/realtime/PriceStreamService'
import { NotificationService } from '@/services/realtime/NotificationService'
import { useMarketStore, useConnectionStore, useNotificationStore } from '@/store/advanced/store'

// Price streaming hook
export const usePriceStream = (symbols: string[] = []) => {
  const [isConnected, setIsConnected] = useState(false)
  const [prices, setPrices] = useState<Map<string, PriceUpdate>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const serviceRef = useRef<PriceStreamService | null>(null)
  const { updatePrices } = useMarketStore()

  useEffect(() => {
    if (symbols.length === 0) return

    const startPriceStream = async () => {
      try {
        serviceRef.current = new PriceStreamService({
          symbols,
          updateInterval: 1000,
          enableAggregation: true,
        })

        // Subscribe to all price updates
        const unsubscribe = serviceRef.current.subscribeToSymbol('*', (update) => {
          setPrices(prev => new Map(prev.set(update.symbol, update)))
          
          // Update global store
          updatePrices({
            [update.address]: {
              price: update.price,
              change24h: update.change24h,
              volume24h: update.volume24h,
              marketCap: update.marketCap || 0,
              lastUpdated: update.timestamp,
            }
          })
        })

        await serviceRef.current.start()
        setIsConnected(true)
        setError(null)

        return () => {
          unsubscribe()
          serviceRef.current?.stop()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start price stream')
        setIsConnected(false)
      }
    }

    const cleanup = startPriceStream()

    return () => {
      cleanup.then(cleanupFn => cleanupFn?.())
    }
  }, [symbols, updatePrices])

  const getPrice = useCallback((symbol: string) => {
    return prices.get(symbol)
  }, [prices])

  const subscribeToSymbol = useCallback((symbol: string, callback: (update: PriceUpdate) => void) => {
    if (!serviceRef.current) return () => {}
    return serviceRef.current.subscribeToSymbol(symbol, callback)
  }, [])

  return {
    isConnected,
    prices,
    error,
    getPrice,
    subscribeToSymbol,
    connectionMetrics: serviceRef.current?.connectionMetrics,
  }
}

// Real-time notifications hook
export const useRealtimeNotifications = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const serviceRef = useRef<NotificationService | null>(null)
  const { isConnected: walletConnected } = useConnectionStore()
  const { settings } = useNotificationStore()

  useEffect(() => {
    if (!walletConnected) return

    const startNotificationService = async () => {
      try {
        serviceRef.current = new NotificationService({
          enableBrowser: settings.enabled && settings.desktop,
          enableSound: settings.enabled && settings.sound,
          position: settings.position,
        })

        await serviceRef.current.start()
        setIsConnected(true)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start notification service')
        setIsConnected(false)
      }
    }

    startNotificationService()

    return () => {
      serviceRef.current?.stop()
    }
  }, [walletConnected, settings])

  const sendNotification = useCallback((notification: any) => {
    serviceRef.current?.sendNotification(notification)
  }, [])

  const updateConfig = useCallback((config: any) => {
    serviceRef.current?.updateConfig(config)
  }, [])

  return {
    isConnected,
    error,
    sendNotification,
    updateConfig,
    connectionMetrics: serviceRef.current?.connectionMetrics,
  }
}

// WebSocket connection hook
export const useWebSocket = (url: string, options: {
  onMessage?: (data: any) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: any) => void
  autoReconnect?: boolean
  reconnectInterval?: number
} = {}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options

  const connect = useCallback(() => {
    try {
      wsRef.current = new WebSocket(url)

      wsRef.current.onopen = () => {
        setIsConnected(true)
        setError(null)
        onConnect?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          setLastMessage(data)
          onMessage?.(data)
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        onDisconnect?.()

        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval)
        }
      }

      wsRef.current.onerror = (error) => {
        setError('WebSocket connection error')
        onError?.(error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
      onError?.(err)
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  return {
    isConnected,
    error,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  }
}

// Real-time data synchronization hook
export const useRealtimeSync = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    interval?: number
    enabled?: boolean
    onUpdate?: (data: T) => void
    onError?: (error: Error) => void
  } = {}
) => {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    interval = 5000,
    enabled = true,
    onUpdate,
    onError,
  } = options

  const fetchData = useCallback(async () => {
    if (!enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetcher()
      setData(result)
      setLastUpdated(Date.now())
      onUpdate?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed')
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [fetcher, enabled, onUpdate, onError])

  const startSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    fetchData() // Initial fetch
    intervalRef.current = setInterval(fetchData, interval)
  }, [fetchData, interval])

  const stopSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      startSync()
    } else {
      stopSync()
    }

    return stopSync
  }, [enabled, startSync, stopSync])

  const refresh = useCallback(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
    startSync,
    stopSync,
  }
}

// Live chart data hook
export const useLiveChartData = (symbol: string, interval: string = '1m') => {
  const [chartData, setChartData] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const connectToChart = () => {
      const wsUrl = `${process.env.NEXT_PUBLIC_CHART_WS_URL}/${symbol}/${interval}`
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setIsConnected(true)
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'kline') {
            setChartData(prev => {
              const newData = [...prev]
              const lastIndex = newData.length - 1
              
              if (lastIndex >= 0 && newData[lastIndex].timestamp === data.timestamp) {
                // Update existing candle
                newData[lastIndex] = data
              } else {
                // Add new candle
                newData.push(data)
                
                // Keep only last 1000 candles
                if (newData.length > 1000) {
                  newData.shift()
                }
              }
              
              return newData
            })
          }
        } catch (error) {
          console.error('Failed to parse chart data:', error)
        }
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        // Reconnect after 5 seconds
        setTimeout(connectToChart, 5000)
      }

      wsRef.current.onerror = (error) => {
        console.error('Chart WebSocket error:', error)
      }
    }

    connectToChart()

    return () => {
      wsRef.current?.close()
    }
  }, [symbol, interval])

  return {
    chartData,
    isConnected,
  }
}
