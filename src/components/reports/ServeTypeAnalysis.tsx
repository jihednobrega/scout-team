'use client'

import { useMemo } from 'react'
import {
  Box,
  Text,
  Flex,
  Grid,
  Heading,
} from '@chakra-ui/react'
import { ScoutAction, ServeType } from '@/types/scout'

// ============================================================================
// TYPES
// ============================================================================

interface ServeTypeStats {
  total: number
  aces: number
  brokenPass: number
  facilitated: number
  errors: number
  acePercent: number
  errorPercent: number
  efficiency: number // (aces - errors) / total
  pressure: number   // (aces + brokenPass) / total — saques que pressionam
}

interface ServeTypeAnalysisProps {
  actions: ScoutAction[]
  matchId?: string
  playerInfo?: Record<string, { name: string; number: string }>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SERVE_TYPE_LABELS: Record<ServeType, string> = {
  jump: 'Viagem',
  float: 'Flutuante',
  directed: 'Direcionado',
}

const SERVE_TYPE_COLORS: Record<ServeType, string> = {
  jump: 'red',
  float: 'blue',
  directed: 'purple',
}

const ALL_TYPES: ServeType[] = ['jump', 'float', 'directed']

// ============================================================================
// HELPERS
// ============================================================================

function createEmptyStats(): ServeTypeStats {
  return { total: 0, aces: 0, brokenPass: 0, facilitated: 0, errors: 0, acePercent: 0, errorPercent: 0, efficiency: 0, pressure: 0 }
}

function finalizeStats(s: ServeTypeStats): ServeTypeStats {
  if (s.total === 0) return s
  s.acePercent = s.aces / s.total
  s.errorPercent = s.errors / s.total
  s.efficiency = (s.aces - s.errors) / s.total
  s.pressure = (s.aces + s.brokenPass) / s.total
  return s
}

function classifyServe(subAction: string, stats: ServeTypeStats) {
  stats.total++
  switch (subAction) {
    case 'ace': stats.aces++; break
    case 'broken_pass': stats.brokenPass++; break
    case 'overpass': stats.brokenPass++; break // xeque ≈ saque agressivo que pressionou
    case 'facilitated': stats.facilitated++; break
    case 'error': stats.errors++; break
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ServeTypeAnalysis({ actions, matchId, playerInfo }: ServeTypeAnalysisProps) {
  const { teamStats, playerStats, hasData } = useMemo(() => {
    const serves = actions.filter(a => {
      if (a.action !== 'serve') return false
      if (matchId && a.matchId !== matchId) return false
      return true
    })

    // Stats por tipo (time todo)
    const byType: Record<ServeType, ServeTypeStats> = {
      float: createEmptyStats(),
      jump: createEmptyStats(),
      directed: createEmptyStats(),
    }
    // Saques sem tipo → não quebrar
    const noType = createEmptyStats()

    // Stats por jogador por tipo
    const byPlayer: Record<string, Record<ServeType, ServeTypeStats>> = {}

    for (const a of serves) {
      const st = a.serveType as ServeType | undefined
      if (st && byType[st]) {
        classifyServe(a.subAction, byType[st])
      } else {
        classifyServe(a.subAction, noType)
      }

      // Per player
      if (a.player && a.player !== '0') {
        if (!byPlayer[a.player]) {
          byPlayer[a.player] = {
            float: createEmptyStats(),
            jump: createEmptyStats(),
            directed: createEmptyStats(),
          }
        }
        if (st && byPlayer[a.player][st]) {
          classifyServe(a.subAction, byPlayer[a.player][st])
        }
      }
    }

    // Finalize
    ALL_TYPES.forEach(t => finalizeStats(byType[t]))
    Object.values(byPlayer).forEach(p => ALL_TYPES.forEach(t => finalizeStats(p[t])))

    const totalWithType = ALL_TYPES.reduce((sum, t) => sum + byType[t].total, 0)

    return {
      teamStats: byType,
      playerStats: byPlayer,
      hasData: totalWithType > 0,
    }
  }, [actions, matchId])

  if (!hasData) return null

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.700"
      p={{ base: 4, md: 6 }}
    >
      <Heading size="md" color="white" mb={4}>
        Eficiência por Tipo de Saque
      </Heading>

      {/* Cards por tipo de saque */}
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mb={6}>
        {ALL_TYPES.map(type => {
          const s = teamStats[type]
          if (s.total === 0) return null
          const color = SERVE_TYPE_COLORS[type]
          return (
            <Box
              key={type}
              bg="gray.900"
              borderRadius="lg"
              borderWidth="1px"
              borderColor={`${color}.700`}
              p={4}
            >
              <Flex justify="space-between" align="center" mb={3}>
                <Text color={`${color}.300`} fontWeight="bold" fontSize="md">
                  {SERVE_TYPE_LABELS[type]}
                </Text>
                <Text color="gray.400" fontSize="sm">
                  {s.total} saque{s.total !== 1 ? 's' : ''}
                </Text>
              </Flex>

              {/* Barra de composição */}
              <Flex h="8px" borderRadius="full" overflow="hidden" mb={3} bg="gray.700">
                {s.aces > 0 && (
                  <Box w={`${(s.aces / s.total) * 100}%`} bg="green.500" />
                )}
                {s.brokenPass > 0 && (
                  <Box w={`${(s.brokenPass / s.total) * 100}%`} bg="blue.500" />
                )}
                {s.facilitated > 0 && (
                  <Box w={`${(s.facilitated / s.total) * 100}%`} bg="gray.500" />
                )}
                {s.errors > 0 && (
                  <Box w={`${(s.errors / s.total) * 100}%`} bg="red.500" />
                )}
              </Flex>

              {/* Métricas */}
              <Grid templateColumns="1fr 1fr" gap={2}>
                <Box>
                  <Text color="gray.500" fontSize="xs">Pressão</Text>
                  <Text color="white" fontWeight="bold" fontSize="lg">
                    {(s.pressure * 100).toFixed(0)}%
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="xs">Eficiência</Text>
                  <Text
                    color={s.efficiency >= 0 ? 'green.400' : 'red.400'}
                    fontWeight="bold"
                    fontSize="lg"
                  >
                    {(s.efficiency * 100).toFixed(0)}%
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="xs">Aces</Text>
                  <Text color="green.300" fontWeight="bold">
                    {s.aces} ({(s.acePercent * 100).toFixed(0)}%)
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.500" fontSize="xs">Erros</Text>
                  <Text color="red.300" fontWeight="bold">
                    {s.errors} ({(s.errorPercent * 100).toFixed(0)}%)
                  </Text>
                </Box>
              </Grid>
            </Box>
          )
        })}
      </Grid>

      {/* Insight automático */}
      {(() => {
        const typesWithData = ALL_TYPES.filter(t => teamStats[t].total > 0)
        if (typesWithData.length < 2) return null

        // Melhor pressão
        const bestPressure = typesWithData.reduce((best, t) =>
          teamStats[t].pressure > teamStats[best].pressure ? t : best
        , typesWithData[0])

        // Maior taxa de erro
        const worstError = typesWithData.reduce((worst, t) =>
          teamStats[t].errorPercent > teamStats[worst].errorPercent ? t : worst
        , typesWithData[0])

        const insights: string[] = []

        if (teamStats[bestPressure].pressure > 0.3) {
          insights.push(
            `${SERVE_TYPE_LABELS[bestPressure]} é o tipo com mais pressão (${(teamStats[bestPressure].pressure * 100).toFixed(0)}% dos saques forçaram o adversário).`
          )
        }

        if (teamStats[worstError].errorPercent > 0.2) {
          insights.push(
            `${SERVE_TYPE_LABELS[worstError]} tem taxa de erro elevada (${(teamStats[worstError].errorPercent * 100).toFixed(0)}%). Considere ajustar a agressividade.`
          )
        }

        // Risco-benefício: erro alto mas também muita pressão?
        const aggressiveTypes = typesWithData.filter(t =>
          teamStats[t].errorPercent > 0.15 && teamStats[t].pressure > 0.25
        )
        for (const t of aggressiveTypes) {
          if (t !== bestPressure && t !== worstError) {
            insights.push(
              `${SERVE_TYPE_LABELS[t]}: saque agressivo com risco-benefício equilibrado (${(teamStats[t].pressure * 100).toFixed(0)}% pressão / ${(teamStats[t].errorPercent * 100).toFixed(0)}% erro).`
            )
          }
        }

        if (insights.length === 0) return null

        return (
          <Box
            bg="blue.900/30"
            borderRadius="lg"
            borderWidth="1px"
            borderColor="blue.700"
            p={4}
          >
            <Text color="blue.300" fontWeight="bold" fontSize="sm" mb={2}>
              Insights
            </Text>
            {insights.map((text, i) => (
              <Text key={i} color="gray.300" fontSize="sm" mb={1}>
                {text}
              </Text>
            ))}
          </Box>
        )
      })()}

      {/* Tabela por jogador */}
      {playerInfo && Object.keys(playerStats).length > 0 && (
        <Box mt={5}>
          <Text color="gray.400" fontSize="sm" fontWeight="bold" mb={3}>
            Por Jogador
          </Text>
          <Box overflowX="auto">
            <Box as="table" w="full" fontSize="sm">
              <Box as="thead">
                <Box as="tr" borderBottomWidth="1px" borderColor="gray.700">
                  <Box as="th" textAlign="left" color="gray.400" py={2} px={2}>Jogador</Box>
                  {ALL_TYPES.filter(t => {
                    return Object.values(playerStats).some(p => p[t].total > 0)
                  }).map(t => (
                    <Box as="th" key={t} textAlign="center" color={`${SERVE_TYPE_COLORS[t]}.300`} py={2} px={2} colSpan={3}>
                      {SERVE_TYPE_LABELS[t]}
                    </Box>
                  ))}
                </Box>
                <Box as="tr" borderBottomWidth="1px" borderColor="gray.700">
                  <Box as="th" py={1} px={2} />
                  {ALL_TYPES.filter(t => {
                    return Object.values(playerStats).some(p => p[t].total > 0)
                  }).map(t => (
                    <>
                      <Box as="th" key={`${t}-tot`} textAlign="center" color="gray.500" py={1} px={1} fontSize="xs">Tot</Box>
                      <Box as="th" key={`${t}-pr`} textAlign="center" color="gray.500" py={1} px={1} fontSize="xs">Prs%</Box>
                      <Box as="th" key={`${t}-err`} textAlign="center" color="gray.500" py={1} px={1} fontSize="xs">Err%</Box>
                    </>
                  ))}
                </Box>
              </Box>
              <Box as="tbody">
                {Object.entries(playerStats)
                  .filter(([, types]) => ALL_TYPES.some(t => types[t].total > 0))
                  .sort(([a], [b]) => {
                    const aTotal = ALL_TYPES.reduce((s, t) => s + playerStats[a][t].total, 0)
                    const bTotal = ALL_TYPES.reduce((s, t) => s + playerStats[b][t].total, 0)
                    return bTotal - aTotal
                  })
                  .map(([pid, types]) => {
                    const info = playerInfo[pid]
                    return (
                      <Box as="tr" key={pid} borderBottomWidth="1px" borderColor="gray.800" _hover={{ bg: 'whiteAlpha.50' }}>
                        <Box as="td" py={2} px={2} color="white" fontWeight="medium" whiteSpace="nowrap">
                          {info ? `#${info.number} ${info.name}` : pid}
                        </Box>
                        {ALL_TYPES.filter(t => {
                          return Object.values(playerStats).some(p => p[t].total > 0)
                        }).map(t => {
                          const s = types[t]
                          if (s.total === 0) {
                            return (
                              <>
                                <Box as="td" key={`${pid}-${t}-tot`} textAlign="center" color="gray.600" py={2} px={1}>-</Box>
                                <Box as="td" key={`${pid}-${t}-pr`} textAlign="center" color="gray.600" py={2} px={1}>-</Box>
                                <Box as="td" key={`${pid}-${t}-err`} textAlign="center" color="gray.600" py={2} px={1}>-</Box>
                              </>
                            )
                          }
                          return (
                            <>
                              <Box as="td" key={`${pid}-${t}-tot`} textAlign="center" color="white" py={2} px={1}>{s.total}</Box>
                              <Box as="td" key={`${pid}-${t}-pr`} textAlign="center" color="blue.300" py={2} px={1}>{(s.pressure * 100).toFixed(0)}%</Box>
                              <Box as="td" key={`${pid}-${t}-err`} textAlign="center" color={s.errorPercent > 0.2 ? 'red.300' : 'gray.300'} py={2} px={1}>{(s.errorPercent * 100).toFixed(0)}%</Box>
                            </>
                          )
                        })}
                      </Box>
                    )
                  })}
              </Box>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}
