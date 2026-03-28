'use client'

import { Box, Flex, Text } from '@chakra-ui/react'
import { Kpi } from '@/types/volleyball'
import KpiTooltip from './KpiTooltip'
import { formatKpiValue } from '@/lib/kpis'

interface KpiCardProps {
  kpi: Kpi
  size?: 'sm' | 'md' | 'lg'
}

export default function KpiCard({ kpi, size = 'md' }: KpiCardProps) {
  const sizeStyles = {
    sm: {
      p: 3,
      valueSize: 'xl',
      labelSize: 'xs',
    },
    md: {
      p: 4,
      valueSize: '2xl',
      labelSize: 'sm',
    },
    lg: {
      p: 5,
      valueSize: '3xl',
      labelSize: 'md',
    },
  }

  const styles = sizeStyles[size]

  // Determina cor baseada no valor e bounds
  const getValueColor = () => {
    if (kpi.sampleSize === 0) return 'gray.500'

    if (!kpi.bounds) return 'white'

    const { value } = kpi
    const { min, max, ideal } = kpi.bounds

    // Para percentuais e índices, avalia se está no range ideal
    if (ideal) {
      const idealStr = ideal.toLowerCase()
      if (idealStr.includes('>')) {
        const threshold = parseFloat(idealStr.match(/[\d.]+/)?.[0] || '0')
        return value >= threshold ? 'green.400' : value >= threshold * 0.7 ? 'yellow.400' : 'red.400'
      }
      if (idealStr.includes('<')) {
        const threshold = parseFloat(idealStr.match(/[\d.]+/)?.[0] || '0')
        return value <= threshold ? 'green.400' : value <= threshold * 1.3 ? 'yellow.400' : 'red.400'
      }
    }

    // Default: branco
    return 'white'
  }

  return (
    <Box
      bg="gray.800"
      borderRadius="lg"
      p={styles.p}
      borderWidth="1px"
      borderColor="gray.700"
      transition="all 0.2s"
      _hover={{
        borderColor: 'gray.600',
        transform: 'translateY(-2px)',
      }}
    >
      <KpiTooltip kpi={kpi}>
        <Flex direction="column" w="full">
          <Flex align="center" justify="space-between" mb={2}>
            <Text fontSize={styles.labelSize} color="gray.400" fontWeight="medium">
              {kpi.label}
            </Text>
            <Box
              as="span"
              fontSize="xs"
              color="gray.500"
              cursor="help"
              w="16px"
              h="16px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              borderRadius="full"
              borderWidth="1px"
              borderColor="gray.600"
            >
              ?
            </Box>
          </Flex>

          <Text fontSize={styles.valueSize} fontWeight="bold" color={getValueColor()}>
            {formatKpiValue(kpi.value, kpi.format)}
          </Text>

          <Text fontSize="xs" color="gray.500" mt={1}>
            n = {kpi.sampleSize}
          </Text>
        </Flex>
      </KpiTooltip>
    </Box>
  )
}
