'use client'

import React, { useEffect, useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Progress,
  Collapse,
  IconButton,
  useDisclosure,
  useColorModeValue,
  Tooltip,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
} from '@chakra-ui/react'
import { FiActivity, FiEye, FiEyeOff, FiRefreshCw } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import {
  usePerformanceObserver,
  useMemoryMonitor,
  usePerformanceBudget,
  WebVitalsMetric,
} from '@/hooks/usePerformance'

const MotionBox = motion(Box)

interface PerformanceMonitorProps {
  showInProduction?: boolean
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showInProduction = false,
  position = 'bottom-right',
}) => {
  const { isOpen, onToggle } = useDisclosure()
  const [webVitals, setWebVitals] = useState<WebVitalsMetric[]>([])
  const [renderCount, setRenderCount] = useState(0)
  const [lastUpdate, setLastUpdate] = useState(Date.now())

  const { metrics, reportMetric } = usePerformanceObserver()
  const memoryInfo = useMemoryMonitor()
  const violations = usePerformanceBudget({
    bundleSize: 500000, // 500KB
    memory: 50000000, // 50MB
  })

  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  // Don't show in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null
  }

  useEffect(() => {
    setRenderCount(prev => prev + 1)
    setLastUpdate(Date.now())
  })

  // Load Web Vitals
  useEffect(() => {
    const loadWebVitals = async () => {
      try {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = await import('web-vitals')
        
        const handleMetric = (metric: any) => {
          const webVitalMetric: WebVitalsMetric = {
            name: metric.name,
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
            id: metric.id,
          }
          
          setWebVitals(prev => {
            const existing = prev.findIndex(m => m.name === metric.name)
            if (existing >= 0) {
              const updated = [...prev]
              updated[existing] = webVitalMetric
              return updated
            }
            return [...prev, webVitalMetric]
          })
          
          reportMetric(webVitalMetric)
        }

        getCLS(handleMetric)
        getFID(handleMetric)
        getFCP(handleMetric)
        getLCP(handleMetric)
        getTTFB(handleMetric)
      } catch (error) {
        console.warn('Failed to load Web Vitals:', error)
      }
    }

    loadWebVitals()
  }, [reportMetric])

  const getPositionStyles = () => {
    const base = {
      position: 'fixed' as const,
      zIndex: 9999,
    }

    switch (position) {
      case 'top-left':
        return { ...base, top: 4, left: 4 }
      case 'top-right':
        return { ...base, top: 4, right: 4 }
      case 'bottom-left':
        return { ...base, bottom: 4, left: 4 }
      case 'bottom-right':
      default:
        return { ...base, bottom: 4, right: 4 }
    }
  }

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'green'
      case 'needs-improvement':
        return 'yellow'
      case 'poor':
        return 'red'
      default:
        return 'gray'
    }
  }

  const formatValue = (name: string, value: number) => {
    switch (name) {
      case 'CLS':
        return value.toFixed(3)
      case 'FID':
      case 'FCP':
      case 'LCP':
      case 'TTFB':
        return `${Math.round(value)}ms`
      default:
        return value.toString()
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <MotionBox
      {...getPositionStyles()}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Toggle Button */}
      <Tooltip label={isOpen ? 'Hide Performance Monitor' : 'Show Performance Monitor'}>
        <IconButton
          aria-label="Toggle performance monitor"
          icon={isOpen ? <FiEyeOff /> : <FiActivity />}
          size="sm"
          colorScheme="blue"
          variant="solid"
          onClick={onToggle}
          mb={isOpen ? 2 : 0}
        />
      </Tooltip>

      {/* Performance Panel */}
      <AnimatePresence>
        {isOpen && (
          <MotionBox
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            bg={bg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="lg"
            p={4}
            boxShadow="xl"
            minW="300px"
            maxW="400px"
            maxH="500px"
            overflowY="auto"
          >
            <VStack spacing={4} align="stretch">
              {/* Header */}
              <HStack justify="space-between">
                <Text fontSize="sm" fontWeight="bold">
                  Performance Monitor
                </Text>
                <HStack spacing={1}>
                  <Badge colorScheme="blue" size="sm">
                    {renderCount} renders
                  </Badge>
                  <IconButton
                    aria-label="Refresh metrics"
                    icon={<FiRefreshCw />}
                    size="xs"
                    variant="ghost"
                    onClick={() => window.location.reload()}
                  />
                </HStack>
              </HStack>

              {/* Web Vitals */}
              {webVitals.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" mb={2} color="gray.500">
                    Core Web Vitals
                  </Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                    {webVitals.map((metric) => (
                      <GridItem key={metric.name}>
                        <Stat size="sm">
                          <StatLabel fontSize="xs">{metric.name}</StatLabel>
                          <StatNumber fontSize="sm">
                            {formatValue(metric.name, metric.value)}
                          </StatNumber>
                          <StatHelpText fontSize="xs" m={0}>
                            <Badge
                              size="xs"
                              colorScheme={getRatingColor(metric.rating)}
                            >
                              {metric.rating}
                            </Badge>
                          </StatHelpText>
                        </Stat>
                      </GridItem>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* Memory Usage */}
              {memoryInfo && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" mb={2} color="gray.500">
                    Memory Usage
                  </Text>
                  <VStack spacing={2} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="xs">Used JS Heap</Text>
                      <Text fontSize="xs" fontWeight="semibold">
                        {formatBytes(memoryInfo.usedJSHeapSize)}
                      </Text>
                    </HStack>
                    <Progress
                      value={(memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100}
                      size="sm"
                      colorScheme="blue"
                    />
                    <HStack justify="space-between" fontSize="xs" color="gray.500">
                      <Text>Total: {formatBytes(memoryInfo.totalJSHeapSize)}</Text>
                      <Text>Limit: {formatBytes(memoryInfo.jsHeapSizeLimit)}</Text>
                    </HStack>
                  </VStack>
                </Box>
              )}

              {/* Performance Violations */}
              {violations.length > 0 && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" mb={2} color="red.500">
                    Performance Issues
                  </Text>
                  <VStack spacing={1} align="stretch">
                    {violations.map((violation, index) => (
                      <Text key={index} fontSize="xs" color="red.500">
                        ⚠️ {violation}
                      </Text>
                    ))}
                  </VStack>
                </Box>
              )}

              {/* Network Information */}
              {typeof navigator !== 'undefined' && 'connection' in navigator && (
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" mb={2} color="gray.500">
                    Network
                  </Text>
                  <HStack justify="space-between" fontSize="xs">
                    <Text>Type:</Text>
                    <Text fontWeight="semibold">
                      {(navigator as any).connection?.effectiveType || 'Unknown'}
                    </Text>
                  </HStack>
                  <HStack justify="space-between" fontSize="xs">
                    <Text>Downlink:</Text>
                    <Text fontWeight="semibold">
                      {(navigator as any).connection?.downlink || 'Unknown'} Mbps
                    </Text>
                  </HStack>
                </Box>
              )}

              {/* Last Update */}
              <Text fontSize="xs" color="gray.400" textAlign="center">
                Last update: {new Date(lastUpdate).toLocaleTimeString()}
              </Text>
            </VStack>
          </MotionBox>
        )}
      </AnimatePresence>
    </MotionBox>
  )
}

// Development-only performance overlay
export const DevPerformanceOverlay: React.FC = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return <PerformanceMonitor showInProduction={false} position="bottom-right" />
}
