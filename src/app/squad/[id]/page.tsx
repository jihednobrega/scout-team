// app/squad/[id]/page.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Grid,
  Badge,
  Spinner,
  Icon,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay,
} from '@chakra-ui/react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { useTeamContext } from '@/contexts/TeamContext'
import { POSITION_LABELS } from '@/types/player'
import AIStreamingPanel from '@/components/ai/AIStreamingPanel'
import { IoSparkles } from 'react-icons/io5'

// ─── helpers ─────────────────────────────────────────────────────────────────
const pct = (n: number, total: number) =>
  total > 0 ? ((n / total) * 100).toFixed(1) : '0.0'

const safeDiv = (n: number, d: number, fallback = '—') =>
  d > 0 ? (n / d).toFixed(1) : fallback

const POSITION_COLORS: Record<string, string> = {
  ponteiro:   '#9F7AEA',
  central:    '#14B8A6',
  levantador: '#3B82F6',
  oposto:     '#F97316',
  libero:     '#EAB308',
}

// ─── FundamentalBar ───────────────────────────────────────────────────────────
interface BarSegment { label: string; value: number; color: string }
interface FundamentalBarProps {
  title: string
  icon: string
  total: number
  segments: BarSegment[]
}

function FundamentalBar({ title, icon, total, segments }: FundamentalBarProps) {
  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      p={5}
      borderWidth="1px"
      borderColor="gray.700"
      transition="border-color 0.2s"
      _hover={{ borderColor: 'blue.700' }}
    >
      {/* Header */}
      <Flex justify="space-between" align="center" mb={4}>
        <Flex align="center" gap={2}>
          <img src={icon} alt="" width={20} height={20} style={{ display: 'block', objectFit: 'contain' }} />
          <Text color="white" fontWeight="bold" fontSize="md">{title}</Text>
        </Flex>
        <Box
          bg="whiteAlpha.100"
          borderRadius="full"
          px={3}
          py={0.5}
        >
          <Text color="gray.300" fontSize="xs" fontWeight="bold">
            {total} ações
          </Text>
        </Box>
      </Flex>

      {total === 0 ? (
        <Flex
          h="80px"
          align="center"
          justify="center"
          bg="gray.900"
          borderRadius="lg"
        >
          <Text color="gray.600" fontSize="sm">Sem dados registrados</Text>
        </Flex>
      ) : (
        <>
          {/* Stacked bar */}
          <Flex h="10px" borderRadius="full" overflow="hidden" mb={4} gap="1px">
            {segments.map((seg) =>
              seg.value > 0 ? (
                <Box
                  key={seg.label}
                  h="full"
                  bg={seg.color}
                  flex={`${seg.value} 0 0`}
                  transition="flex 0.4s"
                  title={`${seg.label}: ${pct(seg.value, total)}%`}
                />
              ) : null
            )}
          </Flex>

          {/* Stat rows */}
          <Flex direction="column" gap={2}>
            {segments.map((seg) => (
              <Flex key={seg.label} align="center" gap={2}>
                <Box
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg={seg.color}
                  flexShrink={0}
                />
                <Text color="gray.400" fontSize="xs" flex={1}>
                  {seg.label}
                </Text>
                <Text
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                  fontFamily="mono"
                  w="28px"
                  textAlign="right"
                >
                  {seg.value}
                </Text>
                <Text color="gray.500" fontSize="xs" w="44px" textAlign="right">
                  {pct(seg.value, total)}%
                </Text>
                {/* Mini bar */}
                <Box w="50px" h="3px" bg="gray.700" borderRadius="full" overflow="hidden">
                  <Box
                    h="full"
                    w={`${pct(seg.value, total)}%`}
                    bg={seg.color}
                    borderRadius="full"
                  />
                </Box>
              </Flex>
            ))}
          </Flex>
        </>
      )}
    </Box>
  )
}

// ─── KpiPill ─────────────────────────────────────────────────────────────────
function KpiPill({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <Box
      bg="blackAlpha.400"
      borderRadius="lg"
      px={4}
      py={3}
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      minW="80px"
      textAlign="center"
    >
      <Text color={accent} fontSize="xl" fontWeight="black" lineHeight="1" mb={0.5}>
        {value}
      </Text>
      <Text color="whiteAlpha.600" fontSize="10px" textTransform="uppercase" letterSpacing="widest">
        {label}
      </Text>
    </Box>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function PlayerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const playerId = params.id as string
  const { selectedTeamId } = useTeamContext()
  const { players, loading } = usePlayersAPI(selectedTeamId)

  const player = players.find((p) => p.id === playerId)

  const [statsData, setStatsData] = useState<any>(null)
  const [matchesPerformance, setMatchesPerformance] = useState<any[]>([])
  const [hasCachedInsight, setHasCachedInsight] = useState(false)
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [drawerKey, setDrawerKey] = useState(0)
  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure()
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure()
  const confirmCancelRef = useRef<HTMLButtonElement>(null)

  const fetchStats = useCallback(async () => {
    if (!selectedTeamId || !playerId) return
    try {
      const res = await fetch(`/api/players/stats?teamId=${selectedTeamId}`)
      if (res.ok) {
        const data = await res.json()
        setStatsData(data.playerStats?.[playerId] || null)
      }
      const matchesRes = await fetch(`/api/matches?teamId=${selectedTeamId}`)
      if (matchesRes.ok) {
        const matchesList = await matchesRes.json()
        const perfs: any[] = []
        for (const m of matchesList.slice(-10)) {
          const mRes = await fetch(`/api/matches/${m.id}`)
          if (!mRes.ok) continue
          const mData = await mRes.json()
          const pActions = (mData.actions || []).filter((a: any) => a.playerId === playerId)
          if (pActions.length === 0) continue
          const aces = pActions.filter((a: any) => a.action === 'serve' && a.subAction === 'ace').length
          const blocks = pActions.filter((a: any) => a.action === 'block' && (a.subAction === 'kill_block' || a.subAction === 'point')).length
          const attacks = pActions.filter((a: any) => a.action === 'attack' && (a.subAction === 'kill' || a.subAction === 'tip' || a.subAction === 'block_out')).length
          const errors = pActions.filter((a: any) => a.subAction === 'error').length
          const pts = aces + blocks + attacks
          const total = pActions.filter((a: any) => a.action === 'attack').length
          perfs.push({
            match: m.awayTeam || `Jogo ${perfs.length + 1}`,
            points: pts,
            efficiency: total > 0 ? Math.round((attacks / total) * 100) : 0,
            aces, blocks, attacks, errors,
          })
        }
        setMatchesPerformance(perfs)
      }
    } catch { /* silencioso */ }
  }, [selectedTeamId, playerId])

  useEffect(() => { fetchStats() }, [fetchStats])

  useEffect(() => {
    if (!selectedTeamId || !playerId) return
    const params = new URLSearchParams({ type: 'player_dev', teamId: selectedTeamId, playerId })
    fetch(`/api/ai/insights?${params}`)
      .then(r => r.json())
      .then(data => setHasCachedInsight(!!data.found))
      .catch(() => {})
  }, [selectedTeamId, playerId])

  const handleOpenAI = () => {
    if (!selectedTeamId) return
    if (hasCachedInsight) {
      setAutoGenerate(false)
      setDrawerKey(k => k + 1)
      onDrawerOpen()
    } else {
      onConfirmOpen()
    }
  }

  const handleConfirmGenerate = () => {
    onConfirmClose()
    setAutoGenerate(true)
    setDrawerKey(k => k + 1)
    setHasCachedInsight(true)
    onDrawerOpen()
  }

  const fundamentals = useMemo(() => {
    if (!statsData) return null
    const s = statsData
    return {
      serve: {
        total: s.serve.total,
        segments: [
          { label: 'Ponto direto', value: s.serve.aces, color: '#22C55E' },
          { label: 'Neutro', value: Math.max(0, s.serve.total - s.serve.aces - s.serve.errors), color: '#3B82F6' },
          { label: 'Erro', value: s.serve.errors, color: '#EF4444' },
        ],
      },
      reception: {
        total: s.reception.total,
        segments: [
          { label: 'Perfeita (A)', value: s.reception.perfect, color: '#22C55E' },
          { label: 'Boa (B)', value: s.reception.positive, color: '#86EFAC' },
          { label: 'Ruim (C)', value: Math.max(0, s.reception.total - s.reception.perfect - s.reception.positive - s.reception.errors), color: '#F97316' },
          { label: 'Erro', value: s.reception.errors, color: '#EF4444' },
        ],
      },
      attack: {
        total: s.attack.total,
        segments: [
          { label: 'Ponto', value: s.attack.kills, color: '#22C55E' },
          { label: 'Neutro', value: Math.max(0, s.attack.total - s.attack.kills - s.attack.blocked - s.attack.errors), color: '#3B82F6' },
          { label: 'Bloqueado', value: s.attack.blocked, color: '#F97316' },
          { label: 'Erro', value: s.attack.errors, color: '#EF4444' },
        ],
      },
      block: {
        total: s.block.total,
        segments: [
          { label: 'Ponto', value: s.block.points, color: '#22C55E' },
          { label: 'Toque', value: s.block.touches, color: '#3B82F6' },
          { label: 'Erro', value: s.block.errors, color: '#EF4444' },
          { label: 'Neutro', value: Math.max(0, s.block.total - s.block.points - s.block.touches - s.block.errors), color: '#6B7280' },
        ],
      },
      defense: {
        total: s.defense.total,
        segments: [
          { label: 'Efetiva', value: s.defense.perfect + s.defense.positive, color: '#22C55E' },
          { label: 'Neutra', value: Math.max(0, s.defense.total - s.defense.perfect - s.defense.positive - s.defense.errors), color: '#3B82F6' },
          { label: 'Erro', value: s.defense.errors, color: '#EF4444' },
        ],
      },
      set: {
        total: s.set.total,
        dist: {
          ponteiro: s.set.distribution?.ponteiro ?? 0,
          central: s.set.distribution?.central ?? 0,
          oposto: s.set.distribution?.oposto ?? 0,
          pipe: s.set.distribution?.pipe ?? 0,
        },
        perfect: s.set.perfect ?? 0,
        errors: s.set.errors,
      },
    }
  }, [statsData])

  const radarData = useMemo(() => {
    if (!statsData) return null
    return [
      { skill: 'Saque', value: Math.round(statsData.serve.rating) },
      { skill: 'Recepção', value: Math.round(statsData.reception.rating) },
      { skill: 'Ataque', value: Math.round(statsData.attack.rating) },
      { skill: 'Bloqueio', value: Math.round(statsData.block.rating) },
      { skill: 'Defesa', value: Math.round(statsData.defense.rating) },
      { skill: 'Levantamento', value: Math.round(statsData.set.rating) },
    ]
  }, [statsData])

  if (loading) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    )
  }

  if (!player) {
    return (
      <Flex direction="column" align="center" gap={4} pt={16}>
        <Text color="gray.400" fontSize="lg">Jogador não encontrado</Text>
        <Button colorScheme="blue" onClick={() => router.push('/squad')}>← Voltar para o elenco</Button>
      </Flex>
    )
  }

  const accentColor = POSITION_COLORS[player.position] ?? '#3B82F6'
  const totalPoints = matchesPerformance.reduce((acc, m) => acc + m.points, 0)

  return (
    <Box maxW="1200px" mx="auto">
      {/* ── Voltar ─────────────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        color="gray.500"
        _hover={{ color: 'gray.200' }}
        onClick={() => router.push('/squad')}
        mb={4}
        px={1}
        fontWeight="normal"
      >
        ← Elenco
      </Button>

      {/* ── Hero + Radar ───────────────────────────────────────────── */}
      <Box
        bg="gray.800"
        borderRadius="2xl"
        overflow="hidden"
        mb={6}
        borderWidth="1px"
        borderColor="gray.700"
      >
        <Grid templateColumns={{ base: '1fr', md: '200px 1fr 300px' }}>

          {/* Coluna 1: Foto */}
          <Box
            position="relative"
            h={{ base: '220px', md: 'auto' }}
            minH={{ md: '320px' }}
            bg="gray.900"
            overflow="hidden"
          >
            {player.photo ? (
              <Image
                src={player.photo}
                alt={player.name}
                fill
                style={{ objectFit: 'cover', objectPosition: 'top center' }}
                sizes="200px"
              />
            ) : (
              <Flex h="full" align="center" justify="center">
                <Text fontSize="5xl" color="gray.700" userSelect="none">👤</Text>
              </Flex>
            )}
            {/* Jersey number badge */}
            <Box
              position="absolute"
              bottom={2}
              left={2}
              bg={accentColor}
              color="white"
              fontWeight="black"
              fontSize="xl"
              px={3}
              py={1}
              borderRadius="lg"
              lineHeight="1.4"
              boxShadow="0 2px 8px rgba(0,0,0,0.6)"
            >
              #{player.jerseyNumber}
            </Box>
          </Box>

          {/* Coluna 2: Info */}
          <Box
            p={{ base: 5, md: 6 }}
            borderLeftWidth={{ md: '1px' }}
            borderRightWidth={{ md: '1px' }}
            borderColor="gray.700"
            position="relative"
            overflow="hidden"
          >
            {/* Número decorativo */}
            <Box
              position="absolute"
              right="-5px"
              bottom="-10px"
              fontSize="120px"
              fontWeight="black"
              color="whiteAlpha.50"
              lineHeight="1"
              userSelect="none"
              letterSpacing="-0.05em"
              pointerEvents="none"
            >
              {player.jerseyNumber}
            </Box>

            <Box position="relative" zIndex={1} h="full" display="flex" flexDirection="column" justifyContent="space-between">
              <Box>
                {/* Badges */}
                <Flex gap={2} mb={3} flexWrap="wrap">
                  <Badge
                    px={3} py={1} borderRadius="full" fontSize="xs"
                    fontWeight="bold" color="white" bg={accentColor}
                    letterSpacing="wide" textTransform="uppercase"
                  >
                    {POSITION_LABELS[player.position]}
                  </Badge>
                  {(player.secondaryPositions ?? []).map((pos) => (
                    <Badge
                      key={pos} px={3} py={1} borderRadius="full" fontSize="xs"
                      color="gray.300" bg="whiteAlpha.100" textTransform="uppercase" letterSpacing="wide"
                    >
                      {POSITION_LABELS[pos]}
                    </Badge>
                  ))}
                </Flex>

                {/* Nome */}
                <Heading
                  size={{ base: 'xl', md: '2xl' }}
                  color="white"
                  lineHeight="1.1"
                  letterSpacing="-0.02em"
                  mb={5}
                >
                  {player.name}
                </Heading>
              </Box>

              {/* KPI pills */}
              <Flex gap={2} flexWrap="wrap">
                <KpiPill label="Jogos" value={matchesPerformance.length || '—'} accent="white" />
                <KpiPill
                  label="Pontos"
                  value={totalPoints > 0 ? totalPoints : '—'}
                  accent="#22C55E"
                />
                <KpiPill
                  label="Méd/jogo"
                  value={matchesPerformance.length > 0 ? safeDiv(totalPoints, matchesPerformance.length) : '—'}
                  accent="#86EFAC"
                />
                {statsData && (
                  <KpiPill
                    label="Rating"
                    value={`${Math.round(
                      (statsData.serve.rating + statsData.attack.rating + statsData.reception.rating) / 3
                    )}`}
                    accent={accentColor}
                  />
                )}
              </Flex>
            </Box>
          </Box>

          {/* Coluna 3: Radar */}
          <Box p={{ base: 5, md: 4 }} display="flex" flexDirection="column">
            <Flex align="center" gap={2} mb={2}>
              <Box w="3px" h="14px" bg={accentColor} borderRadius="full" flexShrink={0} />
              <Text color="white" fontWeight="bold" fontSize="sm">Análise de Fundamentos</Text>
            </Flex>
            <Box flex={1} minH="240px">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData ?? [
                  { skill: 'Saque', value: 0 }, { skill: 'Recepção', value: 0 },
                  { skill: 'Ataque', value: 0 }, { skill: 'Bloqueio', value: 0 },
                  { skill: 'Defesa', value: 0 }, { skill: 'Levantamento', value: 0 },
                ]}>
                  <PolarGrid stroke="#2D3748" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Rating"
                    dataKey="value"
                    stroke={accentColor}
                    fill={accentColor}
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Grid>
      </Box>

      {/* ── Botão IA ──────────────────────────────────────────────── */}
      {selectedTeamId && (
        <Flex justify="flex-end" mb={4}>
          <Button
            leftIcon={<Icon as={IoSparkles} />}
            colorScheme="purple"
            variant={hasCachedInsight ? 'solid' : 'outline'}
            size="md"
            onClick={handleOpenAI}
          >
            {hasCachedInsight ? 'Ver relatório IA' : 'Relatório de Desenvolvimento com IA'}
          </Button>
        </Flex>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <Tabs colorScheme="blue" variant="soft-rounded">
        <TabList
          bg="gray.800"
          borderRadius="xl"
          p={1.5}
          mb={6}
          borderWidth="1px"
          borderColor="gray.700"
          gap={1}
        >
          {['Fundamentos', 'Evolução'].map((label) => (
            <Tab
              key={label}
              color="gray.400"
              borderRadius="lg"
              fontSize="sm"
              fontWeight="medium"
              _selected={{ color: 'white', bg: 'blue.600' }}
              _hover={{ color: 'gray.200' }}
            >
              {label}
            </Tab>
          ))}
        </TabList>

        <TabPanels>
          {/* ── Tab 1: Fundamentos ─────────────────────────────────── */}
          <TabPanel px={0} pt={0}>
            {!fundamentals ? (
              <Box
                bg="gray.800"
                borderRadius="xl"
                p={10}
                textAlign="center"
                borderWidth="1px"
                borderColor="gray.700"
              >
                <Text fontSize="3xl" mb={3}>📊</Text>
                <Text color="white" fontWeight="bold" mb={2}>Sem dados de desempenho</Text>
                <Text color="gray.500" fontSize="sm">
                  Os fundamentos serão exibidos após partidas com scout registrado.
                </Text>
              </Box>
            ) : (
              <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
                <FundamentalBar
                  title="Saque"
                  icon="/icons/serve.svg"
                  total={fundamentals.serve.total}
                  segments={fundamentals.serve.segments}
                />
                <FundamentalBar
                  title="Recepção"
                  icon="/icons/reception.svg"
                  total={fundamentals.reception.total}
                  segments={fundamentals.reception.segments}
                />
                <FundamentalBar
                  title="Ataque"
                  icon="/icons/attack.svg"
                  total={fundamentals.attack.total}
                  segments={fundamentals.attack.segments}
                />
                <FundamentalBar
                  title="Bloqueio"
                  icon="/icons/block.svg"
                  total={fundamentals.block.total}
                  segments={fundamentals.block.segments}
                />
                <FundamentalBar
                  title="Defesa"
                  icon="/icons/defense.svg"
                  total={fundamentals.defense.total}
                  segments={fundamentals.defense.segments}
                />

                {/* Levantamento – layout especial com distribuição */}
                <Box
                  bg="gray.800"
                  borderRadius="xl"
                  p={5}
                  borderWidth="1px"
                  borderColor="gray.700"
                  transition="border-color 0.2s"
                  _hover={{ borderColor: 'blue.700' }}
                >
                  <Flex justify="space-between" align="center" mb={4}>
                    <Flex align="center" gap={2}>
                      <img src="/icons/set.svg" alt="" width={20} height={20} style={{ display: 'block', objectFit: 'contain' }} />
                      <Text color="white" fontWeight="bold" fontSize="md">Levantamento</Text>
                    </Flex>
                    <Box bg="whiteAlpha.100" borderRadius="full" px={3} py={0.5}>
                      <Text color="gray.300" fontSize="xs" fontWeight="bold">
                        {fundamentals.set.total} ações
                      </Text>
                    </Box>
                  </Flex>

                  {fundamentals.set.total === 0 ? (
                    <Flex h="80px" align="center" justify="center" bg="gray.900" borderRadius="lg">
                      <Text color="gray.600" fontSize="sm">Sem dados registrados</Text>
                    </Flex>
                  ) : (
                    <>
                      {/* Quality row */}
                      <Flex gap={3} mb={5}>
                        {[
                          { label: 'Perfeito', value: fundamentals.set.perfect, color: '#22C55E' },
                          { label: 'Erro', value: fundamentals.set.errors, color: '#EF4444' },
                        ].map((item) => (
                          <Box
                            key={item.label}
                            flex={1}
                            bg="gray.900"
                            borderRadius="lg"
                            p={3}
                            borderWidth="1px"
                            borderColor="gray.700"
                            textAlign="center"
                          >
                            <Text color="gray.500" fontSize="10px" textTransform="uppercase" letterSpacing="wider" mb={1}>
                              {item.label}
                            </Text>
                            <Text color={item.color} fontWeight="black" fontSize="xl" lineHeight="1">
                              {item.value}
                            </Text>
                            <Text color="gray.600" fontSize="10px" mt={0.5}>
                              {pct(item.value, fundamentals.set.total)}%
                            </Text>
                          </Box>
                        ))}
                      </Flex>

                      {/* Distribuição */}
                      {(() => {
                        const { ponteiro, central, oposto, pipe } = fundamentals.set.dist
                        const distTotal = ponteiro + central + oposto + pipe
                        if (distTotal === 0) return null
                        const items = [
                          { name: 'Ponteiro', value: ponteiro, color: '#9F7AEA' },
                          { name: 'Central', value: central, color: '#14B8A6' },
                          { name: 'Oposto', value: oposto, color: '#F97316' },
                          { name: 'Pipe', value: pipe, color: '#EAB308' },
                        ]
                        return (
                          <>
                            <Flex align="center" gap={2} mb={3}>
                              <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="widest" fontWeight="bold">
                                Distribuição
                              </Text>
                              <Text color="gray.600" fontSize="10px">({distTotal} bolas)</Text>
                            </Flex>
                            <Flex h="8px" borderRadius="full" overflow="hidden" mb={3} gap="1px">
                              {items.map((item) =>
                                item.value > 0 ? (
                                  <Box
                                    key={item.name}
                                    h="full"
                                    bg={item.color}
                                    flex={`${item.value} 0 0`}
                                  />
                                ) : null
                              )}
                            </Flex>
                            <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                              {items.map((item) => {
                                const p = distTotal > 0 ? Math.round((item.value / distTotal) * 100) : 0
                                return (
                                  <Flex key={item.name} align="center" gap={2}>
                                    <Box w="6px" h="6px" borderRadius="full" bg={item.color} flexShrink={0} />
                                    <Text color="gray.400" fontSize="xs" flex={1}>{item.name}</Text>
                                    <Text color="white" fontSize="xs" fontWeight="bold" fontFamily="mono">
                                      {p}%
                                    </Text>
                                  </Flex>
                                )
                              })}
                            </Grid>
                          </>
                        )
                      })()}
                    </>
                  )}
                </Box>
              </Grid>
            )}
          </TabPanel>

          {/* ── Tab 2: Evolução ──────────────────────────────────────── */}
          <TabPanel px={0} pt={0}>
            {matchesPerformance.length === 0 ? (
              <Box
                bg="gray.800"
                borderRadius="xl"
                p={10}
                textAlign="center"
                borderWidth="1px"
                borderColor="gray.700"
              >
                <Text fontSize="3xl" mb={3}>📈</Text>
                <Text color="white" fontWeight="bold" mb={2}>Sem histórico de partidas</Text>
                <Text color="gray.500" fontSize="sm">
                  Os gráficos de evolução aparecem após pelo menos uma partida com scout.
                </Text>
              </Box>
            ) : (
              <>
                {/* KPI summary cards */}
                <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={3} mb={5}>
                  {[
                    { label: 'Partidas', value: matchesPerformance.length, color: 'white', sub: 'registradas' },
                    { label: 'Pontos', value: totalPoints, color: '#22C55E', sub: `${safeDiv(totalPoints, matchesPerformance.length)} /jogo` },
                    {
                      label: 'Eficiência',
                      value: `${safeDiv(matchesPerformance.reduce((a, m) => a + m.efficiency, 0), matchesPerformance.length)}%`,
                      color: '#3B82F6',
                      sub: 'média de ataque',
                    },
                    {
                      label: 'Melhor jogo',
                      value: Math.max(...matchesPerformance.map((m) => m.points)),
                      color: accentColor,
                      sub: 'pontos',
                    },
                  ].map((kpi) => (
                    <Box
                      key={kpi.label}
                      bg="gray.800"
                      borderRadius="xl"
                      p={4}
                      borderWidth="1px"
                      borderColor="gray.700"
                    >
                      <Text color="gray.500" fontSize="xs" textTransform="uppercase" letterSpacing="wider" mb={1}>
                        {kpi.label}
                      </Text>
                      <Text color={kpi.color} fontWeight="black" fontSize="2xl" lineHeight="1" mb={0.5}>
                        {kpi.value}
                      </Text>
                      <Text color="gray.600" fontSize="xs">{kpi.sub}</Text>
                    </Box>
                  ))}
                </Grid>

                {/* Line chart */}
                <Box
                  bg="gray.800"
                  borderRadius="xl"
                  p={6}
                  borderWidth="1px"
                  borderColor="gray.700"
                >
                  <Flex align="center" gap={2} mb={5}>
                    <Box w="3px" h="18px" bg={accentColor} borderRadius="full" flexShrink={0} />
                    <Text color="white" fontWeight="bold" fontSize="md">
                      Evolução por Partida
                    </Text>
                    <Text color="gray.600" fontSize="xs" ml={1}>
                      últimas {matchesPerformance.length} partidas
                    </Text>
                  </Flex>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={matchesPerformance} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                      <XAxis dataKey="match" stroke="#4B5563" tick={{ fill: '#6B7280', fontSize: 11 }} />
                      <YAxis stroke="#4B5563" tick={{ fill: '#6B7280', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
                      />
                      <Legend wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }} />
                      <Area
                        type="monotone"
                        dataKey="points"
                        fill="#F59E0B"
                        fillOpacity={0.15}
                        stroke="#F59E0B"
                        strokeWidth={1.5}
                        strokeOpacity={0.5}
                        name="Total de Pontos"
                      />
                      <Line type="monotone" dataKey="aces" stroke="#22C55E" strokeWidth={2.5} name="Aces" dot={{ fill: '#22C55E', r: 4 }} activeDot={{ r: 7 }} />
                      <Line type="monotone" dataKey="blocks" stroke="#3B82F6" strokeWidth={2.5} name="Bloqueios" dot={{ fill: '#3B82F6', r: 4 }} activeDot={{ r: 7 }} />
                      <Line type="monotone" dataKey="attacks" stroke={accentColor} strokeWidth={2.5} name="Ataques" dot={{ fill: accentColor, r: 4 }} activeDot={{ r: 7 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              </>
            )}
          </TabPanel>

        </TabPanels>
      </Tabs>

      {/* ── Drawer — Relatório de Desenvolvimento com IA ──────────── */}
      <Drawer isOpen={isDrawerOpen} placement="right" onClose={onDrawerClose} size="lg">
        <DrawerOverlay />
        <DrawerContent bg="gray.900" borderLeftWidth="1px" borderColor="gray.700">
          <DrawerCloseButton color="gray.400" />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700" pb={4}>
            <Flex align="center" gap={3}>
              <Icon as={IoSparkles} color="purple.400" boxSize={5} />
              <Box>
                <Text color="white" fontWeight="700" fontSize="lg">Relatório de Desenvolvimento</Text>
                <Text color="gray.400" fontSize="xs" fontWeight="normal">
                  {player.name} · {POSITION_LABELS[player.position]}
                </Text>
              </Box>
              <Badge colorScheme="purple" variant="subtle" ml="auto" mr={8}>Claude</Badge>
            </Flex>
          </DrawerHeader>
          <DrawerBody py={5}>
            {selectedTeamId && (
              <AIStreamingPanel
                key={drawerKey}
                type="player_dev"
                teamId={selectedTeamId}
                playerId={player.id}
                embedded
                autoGenerate={autoGenerate}
              />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* ── AlertDialog — Confirmação ──────────────────────────────── */}
      <AlertDialog isOpen={isConfirmOpen} leastDestructiveRef={confirmCancelRef} onClose={onConfirmClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.800" borderWidth="1px" borderColor="gray.700">
            <AlertDialogHeader color="white" fontSize="lg" fontWeight="bold">
              <Flex align="center" gap={2}>
                <Icon as={IoSparkles} color="purple.400" />
                Gerar relatório com IA?
              </Flex>
            </AlertDialogHeader>
            <AlertDialogBody color="gray.300" fontSize="sm">
              O Claude vai analisar o histórico de {player.name} e gerar um plano de desenvolvimento personalizado com pontos fortes, fraquezas e recomendações de treino.
              O resultado ficará salvo para consultas futuras.
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={confirmCancelRef} variant="ghost" colorScheme="gray" onClick={onConfirmClose}>
                Cancelar
              </Button>
              <Button colorScheme="purple" leftIcon={<Icon as={IoSparkles} />} onClick={handleConfirmGenerate}>
                Gerar relatório
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  )
}
