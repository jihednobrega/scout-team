// components/statistics/SimpleCharts.tsx
'use client'

import { Box, Flex, Text, Grid } from '@chakra-ui/react'
import { ChartData } from '@/types/statistics'

interface BarChartProps {
  title: string
  data: ChartData[]
  maxValue?: number
}

export function BarChart({ title, data, maxValue }: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1)

  return (
    <Box
      bg="gray.800"
      borderRadius="lg"
      p={5}
      borderWidth="1px"
      borderColor="gray.700"
    >
      <Text fontSize="md" fontWeight="bold" color="white" mb={4}>
        {title}
      </Text>

      <Flex direction="column" gap={3}>
        {data.map((item, index) => (
          <Box key={index}>
            <Flex justify="space-between" mb={1}>
              <Text fontSize="sm" color="gray.300">
                {item.label}
              </Text>
              <Text fontSize="sm" fontWeight="bold" color="white">
                {item.value}
              </Text>
            </Flex>
            <Box
              w="full"
              h="8px"
              bg="gray.700"
              borderRadius="full"
              overflow="hidden"
            >
              <Box
                h="full"
                w={`${(item.value / max) * 100}%`}
                bg={item.color || 'blue.500'}
                borderRadius="full"
                transition="width 0.3s"
              />
            </Box>
          </Box>
        ))}
      </Flex>
    </Box>
  )
}

interface PieChartProps {
  title: string
  data: ChartData[]
}

export function PieChart({ title, data }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Box
      bg="gray.800"
      borderRadius="lg"
      p={5}
      borderWidth="1px"
      borderColor="gray.700"
    >
      <Text fontSize="md" fontWeight="bold" color="white" mb={4}>
        {title}
      </Text>

      <Flex direction="column" align="center" gap={4}>
        {/* Visual do gráfico de pizza (simplificado) */}
        <Grid templateColumns="repeat(2, 1fr)" gap={3} w="full">
          {data.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
            return (
              <Flex key={index} align="center" gap={2}>
                <Box
                  w="12px"
                  h="12px"
                  bg={item.color || `hsl(${(index * 360) / data.length}, 70%, 50%)`}
                  borderRadius="sm"
                  flexShrink={0}
                />
                <Box flex="1">
                  <Text fontSize="xs" color="gray.300">
                    {item.label}
                  </Text>
                  <Flex gap={2} align="baseline">
                    <Text fontSize="sm" fontWeight="bold" color="white">
                      {item.value}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      ({percentage}%)
                    </Text>
                  </Flex>
                </Box>
              </Flex>
            )
          })}
        </Grid>
      </Flex>
    </Box>
  )
}
