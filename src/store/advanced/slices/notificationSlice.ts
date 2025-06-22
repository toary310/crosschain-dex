import { StateCreator } from 'zustand'
import { Notification, NotificationState, Store } from '../types'

// Default notification state
const defaultNotificationState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  settings: {
    enabled: true,
    sound: true,
    desktop: true,
    position: 'top-right',
  },
}

export const createNotificationSlice: StateCreator<
  Store,
  [['zustand/immer', never], ['zustand/persist', unknown], ['zustand/subscribeWithSelector', never], ['zustand/devtools', never]],
  [],
  Pick<Store,
    'notifications' |
    'addNotification' |
    'removeNotification' |
    'markAsRead' |
    'markAllAsRead' |
    'clearNotifications' |
    'updateNotificationSettings' |
    'getUnreadNotifications' |
    'getUnreadCount'
  >
> = (set, get) => ({
  // State
  notifications: defaultNotificationState,

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) =>
    set((state: Store) => {
      const newNotification: Notification = {
        ...notification,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      }

      state.notifications.notifications.unshift(newNotification)

      // Update unread count
      if (!newNotification.read) {
        state.notifications.unreadCount += 1
      }

      // Limit notifications to 50
      if (state.notifications.notifications.length > 50) {
        const removed = state.notifications.notifications.splice(50)
        // Adjust unread count for removed notifications
        const removedUnread = removed.filter(n => !n.read).length
        state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - removedUnread)
      }

      // Show browser notification if enabled
      if (state.notifications.settings.enabled && state.notifications.settings.desktop) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/favicon.ico',
            tag: newNotification.id,
          })
        }
      }

      // Play sound if enabled
      if (state.notifications.settings.enabled && state.notifications.settings.sound) {
        try {
          const audio = new Audio('/sounds/notification.mp3')
          audio.volume = 0.3
          audio.play().catch(() => {
            // Ignore audio play errors
          })
        } catch (error) {
          // Ignore audio errors
        }
      }

      state.trackEvent('notification_added', {
        type: newNotification.type,
        title: newNotification.title,
      })
    }),

  removeNotification: (id: string) =>
    set((state: Store) => {
      const index = state.notifications.notifications.findIndex(n => n.id === id)
      if (index >= 0) {
        const notification = state.notifications.notifications[index]
        state.notifications.notifications.splice(index, 1)

        // Update unread count
        if (!notification.read) {
          state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1)
        }

        state.trackEvent('notification_removed', {
          id,
          type: notification.type,
        })
      }
    }),

  markAsRead: (id: string) =>
    set((state: Store) => {
      const notification = state.notifications.notifications.find(n => n.id === id)
      if (notification && !notification.read) {
        notification.read = true
        state.notifications.unreadCount = Math.max(0, state.notifications.unreadCount - 1)

        state.trackEvent('notification_read', {
          id,
          type: notification.type,
        })
      }
    }),

  markAllAsRead: () =>
    set((state: Store) => {
      state.notifications.notifications.forEach(notification => {
        notification.read = true
      })
      state.notifications.unreadCount = 0

      state.trackEvent('notifications_all_read')
    }),

  clearNotifications: () =>
    set((state: Store) => {
      const persistentNotifications = state.notifications.notifications.filter(n => n.persistent)
      state.notifications.notifications = persistentNotifications
      state.notifications.unreadCount = persistentNotifications.filter(n => !n.read).length

      state.trackEvent('notifications_cleared')
    }),

  updateNotificationSettings: (settings: Partial<NotificationState['settings']>) =>
    set((state: Store) => {
      Object.assign(state.notifications.settings, settings)

      // Request permission for desktop notifications if enabled
      if (settings.desktop && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            state.addNotification({
              type: 'success',
              title: 'Desktop Notifications Enabled',
              message: 'You will now receive desktop notifications.',
              read: false,
              persistent: false,
            })
          }
        })
      }

      state.trackEvent('notification_settings_updated', {
        settings: Object.keys(settings),
      })
    }),

  // Selectors
  getUnreadNotifications: () => {
    return get().notifications.notifications.filter(n => !n.read)
  },

  getUnreadCount: () => {
    return get().notifications.unreadCount
  },
})

// Auto-cleanup old notifications
export const setupNotificationCleanup = (getStore: () => Store) => {
  if (typeof window !== 'undefined') {
    setInterval(() => {
      const store = getStore()
      if (store) {
        const now = Date.now()
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000)

        store.notifications.notifications = store.notifications.notifications.filter(notification => {
          // Keep persistent notifications and recent notifications
          return notification.persistent || notification.timestamp > oneWeekAgo
        })

        // Recalculate unread count
        store.notifications.unreadCount = store.notifications.notifications.filter(n => !n.read).length
      }
    }, 60 * 60 * 1000) // Run every hour
  }
}
