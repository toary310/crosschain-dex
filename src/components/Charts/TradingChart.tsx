'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  ButtonGroup,
  Select,
  useColorModeValue,
  Spinner,
  Center,
  Tooltip,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react'
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMaximize2, FiSettings, FiDownload, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import { useLiveChartData, usePriceStream } from '@/hooks/useRealtime'
import { useScrollAnimation } from '@/hooks/useAnimations'

const MotionBox = motion(Box)

export interface ChartData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  date: string
  time: string
}

export interface TradingChartProps {
  symbol: string
  height?: number
  showVolume?: boolean
  showIndicators?: boolean
  enableRealtime?: boolean
  timeframes?: string[]
  defaultTimeframe?: string
}

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  height = 400,
  showVolume = true,
  showIndicators = true,
  enableRealtime = true,
  timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'],
  defaultTimeframe = '1h',
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(defaultTimeframe)
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick')
  const [indicators, setIndicators] = useState<string[]>(['MA20', 'MA50'])
  const [isLoading, setIsLoading] = useState(true)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [selectedRange, setSelectedRange] = useState<{ start?: number; end?: number }>({})

  const { isOpen: isFullscreen, onOpen: openFullscreen, onClose: closeFullscreen } = useDisclosure()
  const { ref, variants, isInView } = useScrollAnimation()

  // Real-time data
  const { chartData: liveData, isConnected } = useLiveChartData(symbol, selectedTimeframe)
  const { getPrice } = usePriceStream([symbol])

  // Theme colors
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const gridColor = useColorModeValue('gray.100', 'gray.700')
  const textColor = useColorModeValue('gray.600', 'gray.400')
  const bullColor = '#10b981'
  const bearColor = '#ef4444'

  // Process chart data
  const processedData = useMemo(() => {
    const data = enableRealtime && liveData.length > 0 ? liveData : chartData
    
    return data.map((item, index) => ({
      ...item,
      ma20: calculateMA(data, index, 20),
      ma50: calculateMA(data, index, 50),
      rsi: calculateRSI(data, index, 14),
      macd: calculateMACD(data, index),
      volume: item.volume || 0,
    }))
  }, [chartData, liveData, enableRealtime])

  // Load historical data
  useEffect(() => {
    const loadChartData = async () => {
      setIsLoading(true)
      try {
        // Mock data loading
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const mockData = generateMockData(symbol, selectedTimeframe, 100)
        setChartData(mockData)
      } catch (error) {
        console.error('Failed to load chart data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadChartData()
  }, [symbol, selectedTimeframe])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <Box
          bg={bg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="md"
          p={3}
          boxShadow="lg"
        >
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            {new Date(data.timestamp).toLocaleString()}
          </Text>
          <VStack spacing={1} align="start">
            <HStack>
              <Text fontSize="xs" color={textColor}>Open:</Text>
              <Text fontSize="xs" fontWeight="semibold">${data.open?.toFixed(4)}</Text>
            </HStack>
            <HStack>
              <Text fontSize="xs" color={textColor}>High:</Text>
              <Text fontSize="xs" fontWeight="semibold" color={bullColor}>${data.high?.toFixed(4)}</Text>
            </HStack>
            <HStack>
              <Text fontSize="xs" color={textColor}>Low:</Text>
              <Text fontSize="xs" fontWeight="semibold" color={bearColor}>${data.low?.toFixed(4)}</Text>
            </HStack>
            <HStack>
              <Text fontSize="xs" color={textColor}>Close:</Text>
              <Text fontSize="xs" fontWeight="semibold">${data.close?.toFixed(4)}</Text>
            </HStack>
            {showVolume && (
              <HStack>
                <Text fontSize="xs" color={textColor}>Volume:</Text>
                <Text fontSize="xs" fontWeight="semibold">{formatVolume(data.volume)}</Text>
              </HStack>
            )}
          </VStack>
        </Box>
      )
    }
    return null
  }

  // Chart controls
  const ChartControls = () => (
    <HStack spacing={4} wrap="wrap">
      <ButtonGroup size="sm" isAttached>
        {timeframes.map(tf => (
          <Button
            key={tf}
            variant={selectedTimeframe === tf ? 'solid' : 'outline'}
            onClick={() => setSelectedTimeframe(tf)}
          >
            {tf}
          </Button>
        ))}
      </ButtonGroup>

      <ButtonGroup size="sm" isAttached>
        <Button
          variant={chartType === 'candlestick' ? 'solid' : 'outline'}
          onClick={() => setChartType('candlestick')}
        >
          Candles
        </Button>
        <Button
          variant={chartType === 'line' ? 'solid' : 'outline'}
          onClick={() => setChartType('line')}
        >
          Line
        </Button>
        <Button
          variant={chartType === 'area' ? 'solid' : 'outline'}
          onClick={() => setChartType('area')}
        >
          Area
        </Button>
      </ButtonGroup>

      <HStack spacing={2}>
        <IconButton
          aria-label="Fullscreen"
          icon={<FiMaximize2 />}
          size="sm"
          variant="outline"
          onClick={openFullscreen}
        />
        <IconButton
          aria-label="Settings"
          icon={<FiSettings />}
          size="sm"
          variant="outline"
        />
        <IconButton
          aria-label="Download"
          icon={<FiDownload />}
          size="sm"
          variant="outline"
        />
      </HStack>

      {enableRealtime && (
        <Badge
          colorScheme={isConnected ? 'green' : 'red'}
          variant="subtle"
        >
          {isConnected ? 'Live' : 'Disconnected'}
        </Badge>
      )}
    </HStack>
  )

  // Render chart based on type
  const renderChart = () => {
    if (chartType === 'line') {
      return (
        <Line
          type="monotone"
          dataKey="close"
          stroke={bullColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: bullColor }}
        />
      )
    }

    if (chartType === 'area') {
      return (
        <Area
          type="monotone"
          dataKey="close"
          stroke={bullColor}
          fill={bullColor}
          fillOpacity={0.1}
        />
      )
    }

    // Candlestick (using bars as approximation)
    return (
      <>
        <Bar
          dataKey="high"
          fill="transparent"
          stroke={textColor}
          strokeWidth={1}
        />
        <Bar
          dataKey="low"
          fill="transparent"
          stroke={textColor}
          strokeWidth={1}
        />
        <Line
          type="monotone"
          dataKey="close"
          stroke={bullColor}
          strokeWidth={2}
          dot={false}
        />
      </>
    )
  }

  if (isLoading) {
    return (
      <Center h={height}>
        <VStack spacing={4}>
          <Spinner size="lg" color="primary.500" />
          <Text color={textColor}>Loading chart data...</Text>
        </VStack>
      </Center>
    )
  }

  return (
    <>
      <MotionBox
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={variants}
        bg={bg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="xl"
        p={4}
        h={height + 100}
      >
        <VStack spacing={4} align="stretch" h="full">
          {/* Header */}
          <HStack justify="space-between" align="center">
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="bold">
                {symbol} / USD
              </Text>
              <HStack spacing={2}>
                <Text fontSize="2xl" fontWeight="bold">
                  ${processedData[processedData.length - 1]?.close?.toFixed(4) || '0.0000'}
                </Text>
                <Badge
                  colorScheme={
                    (processedData[processedData.length - 1]?.close || 0) >
                    (processedData[processedData.length - 2]?.close || 0)
                      ? 'green'
                      : 'red'
                  }
                  variant="subtle"
                >
                  <HStack spacing={1}>
                    {(processedData[processedData.length - 1]?.close || 0) >
                    (processedData[processedData.length - 2]?.close || 0) ? (
                      <FiTrendingUp />
                    ) : (
                      <FiTrendingDown />
                    )}
                    <Text>
                      {(
                        ((processedData[processedData.length - 1]?.close || 0) -
                          (processedData[processedData.length - 2]?.close || 0)) /
                        (processedData[processedData.length - 2]?.close || 1) *
                        100
                      ).toFixed(2)}%
                    </Text>
                  </HStack>
                </Badge>
              </HStack>
            </VStack>

            <ChartControls />
          </HStack>

          {/* Chart */}
          <Box flex={1}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={processedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="time"
                  stroke={textColor}
                  fontSize={12}
                  tickFormatter={(value) => value}
                />
                <YAxis
                  stroke={textColor}
                  fontSize={12}
                  domain={['dataMin - 10', 'dataMax + 10']}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                
                {renderChart()}
                
                {/* Moving averages */}
                {indicators.includes('MA20') && (
                  <Line
                    type="monotone"
                    dataKey="ma20"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                )}
                {indicators.includes('MA50') && (
                  <Line
                    type="monotone"
                    dataKey="ma50"
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                )}

                {/* Brush for zooming */}
                <Brush
                  dataKey="time"
                  height={30}
                  stroke={borderColor}
                  fill={bg}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>

          {/* Volume chart */}
          {showVolume && (
            <Box h="100px">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="time" stroke={textColor} fontSize={10} />
                  <YAxis stroke={textColor} fontSize={10} />
                  <Bar
                    dataKey="volume"
                    fill={bullColor}
                    fillOpacity={0.6}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          )}
        </VStack>
      </MotionBox>

      {/* Fullscreen modal */}
      <Modal isOpen={isFullscreen} onClose={closeFullscreen} size="full">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {symbol} Trading Chart
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TradingChart
              {...{ symbol, showVolume, showIndicators, enableRealtime }}
              height={window.innerHeight - 200}
            />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  )
}

// Utility functions
function calculateMA(data: ChartData[], index: number, period: number): number {
  if (index < period - 1) return 0
  
  const sum = data.slice(index - period + 1, index + 1)
    .reduce((acc, item) => acc + item.close, 0)
  
  return sum / period
}

function calculateRSI(data: ChartData[], index: number, period: number): number {
  if (index < period) return 50
  
  const changes = data.slice(index - period + 1, index + 1)
    .map((item, i, arr) => i > 0 ? item.close - arr[i - 1].close : 0)
  
  const gains = changes.filter(change => change > 0)
  const losses = changes.filter(change => change < 0).map(loss => Math.abs(loss))
  
  const avgGain = gains.reduce((sum, gain) => sum + gain, 0) / period
  const avgLoss = losses.reduce((sum, loss) => sum + loss, 0) / period
  
  if (avgLoss === 0) return 100
  
  const rs = avgGain / avgLoss
  return 100 - (100 / (1 + rs))
}

function calculateMACD(data: ChartData[], index: number): number {
  const ema12 = calculateEMA(data, index, 12)
  const ema26 = calculateEMA(data, index, 26)
  return ema12 - ema26
}

function calculateEMA(data: ChartData[], index: number, period: number): number {
  if (index === 0) return data[0].close
  
  const multiplier = 2 / (period + 1)
  const prevEMA = index > 0 ? calculateEMA(data, index - 1, period) : data[0].close
  
  return (data[index].close * multiplier) + (prevEMA * (1 - multiplier))
}

function formatVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`
  return volume.toFixed(0)
}

function generateMockData(symbol: string, timeframe: string, count: number): ChartData[] {
  const data: ChartData[] = []
  let basePrice = 100 + Math.random() * 1000
  
  for (let i = 0; i < count; i++) {
    const timestamp = Date.now() - (count - i) * getTimeframeMs(timeframe)
    const volatility = 0.02
    
    const change = (Math.random() - 0.5) * volatility * basePrice
    const open = i === 0 ? basePrice : data[i - 1].close
    const close = open + change
    const high = Math.max(open, close) + Math.random() * volatility * basePrice * 0.5
    const low = Math.min(open, close) - Math.random() * volatility * basePrice * 0.5
    const volume = Math.random() * 1000000
    
    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      date: new Date(timestamp).toLocaleDateString(),
      time: new Date(timestamp).toLocaleTimeString(),
    })
    
    basePrice = close
  }
  
  return data
}

function getTimeframeMs(timeframe: string): number {
  const timeframes: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  }
  
  return timeframes[timeframe] || timeframes['1h']
}
