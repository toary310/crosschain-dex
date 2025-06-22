export const NAVIGATION_ITEMS = [
  { id: 'swap', label: 'Swap', path: '/swap' },
  { id: 'liquidity', label: 'Liquidity', path: '/liquidity' },
  { id: 'portfolio', label: 'Portfolio', path: '/portfolio' },
  { id: 'analytics', label: 'Analytics', path: '/analytics' },
] as const

export type NavigationItemId = typeof NAVIGATION_ITEMS[number]['id']

export const DEFAULT_ACTIVE_TAB: NavigationItemId = 'swap'
