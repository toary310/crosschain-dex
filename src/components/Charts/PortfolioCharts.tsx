'use client'

import { useScrollAnimation, useStaggerAnimation } from '@/hooks/useAnimations'
import { usePortfolioStore } from '@/store/advanced/store'
import {
    Badge,
    Box,
    Button,
    ButtonGroup,
    Grid,
    GridItem,
    HStack,
    Select,
    Text,
    useColorModeValue,
    VStack
} from '@chakra-ui/react'
import { motion } from 'framer-motion'
import React, { useMemo, useState } from 'react'
import {
    Area,
    Bar,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    Tooltip as RechartsTooltip,
    ReferenceLine,
    ResponsiveContainer,
    XAxis,
    YAxis
} from 'recharts'

const MotionBox = motion(Box)
const MotionGrid = motion(Grid)
const MotionGridItem = motion(GridItem)

export interface PortfolioChartsProps {
  timeRange?: '24h' | '7d' | '30d' | '90d' | '1y' | 'all'
  showAllocation?: boolean
  showPerformance?: boolean
  showPnL?: boolean
}

export const PortfolioCharts: React.FC<PortfolioChartsProps> = ({
  timeRange = '30d',
  showAllocation = true,
  showPerformance = true,
  showPnL = true,
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange)
  const [selectedMetric, setSelectedMetric] = useState<'value' | 'pnl' | 'allocation'>('value')

  const { ref, variants, isInView } = useScrollAnimation()
  const { staggerVariants, childVariants } = useStaggerAnimation()
  const { portfolio } = usePortfolioStore()

  // Theme colors
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const textColor = useColorModeValue('gray.600', 'gray.400')

  // Color palette for charts
  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ]

  // Mock portfolio data
  const portfolioData = useMemo(() => {
    return generatePortfolioData(selectedTimeRange)
  }, [selectedTimeRange])

  const allocationData = useMemo(() => {
    return portfolio.tokens.map((token, index) => ({
      name: token.token.symbol,
      value: parseFloat(token.value),
      allocation: token.allocation,
      change24h: token.change24h,
      color: colors[index % colors.length],
    }))
  }, [portfolio.tokens])

  const performanceData = useMemo(() => {
    return generatePerformanceData(selectedTimeRange)
  }, [selectedTimeRange])

  // Custom tooltip components
  const AllocationTooltip = ({ active, payload }: any) => {
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
          <VStack spacing={1} align="start">
            <Text fontSize="sm" fontWeight="bold">{data.name}</Text>
            <Text fontSize="sm">Value: ${data.value.toLocaleString()}</Text>
            <Text fontSize="sm">Allocation: {data.allocation.toFixed(2)}%</Text>
            <Badge colorScheme={data.change24h >= 0 ? 'green' : 'red'}>
              {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
            </Badge>
          </VStack>
        </Box>
      )
    }
    return null
  }

  const PerformanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
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
            {new Date(label).toLocaleDateString()}
          </Text>
          {payload.map((entry: any, index: number) => (
            <HStack key={index} spacing={2}>
              <Box w={3} h={3} bg={entry.color} borderRadius="sm" />
              <Text fontSize="sm" color={textColor}>{entry.name}:</Text>
              <Text fontSize="sm" fontWeight="semibold">
                {entry.name === 'PnL' ?
                  `${entry.value >= 0 ? '+' : ''}${entry.value.toFixed(2)}%` :
                  `$${entry.value.toLocaleString()}`
                }
              </Text>
            </HStack>
          ))}
        </Box>
      )
    }
    return null
  }

  return (
    <MotionBox
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
    >
      <VStack spacing={6} align="stretch">
        {/* Header Controls */}
        <HStack justify="space-between" wrap="wrap">
          <Text fontSize="xl" fontWeight="bold">
            Portfolio Analytics
          </Text>

          <HStack spacing={4}>
            <ButtonGroup size="sm" isAttached>
              {['24h', '7d', '30d', '90d', '1y', 'all'].map(range => (
                <Button
                  key={range}
                  variant={selectedTimeRange === range ? 'solid' : 'outline'}
                  onClick={() => setSelectedTimeRange(range as any)}
                >
                  {range}
                </Button>
              ))}
            </ButtonGroup>

            <Select
              size="sm"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              w="150px"
            >
              <option value="value">Portfolio Value</option>
              <option value="pnl">P&L Analysis</option>
              <option value="allocation">Asset Allocation</option>
            </Select>
          </HStack>
        </HStack>

        {/* Charts Grid */}
        <MotionGrid
          templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }}
          gap={6}
          variants={staggerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {/* Portfolio Value Chart */}
          {showPerformance && (
            <MotionGridItem variants={childVariants}>
              <Box
                bg={bg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="xl"
                p={6}
                h="400px"
              >
                <VStack spacing={4} align="stretch" h="full">
                  <HStack justify="space-between">
                    <Text fontSize="lg" fontWeight="semibold">
                      Portfolio Performance
                    </Text>
                    <Badge colorScheme="blue" variant="subtle">
                      {selectedTimeRange}
                    </Badge>
                  </HStack>

                  <Box flex={1}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                        <XAxis
                          dataKey="date"
                          stroke={textColor}
                          fontSize={12}
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis
                          stroke={textColor}
                          fontSize={12}
                          tickFormatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <RechartsTooltip content={<PerformanceTooltip />} />

                        <Area
                          type="monotone"
                          dataKey="totalValue"
                          stroke={colors[0]}
                          fill={colors[0]}
                          fillOpacity={0.1}
                          strokeWidth={2}
                        />

                        <Line
                          type="monotone"
                          dataKey="benchmark"
                          stroke={colors[1]}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />

                        <ReferenceLine y={0} stroke={textColor} strokeDasharray="2 2" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </VStack>
              </Box>
            </MotionGridItem>
          )}

          {/* Asset Allocation Pie Chart */}
          {showAllocation && (
            <MotionGridItem variants={childVariants}>
              <Box
                bg={bg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="xl"
                p={6}
                h="400px"
              >
                <VStack spacing={4} align="stretch" h="full">
                  <Text fontSize="lg" fontWeight="semibold">
                    Asset Allocation
                  </Text>

                  <Box flex={1}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={allocationData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {allocationData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<AllocationTooltip />} />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value, entry: any) => (
                            <span style={{ color: entry.color }}>
                              {value} ({entry.payload.allocation.toFixed(1)}%)
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </VStack>
              </Box>
            </MotionGridItem>
          )}

          {/* P&L Analysis */}
          {showPnL && (
            <MotionGridItem variants={childVariants}>
              <Box
                bg={bg}
                border="1px solid"
                borderColor={borderColor}
                borderRadius="xl"
                p={6}
                h="400px"
              >
                <VStack spacing={4} align="stretch" h="full">
                  <Text fontSize="lg" fontWeight="semibold">
                    Profit & Loss Analysis
                  </Text>

                  <Box flex={1}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={performanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={borderColor} />
                        <XAxis
                          dataKey="date"
                          stroke={textColor}
                          fontSize={12}
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis
                          stroke={textColor}
                          fontSize={12}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <RechartsTooltip content={<PerformanceTooltip />} />

                        <Bar
                          dataKey="dailyPnL"
                          fill={(data: any) => data.dailyPnL >= 0 ? colors[2] : colors[3]}
                          fillOpacity={0.8}
                        />

                        <Line
                          type="monotone"
                          dataKey="cumulativePnL"
                          stroke={colors[4]}
                          strokeWidth={2}
                          dot={false}
                        />

                        <ReferenceLine y={0} stroke={textColor} strokeDasharray="2 2" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Box>
                </VStack>
              </Box>
            </MotionGridItem>
          )}

          {/* Risk Metrics */}
          <MotionGridItem variants={childVariants}>
            <Box
              bg={bg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="xl"
              p={6}
              h="400px"
            >
              <VStack spacing={4} align="stretch" h="full">
                <Text fontSize="lg" fontWeight="semibold">
                  Risk Metrics
                </Text>

                <Grid templateColumns="repeat(2, 1fr)" gap={4} flex={1}>
                  <VStack spacing={2}>
                    <Text fontSize="sm" color={textColor}>Sharpe Ratio</Text>
                    <Text fontSize="2xl" fontWeight="bold" color={colors[0]}>
                      1.24
                    </Text>
                  </VStack>

                  <VStack spacing={2}>
                    <Text fontSize="sm" color={textColor}>Max Drawdown</Text>
                    <Text fontSize="2xl" fontWeight="bold" color={colors[3]}>
                      -12.5%
                    </Text>
                  </VStack>

                  <VStack spacing={2}>
                    <Text fontSize="sm" color={textColor}>Volatility</Text>
                    <Text fontSize="2xl" fontWeight="bold" color={colors[1]}>
                      18.3%
                    </Text>
                  </VStack>

                  <VStack spacing={2}>
                    <Text fontSize="sm" color={textColor}>Beta</Text>
                    <Text fontSize="2xl" fontWeight="bold" color={colors[4]}>
                      0.87
                    </Text>
                  </VStack>
                </Grid>

                <Box flex={1}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData.slice(-30)}>
                      <Line
                        type="monotone"
                        dataKey="volatility"
                        stroke={colors[1]}
                        strokeWidth={2}
                        dot={false}
                      />
                      <XAxis hide />
                      <YAxis hide />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </VStack>
            </Box>
          </MotionGridItem>
        </MotionGrid>
      </VStack>
    </MotionBox>
  )
}

// Utility functions for generating mock data
function generatePortfolioData(timeRange: string) {
  const days = getTimeRangeDays(timeRange)
  const data = []
  let baseValue = 10000

  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000)
    const change = (Math.random() - 0.5) * 0.05 // ±2.5% daily change
    baseValue *= (1 + change)

    data.push({
      date: date.getTime(),
      totalValue: baseValue,
      benchmark: 10000 * Math.pow(1.001, i), // 0.1% daily benchmark
      dailyPnL: change * 100,
      cumulativePnL: ((baseValue - 10000) / 10000) * 100,
      volatility: Math.abs(change) * 100,
    })
  }

  return data
}

function generatePerformanceData(timeRange: string) {
  return generatePortfolioData(timeRange)
}

function getTimeRangeDays(timeRange: string): number {
  switch (timeRange) {
    case '24h': return 1
    case '7d': return 7
    case '30d': return 30
    case '90d': return 90
    case '1y': return 365
    case 'all': return 730
    default: return 30
  }
}
