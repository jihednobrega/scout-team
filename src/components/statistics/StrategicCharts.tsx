'use client'

import { Box, Grid, Text, Flex } from '@chakra-ui/react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'

interface AttackByPosition {
  label: string
  value: number
  kills: number
  errors: number
  blocked: number
  total: number
}

interface ReceptionByPosition {
  label: string
  efficiency: number
  perfect: number
  good: number
  poor: number
  errors: number
  total: number
}

interface StrategicChartsProps {
  attackByPosition: AttackByPosition[]
  receptionByPosition: ReceptionByPosition[]
  setterDistribution: { label: string; value: number }[]
  pipeAttacks?: number
}

const POSITION_COLORS: Record<string, string> = {
  Ponteiros: '#3B82F6',
  Centrais: '#F59E0B',
  Oposto: '#EF4444',
  'Líbero': '#A855F7',
}

const SETTER_ORDER = ['Ponteiros', 'Centrais', 'Oposto']
const SETTER_COLORS = ['#3B82F6', '#F59E0B', '#EF4444']

const REC_COLORS = {
  perfect: '#22C55E',
  good: '#3B82F6',
  poor: '#F59E0B',
  errors: '#EF4444',
}

function getEffColor(value: number, thresholds: [number, number, number] = [30, 15, 0]): string {
  if (value >= thresholds[0]) return '#22C55E'
  if (value >= thresholds[1]) return '#EAB308'
  return '#EF4444'
}

// ============================================================================
// Attack Position Card — one per position with horizontal breakdown bar
// ============================================================================
function AttackPositionCard({ data }: { data: AttackByPosition }) {
  const eff = data.value
  const killPct = data.total > 0 ? (data.kills / data.total * 100) : 0
  const errorPct = data.total > 0 ? (data.errors / data.total * 100) : 0
  const blockedPct = data.total > 0 ? (data.blocked / data.total * 100) : 0
  const otherPct = 100 - killPct - errorPct - blockedPct
  const posColor = POSITION_COLORS[data.label] || '#6B7280'

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      p={4}
      borderWidth="1px"
      borderColor="gray.700/60"
      borderTopWidth="3px"
      borderTopColor={posColor}
      position="relative"
    >
      {/* Header */}
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontSize="sm" fontWeight="bold" color="white">{data.label}</Text>
        <Text fontSize="2xl" fontWeight="black" color={getEffColor(eff)} lineHeight="1">
          {eff.toFixed(1)}%
        </Text>
      </Flex>

      {/* Horizontal breakdown bar */}
      <Box w="full" h="10px" borderRadius="full" overflow="hidden" bg="gray.700" mb={3}>
        <Flex h="full">
          {killPct > 0 && <Box h="full" w={`${killPct}%`} bg="#22C55E" />}
          {otherPct > 0 && <Box h="full" w={`${otherPct}%`} bg="#6B7280" />}
          {blockedPct > 0 && <Box h="full" w={`${blockedPct}%`} bg="#F59E0B" />}
          {errorPct > 0 && <Box h="full" w={`${errorPct}%`} bg="#EF4444" />}
        </Flex>
      </Box>

      {/* Stats grid */}
      <Grid templateColumns="repeat(2, 1fr)" gap={2}>
        <StatItem label="Ataques" value={data.total} color="gray.300" />
        <StatItem label="Kills" value={data.kills} color="green.300" subtext={`${killPct.toFixed(0)}%`} />
        <StatItem label="Bloqueados" value={data.blocked} color="orange.300" subtext={`${blockedPct.toFixed(0)}%`} />
        <StatItem label="Erros" value={data.errors} color="red.300" subtext={`${errorPct.toFixed(0)}%`} />
      </Grid>
    </Box>
  )
}

function StatItem({ label, value, color, subtext }: { label: string; value: number; color: string; subtext?: string }) {
  return (
    <Box>
      <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="0.04em">{label}</Text>
      <Flex align="baseline" gap={1}>
        <Text fontSize="md" fontWeight="bold" color={color}>{value}</Text>
        {subtext && <Text fontSize="2xs" color="gray.500">{subtext}</Text>}
      </Flex>
    </Box>
  )
}

// ============================================================================
// Reception Position Card — horizontal quality distribution
// ============================================================================
function ReceptionPositionCard({ data }: { data: ReceptionByPosition }) {
  const perfectPct = data.total > 0 ? (data.perfect / data.total * 100) : 0
  const goodPct = data.total > 0 ? (data.good / data.total * 100) : 0
  const poorPct = data.total > 0 ? (data.poor / data.total * 100) : 0
  const errorPct = data.total > 0 ? (data.errors / data.total * 100) : 0
  const posColor = POSITION_COLORS[data.label] || '#6B7280'

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      p={4}
      borderWidth="1px"
      borderColor="gray.700/60"
      borderTopWidth="3px"
      borderTopColor={posColor}
    >
      {/* Header */}
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontSize="sm" fontWeight="bold" color="white">{data.label}</Text>
        <Text
          fontSize="2xl"
          fontWeight="black"
          color={data.efficiency >= 60 ? '#22C55E' : data.efficiency >= 45 ? '#EAB308' : '#EF4444'}
          lineHeight="1"
        >
          {data.efficiency.toFixed(1)}%
        </Text>
      </Flex>

      {/* Horizontal quality bar */}
      <Box w="full" h="10px" borderRadius="full" overflow="hidden" bg="gray.700" mb={3}>
        <Flex h="full">
          {perfectPct > 0 && <Box h="full" w={`${perfectPct}%`} bg={REC_COLORS.perfect} />}
          {goodPct > 0 && <Box h="full" w={`${goodPct}%`} bg={REC_COLORS.good} />}
          {poorPct > 0 && <Box h="full" w={`${poorPct}%`} bg={REC_COLORS.poor} />}
          {errorPct > 0 && <Box h="full" w={`${errorPct}%`} bg={REC_COLORS.errors} />}
        </Flex>
      </Box>

      {/* Quality breakdown */}
      <Flex justify="space-between">
        <RecQuality label="A" value={data.perfect} pct={perfectPct} color="green.300" />
        <RecQuality label="B" value={data.good} pct={goodPct} color="blue.300" />
        <RecQuality label="C" value={data.poor} pct={poorPct} color="orange.300" />
        <RecQuality label="Err" value={data.errors} pct={errorPct} color="red.300" />
      </Flex>

      <Text fontSize="2xs" color="gray.600" textAlign="center" mt={2}>
        {data.total} recepções totais
      </Text>
    </Box>
  )
}

function RecQuality({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <Flex direction="column" align="center" gap={0}>
      <Text fontSize="2xs" color="gray.500" fontWeight="medium">{label}</Text>
      <Text fontSize="sm" fontWeight="bold" color={color}>{value}</Text>
      <Text fontSize="2xs" color="gray.600">{pct.toFixed(0)}%</Text>
    </Flex>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StrategicCharts({ attackByPosition, receptionByPosition, setterDistribution, pipeAttacks }: StrategicChartsProps) {
  const orderedPie = SETTER_ORDER.map(pos => {
    const found = setterDistribution.find(d => d.label === pos)
    return { name: pos, value: found?.value || 0 }
  }).filter(d => d.value > 0)

  const totalSets = orderedPie.reduce((acc, d) => acc + d.value, 0)

  return (
    <Box>
      {/* Row 1: Attack cards */}
      <Text fontSize="md" fontWeight="bold" color="white" mb={3}>
        Ataque por Posição
      </Text>
      {attackByPosition.length > 0 ? (
        <Grid
          templateColumns={{ base: '1fr', md: `repeat(${Math.min(attackByPosition.length, 3)}, 1fr)` }}
          gap={4}
          mb={5}
        >
          {attackByPosition.map(d => (
            <AttackPositionCard key={d.label} data={d} />
          ))}
        </Grid>
      ) : (
        <Box bg="gray.800" borderRadius="xl" p={6} textAlign="center" borderWidth="1px" borderColor="gray.700/60" mb={5}>
          <Text color="gray.500" fontSize="sm">Sem dados de ataque</Text>
        </Box>
      )}

      {/* Row 2: Reception + Setter distribution — side by side with separate titles */}
      <Grid templateColumns={{ base: '1fr', md: '2fr 1fr' }} gap={5}>
        {/* Reception — Linha de Passe */}
        <Box>
          <Text fontSize="md" fontWeight="bold" color="white" mb={3}>
            Recepção — Linha de Passe
          </Text>
          {receptionByPosition.length > 0 ? (
            <Grid templateColumns={{ base: '1fr', sm: `repeat(${Math.min(receptionByPosition.length, 2)}, 1fr)` }} gap={4}>
              {receptionByPosition.map(d => (
                <ReceptionPositionCard key={d.label} data={d} />
              ))}
            </Grid>
          ) : (
            <Box bg="gray.800" borderRadius="xl" p={6} textAlign="center" borderWidth="1px" borderColor="gray.700/60">
              <Text color="gray.500" fontSize="sm">Sem dados de recepção</Text>
            </Box>
          )}
        </Box>

        {/* Setter distribution */}
        <Box>
          <Text fontSize="md" fontWeight="bold" color="white" mb={3}>
            Distribuição do Levantador
          </Text>
          <Box
            bg="gray.800"
            borderRadius="xl"
            p={4}
            borderWidth="1px"
            borderColor="gray.700/60"
            borderTopWidth="3px"
            borderTopColor="#10B981"
          >
            <Flex justify="space-between" align="center" mb={3}>
              <Text fontSize="sm" fontWeight="bold" color="white">Distribuição</Text>
              <Text fontSize="2xl" fontWeight="bold" color="gray.300">{totalSets} lev.</Text>
            </Flex>

            {orderedPie.length > 0 ? (
              <Flex direction={{ base: 'column', sm: 'row' }} align={{ base: 'center', sm: 'center' }} gap={3}>
                {/* Chart in fixed-width clipped box */}
                <Box w={{ base: '160px', md: '200px' }} h="85px" overflow="hidden" position="relative" flexShrink={0}>
                  <Box position="absolute" top="0" left="0" w={{ base: '160px', md: '200px' }} h="140px" pointerEvents="none">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={orderedPie}
                          cx="50%"
                          cy="50%"
                          startAngle={180}
                          endAngle={0}
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {orderedPie.map((entry, index) => {
                            const colorIndex = SETTER_ORDER.indexOf(entry.name)
                            return <Cell key={index} fill={SETTER_COLORS[colorIndex >= 0 ? colorIndex : index]} />
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>

                {/* Legend */}
                <Flex direction="column" flexWrap="wrap" gap={2} maxH="90px">
                  {orderedPie.map((entry) => {
                    const colorIndex = SETTER_ORDER.indexOf(entry.name)
                    const totalAll = totalSets + (pipeAttacks ?? 0)
                    const pct = totalAll > 0 ? ((entry.value / totalAll) * 100).toFixed(0) : '0'
                    return (
                      <Flex key={entry.name} align="center" gap={2}>
                        <Box w="8px" h="8px" borderRadius="full" flexShrink={0} bg={SETTER_COLORS[colorIndex >= 0 ? colorIndex : 0]} />
                        <Box>
                          <Text fontSize="xs" color="gray.300" fontWeight="semibold" lineHeight="1.2">{entry.name}</Text>
                          <Text fontSize="2xs" color="gray.500">{entry.value} ({pct}%)</Text>
                        </Box>
                      </Flex>
                    )
                  })}
                  {pipeAttacks !== undefined && pipeAttacks > 0 && (
                    <Flex align="center" gap={2}>
                      <Box w="8px" h="2px" flexShrink={0} bg="gray.500" borderRadius="full" />
                      <Box>
                        <Text fontSize="xs" color="gray.400" fontWeight="semibold" lineHeight="1.2">Pipe</Text>
                        <Text fontSize="2xs" color="gray.500">{pipeAttacks} ({(((pipeAttacks) / (totalSets + pipeAttacks)) * 100).toFixed(0)}%)</Text>
                      </Box>
                    </Flex>
                  )}
                </Flex>
              </Flex>
            ) : (
              <Flex align="center" justify="center" h="100px">
                <Text color="gray.500" fontSize="sm">Sem dados</Text>
              </Flex>
            )}
          </Box>
        </Box>
      </Grid>
    </Box>
  )
}
