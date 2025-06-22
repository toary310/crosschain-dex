'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Skeleton,
  Text,
  useColorMode,
  useColorModeValue,
  VStack,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { useIsMobile } from '@/hooks/useMobileOptimized'

const MotionBox = motion(Box)

// TradingView widget configuration
interface TradingViewConfig {
  symbol: string
  interval: string
  theme: 'light' | 'dark'
  style: string
  locale: string
  toolbar_bg: string
  enable_publishing: boolean
  allow_symbol_change: boolean
  container_id: string
  height: number
  width: string
}

interface TradingViewChartProps {
  symbol?: string
  height?: number
  showToolbar?: boolean
  showVolumeProfile?: boolean
  enableDrawing?: boolean
  enableIndicators?: boolean
  autosize?: boolean
}

declare global {
  interface Window {
    TradingView: any
  }
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol = 'BINANCE:ETHUSDT',
  height = 500,
  showToolbar = true,
  showVolumeProfile = true,
  enableDrawing = true,
  enableIndicators = true,
  autosize = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  
  const { colorMode } = useColorMode()
  const { isMobile } = useIsMobile()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  // Load TradingView script
  useEffect(() => {
    if (typeof window === 'undefined') return

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => setError('Failed to load TradingView script')
    
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  // Initialize TradingView widget
  useEffect(() => {
    if (!scriptLoaded || !window.TradingView || !containerRef.current) return

    try {
      const config: TradingViewConfig = {
        symbol,
        interval: isMobile ? '1H' : '15',
        theme: colorMode,
        style: '1',
        locale: 'en',
        toolbar_bg: colorMode === 'dark' ? '#1a202c' : '#ffffff',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerRef.current.id,
        height: isMobile ? 400 : height,
        width: autosize ? '100%' : '800',
      }

      // Advanced configuration for professional features
      const advancedConfig = {
        ...config,
        // Chart settings
        hide_side_toolbar: !showToolbar || isMobile,
        hide_legend: isMobile,
        hide_top_toolbar: isMobile,
        // Studies and indicators
        studies: enableIndicators ? [
          'MASimple@tv-basicstudies',
          'RSI@tv-basicstudies',
          'MACD@tv-basicstudies',
        ] : [],
        // Volume profile
        volume_profile: showVolumeProfile,
        // Drawing tools
        drawings_access: {
          type: enableDrawing ? 'black' : 'white',
          tools: enableDrawing ? [
            { name: 'Regression Trend' },
            { name: 'Trend Line' },
            { name: 'Horizontal Line' },
            { name: 'Rectangle' },
          ] : [],
        },
        // Mobile optimizations
        ...(isMobile && {
          hide_side_toolbar: true,
          hide_legend: true,
          hide_top_toolbar: false,
          toolbar_bg: colorMode === 'dark' ? '#1a202c' : '#ffffff',
        }),
      }

      widgetRef.current = new window.TradingView.widget(advancedConfig)
      
      widgetRef.current.onChartReady(() => {
        setIsLoading(false)
        setError(null)
      })

    } catch (err) {
      setError('Failed to initialize TradingView chart')
      setIsLoading(false)
    }

    return () => {
      if (widgetRef.current && widgetRef.current.remove) {
        widgetRef.current.remove()
      }
    }
  }, [
    scriptLoaded,
    symbol,
    colorMode,
    height,
    showToolbar,
    showVolumeProfile,
    enableDrawing,
    enableIndicators,
    autosize,
    isMobile,
  ])

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const handleRefresh = () => {
    if (widgetRef.current && widgetRef.current.chart) {
      widgetRef.current.chart().resetData()
    }
  }

  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w']
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m')

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe)
    if (widgetRef.current && widgetRef.current.chart) {
      widgetRef.current.chart().setResolution(timeframe.toUpperCase())
    }
  }

  if (error) {
    return (
      <Box
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="xl"
        p={6}
        height={height}
      >
        <Alert status="error">
          <AlertIcon />
          <VStack align="start" spacing={2}>
            <Text fontWeight="semibold">Chart Error</Text>
            <Text fontSize="sm">{error}</Text>
            <Button size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </VStack>
        </Alert>
      </Box>
    )
  }

  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <VStack spacing={4} align="stretch">
        {/* Chart Controls */}
        {showToolbar && !isMobile && (
          <HStack justify="space-between" wrap="wrap" spacing={2}>
            <HStack spacing={1}>
              {timeframes.map((tf) => (
                <Button
                  key={tf}
                  size="sm"
                  variant={selectedTimeframe === tf ? 'solid' : 'ghost'}
                  onClick={() => handleTimeframeChange(tf)}
                >
                  {tf}
                </Button>
              ))}
            </HStack>
            
            <HStack spacing={2}>
              <IconButton
                aria-label="Refresh chart"
                icon={<Text>🔄</Text>}
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
              />
              <IconButton
                aria-label="Fullscreen"
                icon={<Text>⛶</Text>}
                size="sm"
                variant="ghost"
                onClick={handleFullscreen}
              />
            </HStack>
          </HStack>
        )}

        {/* Chart Container */}
        <Box
          position="relative"
          bg={bg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="xl"
          overflow="hidden"
          height={isMobile ? '400px' : `${height}px`}
        >
          {isLoading && (
            <Skeleton
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              borderRadius="xl"
            />
          )}
          
          <Box
            ref={containerRef}
            id={`tradingview-chart-${Date.now()}`}
            width="100%"
            height="100%"
            opacity={isLoading ? 0 : 1}
            transition="opacity 0.3s ease"
          />
        </Box>

        {/* Mobile Controls */}
        {isMobile && (
          <HStack justify="center" wrap="wrap" spacing={1}>
            {timeframes.map((tf) => (
              <Button
                key={tf}
                size="xs"
                variant={selectedTimeframe === tf ? 'solid' : 'ghost'}
                onClick={() => handleTimeframeChange(tf)}
              >
                {tf}
              </Button>
            ))}
          </HStack>
        )}
      </VStack>
    </MotionBox>
  )
}

// Lightweight chart component for mobile or low-bandwidth scenarios
export const LightweightChart: React.FC<{
  symbol: string
  height?: number
}> = ({ symbol, height = 300 }) => {
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="xl"
      p={4}
      height={height}
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack spacing={4}>
        <Text fontSize="lg" fontWeight="semibold">
          {symbol}
        </Text>
        <Text color="gray.500" textAlign="center">
          Lightweight chart mode
        </Text>
        <Button size="sm" variant="outline">
          Load Full Chart
        </Button>
      </VStack>
    </Box>
  )
}
