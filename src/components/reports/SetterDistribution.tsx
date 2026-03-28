'use client'

import React, { useMemo, useState } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Badge,
} from '@chakra-ui/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { ScoutAction } from '@/types/scout'
import {
  analyzeSetterDistribution,
  SetterDistributionAnalysis,
  DistributionBreakdown,
  SetDestinationKey,
  DESTINATION_LABELS,
  DESTINATION_COLORS,
} from '@/lib/kpis/setterDistribution'

// ============================================================================
// TIPOS
// ============================================================================

interface SetterDistributionProps {
  actions: ScoutAction[]
  matchId?: string
}

type PassTab = 'passA' | 'passB' | 'passC' | 'counterAttack'

const TAB_CONFIG: { key: PassTab; label: string; shortLabel: string; color: string }[] = [
  { key: 'passA', label: 'Passe A', shortLabel: 'A', color: 'green' },
  { key: 'passB', label: 'Passe B', shortLabel: 'B', color: 'blue' },
  { key: 'passC', label: 'Passe C', shortLabel: 'C', color: 'red' },
  { key: 'counterAttack', label: 'Contra-ataque', shortLabel: 'CA', color: 'purple' },
]

const DEST_ORDER: SetDestinationKey[] = ['outside', 'opposite', 'middle', 'pipe']

// ============================================================================
// COMPONENTE: BREAKDOWN DE UM CENÁRIO DE PASSE
// ============================================================================

function DistributionPanel({ breakdown, label }: { breakdown: DistributionBreakdown; label: string }) {
  if (breakdown.total === 0) {
    return (
      <Flex direction="column" align="center" justify="center" minH="160px" color="gray.500">
        <Text fontSize="sm">Dados insuficientes</Text>
        <Text fontSize="xs" mt={1}>Nenhum ataque registrado para {label}</Text>
      </Flex>
    )
  }

  const chartData = DEST_ORDER.map(key => ({
    name: DESTINATION_LABELS[key],
    destKey: key,
    percentage: breakdown.byDestination[key].percentage * 100,
    count: breakdown.byDestination[key].count,
    efficiency: breakdown.byDestination[key].attackPointPct * 100,
    color: DESTINATION_COLORS[key],
  })).filter(d => d.count > 0)

  // Inclui destinos com 0 para visualização completa
  const fullData = DEST_ORDER.map(key => ({
    name: DESTINATION_LABELS[key],
    destKey: key,
    percentage: breakdown.byDestination[key].percentage * 100,
    count: breakdown.byDestination[key].count,
    efficiency: breakdown.byDestination[key].attackPointPct * 100,
    color: DESTINATION_COLORS[key],
  }))

  return (
    <Box>
      <Text fontSize="xs" color="gray.400" mb={2}>
        {breakdown.total} levantamento{breakdown.total !== 1 ? 's' : ''}
      </Text>

      {/* Gráfico de barras horizontais */}
      <Box h="140px" mb={3}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={fullData}
            layout="vertical"
            margin={{ top: 0, right: 4, left: 0, bottom: 0 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={v => `${v}%`}
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={55}
              tick={{ fill: '#D1D5DB', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              contentStyle={{
                background: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              labelStyle={{ color: '#F9FAFB' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _name: any, props: any) => [
                `${Number(value).toFixed(0)}% (${props.payload.count}x) — Conversão: ${Number(props.payload.efficiency).toFixed(0)}%`,
                'Distribuição',
              ]}
            />
            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={18}>
              {fullData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={entry.count > 0 ? 0.85 : 0.15} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Detalhes por destino */}
      <Flex direction="column" gap={1}>
        {chartData.map(d => (
          <Flex key={d.destKey} align="center" justify="space-between" fontSize="xs">
            <Flex align="center" gap={1.5}>
              <Box w="8px" h="8px" borderRadius="full" bg={d.color} />
              <Text color="gray.300">{d.name}</Text>
            </Flex>
            <Flex gap={2}>
              <Text color="gray.400">{d.percentage.toFixed(0)}%</Text>
              <Badge
                size="sm"
                fontSize="10px"
                colorScheme={d.efficiency >= 50 ? 'green' : d.efficiency >= 30 ? 'yellow' : 'red'}
                variant="subtle"
              >
                {d.efficiency.toFixed(0)}% conv.
              </Badge>
            </Flex>
          </Flex>
        ))}
      </Flex>
    </Box>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function SetterDistribution({ actions, matchId }: SetterDistributionProps) {
  const [activeTab, setActiveTab] = useState<PassTab>('passA')

  const analysis: SetterDistributionAnalysis = useMemo(
    () => analyzeSetterDistribution(actions, matchId),
    [actions, matchId]
  )

  const hasAnyData = analysis.passA.total > 0 ||
    analysis.passB.total > 0 ||
    analysis.passC.total > 0 ||
    analysis.counterAttack.total > 0

  // Mensagens de status
  if (!analysis.hasSetActions && !hasAnyData) {
    return (
      <Box bg="gray.800" borderRadius="xl" borderWidth="1px" borderColor="gray.700" p={6}>
        <Heading size="md" color="white" mb={2}>Distribuição do levantador</Heading>
        <Box bg="yellow.900" borderRadius="lg" px={4} py={3} borderLeftWidth="3px" borderLeftColor="yellow.400">
          <Text fontSize="sm" color="yellow.200">
            Ative o registro de levantamento para ver esta análise.
          </Text>
          <Text fontSize="xs" color="yellow.300" mt={1}>
            Os fundamentos de saque, recepção e ataque devem estar habilitados junto com o levantamento.
          </Text>
        </Box>
      </Box>
    )
  }

  if (!analysis.hasDestinationData && !hasAnyData) {
    return (
      <Box bg="gray.800" borderRadius="xl" borderWidth="1px" borderColor="gray.700" p={6}>
        <Heading size="md" color="white" mb={2}>Distribuição do levantador</Heading>
        <Box bg="blue.900" borderRadius="lg" px={4} py={3} borderLeftWidth="3px" borderLeftColor="blue.400">
          <Text fontSize="sm" color="blue.200">
            Registre a zona de ataque para ver a distribuição do levantador.
          </Text>
          <Text fontSize="xs" color="blue.300" mt={1}>
            A zona do ataque (2, 3, 4, 6) é usada para inferir o destino do levantamento.
          </Text>
        </Box>
      </Box>
    )
  }

  if (!hasAnyData) return null

  // Frase resumo
  const summaryText = useMemo(() => {
    const middleA = analysis.passA.total > 0 ? analysis.passA.byDestination.middle.percentage * 100 : null
    const middleC = analysis.passC.total > 0 ? analysis.passC.byDestination.middle.percentage * 100 : null

    if (middleA !== null && middleC !== null && middleA > 0) {
      if (middleA > middleC + 5) {
        return `Com passe perfeito, o levantador usa o meio ${middleA.toFixed(0)}% das vezes. Com passe ruim, o meio cai para ${middleC.toFixed(0)}%.`
      } else if (middleA < middleC - 5) {
        return `Curiosamente, o meio é mais usado com passe ruim (${middleC.toFixed(0)}%) do que com passe perfeito (${middleA.toFixed(0)}%).`
      }
      return `O uso do meio é similar independente da qualidade do passe (~${middleA.toFixed(0)}%).`
    }
    return null
  }, [analysis])

  const activeBreakdown = analysis[activeTab]

  return (
    <Box bg="gray.800" borderRadius="xl" borderWidth="1px" borderColor="gray.700" p={{ base: 4, md: 6 }} data-testid="setter-distribution-section">
      {/* Header */}
      <Heading size="md" color="white" mb={1}>
        Distribuição do levantador
      </Heading>
      <Text fontSize="sm" color="gray.400" mb={4}>
        Para onde o levantador distribui as bolas por qualidade de recepção
      </Text>

      {/* Desktop: Grid lado a lado */}
      <Box display={{ base: 'none', lg: 'block' }} data-testid="setter-grid">
        <Grid templateColumns="repeat(4, 1fr)" gap={4}>
          {TAB_CONFIG.map(tab => (
            <Box
              key={tab.key}
              bg="gray.900"
              borderRadius="lg"
              p={4}
              borderWidth="1px"
              borderColor={`${tab.color}.800`}
            >
              <Text
                fontSize="xs"
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing="wider"
                color={`${tab.color}.300`}
                mb={2}
              >
                {tab.label}
              </Text>
              <DistributionPanel
                breakdown={analysis[tab.key]}
                label={tab.label}
              />
            </Box>
          ))}
        </Grid>
      </Box>

      {/* Mobile: Tabs */}
      <Box display={{ base: 'block', lg: 'none' }} data-testid="setter-tabs">
        <Flex gap={1} mb={4} bg="gray.900" borderRadius="lg" p={1}>
          {TAB_CONFIG.map(tab => (
            <Box
              key={tab.key}
              flex="1"
              textAlign="center"
              py={1.5}
              px={2}
              borderRadius="md"
              cursor="pointer"
              bg={activeTab === tab.key ? `${tab.color}.600` : 'transparent'}
              color={activeTab === tab.key ? 'white' : 'gray.400'}
              fontSize="xs"
              fontWeight={activeTab === tab.key ? 'bold' : 'normal'}
              data-testid={`setter-tab-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              _hover={{ bg: activeTab === tab.key ? undefined : 'whiteAlpha.100' }}
              transition="all 0.15s"
            >
              {tab.shortLabel}
            </Box>
          ))}
        </Flex>
        <Box bg="gray.900" borderRadius="lg" p={4} borderWidth="1px" borderColor="gray.700">
          <DistributionPanel
            breakdown={activeBreakdown}
            label={TAB_CONFIG.find(t => t.key === activeTab)!.label}
          />
        </Box>
      </Box>

      {/* Frase resumo */}
      {summaryText && (
        <Box
          bg="whiteAlpha.50"
          borderRadius="lg"
          px={4}
          py={3}
          mt={4}
          borderLeftWidth="3px"
          borderLeftColor="blue.400"
        >
          <Text fontSize="sm" color="gray.300" fontStyle="italic">
            {summaryText}
          </Text>
        </Box>
      )}
    </Box>
  )
}
