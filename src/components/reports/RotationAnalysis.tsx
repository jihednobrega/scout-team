'use client'

import React, { useMemo } from 'react'
import { Box, Flex, Grid, Heading, Text, Tooltip, Progress } from '@chakra-ui/react'
import { PointHistory } from '@/utils/mockData'
import { ScoutAction } from '@/types/scout'
import {
  analyzeByRotation,
  RotationAnalysisResult,
  RotationStats,
} from '@/lib/kpis/rotationAnalysis'
import { DESTINATION_COLORS } from '@/lib/kpis/setterDistribution'

// ============================================================================
// TIPOS
// ============================================================================

interface RotationAnalysisProps {
  pointHistory: PointHistory[]
  scoutActions?: ScoutAction[]
}

// ============================================================================
// COMPONENTE: MINI CARD DE ROTAÇÃO
// ============================================================================

function RotationCard({
  stats,
  isBest,
  isWorst,
}: {
  stats: RotationStats
  isBest: boolean
  isWorst: boolean
}) {
  const hasData = stats.rallies > 0
  const borderColor = isBest ? 'green.500' : isWorst ? 'red.500' : 'gray.700'
  const badgeBg = isBest ? 'green.900' : isWorst ? 'red.900' : undefined
  const badgeText = isBest ? 'Melhor' : isWorst ? 'Pior' : undefined

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      borderWidth={isBest || isWorst ? '2px' : '1px'}
      borderColor={borderColor}
      p={4}
      position="relative"
      data-testid={`rotation-card-S${stats.rotation}`}
    >
      {/* Header */}
      <Flex justify="space-between" align="center" mb={3}>
        <Flex align="center" gap={2}>
          <Box
            w="32px"
            h="32px"
            borderRadius="full"
            bg="gray.900"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="xs" fontWeight="bold" color="white">
              S{stats.rotation}
            </Text>
          </Box>
          {badgeText && (
            <Text fontSize="10px" fontWeight="bold" color={isBest ? 'green.300' : 'red.300'} bg={badgeBg} px={1.5} py={0.5} borderRadius="md">
              {badgeText}
            </Text>
          )}
        </Flex>
        {hasData && (
          <Text
            fontSize="lg"
            fontWeight="bold"
            color={stats.balance > 0 ? 'green.400' : stats.balance < 0 ? 'red.400' : 'gray.400'}
          >
            {stats.balance > 0 ? '+' : ''}{stats.balance}
          </Text>
        )}
      </Flex>

      {!hasData ? (
        <Text fontSize="xs" color="gray.500" textAlign="center" py={2}>
          Sem dados
        </Text>
      ) : (
        <>
          {/* Pontos ganhos/perdidos */}
          <Flex gap={3} mb={3} fontSize="xs">
            <Box>
              <Text color="gray.500">Ganhos</Text>
              <Text color="green.300" fontWeight="semibold">{stats.pointsWon}</Text>
            </Box>
            <Box>
              <Text color="gray.500">Perdidos</Text>
              <Text color="red.300" fontWeight="semibold">{stats.pointsLost}</Text>
            </Box>
            <Box>
              <Text color="gray.500">Rallies</Text>
              <Text color="gray.300" fontWeight="semibold">{stats.rallies}</Text>
            </Box>
          </Flex>

          {/* Side-out e Break */}
          <Flex direction="column" gap={2} mb={3}>
            {stats.sideOutPercentage !== null && (
              <Box>
                <Flex justify="space-between" fontSize="xs" mb={1}>
                  <Text color="blue.300">Side-out</Text>
                  <Text color="white" fontWeight="bold">
                    {(stats.sideOutPercentage * 100).toFixed(0)}%
                  </Text>
                </Flex>
                <Tooltip
                  label={`${stats.sideOutConverted}/${stats.sideOutOpportunities} oportunidades`}
                  hasArrow
                  bg="gray.700"
                  placement="top"
                >
                  <Box>
                    <Progress
                      value={stats.sideOutPercentage * 100}
                      size="xs"
                      colorScheme="blue"
                      borderRadius="full"
                      bg="whiteAlpha.100"
                    />
                  </Box>
                </Tooltip>
              </Box>
            )}

            {stats.breakPercentage !== null && (
              <Box>
                <Flex justify="space-between" fontSize="xs" mb={1}>
                  <Text color="orange.300">Break</Text>
                  <Text color="white" fontWeight="bold">
                    {(stats.breakPercentage * 100).toFixed(0)}%
                  </Text>
                </Flex>
                <Tooltip
                  label={`${stats.breakConverted}/${stats.breakOpportunities} oportunidades`}
                  hasArrow
                  bg="gray.700"
                  placement="top"
                >
                  <Box>
                    <Progress
                      value={stats.breakPercentage * 100}
                      size="xs"
                      colorScheme="orange"
                      borderRadius="full"
                      bg="whiteAlpha.100"
                    />
                  </Box>
                </Tooltip>
              </Box>
            )}
          </Flex>

          {/* Mini distribuição */}
          {stats.distribution && stats.distribution.total > 0 && (
            <Box>
              <Text fontSize="10px" color="gray.500" mb={1}>Distribuição</Text>
              <Flex h="6px" borderRadius="full" overflow="hidden">
                {(['outside', 'opposite', 'middle', 'pipe'] as const).map(dest => {
                  const pct = stats.distribution![dest].percentage * 100
                  if (pct <= 0) return null
                  return (
                    <Tooltip
                      key={dest}
                      label={`${dest === 'outside' ? 'Ponta' : dest === 'opposite' ? 'Oposto' : dest === 'middle' ? 'Meio' : 'Pipe'}: ${pct.toFixed(0)}%`}
                      hasArrow
                      bg="gray.700"
                      placement="top"
                    >
                      <Box
                        w={`${pct}%`}
                        h="full"
                        bg={DESTINATION_COLORS[dest]}
                      />
                    </Tooltip>
                  )
                })}
              </Flex>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function RotationAnalysis({
  pointHistory,
  scoutActions,
}: RotationAnalysisProps) {
  const analysis: RotationAnalysisResult = useMemo(
    () => analyzeByRotation(pointHistory, scoutActions),
    [pointHistory, scoutActions]
  )

  if (!analysis.hasData) {
    return null
  }

  const { rotations, bestRotation, worstRotation } = analysis

  // Frase resumo
  const summaryText = useMemo(() => {
    if (!bestRotation || !worstRotation) return null
    if (bestRotation.rotation === worstRotation.rotation) return null

    const parts: string[] = []
    parts.push(`Nossa melhor rotação é a S${bestRotation.rotation} (${bestRotation.balance > 0 ? '+' : ''}${bestRotation.balance} pontos).`)
    parts.push(`Nossa pior é a S${worstRotation.rotation} (${worstRotation.balance > 0 ? '+' : ''}${worstRotation.balance} pontos).`)
    return parts.join(' ')
  }, [bestRotation, worstRotation])

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.700"
      p={{ base: 4, md: 6 }}
      data-testid="rotation-analysis-section"
    >
      <Heading size="md" color="white" mb={1}>
        Performance por rotação
      </Heading>
      <Text fontSize="sm" color="gray.400" mb={5}>
        Como o time performa em cada posição do levantador (S1-S6)
      </Text>

      {/* Grid de 6 cards */}
      <Grid
        templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }}
        gap={3}
        mb={4}
      >
        {rotations.map(rot => (
          <RotationCard
            key={rot.rotation}
            stats={rot}
            isBest={bestRotation?.rotation === rot.rotation && rot.rallies >= 2}
            isWorst={worstRotation?.rotation === rot.rotation && rot.rallies >= 2 && bestRotation?.rotation !== rot.rotation}
          />
        ))}
      </Grid>

      {/* Legenda de distribuição */}
      {rotations.some(r => r.distribution && r.distribution.total > 0) && (
        <Flex gap={4} mb={3} flexWrap="wrap">
          {([
            { key: 'outside', label: 'Ponta' },
            { key: 'opposite', label: 'Oposto' },
            { key: 'middle', label: 'Meio' },
            { key: 'pipe', label: 'Pipe' },
          ] as const).map(({ key, label }) => (
            <Flex key={key} align="center" gap={1.5} fontSize="xs" color="gray.400">
              <Box w="8px" h="8px" borderRadius="full" bg={DESTINATION_COLORS[key]} />
              <Text>{label}</Text>
            </Flex>
          ))}
        </Flex>
      )}

      {/* Frase resumo */}
      {summaryText && (
        <Box
          bg="whiteAlpha.50"
          borderRadius="lg"
          px={4}
          py={3}
          borderLeftWidth="3px"
          borderLeftColor={bestRotation && bestRotation.balance > 0 ? 'green.400' : 'gray.500'}
        >
          <Text fontSize="sm" color="gray.300" fontStyle="italic">
            {summaryText}
          </Text>
        </Box>
      )}
    </Box>
  )
}
