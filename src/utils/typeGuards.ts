import { NavigationItemId } from '@/constants/navigation'

export function isValidNavigationId(id: string): id is NavigationItemId {
  return ['swap', 'liquidity', 'portfolio', 'analytics'].includes(id)
}

export function isValidChainId(chainId: unknown): chainId is number {
  return typeof chainId === 'number' && chainId > 0
}

export function isValidAddress(address: unknown): address is string {
  return typeof address === 'string' && /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function isValidSlippage(slippage: unknown): slippage is number {
  return typeof slippage === 'number' && slippage >= 0 && slippage <= 100
}
