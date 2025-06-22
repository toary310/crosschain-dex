interface NavigationItem {
  readonly id: string
  readonly label: string
  readonly path: string
}

export const NAVIGATION_ITEMS = [
  { id: 'swap', label: 'Swap', path: '/swap' },
  { id: 'pools', label: 'Pools', path: '/pools' },
  { id: 'portfolio', label: 'Portfolio', path: '/portfolio' },
  { id: 'analytics', label: 'Analytics', path: '/analytics' },
] as const satisfies readonly NavigationItem[]

export type NavigationItemId = typeof NAVIGATION_ITEMS[number]['id']
export type NavigationPath = typeof NAVIGATION_ITEMS[number]['path']

export const DEFAULT_ACTIVE_TAB: NavigationItemId = 'swap'

// Type guard for navigation validation
export const isValidNavigationId = (id: string): id is NavigationItemId => {
  return NAVIGATION_ITEMS.some(item => item.id === id)
}

// Helper to get navigation item by id
export const getNavigationItem = (id: NavigationItemId): typeof NAVIGATION_ITEMS[number] => {
  const item = NAVIGATION_ITEMS.find(item => item.id === id)
  if (!item) {
    throw new Error(`Navigation item with id "${id}" not found`)
  }
  return item
}
