import { screen, fireEvent, waitFor } from '@testing-library/react'
import { render, mockWalletConnection } from '@/test/utils/testUtils'
import { WalletConnectButton } from '../WalletConnectButton'
import { useWalletConnection } from '@/hooks/useWalletConnection'
import { useWalletNotifications } from '@/hooks/useWalletNotifications'
import { vi } from 'vitest'

// Mock hooks
vi.mock('@/hooks/useWalletConnection')
vi.mock('@/hooks/useWalletNotifications')

const mockUseWalletConnection = vi.mocked(useWalletConnection)
const mockUseWalletNotifications = vi.mocked(useWalletNotifications)

describe('WalletConnectButton', () => {
  const mockShowDisconnectNotification = vi.fn()
  const mockHandleConnect = vi.fn()
  const mockHandleDisconnect = vi.fn()
  const mockFormatAddress = vi.fn((address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`)

  beforeEach(() => {
    mockUseWalletNotifications.mockReturnValue({
      showDisconnectNotification: mockShowDisconnectNotification,
      showConnectNotification: jest.fn(),
      showErrorNotification: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('when wallet is not connected', () => {
    beforeEach(() => {
      mockUseWalletConnection.mockReturnValue({
        address: undefined,
        isConnected: false,
        isConnecting: false,
        isPending: false,
        connectors: [
          { id: 'metamask', name: 'MetaMask' },
          { id: 'walletconnect', name: 'WalletConnect' },
        ],
        handleConnect: mockHandleConnect,
        handleDisconnect: mockHandleDisconnect,
        formatAddress: mockFormatAddress,
      })
    })

    it('renders connect wallet button', () => {
      render(<WalletConnectButton />)
      
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
    })

    it('shows connector options when clicked', async () => {
      render(<WalletConnectButton />)
      
      fireEvent.click(screen.getByText('Connect Wallet'))
      
      await waitFor(() => {
        expect(screen.getByText('MetaMask')).toBeInTheDocument()
        expect(screen.getByText('WalletConnect')).toBeInTheDocument()
      })
    })

    it('calls handleConnect when connector is selected', async () => {
      render(<WalletConnectButton />)
      
      fireEvent.click(screen.getByText('Connect Wallet'))
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('MetaMask'))
      })
      
      expect(mockHandleConnect).toHaveBeenCalledWith({ id: 'metamask', name: 'MetaMask' })
    })
  })

  describe('when wallet is connecting', () => {
    beforeEach(() => {
      mockUseWalletConnection.mockReturnValue({
        address: undefined,
        isConnected: false,
        isConnecting: true,
        isPending: false,
        connectors: [],
        handleConnect: mockHandleConnect,
        handleDisconnect: mockHandleDisconnect,
        formatAddress: mockFormatAddress,
      })
    })

    it('shows connecting state', () => {
      render(<WalletConnectButton />)
      
      expect(screen.getByText('Connecting...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })
  })

  describe('when wallet is connected', () => {
    beforeEach(() => {
      mockUseWalletConnection.mockReturnValue({
        address: mockWalletConnection.address,
        isConnected: true,
        isConnecting: false,
        isPending: false,
        connectors: [],
        handleConnect: mockHandleConnect,
        handleDisconnect: mockHandleDisconnect,
        formatAddress: mockFormatAddress,
      })
    })

    it('shows formatted address', () => {
      render(<WalletConnectButton />)
      
      expect(screen.getByText('0x1234...7890')).toBeInTheDocument()
    })

    it('shows disconnect option when clicked', async () => {
      render(<WalletConnectButton />)
      
      fireEvent.click(screen.getByText('0x1234...7890'))
      
      await waitFor(() => {
        expect(screen.getByText('Disconnect Wallet')).toBeInTheDocument()
      })
    })

    it('calls handleDisconnect and shows notification when disconnect is clicked', async () => {
      render(<WalletConnectButton />)
      
      fireEvent.click(screen.getByText('0x1234...7890'))
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Disconnect Wallet'))
      })
      
      expect(mockHandleDisconnect).toHaveBeenCalled()
      expect(mockShowDisconnectNotification).toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA labels', () => {
      mockUseWalletConnection.mockReturnValue({
        address: undefined,
        isConnected: false,
        isConnecting: false,
        isPending: false,
        connectors: [{ id: 'metamask', name: 'MetaMask' }],
        handleConnect: mockHandleConnect,
        handleDisconnect: mockHandleDisconnect,
        formatAddress: mockFormatAddress,
      })

      render(<WalletConnectButton />)
      
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('is keyboard navigable', async () => {
      mockUseWalletConnection.mockReturnValue({
        address: undefined,
        isConnected: false,
        isConnecting: false,
        isPending: false,
        connectors: [{ id: 'metamask', name: 'MetaMask' }],
        handleConnect: mockHandleConnect,
        handleDisconnect: mockHandleDisconnect,
        formatAddress: mockFormatAddress,
      })

      render(<WalletConnectButton />)
      
      const button = screen.getByRole('button')
      button.focus()
      
      expect(button).toHaveFocus()
    })
  })
})
