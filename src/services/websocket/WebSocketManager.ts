// Advanced WebSocket Manager for Real-time Features
export interface WebSocketConfig {
  url: string
  protocols?: string[]
  reconnectInterval?: number
  maxReconnectAttempts?: number
  heartbeatInterval?: number
  messageQueueSize?: number
  enableCompression?: boolean
  enableBinaryMessages?: boolean
}

export interface WebSocketMessage {
  id: string
  type: string
  payload: any
  timestamp: number
  priority?: 'low' | 'normal' | 'high'
}

export interface WebSocketSubscription {
  id: string
  channel: string
  callback: (data: any) => void
  filter?: (data: any) => boolean
  once?: boolean
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error' | 'reconnecting'

export class WebSocketManager {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private status: WebSocketStatus = 'disconnected'
  private subscriptions = new Map<string, WebSocketSubscription>()
  private messageQueue: WebSocketMessage[] = []
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private lastHeartbeat = 0
  private listeners = new Map<string, Set<(data: any) => void>>()

  // Performance metrics
  private metrics = {
    messagesReceived: 0,
    messagesSent: 0,
    reconnections: 0,
    errors: 0,
    latency: 0,
    uptime: 0,
    startTime: Date.now(),
  }

  constructor(config: WebSocketConfig) {
    this.config = {
      protocols: [],
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageQueueSize: 1000,
      enableCompression: true,
      enableBinaryMessages: false,
      ...config,
    }
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        this.status = 'connecting'
        this.emit('statusChange', this.status)

        this.ws = new WebSocket(this.config.url, this.config.protocols)

        // Configure WebSocket
        if (this.config.enableCompression) {
          // Note: Compression is typically handled by the browser automatically
        }

        this.ws.onopen = () => {
          this.status = 'connected'
          this.reconnectAttempts = 0
          this.metrics.startTime = Date.now()
          
          this.emit('statusChange', this.status)
          this.emit('connected')
          
          this.startHeartbeat()
          this.processMessageQueue()
          
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

        this.ws.onclose = (event) => {
          this.handleClose(event)
        }

        this.ws.onerror = (error) => {
          this.handleError(error)
          reject(error)
        }

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.CONNECTING) {
            this.ws.close()
            reject(new Error('Connection timeout'))
          }
        }, 10000)

      } catch (error) {
        this.handleError(error)
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.stopHeartbeat()
    this.stopReconnect()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    
    this.status = 'disconnected'
    this.emit('statusChange', this.status)
    this.emit('disconnected')
  }

  // Message handling
  send(message: Omit<WebSocketMessage, 'id' | 'timestamp'>): boolean {
    const fullMessage: WebSocketMessage = {
      id: this.generateId(),
      timestamp: Date.now(),
      priority: 'normal',
      ...message,
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        const serialized = JSON.stringify(fullMessage)
        this.ws.send(serialized)
        this.metrics.messagesSent++
        return true
      } catch (error) {
        this.handleError(error)
        return false
      }
    } else {
      // Queue message for later
      this.queueMessage(fullMessage)
      return false
    }
  }

  private handleMessage(event: MessageEvent): void {
    try {
      this.metrics.messagesReceived++
      
      let data: any
      
      if (typeof event.data === 'string') {
        data = JSON.parse(event.data)
      } else if (this.config.enableBinaryMessages && event.data instanceof ArrayBuffer) {
        // Handle binary messages
        data = this.parseBinaryMessage(event.data)
      } else {
        console.warn('Unsupported message format:', typeof event.data)
        return
      }

      // Handle heartbeat responses
      if (data.type === 'pong') {
        this.metrics.latency = Date.now() - this.lastHeartbeat
        return
      }

      // Process subscriptions
      this.processSubscriptions(data)
      
      // Emit to general listeners
      this.emit('message', data)
      
      // Emit to specific channel listeners
      if (data.channel) {
        this.emit(`channel:${data.channel}`, data)
      }

    } catch (error) {
      this.handleError(error)
    }
  }

  private handleClose(event: CloseEvent): void {
    this.status = 'disconnected'
    this.stopHeartbeat()
    
    this.emit('statusChange', this.status)
    this.emit('disconnected', event)

    // Auto-reconnect if not a clean close
    if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect()
    }
  }

  private handleError(error: any): void {
    this.metrics.errors++
    this.status = 'error'
    
    this.emit('statusChange', this.status)
    this.emit('error', error)
    
    console.error('WebSocket error:', error)
  }

  // Subscription management
  subscribe(channel: string, callback: (data: any) => void, options: {
    filter?: (data: any) => boolean
    once?: boolean
  } = {}): string {
    const subscription: WebSocketSubscription = {
      id: this.generateId(),
      channel,
      callback,
      filter: options.filter,
      once: options.once,
    }

    this.subscriptions.set(subscription.id, subscription)

    // Send subscription message
    this.send({
      type: 'subscribe',
      payload: { channel },
    })

    return subscription.id
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId)
    if (subscription) {
      this.subscriptions.delete(subscriptionId)
      
      // Send unsubscription message
      this.send({
        type: 'unsubscribe',
        payload: { channel: subscription.channel },
      })
    }
  }

  private processSubscriptions(data: any): void {
    for (const [id, subscription] of this.subscriptions) {
      if (data.channel === subscription.channel) {
        // Apply filter if present
        if (subscription.filter && !subscription.filter(data)) {
          continue
        }

        try {
          subscription.callback(data)
          
          // Remove one-time subscriptions
          if (subscription.once) {
            this.subscriptions.delete(id)
          }
        } catch (error) {
          console.error('Subscription callback error:', error)
        }
      }
    }
  }

  // Heartbeat mechanism
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastHeartbeat = Date.now()
        this.send({
          type: 'ping',
          payload: { timestamp: this.lastHeartbeat },
        })
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // Reconnection logic
  private scheduleReconnect(): void {
    this.stopReconnect()
    this.status = 'reconnecting'
    this.emit('statusChange', this.status)

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      this.metrics.reconnections++
      this.connect().catch(() => {
        // Reconnection failed, will try again
      })
    }, delay)
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // Message queue management
  private queueMessage(message: WebSocketMessage): void {
    // Priority queue implementation
    if (message.priority === 'high') {
      this.messageQueue.unshift(message)
    } else {
      this.messageQueue.push(message)
    }

    // Limit queue size
    if (this.messageQueue.length > this.config.messageQueueSize) {
      this.messageQueue.shift() // Remove oldest message
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!
      try {
        this.ws.send(JSON.stringify(message))
        this.metrics.messagesSent++
      } catch (error) {
        this.handleError(error)
        break
      }
    }
  }

  // Event system
  private emit(event: string, data?: any): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Event listener error:', error)
        }
      })
    }
  }

  on(event: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    this.listeners.get(event)!.add(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback)
    } else {
      this.listeners.delete(event)
    }
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private parseBinaryMessage(buffer: ArrayBuffer): any {
    // Implement binary message parsing based on your protocol
    // This is a placeholder implementation
    const view = new DataView(buffer)
    return {
      type: 'binary',
      data: Array.from(new Uint8Array(buffer)),
    }
  }

  // Public getters
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  get currentStatus(): WebSocketStatus {
    return this.status
  }

  get connectionMetrics() {
    return {
      ...this.metrics,
      uptime: this.status === 'connected' ? Date.now() - this.metrics.startTime : 0,
      subscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
    }
  }

  // Cleanup
  destroy(): void {
    this.disconnect()
    this.subscriptions.clear()
    this.messageQueue.length = 0
    this.listeners.clear()
  }
}
