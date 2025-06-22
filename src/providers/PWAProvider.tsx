'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  Box,
  Button,
  HStack,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  VStack,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDownload, FiWifi, FiWifiOff, FiRefreshCw } from 'react-icons/fi'
import { usePWAInstall, useNetworkStatus } from '@/hooks/useMobile'
import { useNotificationStore } from '@/store/advanced/store'

const MotionBox = motion(Box)

interface PWAContextType {
  isInstallable: boolean
  isInstalled: boolean
  isOnline: boolean
  connectionType: string
  effectiveType: string
  promptInstall: () => Promise<boolean>
  updateAvailable: boolean
  updateApp: () => void
}

const PWAContext = createContext<PWAContextType | undefined>(undefined)

export const usePWA = () => {
  const context = useContext(PWAContext)
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}

interface PWAProviderProps {
  children: React.ReactNode
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall()
  const { isOnline, connectionType, effectiveType } = useNetworkStatus()
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showOfflineAlert, setShowOfflineAlert] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  const toast = useToast()
  const { addNotification } = useNotificationStore()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered:', reg)
          setRegistration(reg)

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                  addNotification({
                    type: 'info',
                    title: 'App Update Available',
                    message: 'A new version of the app is ready to install.',
                    read: false,
                    persistent: true,
                  })
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'transaction-synced') {
          toast({
            title: 'Transaction Synced',
            description: 'Your offline transaction has been processed.',
            status: 'success',
            duration: 5000,
          })
        }
      })
    }
  }, [addNotification, toast])

  // Show install prompt after delay
  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true)
      }, 30000) // Show after 30 seconds

      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  // Handle offline status
  useEffect(() => {
    if (!isOnline) {
      setShowOfflineAlert(true)
      addNotification({
        type: 'warning',
        title: 'You are offline',
        message: 'Some features may be limited while offline.',
        read: false,
        persistent: false,
      })
    } else {
      setShowOfflineAlert(false)
    }
  }, [isOnline, addNotification])

  const handleInstall = async () => {
    const installed = await promptInstall()
    if (installed) {
      setShowInstallPrompt(false)
      toast({
        title: 'App Installed',
        description: 'ChainBridge DEX has been installed on your device.',
        status: 'success',
        duration: 5000,
      })
    }
  }

  const updateApp = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  const contextValue: PWAContextType = {
    isInstallable,
    isInstalled,
    isOnline,
    connectionType,
    effectiveType,
    promptInstall,
    updateAvailable,
    updateApp,
  }

  return (
    <PWAContext.Provider value={contextValue}>
      {children}

      {/* Install Prompt */}
      <AnimatePresence>
        {showInstallPrompt && (
          <MotionBox
            position="fixed"
            bottom={4}
            left={4}
            right={4}
            zIndex={9999}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3 }}
          >
            <Alert
              status="info"
              variant="solid"
              borderRadius="lg"
              bg={bg}
              color="inherit"
              border="1px solid"
              borderColor={borderColor}
              boxShadow="xl"
            >
              <AlertIcon as={FiDownload} />
              <Box flex="1">
                <AlertTitle fontSize="sm">Install App</AlertTitle>
                <AlertDescription fontSize="xs">
                  Install ChainBridge DEX for a better experience
                </AlertDescription>
              </Box>
              <VStack spacing={2}>
                <Button size="xs" colorScheme="blue" onClick={handleInstall}>
                  Install
                </Button>
                <CloseButton
                  size="sm"
                  onClick={() => setShowInstallPrompt(false)}
                />
              </VStack>
            </Alert>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Offline Alert */}
      <AnimatePresence>
        {showOfflineAlert && (
          <MotionBox
            position="fixed"
            top={4}
            left={4}
            right={4}
            zIndex={9999}
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.3 }}
          >
            <Alert
              status="warning"
              variant="solid"
              borderRadius="lg"
              bg={bg}
              color="inherit"
              border="1px solid"
              borderColor="orange.500"
              boxShadow="xl"
            >
              <AlertIcon as={FiWifiOff} />
              <Box flex="1">
                <AlertTitle fontSize="sm">You are offline</AlertTitle>
                <AlertDescription fontSize="xs">
                  Some features may be limited
                </AlertDescription>
              </Box>
              <CloseButton
                size="sm"
                onClick={() => setShowOfflineAlert(false)}
              />
            </Alert>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Update Available Alert */}
      <AnimatePresence>
        {updateAvailable && (
          <MotionBox
            position="fixed"
            top={4}
            left={4}
            right={4}
            zIndex={9999}
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.3 }}
          >
            <Alert
              status="info"
              variant="solid"
              borderRadius="lg"
              bg={bg}
              color="inherit"
              border="1px solid"
              borderColor="blue.500"
              boxShadow="xl"
            >
              <AlertIcon as={FiRefreshCw} />
              <Box flex="1">
                <AlertTitle fontSize="sm">Update Available</AlertTitle>
                <AlertDescription fontSize="xs">
                  A new version is ready to install
                </AlertDescription>
              </Box>
              <VStack spacing={2}>
                <Button size="xs" colorScheme="blue" onClick={updateApp}>
                  Update
                </Button>
                <CloseButton
                  size="sm"
                  onClick={() => setUpdateAvailable(false)}
                />
              </VStack>
            </Alert>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Network Status Indicator */}
      <Box
        position="fixed"
        top={4}
        right={4}
        zIndex={1000}
      >
        <HStack spacing={2}>
          {!isOnline && (
            <Badge colorScheme="red" variant="solid">
              <HStack spacing={1}>
                <FiWifiOff size={12} />
                <Text fontSize="xs">Offline</Text>
              </HStack>
            </Badge>
          )}
          
          {isOnline && effectiveType && effectiveType !== '4g' && (
            <Badge
              colorScheme={effectiveType === '2g' ? 'red' : effectiveType === '3g' ? 'yellow' : 'green'}
              variant="subtle"
            >
              <HStack spacing={1}>
                <FiWifi size={12} />
                <Text fontSize="xs">{effectiveType.toUpperCase()}</Text>
              </HStack>
            </Badge>
          )}
        </HStack>
      </Box>
    </PWAContext.Provider>
  )
}

// PWA Status Component
export const PWAStatus: React.FC = () => {
  const { isInstalled, isOnline, effectiveType } = usePWA()

  return (
    <HStack spacing={2}>
      {isInstalled && (
        <Badge colorScheme="green" variant="subtle">
          PWA
        </Badge>
      )}
      
      <Badge
        colorScheme={isOnline ? 'green' : 'red'}
        variant="subtle"
      >
        {isOnline ? 'Online' : 'Offline'}
      </Badge>
      
      {isOnline && effectiveType && (
        <Badge colorScheme="blue" variant="subtle">
          {effectiveType.toUpperCase()}
        </Badge>
      )}
    </HStack>
  )
}

// Install Button Component
export const InstallButton: React.FC = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWA()

  if (isInstalled || !isInstallable) {
    return null
  }

  return (
    <Button
      leftIcon={<FiDownload />}
      size="sm"
      colorScheme="blue"
      variant="outline"
      onClick={promptInstall}
    >
      Install App
    </Button>
  )
}
