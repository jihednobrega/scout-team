'use client'

import React, { useMemo, useState } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Progress,
  Tooltip,
} from '@chakra-ui/react'
import { PointHistory } from '@/utils/mockData'
import { ScoutAction } from '@/types/scout'
import {
  analyzeNetComparison,
  NetScenario,
  NetComparison as NetComparisonResult,
} from '@/lib/kpis/netComparison'
import { DESTINATION_COLORS, SetDestinationKey } from '@/lib/kpis/setterDistribution'

// ============================================================================
// LABELS
// ============================================================================

const DEST_LABELS: Record<SetDestinationKey, string> = {
  outside: 'Ponta',
  opposite: 'Oposto',
  middle: 'Meio',
  pipe: 'Pipe',
}

// ============================================================================
// MINI COMPONENTES
// ============================================================================

function MetricRow({
  label,
  value,
  otherValue,
  format = 'number',
  higherIsBetter = true,
}: {
  label: string
  value: number | null
  otherValue: number | null
  format?: 'number' | 'percent' | 'balance'
  higherIsBetter?: boolean
}) {
  if (value === null) return null

  const formatted =
    format === 'percent'
      ? `${value.toFixed(0)}%`
      : format === 'balance'
        ? `${value > 0 ? '+' : ''}${value}`
        : `${value}`

  // Comparação com o outro cenário
  let arrow = ''
  let arrowColor = 'gray.400'
  if (otherValue !== null && value !== otherValue) {
    const isBetter = higherIsBetter ? value > otherValue : value < otherValue
    arrow = isBetter ? '↑' : '↓'
    arrowColor = isBetter ? 'green.400' : 'red.400'
  }

  return (
    <Flex justify="space-between" align="center" py={1}>
      <Text fontSize="xs" color="gray.400">
        {label}
      </Text>
      <Flex align="center" gap={1}>
        <Text fontSize="sm" fontWeight="bold" color="white">
          {formatted}
        </Text>
        {arrow && (
          <Text fontSize="xs" color={arrowColor} fontWeight="bold">
            {arrow}
          </Text>
        )}
      </Flex>
    </Flex>
  )
}

function DistributionBar({ distribution }: { distribution: NetScenario['distribution'] }) {
  if (!distribution || distribution.total === 0) return null

  const destinations: SetDestinationKey[] = ['outside', 'opposite', 'middle', 'pipe']

  return (
    <Box mt={3}>
      <Text fontSize="10px" color="gray.500" mb={1.5} fontWeight="semibold">
        Distribuição
      </Text>
      <Flex direction="column" gap={1.5}>
        {destinations.map((dest) => {
          const count = distribution[dest]
          const pct = distribution.total > 0 ? (count / distribution.total) * 100 : 0
          if (count === 0) return null
          return (
            <Flex key={dest} align="center" gap={2} fontSize="xs">
              <Box w="6px" h="6px" borderRadius="full" bg={DESTINATION_COLORS[dest]} flexShrink={0} />
              <Text color="gray.400" w="45px" flexShrink={0}>
                {DEST_LABELS[dest]}
              </Text>
              <Box flex={1}>
                <Tooltip label={`${count} ataques (${pct.toFixed(0)}%)`} hasArrow bg="gray.700" placement="top">
                  <Box>
                    <Progress
                      value={pct}
                      size="xs"
                      borderRadius="full"
                      bg="whiteAlpha.100"
                      sx={{ '& > div': { bg: DESTINATION_COLORS[dest] } }}
                    />
                  </Box>
                </Tooltip>
              </Box>
              <Text color="gray.300" w="30px" textAlign="right" fontWeight="semibold">
                {pct.toFixed(0)}%
              </Text>
            </Flex>
          )
        })}
      </Flex>
    </Box>
  )
}

// ============================================================================
// CARD DE CENÁRIO
// ============================================================================

function ScenarioCard({
  scenario,
  otherScenario,
  isBetter,
}: {
  scenario: NetScenario
  otherScenario: NetScenario
  isBetter: boolean
}) {
  const borderColor = scenario.rallies === 0
    ? 'gray.700'
    : isBetter
      ? 'green.500'
      : 'red.500'

  const balanceColor = scenario.balance > 0
    ? 'green.400'
    : scenario.balance < 0
      ? 'red.400'
      : 'gray.400'

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      borderWidth="2px"
      borderColor={borderColor}
      p={{ base: 4, md: 5 }}
      data-testid={`net-scenario-${isBetter ? 'better' : 'worse'}`}
    >
      {/* Header */}
      <Flex justify="space-between" align="start" mb={3}>
        <Box>
          <Text fontSize="sm" fontWeight="bold" color="white">
            {scenario.label}
          </Text>
          <Text fontSize="xs" color="gray.500">
            Rotações {scenario.rotations.map((r) => `S${r}`).join(', ')}
          </Text>
        </Box>
        {scenario.rallies > 0 && (
          <Box textAlign="right">
            <Text fontSize="2xl" fontWeight="bold" color={balanceColor} lineHeight="1">
              {scenario.balance > 0 ? '+' : ''}
              {scenario.balance}
            </Text>
            <Text fontSize="10px" color="gray.500">
              saldo
            </Text>
          </Box>
        )}
      </Flex>

      {scenario.rallies === 0 ? (
        <Text fontSize="xs" color="gray.500" textAlign="center" py={4}>
          Sem dados de rotação para este cenário
        </Text>
      ) : (
        <>
          {/* Pontos ganhos/perdidos */}
          <Flex gap={4} mb={3} fontSize="xs">
            <Box>
              <Text color="gray.500">Ganhos</Text>
              <Text color="green.300" fontWeight="semibold" fontSize="sm">
                {scenario.pointsWon}
              </Text>
            </Box>
            <Box>
              <Text color="gray.500">Perdidos</Text>
              <Text color="red.300" fontWeight="semibold" fontSize="sm">
                {scenario.pointsLost}
              </Text>
            </Box>
            <Box>
              <Text color="gray.500">Rallies</Text>
              <Text color="gray.300" fontWeight="semibold" fontSize="sm">
                {scenario.rallies}
              </Text>
            </Box>
          </Flex>

          {/* Métricas ofensivas */}
          <Box
            bg="whiteAlpha.50"
            borderRadius="lg"
            px={3}
            py={2}
            mb={2}
          >
            <Text fontSize="10px" color="gray.500" fontWeight="semibold" mb={1}>
              ATAQUE
            </Text>
            <MetricRow
              label="Eficiência"
              value={scenario.attack.total > 0 ? scenario.attack.efficiency : null}
              otherValue={otherScenario.attack.total > 0 ? otherScenario.attack.efficiency : null}
              format="percent"
            />
            <MetricRow
              label="Pontos"
              value={scenario.attack.points}
              otherValue={otherScenario.attack.points}
            />
            <MetricRow
              label="Erros"
              value={scenario.attack.errors}
              otherValue={otherScenario.attack.errors}
              higherIsBetter={false}
            />
            <MetricRow
              label="Bloqueados"
              value={scenario.attack.blocked}
              otherValue={otherScenario.attack.blocked}
              higherIsBetter={false}
            />
          </Box>

          {/* Métricas defensivas */}
          <Box
            bg="whiteAlpha.50"
            borderRadius="lg"
            px={3}
            py={2}
            mb={2}
          >
            <Text fontSize="10px" color="gray.500" fontWeight="semibold" mb={1}>
              BLOQUEIO
            </Text>
            <MetricRow
              label="Pontos"
              value={scenario.block.points}
              otherValue={otherScenario.block.points}
            />
            <MetricRow
              label="Erros"
              value={scenario.block.errors}
              otherValue={otherScenario.block.errors}
              higherIsBetter={false}
            />
          </Box>

          {/* Side-out e Break */}
          <Box
            bg="whiteAlpha.50"
            borderRadius="lg"
            px={3}
            py={2}
          >
            <Text fontSize="10px" color="gray.500" fontWeight="semibold" mb={1}>
              FASE
            </Text>
            <MetricRow
              label="Side-out"
              value={scenario.sideOutPercentage}
              otherValue={otherScenario.sideOutPercentage}
              format="percent"
            />
            <MetricRow
              label="Break"
              value={scenario.breakPercentage}
              otherValue={otherScenario.breakPercentage}
              format="percent"
            />
          </Box>

          {/* Distribuição */}
          <DistributionBar distribution={scenario.distribution} />
        </>
      )}
    </Box>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface NetComparisonProps {
  pointHistory: PointHistory[]
  scoutActions?: ScoutAction[]
}

export default function NetComparison({
  pointHistory,
  scoutActions,
}: NetComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const analysis: NetComparisonResult = useMemo(
    () => analyzeNetComparison(pointHistory, scoutActions),
    [pointHistory, scoutActions]
  )

  if (!analysis.hasData) return null

  const setterIsBetter = analysis.setterFront.balance >= analysis.oppositeFront.balance

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.700"
      overflow="hidden"
      data-testid="net-comparison-section"
    >
      {/* Accordion header */}
      <Flex
        as="button"
        w="full"
        justify="space-between"
        align="center"
        p={{ base: 4, md: 6 }}
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="net-comparison-toggle"
        _hover={{ bg: 'whiteAlpha.50' }}
        transition="background 0.15s"
        cursor="pointer"
      >
        <Box textAlign="left">
          <Heading size="md" color="white" mb={1}>
            Comparativo de redes
          </Heading>
          <Text fontSize="sm" color="gray.400">
            Levantador na rede vs Oposto na rede (sistema 5-1)
          </Text>
        </Box>
        <Text fontSize="xl" color="gray.500" transform={isExpanded ? 'rotate(180deg)' : 'none'} transition="transform 0.2s">
          ▼
        </Text>
      </Flex>

      {/* Content */}
      {isExpanded && (
        <Box px={{ base: 4, md: 6 }} pb={{ base: 4, md: 6 }}>
          {/* Duas colunas lado a lado */}
          <Grid
            templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }}
            gap={4}
            mb={4}
          >
            <ScenarioCard
              scenario={analysis.setterFront}
              otherScenario={analysis.oppositeFront}
              isBetter={setterIsBetter}
            />
            <ScenarioCard
              scenario={analysis.oppositeFront}
              otherScenario={analysis.setterFront}
              isBetter={!setterIsBetter}
            />
          </Grid>

          {/* Legenda de distribuição */}
          {(analysis.setterFront.distribution || analysis.oppositeFront.distribution) && (
            <Flex gap={4} mb={3} flexWrap="wrap">
              {(['outside', 'opposite', 'middle', 'pipe'] as const).map((key) => (
                <Flex key={key} align="center" gap={1.5} fontSize="xs" color="gray.400">
                  <Box w="8px" h="8px" borderRadius="full" bg={DESTINATION_COLORS[key]} />
                  <Text>{DEST_LABELS[key]}</Text>
                </Flex>
              ))}
            </Flex>
          )}

          {/* Frase resumo */}
          {analysis.summary && (
            <Box
              bg="whiteAlpha.50"
              borderRadius="lg"
              px={4}
              py={3}
              borderLeftWidth="3px"
              borderLeftColor={setterIsBetter ? 'green.400' : 'orange.400'}
            >
              <Text fontSize="sm" color="gray.300" fontStyle="italic">
                {analysis.summary}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
