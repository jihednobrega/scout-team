'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Box,
  Text,
  Flex,
  Select,
  Spinner,
  Badge,
  Tooltip,
} from '@chakra-ui/react'
import type { HeatmapAction } from '@/app/api/scout-actions/heatmap/route'

// ============================================================================
// TYPES
// ============================================================================

export type HeatmapMode = string

export interface ModeConfig {
  label: string
  colors: [string, string]
  rgb: string
  /** Active button color */
  buttonColor?: string
  filterFn: (a: HeatmapAction) => boolean
}

/** Info stat shown below the court (e.g. error counts) */
export interface ErrorInfoConfig {
  label: string
  filterFn: (a: HeatmapAction) => boolean
  color: string
}

export interface HeatmapCourtProps {
  /** API action type: "attack" or "serve" */
  actionType: 'attack' | 'serve'
  matchId?: string
  teamId?: string
  defaultPlayerId?: string
  players?: { id: string; name: string; jerseyNumber: number }[]
  availableSets?: number[]
  compact?: boolean
  title?: string
  defaultTitle?: string
  /** Mode config per mode key */
  modes: Record<string, ModeConfig>
  /** Order of mode keys for the switch */
  modeOrder: string[]
  /** Default mode */
  defaultMode?: string
  /** Error/info stats to show below the map */
  errorInfo?: ErrorInfoConfig[]
  countLabel?: string
  successSubAction?: string
  showRotationFilter?: boolean
  showServeTypeFilter?: boolean
  loadingText?: string
  emptyText?: string
}

// ============================================================================
// CONSTANTS — Landscape orientation matching game court
// ============================================================================

const COURT_WIDTH = 480
const COURT_HEIGHT = 320

interface ZoneRect {
  zone: number
  x: number
  y: number
  w: number
  h: number
}

const DEFENSE_W = 2 / 3
const ATTACK_W = 1 / 3
const ROW_H = 1 / 3

const ZONE_RECTS: ZoneRect[] = [
  { zone: 5, x: 0,         y: 0,         w: DEFENSE_W, h: ROW_H },
  { zone: 6, x: 0,         y: ROW_H,     w: DEFENSE_W, h: ROW_H },
  { zone: 1, x: 0,         y: ROW_H * 2, w: DEFENSE_W, h: ROW_H },
  { zone: 4, x: DEFENSE_W, y: 0,         w: ATTACK_W,  h: ROW_H },
  { zone: 3, x: DEFENSE_W, y: ROW_H,     w: ATTACK_W,  h: ROW_H },
  { zone: 2, x: DEFENSE_W, y: ROW_H * 2, w: ATTACK_W,  h: ROW_H },
]

const SERVE_TYPE_LABELS: Record<string, string> = {
  jump: 'Viagem',
  float: 'Flutuante',
  directed: 'Direcionado',
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeZone(zone: number): number {
  return zone > 10 ? zone - 10 : zone
}

function destToZone(destX: number, destY: number): number {
  const row = destX < 33.33 ? 0 : destX < 66.67 ? 1 : 2
  const isAttack = destY < 33.33
  if (isAttack) return [4, 3, 2][row]
  return [5, 6, 1][row]
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function HeatmapCourt({
  actionType,
  matchId,
  teamId,
  defaultPlayerId,
  players = [],
  availableSets,
  compact = false,
  title,
  defaultTitle = 'Mapa',
  modes,
  modeOrder,
  defaultMode,
  errorInfo = [],
  countLabel = 'Ações',
  successSubAction = 'kill',
  showRotationFilter = true,
  showServeTypeFilter = false,
  loadingText = 'Carregando dados...',
  emptyText = 'Nenhum dado com coordenadas de destino disponível.',
}: HeatmapCourtProps) {
  const [actions, setActions] = useState<HeatmapAction[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<string>(defaultMode || modeOrder[0])
  const [selectedPlayer, setSelectedPlayer] = useState(defaultPlayerId || '')
  const [selectedSet, setSelectedSet] = useState('')
  const [selectedRotation, setSelectedRotation] = useState('')
  const [selectedServeType, setSelectedServeType] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (matchId) params.set('matchId', matchId)
    else if (teamId) params.set('teamId', teamId)
    else return

    params.set('type', actionType)

    fetch(`/api/scout-actions/heatmap?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setActions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [matchId, teamId, actionType])

  // Base filtered (player, set, rotation, serveType) — used as denominator for stats
  const baseFiltered = useMemo(() => {
    let result = actions
    if (selectedPlayer) result = result.filter((a) => a.playerId === selectedPlayer)
    if (selectedSet) result = result.filter((a) => a.setNumber === parseInt(selectedSet))
    if (selectedRotation) result = result.filter((a) => a.rotation === parseInt(selectedRotation))
    if (selectedServeType) result = result.filter((a) => a.serveType === selectedServeType)
    return result
  }, [actions, selectedPlayer, selectedSet, selectedRotation, selectedServeType])

  // Mode-filtered actions (what shows on the map)
  const filteredActions = useMemo(() => {
    const modeConfig = modes[mode]
    if (!modeConfig) return baseFiltered
    return baseFiltered.filter(modeConfig.filterFn)
  }, [baseFiltered, mode, modes])

  const zoneCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    for (const a of filteredActions) {
      let z = normalizeZone(a.zone)
      if (z < 1 || z > 6) z = destToZone(a.destX, a.destY)
      if (z >= 1 && z <= 6) counts[z]++
    }
    return counts
  }, [filteredActions])

  const heatPoints = useMemo(() => {
    return filteredActions.map((a) => {
      const svgY = (a.destX / 100)
      const svgX = 1 - (a.destY / 100)
      return { x: svgX, y: svgY }
    })
  }, [filteredActions])

  const sets = useMemo(() => {
    if (availableSets) return availableSets
    const s = new Set(actions.map((a) => a.setNumber))
    return Array.from(s).sort()
  }, [actions, availableSets])

  const serveTypes = useMemo(() => {
    if (!showServeTypeFilter) return []
    const types = new Set(actions.map((a) => a.serveType).filter(Boolean))
    return Array.from(types) as string[]
  }, [actions, showServeTypeFilter])

  const selectedPlayerInfo = useMemo(() => {
    if (!selectedPlayer) return null
    return players.find((p) => p.id === selectedPlayer)
  }, [selectedPlayer, players])

  const conversionRate = baseFiltered.length > 0
    ? ((baseFiltered.filter((a) => a.subAction === successSubAction).length / baseFiltered.length) * 100).toFixed(1)
    : '0.0'

  // Error info stats
  const errorStats = useMemo(() => {
    return errorInfo.map(info => {
      const count = baseFiltered.filter(info.filterFn).length
      const pct = baseFiltered.length > 0 ? ((count / baseFiltered.length) * 100).toFixed(1) : '0.0'
      return { ...info, count, pct }
    })
  }, [baseFiltered, errorInfo])

  const displayTitle = title || (selectedPlayerInfo
    ? `${defaultTitle} — #${selectedPlayerInfo.jerseyNumber} ${selectedPlayerInfo.name}`
    : defaultTitle)

  const currentModeConfig = modes[mode]

  if (loading) {
    return (
      <Box bg="gray.800" borderRadius="lg" p={5} borderWidth="1px" borderColor="gray.700" textAlign="center">
        <Spinner size="md" color="blue.500" />
        <Text color="gray.400" mt={2} fontSize="sm">{loadingText}</Text>
      </Box>
    )
  }

  if (actions.length === 0) {
    return (
      <Box bg="gray.800" borderRadius="lg" p={5} borderWidth="1px" borderColor="gray.700" textAlign="center">
        <Text color="gray.400" fontSize="sm">{emptyText}</Text>
      </Box>
    )
  }

  const courtW = compact ? 320 : COURT_WIDTH
  const courtH = compact ? 213 : COURT_HEIGHT
  const netBandW = compact ? 14 : 20
  const attackLineX = courtW * DEFENSE_W
  const rowLineY1 = courtH * ROW_H
  const rowLineY2 = courtH * ROW_H * 2

  return (
    <Box bg="gray.800" borderRadius="lg" p={compact ? 3 : 5} borderWidth="1px" borderColor="gray.700" data-testid={`heatmap-${actionType}${compact ? '-compact' : ''}`}>
      {/* Title */}
      <Text fontSize={compact ? 'sm' : 'md'} fontWeight="bold" color="white" mb={compact ? 2 : 3}>
        {displayTitle}
      </Text>

      {/* Filters */}
      {!compact && (
        <Flex gap={2} mb={3} flexWrap="wrap">
          {players.length > 0 && (
            <Select
              size="sm"
              bg="gray.700"
              borderColor="gray.600"
              w="auto"
              minW="150px"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
            >
              <option value="">Todos os jogadores</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.jerseyNumber} {p.name}
                </option>
              ))}
            </Select>
          )}

          {sets.length > 1 && (
            <Select
              size="sm"
              bg="gray.700"
              borderColor="gray.600"
              w="auto"
              minW="90px"
              value={selectedSet}
              onChange={(e) => setSelectedSet(e.target.value)}
            >
              <option value="">Todos sets</option>
              {sets.map((s) => (
                <option key={s} value={s}>Set {s}</option>
              ))}
            </Select>
          )}

          {showRotationFilter && (
            <Select
              size="sm"
              bg="gray.700"
              borderColor="gray.600"
              w="auto"
              minW="90px"
              value={selectedRotation}
              onChange={(e) => setSelectedRotation(e.target.value)}
            >
              <option value="">Todas rot.</option>
              {[1, 2, 3, 4, 5, 6].map((r) => (
                <option key={r} value={r}>S{r}</option>
              ))}
            </Select>
          )}

          {showServeTypeFilter && serveTypes.length > 0 && (
            <Select
              size="sm"
              bg="gray.700"
              borderColor="gray.600"
              w="auto"
              minW="110px"
              value={selectedServeType}
              onChange={(e) => setSelectedServeType(e.target.value)}
            >
              <option value="">Todos tipos</option>
              {serveTypes.map((t) => (
                <option key={t} value={t}>{SERVE_TYPE_LABELS[t] || t}</option>
              ))}
            </Select>
          )}
        </Flex>
      )}

      {/* Court + Mode switch */}
      <Flex gap={3} align="start">
        {/* Vertical mode switch */}
        {!compact && (
          <Flex
            direction="column"
            bg="gray.700"
            borderRadius="md"
            p={0.5}
            gap={0.5}
            flexShrink={0}
          >
            {modeOrder.map((m) => {
              const cfg = modes[m]
              if (!cfg) return null
              const isActive = mode === m
              return (
                <Box
                  key={m}
                  as="button"
                  px={2}
                  py={2}
                  borderRadius="md"
                  fontSize="xs"
                  fontWeight={isActive ? 'bold' : 'normal'}
                  bg={isActive ? (cfg.buttonColor || 'blue.600') : 'transparent'}
                  color={isActive ? 'white' : 'gray.400'}
                  _hover={{ bg: isActive ? undefined : 'gray.600' }}
                  onClick={() => setMode(m)}
                  transition="all 0.15s"
                  whiteSpace="nowrap"
                  w="full"
                  textAlign="center"
                >
                  {cfg.label}
                </Box>
              )
            })}
          </Flex>
        )}

        {/* Court + legend */}
        <Box flex="1" minW={0}>
          <Box overflowX="auto" display="flex" justifyContent="center">
            <svg
              width={courtW}
              height={courtH}
              viewBox={`0 0 ${courtW} ${courtH}`}
              style={{ borderRadius: '8px', overflow: 'hidden', display: 'block', maxWidth: '100%' }}
            >
              <defs>
                <filter id={`heatBlur-${actionType}-${compact ? 'c' : 'f'}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation={compact ? 18 : 25} />
                </filter>
                {currentModeConfig && (
                  <radialGradient id={`heatDot-${actionType}-${mode}`}>
                    <stop offset="0%"   stopColor={`rgb(${currentModeConfig.rgb})`} stopOpacity="1" />
                    <stop offset="55%"  stopColor={`rgb(${currentModeConfig.rgb})`} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={`rgb(${currentModeConfig.rgb})`} stopOpacity="0" />
                  </radialGradient>
                )}
                <clipPath id={`courtClip-${actionType}-${compact ? 'c' : 'f'}`}>
                  <rect x={2} y={2} width={courtW - 4} height={courtH - 4} rx={6} />
                </clipPath>
                <filter id={`textShadow-${actionType}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="black" floodOpacity="0.7" />
                </filter>
              </defs>

              <rect width={courtW} height={courtH} fill="#1a202c" rx={8} />
              <rect x={2} y={2} width={courtW - 4} height={courtH - 4} fill="#2d3748" rx={6} />

              {heatPoints.length > 0 && currentModeConfig && (
                <g clipPath={`url(#courtClip-${actionType}-${compact ? 'c' : 'f'})`}>
                  <g filter={`url(#heatBlur-${actionType}-${compact ? 'c' : 'f'})`}>
                    {heatPoints.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x * (courtW - netBandW)}
                        cy={pt.y * courtH}
                        r={compact ? 44 : 60}
                        fill={`url(#heatDot-${actionType}-${mode})`}
                        opacity={0.65}
                      />
                    ))}
                  </g>
                </g>
              )}

              {ZONE_RECTS.map(({ zone, x, y, w, h }) => {
                const count = zoneCounts[zone] || 0
                const px = x * courtW
                const py = y * courtH
                const pw = w * courtW
                const ph = h * courtH
                const pct = filteredActions.length > 0 ? ((count / filteredActions.length) * 100).toFixed(0) : '0'

                return (
                  <Tooltip
                    key={zone}
                    label={`Zona ${zone}: ${count} ${count === 1 ? 'ação' : 'ações'} (${pct}% do total)`}
                    bg="gray.900"
                    color="white"
                    fontSize="xs"
                    px={3}
                    py={2}
                    borderRadius="md"
                    hasArrow
                    placement="top"
                  >
                    <g style={{ cursor: 'default' }} filter={`url(#textShadow-${actionType})`}>
                      <rect x={px} y={py} width={pw} height={ph} fill="transparent" />
                      <text
                        x={px + pw / 2}
                        y={py + ph / 2 - (count > 0 ? (compact ? 8 : 12) : 0)}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={count > 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.25)'}
                        fontSize={compact ? 14 : 18}
                        fontWeight="bold"
                      >
                        Z{zone}
                      </text>
                      {count > 0 && (
                        <text
                          x={px + pw / 2}
                          y={py + ph / 2 + (compact ? 10 : 14)}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="white"
                          fontSize={compact ? 16 : 22}
                          fontWeight="bold"
                        >
                          {count}
                        </text>
                      )}
                      {count > 0 && filteredActions.length > 0 && !compact && (
                        <text
                          x={px + pw / 2}
                          y={py + ph / 2 + 36}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="rgba(255,255,255,0.7)"
                          fontSize={11}
                        >
                          {pct}%
                        </text>
                      )}
                    </g>
                  </Tooltip>
                )
              })}

              <line x1={attackLineX} y1={2} x2={attackLineX} y2={courtH - 2} stroke="rgba(255,255,255,0.35)" strokeWidth={2} />
              <line x1={2} y1={rowLineY1} x2={courtW - 2} y2={rowLineY1} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="6,4" />
              <line x1={2} y1={rowLineY2} x2={courtW - 2} y2={rowLineY2} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="6,4" />
              <rect x={courtW - netBandW} y={0} width={netBandW} height={courtH} fill="rgba(255,255,255,0.08)" rx={0} />
              <text
                x={courtW - netBandW / 2}
                y={courtH / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(255,255,255,0.5)"
                fontSize={compact ? 9 : 11}
                fontWeight="bold"
                letterSpacing={2}
                transform={`rotate(-90, ${courtW - netBandW / 2}, ${courtH / 2})`}
              >
                REDE
              </text>
              <rect x={2} y={2} width={courtW - 4} height={courtH - 4} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2} rx={6} />
            </svg>
          </Box>

          {/* Legend + stats below court */}
          <Flex align="center" gap={2} mt={2} justify="center" flexWrap="wrap">
            {currentModeConfig && (
              <>
                <Text fontSize="xs" color="gray.500">Menor</Text>
                <Box
                  w={compact ? '80px' : '100px'}
                  h="8px"
                  borderRadius="full"
                  bg={`linear-gradient(to right, rgba(${currentModeConfig.rgb},0.1), rgba(${currentModeConfig.rgb},0.9))`}
                />
                <Text fontSize="xs" color="gray.500">Maior</Text>
              </>
            )}

            {!compact && (
              <>
                <Text fontSize="xs" color="gray.600" mx={1}>|</Text>
                <Text fontSize="xs" color="gray.400">{filteredActions.length} {countLabel?.toLowerCase()}</Text>
                <Text fontSize="xs" color="gray.600" mx={1}>|</Text>
                <Text fontSize="xs" color="green.400" fontWeight="bold">{conversionRate}% conv.</Text>
              </>
            )}
          </Flex>

          {/* Error info stats below */}
          {!compact && errorStats.length > 0 && (
            <Flex gap={3} mt={2} justify="center" flexWrap="wrap">
              {errorStats.map((stat, i) => (
                <Flex key={i} align="center" gap={1.5}>
                  <Box w="6px" h="6px" borderRadius="full" bg={stat.color} />
                  <Text fontSize="xs" color="gray.400">
                    {stat.label}: <Text as="span" color={stat.color} fontWeight="bold">{stat.count}</Text>
                    <Text as="span" color="gray.500"> ({stat.pct}%)</Text>
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}

          <Text fontSize="xs" color="gray.500" textAlign="center" mt={0.5}>
            Quadra adversária
          </Text>
        </Box>
      </Flex>

      {filteredActions.length > 0 && filteredActions.length < 5 && (
        <Badge colorScheme="yellow" fontSize="xs" variant="subtle" mt={2}>
          Poucos dados
        </Badge>
      )}
    </Box>
  )
}
