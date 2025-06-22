import { WebSocketManager } from '../websocket/WebSocketManager'
import { useNotificationStore, useConnectionStore } from '@/store/advanced/store'

export interface NotificationConfig {
  enableBrowser?: boolean
  enableSound?: boolean
  enableVibration?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  maxNotifications?: number
  autoCloseDelay?: number
}

export interface RealtimeNotification {
  id: string
  type: 'transaction' | 'price_alert' | 'system' | 'trade' | 'pool' | 'governance'
  title: string
  message: string
  data?: any
  priority: 'low' | 'normal' | 'high' | 'urgent'
  timestamp: number
  userId?: string
  persistent?: boolean
  actions?: Array<{
    label: string
    action: string
    data?: any
  }>
}

export class NotificationService {
  private wsManager: WebSocketManager
  private config: Required<NotificationConfig>
  private notificationQueue: RealtimeNotification[] = []
  private activeNotifications = new Set<string>()
  private soundCache = new Map<string, HTMLAudioElement>()

  constructor(config: NotificationConfig = {}) {
    this.config = {
      enableBrowser: true,
      enableSound: true,
      enableVibration: true,
      position: 'top-right',
      maxNotifications: 5,
      autoCloseDelay: 5000,
      ...config,
    }

    // Initialize WebSocket for real-time notifications
    this.wsManager = new WebSocketManager({
      url: process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL || 'wss://api.chainbridge.com/notifications',
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
    })

    this.setupEventHandlers()
    this.preloadSounds()
    this.requestPermissions()
  }

  private setupEventHandlers(): void {
    this.wsManager.on('connected', () => {
      console.log('Notification service connected')
      this.subscribeToUserNotifications()
    })

    this.wsManager.on('message', (data) => {
      this.handleNotificationMessage(data)
    })

    this.wsManager.on('error', (error) => {
      console.error('Notification service error:', error)
    })
  }

  async start(): Promise<void> {
    try {
      await this.wsManager.connect()
    } catch (error) {
      console.error('Failed to start notification service:', error)
      throw error
    }
  }

  stop(): void {
    this.wsManager.disconnect()
    this.clearAllNotifications()
  }

  private async requestPermissions(): Promise<void> {
    // Request browser notification permission
    if (this.config.enableBrowser && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    }

    // Request vibration permission (automatically granted)
    if (this.config.enableVibration && 'vibrate' in navigator) {
      // Vibration API doesn't require explicit permission
    }
  }

  private preloadSounds(): void {
    const sounds = {
      default: '/sounds/notification.mp3',
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      warning: '/sounds/warning.mp3',
      urgent: '/sounds/urgent.mp3',
    }

    Object.entries(sounds).forEach(([key, url]) => {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audio.volume = 0.3
      this.soundCache.set(key, audio)
    })
  }

  private subscribeToUserNotifications(): void {
    const connectionStore = useConnectionStore.getState()
    const userAddress = connectionStore.getAddress()

    if (userAddress) {
      // Subscribe to user-specific notifications
      this.wsManager.subscribe(`notifications.${userAddress}`, (data) => {
        this.handleUserNotification(data)
      })

      // Subscribe to global notifications
      this.wsManager.subscribe('notifications.global', (data) => {
        this.handleGlobalNotification(data)
      })

      // Send user identification
      this.wsManager.send({
        type: 'identify',
        payload: {
          userId: userAddress,
          preferences: this.config,
        },
      })
    }
  }

  private handleNotificationMessage(data: any): void {
    try {
      if (data.type === 'notification') {
        const notification: RealtimeNotification = {
          id: data.id || this.generateId(),
          type: data.notificationType || 'system',
          title: data.title,
          message: data.message,
          data: data.data,
          priority: data.priority || 'normal',
          timestamp: data.timestamp || Date.now(),
          userId: data.userId,
          persistent: data.persistent || false,
          actions: data.actions,
        }

        this.processNotification(notification)
      }
    } catch (error) {
      console.error('Error handling notification message:', error)
    }
  }

  private handleUserNotification(data: any): void {
    // Handle user-specific notifications (transactions, alerts, etc.)
    this.handleNotificationMessage(data)
  }

  private handleGlobalNotification(data: any): void {
    // Handle global notifications (system updates, maintenance, etc.)
    this.handleNotificationMessage(data)
  }

  private processNotification(notification: RealtimeNotification): void {
    // Add to queue
    this.notificationQueue.push(notification)

    // Process queue
    this.processNotificationQueue()

    // Add to store
    const notificationStore = useNotificationStore.getState()
    notificationStore.addNotification({
      type: this.mapNotificationType(notification.type),
      title: notification.title,
      message: notification.message,
      read: false,
      persistent: notification.persistent || false,
      actions: notification.actions?.map(action => ({
        label: action.label,
        action: () => this.handleNotificationAction(action),
      })),
    })

    // Show browser notification
    if (this.config.enableBrowser) {
      this.showBrowserNotification(notification)
    }

    // Play sound
    if (this.config.enableSound) {
      this.playNotificationSound(notification)
    }

    // Vibrate
    if (this.config.enableVibration) {
      this.vibrateDevice(notification)
    }
  }

  private processNotificationQueue(): void {
    // Limit active notifications
    while (this.activeNotifications.size >= this.config.maxNotifications && this.notificationQueue.length > 0) {
      const oldestId = Array.from(this.activeNotifications)[0]
      this.dismissNotification(oldestId)
    }

    // Process queued notifications
    while (this.notificationQueue.length > 0 && this.activeNotifications.size < this.config.maxNotifications) {
      const notification = this.notificationQueue.shift()!
      this.showNotification(notification)
    }
  }

  private showNotification(notification: RealtimeNotification): void {
    this.activeNotifications.add(notification.id)

    // Auto-dismiss after delay (unless persistent)
    if (!notification.persistent && this.config.autoCloseDelay > 0) {
      setTimeout(() => {
        this.dismissNotification(notification.id)
      }, this.config.autoCloseDelay)
    }
  }

  private showBrowserNotification(notification: RealtimeNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        silent: !this.config.enableSound,
      })

      browserNotification.onclick = () => {
        window.focus()
        browserNotification.close()
        
        // Handle notification click
        if (notification.actions && notification.actions.length > 0) {
          this.handleNotificationAction(notification.actions[0])
        }
      }

      // Auto-close browser notification
      if (!notification.persistent) {
        setTimeout(() => {
          browserNotification.close()
        }, this.config.autoCloseDelay)
      }
    }
  }

  private playNotificationSound(notification: RealtimeNotification): void {
    let soundKey = 'default'

    switch (notification.priority) {
      case 'urgent':
        soundKey = 'urgent'
        break
      case 'high':
        soundKey = 'warning'
        break
      default:
        switch (notification.type) {
          case 'transaction':
            soundKey = 'success'
            break
          case 'price_alert':
            soundKey = 'warning'
            break
          default:
            soundKey = 'default'
        }
    }

    const audio = this.soundCache.get(soundKey)
    if (audio) {
      audio.currentTime = 0
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      })
    }
  }

  private vibrateDevice(notification: RealtimeNotification): void {
    if ('vibrate' in navigator) {
      let pattern: number[] = [200] // Default vibration

      switch (notification.priority) {
        case 'urgent':
          pattern = [200, 100, 200, 100, 200]
          break
        case 'high':
          pattern = [200, 100, 200]
          break
        case 'normal':
          pattern = [200]
          break
        case 'low':
          pattern = [100]
          break
      }

      navigator.vibrate(pattern)
    }
  }

  private handleNotificationAction(action: any): void {
    try {
      switch (action.action) {
        case 'view_transaction':
          window.open(`https://etherscan.io/tx/${action.data.hash}`, '_blank')
          break
        case 'view_pool':
          window.location.href = `/pools/${action.data.poolId}`
          break
        case 'dismiss':
          // Already handled by dismissNotification
          break
        default:
          console.warn('Unknown notification action:', action.action)
      }
    } catch (error) {
      console.error('Error handling notification action:', error)
    }
  }

  private dismissNotification(notificationId: string): void {
    this.activeNotifications.delete(notificationId)
  }

  private clearAllNotifications(): void {
    this.activeNotifications.clear()
    this.notificationQueue.length = 0
  }

  private mapNotificationType(type: string): 'success' | 'error' | 'warning' | 'info' {
    switch (type) {
      case 'transaction':
        return 'success'
      case 'price_alert':
        return 'warning'
      case 'system':
        return 'info'
      case 'trade':
        return 'success'
      case 'pool':
        return 'info'
      case 'governance':
        return 'info'
      default:
        return 'info'
    }
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Public methods
  updateConfig(config: Partial<NotificationConfig>): void {
    Object.assign(this.config, config)
  }

  // Send custom notification
  sendNotification(notification: Omit<RealtimeNotification, 'id' | 'timestamp'>): void {
    const fullNotification: RealtimeNotification = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...notification,
    }

    this.processNotification(fullNotification)
  }

  // Get connection status
  get isConnected(): boolean {
    return this.wsManager.isConnected
  }

  get connectionMetrics() {
    return this.wsManager.connectionMetrics
  }
}
