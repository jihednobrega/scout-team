// components/statistics/PlayerStatsTable.tsx
'use client'

import { useState, useMemo } from 'react'
import { Box, Text, Flex, Button, Grid, useBreakpointValue } from '@chakra-ui/react'
import { PlayerStatistics, StatisticsFilters } from '@/types/statistics'
import { MdArrowUpward, MdArrowDownward } from 'react-icons/md'

interface PlayerStatsTableProps {
  stats: PlayerStatistics[]
  availablePlayers: { id: string; name: string; number: number }[]
  filters: StatisticsFilters
  onFilterChange: (filters: StatisticsFilters) => void
}

type FundamentoView = 'overview' | 'attack' | 'serve' | 'reception' | 'block' | 'dig' | 'set'

const VIEWS: { id: FundamentoView; label: string; color: string }[] = [
  { id: 'overview', label: 'Geral', color: 'blue' },
  { id: 'attack', label: 'Ataque', color: 'green' },
  { id: 'serve', label: 'Saque', color: 'orange' },
  { id: 'reception', label: 'Recepção', color: 'purple' },
  { id: 'block', label: 'Bloqueio', color: 'red' },
  { id: 'dig', label: 'Defesa', color: 'teal' },
  { id: 'set', label: 'Levantamento', color: 'cyan' },
]

type SortConfig = { key: string; dir: 'asc' | 'desc' }

function getEffColor(value: number): string {
  if (value >= 50) return '#22C55E'
  if (value >= 30) return '#EAB308'
  if (value >= 10) return '#F97316'
  return '#EF4444'
}

function EffBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  return (
    <Text
      as="span"
      fontWeight="bold"
      fontSize="sm"
      color={getEffColor(value)}
    >
      {value.toFixed(1)}{suffix}
    </Text>
  )
}

function getSortValue(player: PlayerStatistics, key: string): number {
  switch (key) {
    case 'totalActions': return player.totalActions
    case 'attacks.efficiency': return player.attacks.efficiency
    case 'attacks.kills': return player.attacks.kills
    case 'attacks.total': return player.attacks.total
    case 'attacks.errors': return player.attacks.errors
    case 'attacks.blocked': return player.attacks.blocked
    case 'attacks.killPct': return player.attacks.total > 0 ? (player.attacks.kills / player.attacks.total) * 100 : 0
    case 'serves.total': return player.serves.total
    case 'serves.aces': return player.serves.aces
    case 'serves.errors': return player.serves.errors
    case 'serves.efficiency': return player.serves.efficiency
    case 'serves.acePct': return player.serves.total > 0 ? (player.serves.aces / player.serves.total) * 100 : 0
    case 'receptions.total': return player.receptions.total
    case 'receptions.perfect': return player.receptions.perfect
    case 'receptions.good': return player.receptions.good
    case 'receptions.poor': return player.receptions.poor
    case 'receptions.errors': return player.receptions.errors
    case 'receptions.efficiency': return player.receptions.efficiency
    case 'blocks.total': return player.blocks.total
    case 'blocks.kills': return player.blocks.kills
    case 'blocks.touches': return player.blocks.touches
    case 'blocks.efficiency': return player.blocks.efficiency
    case 'digs.total': return player.digs.total
    case 'digs.successful': return player.digs.successful
    case 'digs.errors': return player.digs.errors
    case 'digs.efficiency': return player.digs.efficiency
    case 'sets.total': return player.sets.total
    case 'sets.assists': return player.sets.assists
    case 'sets.efficiency': return player.sets.efficiency
    default: return 0
  }
}

function hasDataForView(player: PlayerStatistics, view: FundamentoView): boolean {
  switch (view) {
    case 'overview': return player.totalActions > 0
    case 'attack': return player.attacks.total > 0
    case 'serve': return player.serves.total > 0
    case 'reception': return player.receptions.total > 0
    case 'block': return player.blocks.total > 0
    case 'dig': return player.digs.total > 0
    case 'set': return player.sets.total > 0
    default: return player.totalActions > 0
  }
}

function MobileMetric({ label, value, color = 'gray.200' }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <Flex justify="space-between" align="center" py={1} borderBottomWidth="1px" borderColor="gray.700/40" _last={{ borderBottom: 'none' }}>
      <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="0.06em">{label}</Text>
      <Text fontSize="sm" fontWeight="bold" color={color}>{value}</Text>
    </Flex>
  )
}

function MobilePlayerCard({ player, view }: { player: PlayerStatistics; view: FundamentoView }) {
  const metrics: { label: string; value: React.ReactNode; color?: string }[] = []

  if (view === 'overview') {
    metrics.push(
      { label: 'Ef. Ataque', value: `${player.attacks.efficiency.toFixed(1)}%`, color: player.attacks.efficiency >= 30 ? 'green.300' : player.attacks.efficiency < 0 ? 'red.300' : 'orange.300' },
      { label: 'Kills', value: player.attacks.kills, color: 'green.300' },
      { label: 'Aces', value: player.serves.aces, color: 'green.300' },
      { label: 'Ef. Recep.', value: `${player.receptions.efficiency.toFixed(1)}%`, color: player.receptions.efficiency >= 50 ? 'green.300' : 'orange.300' },
    )
  } else if (view === 'attack') {
    metrics.push(
      { label: 'Total', value: player.attacks.total },
      { label: 'Kills', value: player.attacks.kills, color: 'green.300' },
      { label: 'Erros', value: player.attacks.errors, color: 'red.300' },
      { label: 'Eficiência', value: `${player.attacks.efficiency.toFixed(1)}%`, color: player.attacks.efficiency >= 30 ? 'green.300' : 'orange.300' },
    )
  } else if (view === 'serve') {
    metrics.push(
      { label: 'Total', value: player.serves.total },
      { label: 'Aces', value: player.serves.aces, color: 'green.300' },
      { label: 'Erros', value: player.serves.errors, color: 'red.300' },
      { label: 'Eficiência', value: `${player.serves.efficiency.toFixed(1)}%` },
    )
  } else if (view === 'reception') {
    metrics.push(
      { label: 'Total', value: player.receptions.total },
      { label: 'A (Perf.)', value: player.receptions.perfect, color: 'green.300' },
      { label: 'Erros', value: player.receptions.errors, color: 'red.300' },
      { label: 'Eficiência', value: `${player.receptions.efficiency.toFixed(1)}%`, color: player.receptions.efficiency >= 50 ? 'green.300' : 'orange.300' },
    )
  } else if (view === 'block') {
    metrics.push(
      { label: 'Total', value: player.blocks.total },
      { label: 'Pontos', value: player.blocks.kills, color: 'green.300' },
      { label: 'Eficiência', value: `${player.blocks.efficiency.toFixed(1)}%` },
    )
  } else if (view === 'dig') {
    metrics.push(
      { label: 'Total', value: player.digs.total },
      { label: 'Sucesso', value: player.digs.successful, color: 'green.300' },
      { label: 'Eficiência', value: `${player.digs.efficiency.toFixed(1)}%`, color: player.digs.efficiency >= 50 ? 'green.300' : 'orange.300' },
    )
  } else if (view === 'set') {
    metrics.push(
      { label: 'Total', value: player.sets.total },
      { label: 'Assists', value: player.sets.assists, color: 'green.300' },
      { label: 'Eficiência', value: `${player.sets.efficiency.toFixed(1)}%` },
    )
  }

  return (
    <Box bg="gray.800" borderRadius="xl" borderWidth="1px" borderColor="gray.700/60" overflow="hidden">
      <Flex align="center" gap={2.5} px={3} py={2.5} borderBottomWidth="1px" borderColor="gray.700/60" bg="gray.900/60">
        <Flex
          w="28px" h="28px" align="center" justify="center"
          bg="blue.600" color="white" fontWeight="bold" fontSize="xs" borderRadius="md" flexShrink={0}
        >
          {player.jerseyNumber}
        </Flex>
        <Box minW={0}>
          <Text color="white" fontWeight="semibold" fontSize="xs" noOfLines={1}>{player.playerName}</Text>
          <Text color="gray.500" fontSize="2xs">{player.totalActions} ações</Text>
        </Box>
      </Flex>
      <Box px={3} py={2}>
        {metrics.map(m => (
          <MobileMetric key={m.label} label={m.label} value={m.value} color={m.color} />
        ))}
      </Box>
    </Box>
  )
}

export default function PlayerStatsTable({ stats, availablePlayers, filters, onFilterChange }: PlayerStatsTableProps) {
  const [view, setView] = useState<FundamentoView>('overview')
  const [sort, setSort] = useState<SortConfig>({ key: 'totalActions', dir: 'desc' })
  const isMobile = useBreakpointValue({ base: true, md: false })

  const handleSort = (key: string) => {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  }

  const displayStats = useMemo(() => {
    const filtered = stats.filter(p => hasDataForView(p, view))
    return [...filtered].sort((a, b) => {
      const aVal = getSortValue(a, sort.key)
      const bVal = getSortValue(b, sort.key)
      return sort.dir === 'desc' ? bVal - aVal : aVal - bVal
    })
  }, [stats, view, sort])

  const selectStyles = {
    bg: 'gray.700',
    borderColor: 'gray.600',
    borderWidth: '1px',
    borderRadius: 'md',
    color: 'white',
    _hover: { borderColor: 'blue.500' },
    height: '30px',
    px: 3,
    fontSize: 'xs',
  }

  return (
    <Box>
      {/* Filtro de jogador + View Selector unificados */}
      <Flex gap={3} mb={4} flexWrap="wrap" align="center">
        <Box minW="160px">
          <Box
            as="select"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onFilterChange({ ...filters, playerId: e.target.value === 'all' ? undefined : e.target.value })
            }
            {...selectStyles}
            w="full"
            defaultValue={filters.playerId || 'all'}
          >
            <option value="all">Todos os jogadores</option>
            {availablePlayers.map((player) => (
              <option key={player.id} value={player.id}>
                #{player.number} {player.name}
              </option>
            ))}
          </Box>
        </Box>

        <Box w="1px" h="24px" bg="gray.700" display={{ base: 'none', md: 'block' }} />

        <Flex gap={1} flexWrap="wrap" flex="1">
          {VIEWS.map(v => (
            <Button
              key={v.id}
              size="xs"
              h="30px"
              px={3}
              bg={view === v.id ? `${v.color}.500` : 'gray.700'}
              color="white"
              borderRadius="md"
              fontWeight={view === v.id ? 'bold' : 'medium'}
              onClick={() => setView(v.id)}
              _hover={{ bg: view === v.id ? `${v.color}.600` : 'gray.600' }}
              fontSize="xs"
            >
              {v.label}
            </Button>
          ))}
        </Flex>
      </Flex>

      {/* Table / Card View */}
      {displayStats.length === 0 ? (
        <Box bg="gray.800" borderRadius="xl" p={8} textAlign="center" borderWidth="1px" borderColor="gray.700/60">
          <Text color="gray.400">Nenhum atleta com dados para este fundamento.</Text>
        </Box>
      ) : isMobile ? (
        <Grid templateColumns="repeat(2, 1fr)" gap={2}>
          {displayStats.map(player => (
            <MobilePlayerCard key={player.playerId} player={player} view={view} />
          ))}
        </Grid>
      ) : (
        <Box
          bg="gray.800"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.700/60"
          overflowX="auto"
        >
          <Box as="table" w="full" fontSize="sm">
            <Box as="thead">
              <Box as="tr" borderBottomWidth="1px" borderColor="gray.700">
                <ThStatic sticky>Atleta</ThStatic>
                {view === 'overview' && (
                  <>
                    <ThSort label="Ações" sortKey="totalActions" sort={sort} onSort={handleSort} />
                    <ThSort label="Ef. Ataque" sortKey="attacks.efficiency" sort={sort} onSort={handleSort} />
                    <ThSort label="Kills" sortKey="attacks.kills" sort={sort} onSort={handleSort} />
                    <ThSort label="Aces" sortKey="serves.aces" sort={sort} onSort={handleSort} />
                    <ThSort label="Bloq. Pts" sortKey="blocks.kills" sort={sort} onSort={handleSort} />
                    <ThSort label="Ef. Recep." sortKey="receptions.efficiency" sort={sort} onSort={handleSort} />
                    <ThSort label="Defesas" sortKey="digs.successful" sort={sort} onSort={handleSort} />
                  </>
                )}
                {view === 'attack' && (
                  <>
                    <ThSort label="Total" sortKey="attacks.total" sort={sort} onSort={handleSort} />
                    <ThSort label="Kills" sortKey="attacks.kills" sort={sort} onSort={handleSort} />
                    <ThSort label="Erros" sortKey="attacks.errors" sort={sort} onSort={handleSort} />
                    <ThSort label="Bloq." sortKey="attacks.blocked" sort={sort} onSort={handleSort} />
                    <ThSort label="Eficiência" sortKey="attacks.efficiency" sort={sort} onSort={handleSort} />
                    <ThSort label="Kill %" sortKey="attacks.killPct" sort={sort} onSort={handleSort} />
                  </>
                )}
                {view === 'serve' && (
                  <>
                    <ThSort label="Total" sortKey="serves.total" sort={sort} onSort={handleSort} />
                    <ThSort label="Aces" sortKey="serves.aces" sort={sort} onSort={handleSort} />
                    <ThSort label="Erros" sortKey="serves.errors" sort={sort} onSort={handleSort} />
                    <ThSort label="Eficiência" sortKey="serves.efficiency" sort={sort} onSort={handleSort} />
                    <ThSort label="Ace %" sortKey="serves.acePct" sort={sort} onSort={handleSort} />
                  </>
                )}
                {view === 'reception' && (
                  <>
                    <ThSort label="Total" sortKey="receptions.total" sort={sort} onSort={handleSort} />
                    <ThSort label="A (Perf.)" sortKey="receptions.perfect" sort={sort} onSort={handleSort} />
                    <ThSort label="B (Boa)" sortKey="receptions.good" sort={sort} onSort={handleSort} />
                    <ThSort label="C (Ruim)" sortKey="receptions.poor" sort={sort} onSort={handleSort} />
                    <ThSort label="Erros" sortKey="receptions.errors" sort={sort} onSort={handleSort} />
                    <ThSort label="Eficiência" sortKey="receptions.efficiency" sort={sort} onSort={handleSort} />
                  </>
                )}
                {view === 'block' && (
                  <>
                    <ThSort label="Total" sortKey="blocks.total" sort={sort} onSort={handleSort} />
                    <ThSort label="Pontos" sortKey="blocks.kills" sort={sort} onSort={handleSort} />
                    <ThSort label="Toques" sortKey="blocks.touches" sort={sort} onSort={handleSort} />
                    <ThSort label="Eficiência" sortKey="blocks.efficiency" sort={sort} onSort={handleSort} />
                  </>
                )}
                {view === 'dig' && (
                  <>
                    <ThSort label="Total" sortKey="digs.total" sort={sort} onSort={handleSort} />
                    <ThSort label="Sucesso" sortKey="digs.successful" sort={sort} onSort={handleSort} />
                    <ThSort label="Erros" sortKey="digs.errors" sort={sort} onSort={handleSort} />
                    <ThSort label="Eficiência" sortKey="digs.efficiency" sort={sort} onSort={handleSort} />
                  </>
                )}
                {view === 'set' && (
                  <>
                    <ThSort label="Total" sortKey="sets.total" sort={sort} onSort={handleSort} />
                    <ThSort label="Assistências" sortKey="sets.assists" sort={sort} onSort={handleSort} />
                    <ThSort label="Eficiência" sortKey="sets.efficiency" sort={sort} onSort={handleSort} />
                  </>
                )}
              </Box>
            </Box>
            <Box as="tbody">
              {displayStats.map((player) => (
                <Box
                  as="tr"
                  key={player.playerId}
                  borderBottomWidth="1px"
                  borderColor="gray.700/40"
                  _hover={{ bg: 'gray.700/30' }}
                  transition="background 0.1s"
                >
                  <Box
                    as="td"
                    py={3}
                    px={4}
                    position="sticky"
                    left={0}
                    bg="gray.800"
                    zIndex={1}
                    minW="160px"
                  >
                    <Flex align="center" gap={2.5}>
                      <Flex
                        w="32px"
                        h="32px"
                        align="center"
                        justify="center"
                        bg="blue.600"
                        color="white"
                        fontWeight="bold"
                        fontSize="xs"
                        borderRadius="md"
                        flexShrink={0}
                      >
                        {player.jerseyNumber}
                      </Flex>
                      <Box>
                        <Text color="white" fontWeight="semibold" fontSize="sm" noOfLines={1}>
                          {player.playerName}
                        </Text>
                        <Text color="gray.500" fontSize="2xs">
                          {player.totalActions} ações
                        </Text>
                      </Box>
                    </Flex>
                  </Box>

                  {view === 'overview' && (
                    <>
                      <Td>{player.totalActions}</Td>
                      <Td><EffBadge value={player.attacks.efficiency} /></Td>
                      <Td highlight="green">{player.attacks.kills}</Td>
                      <Td highlight="green">{player.serves.aces}</Td>
                      <Td highlight="green">{player.blocks.kills}</Td>
                      <Td><EffBadge value={player.receptions.efficiency} /></Td>
                      <Td>{player.digs.successful}</Td>
                    </>
                  )}
                  {view === 'attack' && (
                    <>
                      <Td>{player.attacks.total}</Td>
                      <Td highlight="green">{player.attacks.kills}</Td>
                      <Td highlight="red">{player.attacks.errors}</Td>
                      <Td highlight="orange">{player.attacks.blocked}</Td>
                      <Td><EffBadge value={player.attacks.efficiency} /></Td>
                      <Td>
                        <EffBadge value={player.attacks.total > 0 ? (player.attacks.kills / player.attacks.total) * 100 : 0} />
                      </Td>
                    </>
                  )}
                  {view === 'serve' && (
                    <>
                      <Td>{player.serves.total}</Td>
                      <Td highlight="green">{player.serves.aces}</Td>
                      <Td highlight="red">{player.serves.errors}</Td>
                      <Td><EffBadge value={player.serves.efficiency} /></Td>
                      <Td>
                        <EffBadge value={player.serves.total > 0 ? (player.serves.aces / player.serves.total) * 100 : 0} />
                      </Td>
                    </>
                  )}
                  {view === 'reception' && (
                    <>
                      <Td>{player.receptions.total}</Td>
                      <Td highlight="green">{player.receptions.perfect}</Td>
                      <Td highlight="blue">{player.receptions.good}</Td>
                      <Td highlight="orange">{player.receptions.poor}</Td>
                      <Td highlight="red">{player.receptions.errors}</Td>
                      <Td><EffBadge value={player.receptions.efficiency} /></Td>
                    </>
                  )}
                  {view === 'block' && (
                    <>
                      <Td>{player.blocks.total}</Td>
                      <Td highlight="green">{player.blocks.kills}</Td>
                      <Td highlight="blue">{player.blocks.touches}</Td>
                      <Td><EffBadge value={player.blocks.efficiency} /></Td>
                    </>
                  )}
                  {view === 'dig' && (
                    <>
                      <Td>{player.digs.total}</Td>
                      <Td highlight="green">{player.digs.successful}</Td>
                      <Td highlight="red">{player.digs.errors}</Td>
                      <Td><EffBadge value={player.digs.efficiency} /></Td>
                    </>
                  )}
                  {view === 'set' && (
                    <>
                      <Td>{player.sets.total}</Td>
                      <Td highlight="green">{player.sets.assists}</Td>
                      <Td><EffBadge value={player.sets.efficiency} /></Td>
                    </>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

function ThStatic({ children, sticky }: { children: React.ReactNode; sticky?: boolean }) {
  return (
    <Box
      as="th"
      py={3}
      px={4}
      textAlign="left"
      fontSize="xs"
      fontWeight="semibold"
      color="gray.400"
      textTransform="uppercase"
      letterSpacing="0.05em"
      whiteSpace="nowrap"
      {...(sticky ? { position: 'sticky', left: 0, bg: 'gray.800', zIndex: 2 } : {})}
    >
      {children}
    </Box>
  )
}

function ThSort({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: string
  sort: SortConfig
  onSort: (key: string) => void
}) {
  const isActive = sort.key === sortKey
  return (
    <Box
      as="th"
      py={3}
      px={4}
      textAlign="left"
      fontSize="xs"
      fontWeight="semibold"
      color={isActive ? 'blue.300' : 'gray.400'}
      textTransform="uppercase"
      letterSpacing="0.05em"
      whiteSpace="nowrap"
      cursor="pointer"
      userSelect="none"
      _hover={{ color: 'white' }}
      onClick={() => onSort(sortKey)}
      transition="color 0.1s"
    >
      <Flex align="center" gap={1}>
        {label}
        {isActive && (
          sort.dir === 'desc'
            ? <MdArrowDownward size={12} />
            : <MdArrowUpward size={12} />
        )}
      </Flex>
    </Box>
  )
}

function Td({ children, highlight }: { children: React.ReactNode; highlight?: string }) {
  let color = 'gray.200'
  if (highlight === 'green') color = 'green.300'
  else if (highlight === 'red') color = 'red.300'
  else if (highlight === 'orange') color = 'orange.300'
  else if (highlight === 'blue') color = 'blue.300'

  return (
    <Box
      as="td"
      py={3}
      px={4}
      whiteSpace="nowrap"
    >
      <Text color={color} fontSize="sm" fontWeight={highlight ? 'semibold' : 'normal'}>
        {children}
      </Text>
    </Box>
  )
}
