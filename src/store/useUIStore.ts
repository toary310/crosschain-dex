import { DEFAULT_ACTIVE_TAB, NavigationItemId } from '@/constants/navigation'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface UIState {
  isSidebarOpen: boolean
  isMobileMenuOpen: boolean
  isWalletModalOpen: boolean
  isSettingsModalOpen: boolean
  activeTab: NavigationItemId
}

interface UIActions {
  setSidebarOpen: (open: boolean) => void
  setMobileMenuOpen: (open: boolean) => void
  setWalletModalOpen: (open: boolean) => void
  setSettingsModalOpen: (open: boolean) => void
  setActiveTab: (tab: NavigationItemId) => void
  toggleSidebar: () => void
  toggleMobileMenu: () => void
  closeAllModals: () => void
}

type UIStore = UIState & UIActions

const initialState: UIState = {
  isSidebarOpen: false,
  isMobileMenuOpen: false,
  isWalletModalOpen: false,
  isSettingsModalOpen: false,
  activeTab: DEFAULT_ACTIVE_TAB,
}

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setSidebarOpen: (isSidebarOpen) =>
        set(() => ({ isSidebarOpen }), false, 'setSidebarOpen'),

      setMobileMenuOpen: (isMobileMenuOpen) =>
        set(() => ({ isMobileMenuOpen }), false, 'setMobileMenuOpen'),

      setWalletModalOpen: (isWalletModalOpen) =>
        set(() => ({ isWalletModalOpen }), false, 'setWalletModalOpen'),

      setSettingsModalOpen: (isSettingsModalOpen) =>
        set(() => ({ isSettingsModalOpen }), false, 'setSettingsModalOpen'),

      setActiveTab: (activeTab) =>
        set(() => ({ activeTab }), false, 'setActiveTab'),

      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }), false, 'toggleSidebar'),

      toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen }), false, 'toggleMobileMenu'),

      closeAllModals: () =>
        set(() => ({
          isWalletModalOpen: false,
          isSettingsModalOpen: false,
          isMobileMenuOpen: false,
        }), false, 'closeAllModals'),
    }),
    {
      name: 'ui-store',
    }
  )
)
