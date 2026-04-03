// app/history/[id]/page.tsx
'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Box,
  Flex,
  Text,
  Grid,
  Badge,
  Button,
  Spinner,
} from '@chakra-ui/react'
import { useMatchDetail } from '@/hooks/useMatchesAPI'
import { useTeamContext } from '@/contexts/TeamContext'
import AIInsightCard from '@/components/ai/AIInsightCard'

// ─── Helpers ────────────────────────────────────────────────────────────────

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <Box w="full" h="3px" bg="gray.700" borderRadius="full" overflow="hidden">
      <Box h="full" w={`${pct}%`} bg={color} borderRadius="full" />
    </Box>
  )
}

function MetricRow({
  label,
  value,
  sub,
  color = 'white',
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <Flex justify="space-between" align="center" py={2} borderBottomWidth="1px" borderColor="gray.700/40">
      <Text fontSize="sm" color="gray.400">{label}</Text>
      <Flex align="baseline" gap={1.5}>
        <Text fontSize="sm" fontWeight="bold" color={color}>{value}</Text>
        {sub && <Text fontSize="xs" color="gray.500">{sub}</Text>}
      </Flex>
    </Flex>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function MatchDetailPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params?.id as string
  const { selectedTeamId } = useTeamContext()

  const { match, loading } = useMatchDetail(matchId || null)

  useEffect(() => {
    if (!loading && !match) {
      setTimeout(() => router.push('/history'), 2000)
    }
  }, [loading, match, router])

  // ── Computar analytics das ações ─────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!match || match.actions.length === 0) return null
    const a = match.actions

    const KILL_SUBS = ['kill', 'tip', 'block_out']
    const atk = {
      total: a.filter(x => x.action === 'attack').length,
      kills: a.filter(x => x.action === 'attack' && KILL_SUBS.includes(x.subAction)).length,
      errors: a.filter(x => x.action === 'attack' && x.subAction === 'error').length,
      blocked: a.filter(x => x.action === 'attack' && x.subAction === 'blocked').length,
    }
    const atkEfficiency = atk.total > 0
      ? Math.round(((atk.kills - atk.errors - atk.blocked) / atk.total) * 100)
      : null

    const serve = {
      total: a.filter(x => x.action === 'serve').length,
      aces: a.filter(x => x.action === 'serve' && x.subAction === 'ace').length,
      errors: a.filter(x => x.action === 'serve' && x.subAction === 'error').length,
    }

    const block = {
      total: a.filter(x => x.action === 'block').length,
      points: a.filter(x => x.action === 'block' && (x.subAction === 'kill_block' || x.subAction === 'point')).length,
    }

    const rec = {
      total: a.filter(x => x.action === 'reception').length,
      perfect: a.filter(x => x.action === 'reception' && x.subAction === 'perfect').length,
      positive: a.filter(x => x.action === 'reception' && x.subAction === 'positive').length,
      errors: a.filter(x => x.action === 'reception' && x.subAction === 'error').length,
    }
    const recQuality = rec.total > 0
      ? Math.round(((rec.perfect + rec.positive) / rec.total) * 100)
      : null

    const dig = {
      total: a.filter(x => x.action === 'dig').length,
      errors: a.filter(x => x.action === 'dig' && x.subAction === 'error').length,
    }

    // Análise por set: contagem de ações por set
    const setsNumbers = [...new Set(a.map(x => x.set).filter(Boolean))].sort()
    const bySet = setsNumbers.map(setNum => ({
      set: setNum,
      actions: a.filter(x => x.set === setNum).length,
      kills: a.filter(x => x.set === setNum && x.action === 'attack' && KILL_SUBS.includes(x.subAction)).length,
      errors: a.filter(x => x.set === setNum && (x.subAction === 'error')).length,
    }))

    // Fase sideout vs transição
    const hasPhasData = a.some(x => x.phase)
    const phase = hasPhasData ? {
      sideout: a.filter(x => x.phase === 'sideout').length,
      transition: a.filter(x => x.phase === 'transition').length,
    } : null

    // Total de erros por fundamento
    const errorsByFundamental = [
      { label: 'Ataque', count: atk.errors },
      { label: 'Saque', count: serve.errors },
      { label: 'Recepção', count: rec.errors },
      { label: 'Defesa', count: dig.errors },
    ].filter(e => e.count > 0).sort((a, b) => b.count - a.count)

    return { atk, atkEfficiency, serve, block, rec, recQuality, dig, bySet, phase, errorsByFundamental }
  }, [match])

  // ── Loading / not found ───────────────────────────────────────────────────

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="300px" direction="column" gap={4}>
        <Spinner size="xl" color="blue.400" thickness="3px" />
        <Text color="gray.400" fontSize="sm">Carregando partida...</Text>
      </Flex>
    )
  }

  if (!match) {
    return (
      <Flex justify="center" align="center" minH="300px" direction="column" gap={4}>
        <Text color="gray.400" fontSize="lg">Partida não encontrada</Text>
        <Button size="sm" colorScheme="blue" onClick={() => router.push('/history')}>
          ← Voltar ao Histórico
        </Button>
      </Flex>
    )
  }

  const isWin = match.result === 'vitoria'
  const setsWon = match.sets.filter(s => s.homeScore > s.awayScore).length
  const setsLost = match.sets.filter(s => s.homeScore < s.awayScore).length
  const maxSetScore = Math.max(...match.sets.flatMap(s => [s.homeScore, s.awayScore]), 25)

  return (
    <>
      {/* ── Breadcrumb ── */}
      <Flex align="center" gap={2} mb={4}>
        <Button
          size="sm"
          variant="ghost"
          color="gray.400"
          _hover={{ color: 'white' }}
          onClick={() => router.push('/history')}
          px={2}
          fontWeight="normal"
        >
          ← Jogos
        </Button>
        <Text color="gray.600" fontSize="sm">/</Text>
        <Text color="gray.400" fontSize="sm" noOfLines={1}>
          vs {match.awayTeam}
        </Text>
      </Flex>

      {/* ── Hero + CTAs lado a lado ── */}
      <Flex gap={3} mb={4} align="stretch" direction={{ base: 'column', md: 'row' }}>

        {/* Hero card */}
        <Box
          flex="1"
          bg={isWin ? 'green.900/30' : 'red.900/20'}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={isWin ? 'green.700/50' : 'red.700/40'}
          p={{ base: 5, md: 7 }}
          position="relative"
          overflow="hidden"
        >
          {/* Faixa superior colorida */}
          <Box
            position="absolute"
            top={0} left={0} right={0} h="3px"
            bg={isWin ? 'green.400' : 'red.400'}
          />

          {/* Meta da partida */}
          <Flex align="center" gap={2} mb={4} flexWrap="wrap">
            <Text fontSize="sm" color="gray.400">
              {match.date.toLocaleDateString('pt-BR', {
                weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              })}
            </Text>
            {match.tournament && (
              <>
                <Text color="gray.600" fontSize="xs">·</Text>
                <Badge colorScheme="blue" variant="subtle" fontSize="xs" borderRadius="md" px={2}>
                  {match.tournament}
                </Badge>
              </>
            )}
            {match.location && (
              <>
                <Text color="gray.600" fontSize="xs">·</Text>
                <Text fontSize="xs" color="gray.500">📍 {match.location}</Text>
              </>
            )}
          </Flex>

          {/* Placar central */}
          <Flex
            align="center"
            justify="space-between"
            direction={{ base: 'column', sm: 'row' }}
            gap={4}
          >
            {/* Time da casa */}
            <Box flex="1" textAlign={{ base: 'center', sm: 'left' }}>
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="blue.300">
                {match.homeTeam}
              </Text>
              <Text fontSize="xs" color="gray.500">Casa</Text>
            </Box>

            {/* Placar + resultado */}
            <Flex direction="column" align="center" gap={2}>
              <Text
                fontSize={{ base: '4xl', md: '5xl' }}
                fontWeight="black"
                color="white"
                letterSpacing="-0.03em"
                lineHeight="1"
              >
                {match.finalScore}
              </Text>
              <Badge
                px={4}
                py={1.5}
                borderRadius="full"
                colorScheme={isWin ? 'green' : 'red'}
                fontSize="sm"
                fontWeight="bold"
                letterSpacing="wide"
              >
                {isWin ? '✓ VITÓRIA' : '✗ DERROTA'}
              </Badge>
              {match.duration && (
                <Text fontSize="xs" color="gray.500">
                  {match.duration} min
                </Text>
              )}
            </Flex>

            {/* Adversário */}
            <Box flex="1" textAlign={{ base: 'center', sm: 'right' }}>
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="gray.300">
                {match.awayTeam}
              </Text>
              <Text fontSize="xs" color="gray.500">Visitante</Text>
            </Box>
          </Flex>
        </Box>

        {/* ── CTAs empilhados — mesma altura do hero ── */}
        <Flex
          direction="column"
          gap={3}
          w={{ base: 'full', md: '180px' }}
          flexShrink={0}
        >
          {/* Primário: Relatório */}
          <Box
            as="button"
            flex="1"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap={2}
            px={4}
            borderRadius="xl"
            fontWeight="bold"
            color="white"
            cursor="pointer"
            style={{
              background: 'linear-gradient(160deg, #7C3AED 0%, #4C1D95 100%)',
              boxShadow: '0 0 24px rgba(124, 58, 237, 0.45), inset 0 1px 0 rgba(255,255,255,0.10)',
            }}
            transition="all 0.2s"
            _hover={{
              transform: 'translateY(-2px)',
              boxShadow: '0 0 36px rgba(139, 92, 246, 0.65), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
            _active={{ transform: 'translateY(0)' }}
            onClick={() => router.push(`/reports/${match.id}`)}
          >
            <Text fontSize="2xl" lineHeight="1">📄</Text>
            <Box textAlign="center">
              <Text fontSize="sm" fontWeight="bold" lineHeight="1.2">
                Ver Relatório
              </Text>
              <Text fontSize="sm" fontWeight="bold" lineHeight="1.2">
                Completo
              </Text>
            </Box>
          </Box>

          {/* Secundário: Estatísticas */}
          <Box
            as="button"
            flex="1"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap={2}
            px={4}
            borderRadius="xl"
            fontWeight="semibold"
            color="blue.300"
            cursor="pointer"
            bg="gray.800"
            borderWidth="1px"
            borderColor="blue.900"
            transition="all 0.15s"
            _hover={{
              bg: 'blue.900/50',
              borderColor: 'blue.700',
              color: 'blue.200',
              transform: 'translateY(-1px)',
            }}
            _active={{ transform: 'translateY(0)' }}
            onClick={() => router.push('/statistics')}
          >
            <Text fontSize="2xl" lineHeight="1">📊</Text>
            <Box textAlign="center">
              <Text fontSize="sm" lineHeight="1.2">Estatísticas</Text>
              <Text fontSize="sm" lineHeight="1.2">da Equipe</Text>
            </Box>
          </Box>
        </Flex>

      </Flex>

      {/* ── Resumo IA ── */}
      {selectedTeamId && (
        <Box mb={4}>
          <AIInsightCard
            type="match_summary"
            teamId={selectedTeamId}
            matchId={matchId}
            accent="#8B5CF6"
          />
        </Box>
      )}

      {/* ── Sets: visualização por barras ── */}
      {match.sets.length > 0 && (
        <Box
          bg="gray.800"
          borderRadius="xl"
          p={5}
          mb={4}
          borderWidth="1px"
          borderColor="gray.700"
        >
          <Flex align="center" justify="space-between" mb={4}>
            <Text fontSize="sm" fontWeight="bold" color="white">Sets da Partida</Text>
            <Flex gap={3}>
              <Flex align="center" gap={1.5}>
                <Box w="8px" h="8px" borderRadius="full" bg="green.400" />
                <Text fontSize="xs" color="gray.400">{setsWon} ganhos</Text>
              </Flex>
              <Flex align="center" gap={1.5}>
                <Box w="8px" h="8px" borderRadius="full" bg="red.400" />
                <Text fontSize="xs" color="gray.400">{setsLost} perdidos</Text>
              </Flex>
            </Flex>
          </Flex>

          <Grid templateColumns={{ base: `repeat(${Math.min(match.sets.length, 3)}, 1fr)`, md: `repeat(${Math.min(match.sets.length, 5)}, 1fr)` }} gap={3}>
            {match.sets.map((set) => {
              const won = set.homeScore > set.awayScore
              const diff = set.homeScore - set.awayScore
              const homePct = maxSetScore > 0 ? (set.homeScore / maxSetScore) * 100 : 0
              const awayPct = maxSetScore > 0 ? (set.awayScore / maxSetScore) * 100 : 0
              return (
                <Box
                  key={set.number}
                  bg="gray.900"
                  borderRadius="lg"
                  p={3}
                  borderWidth="1px"
                  borderColor={won ? 'green.700/60' : 'red.700/40'}
                  borderTopWidth="3px"
                  borderTopColor={won ? 'green.500' : 'red.500'}
                  textAlign="center"
                >
                  <Text fontSize="2xs" color="gray.500" mb={2} fontWeight="bold" textTransform="uppercase">
                    {set.number}º Set
                  </Text>

                  {/* Barra casa */}
                  <Flex align="center" gap={2} mb={1}>
                    <Text fontSize="xs" color="gray.500" minW="16px" textAlign="right">C</Text>
                    <Box flex="1" h="4px" bg="gray.700" borderRadius="full" overflow="hidden">
                      <Box h="full" w={`${homePct}%`} bg={won ? 'green.400' : 'gray.500'} borderRadius="full" />
                    </Box>
                    <Text fontSize="xs" fontWeight="bold" color="white" minW="20px">{set.homeScore}</Text>
                  </Flex>

                  {/* Barra adversário */}
                  <Flex align="center" gap={2} mb={2}>
                    <Text fontSize="xs" color="gray.500" minW="16px" textAlign="right">F</Text>
                    <Box flex="1" h="4px" bg="gray.700" borderRadius="full" overflow="hidden">
                      <Box h="full" w={`${awayPct}%`} bg={!won ? 'red.400' : 'gray.600'} borderRadius="full" />
                    </Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.400" minW="20px">{set.awayScore}</Text>
                  </Flex>

                  <Flex justify="center" align="center" gap={1}>
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      color={Math.abs(diff) <= 2 ? 'yellow.400' : won ? 'green.400' : 'red.400'}
                    >
                      {won ? `+${diff}` : diff}
                    </Text>
                    {set.duration && (
                      <Text fontSize="2xs" color="gray.600">· {set.duration}m</Text>
                    )}
                  </Flex>
                </Box>
              )
            })}
          </Grid>
        </Box>
      )}

      {/* ── Linha 1: Ataque · Saque · Recepção ── */}
      {analytics && (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4} mb={4}>

          {/* Ataque */}
          {analytics.atk.total > 0 && (
            <Box bg="gray.800" borderRadius="xl" p={5} borderWidth="1px" borderColor="gray.700">
              <Flex align="center" gap={2} mb={3}>
                <Box w="3px" h="16px" bg="orange.400" borderRadius="full" />
                <Text fontSize="sm" fontWeight="bold" color="white">Ataque</Text>
              </Flex>

              <Flex align="baseline" gap={2} mb={3}>
                <Text fontSize="3xl" fontWeight="black" color={
                  analytics.atkEfficiency === null ? 'white' :
                  analytics.atkEfficiency >= 25 ? 'green.400' :
                  analytics.atkEfficiency >= 10 ? 'yellow.400' : 'red.400'
                }>
                  {analytics.atkEfficiency !== null ? `${analytics.atkEfficiency}%` : '—'}
                </Text>
                <Text fontSize="xs" color="gray.500">eficiência</Text>
              </Flex>

              <StatBar value={analytics.atk.kills} max={analytics.atk.total} color="orange.400" />

              <Grid templateColumns="repeat(3, 1fr)" gap={2} mt={3}>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="green.400">{analytics.atk.kills}</Text>
                  <Text fontSize="2xs" color="gray.500">kills</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="red.400">{analytics.atk.errors}</Text>
                  <Text fontSize="2xs" color="gray.500">erros</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="gray.400">{analytics.atk.blocked}</Text>
                  <Text fontSize="2xs" color="gray.500">bloq.</Text>
                </Box>
              </Grid>
              <Text fontSize="2xs" color="gray.600" mt={2} textAlign="right">
                {analytics.atk.total} ataques no total
              </Text>
            </Box>
          )}

          {/* Saque */}
          {analytics.serve.total > 0 && (
            <Box bg="gray.800" borderRadius="xl" p={5} borderWidth="1px" borderColor="gray.700">
              <Flex align="center" gap={2} mb={3}>
                <Box w="3px" h="16px" bg="blue.400" borderRadius="full" />
                <Text fontSize="sm" fontWeight="bold" color="white">Saque</Text>
              </Flex>

              <Flex align="baseline" gap={2} mb={3}>
                <Text fontSize="3xl" fontWeight="black" color={
                  analytics.serve.aces > 0 ? 'blue.300' : 'gray.500'
                }>
                  {analytics.serve.aces}
                </Text>
                <Text fontSize="xs" color="gray.500">aces</Text>
              </Flex>

              <StatBar value={analytics.serve.aces} max={analytics.serve.total} color="blue.400" />

              <Grid templateColumns="repeat(3, 1fr)" gap={2} mt={3}>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="blue.300">{analytics.serve.aces}</Text>
                  <Text fontSize="2xs" color="gray.500">aces</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="red.400">{analytics.serve.errors}</Text>
                  <Text fontSize="2xs" color="gray.500">erros</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="gray.400">
                    {analytics.serve.total - analytics.serve.aces - analytics.serve.errors}
                  </Text>
                  <Text fontSize="2xs" color="gray.500">em jogo</Text>
                </Box>
              </Grid>
              <Text fontSize="2xs" color="gray.600" mt={2} textAlign="right">
                {analytics.serve.total} saques no total
              </Text>
            </Box>
          )}

          {/* Recepção */}
          {analytics.rec.total > 0 && (
            <Box bg="gray.800" borderRadius="xl" p={5} borderWidth="1px" borderColor="gray.700">
              <Flex align="center" gap={2} mb={3}>
                <Box w="3px" h="16px" bg="cyan.400" borderRadius="full" />
                <Text fontSize="sm" fontWeight="bold" color="white">Recepção</Text>
              </Flex>

              <Flex align="baseline" gap={2} mb={3}>
                <Text fontSize="3xl" fontWeight="black" color={
                  analytics.recQuality === null ? 'white' :
                  analytics.recQuality >= 65 ? 'green.400' :
                  analytics.recQuality >= 50 ? 'yellow.400' : 'red.400'
                }>
                  {analytics.recQuality !== null ? `${analytics.recQuality}%` : '—'}
                </Text>
                <Text fontSize="xs" color="gray.500">perfeita + positiva</Text>
              </Flex>

              <StatBar
                value={analytics.rec.perfect + analytics.rec.positive}
                max={analytics.rec.total}
                color="cyan.400"
              />

              <Grid templateColumns="repeat(3, 1fr)" gap={2} mt={3}>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="green.400">{analytics.rec.perfect}</Text>
                  <Text fontSize="2xs" color="gray.500">perfeitas</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="yellow.400">{analytics.rec.positive}</Text>
                  <Text fontSize="2xs" color="gray.500">positivas</Text>
                </Box>
                <Box textAlign="center">
                  <Text fontSize="lg" fontWeight="bold" color="red.400">{analytics.rec.errors}</Text>
                  <Text fontSize="2xs" color="gray.500">erros</Text>
                </Box>
              </Grid>
              <Text fontSize="2xs" color="gray.600" mt={2} textAlign="right">
                {analytics.rec.total} recepções no total
              </Text>
            </Box>
          )}
        </Grid>
      )}

      {/* ── Linha 2: Bloqueio & Defesa · Concentração de Erros ── */}
      {analytics && (
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={4}>

          {/* Bloqueio + Defesa */}
          <Box bg="gray.800" borderRadius="xl" p={5} borderWidth="1px" borderColor="gray.700">
            <Flex align="center" gap={2} mb={3}>
              <Box w="3px" h="16px" bg="purple.400" borderRadius="full" />
              <Text fontSize="sm" fontWeight="bold" color="white">Bloqueio & Defesa</Text>
            </Flex>

            <MetricRow
              label="Pontos de bloqueio"
              value={analytics.block.points}
              sub={analytics.block.total > 0 ? `de ${analytics.block.total} participações` : ''}
              color={analytics.block.points > 0 ? 'purple.300' : 'gray.500'}
            />
            <MetricRow
              label="Defesas registradas"
              value={analytics.dig.total}
              color={analytics.dig.total > 0 ? 'cyan.300' : 'gray.500'}
            />
            <MetricRow
              label="Ações totais no scout"
              value={match.actions.length}
              color="gray.300"
            />
          </Box>

          {/* Concentração de Erros */}
          {analytics.errorsByFundamental.length > 0 && (
            <Box bg="gray.800" borderRadius="xl" p={5} borderWidth="1px" borderColor="gray.700">
              <Flex align="center" gap={2} mb={4}>
                <Box w="3px" h="16px" bg="red.400" borderRadius="full" />
                <Text fontSize="sm" fontWeight="bold" color="white">Concentração de Erros</Text>
                <Text fontSize="xs" color="gray.500" ml={1}>onde perdemos pontos</Text>
              </Flex>

              <Flex direction="column" gap={3}>
                {analytics.errorsByFundamental.map(({ label, count }, i) => {
                  const maxCount = analytics.errorsByFundamental[0].count
                  return (
                    <Box key={label}>
                      <Flex justify="space-between" align="center" mb={1}>
                        <Text fontSize="sm" color="gray.300">{label}</Text>
                        <Flex align="center" gap={2}>
                          <Text fontSize="sm" fontWeight="bold" color={i === 0 ? 'red.300' : 'gray.300'}>
                            {count}
                          </Text>
                          {i === 0 && (
                            <Badge colorScheme="red" variant="subtle" fontSize="2xs" px={1.5}>
                              maior
                            </Badge>
                          )}
                        </Flex>
                      </Flex>
                      <Box h="4px" bg="gray.700" borderRadius="full" overflow="hidden">
                        <Box
                          h="full"
                          w={`${(count / maxCount) * 100}%`}
                          bg={i === 0 ? 'red.400' : 'gray.500'}
                          borderRadius="full"
                        />
                      </Box>
                    </Box>
                  )
                })}
              </Flex>
            </Box>
          )}
        </Grid>
      )}

      {/* ── Ações por set ── */}
      {analytics && analytics.bySet.length > 1 && (
        <Box bg="gray.800" borderRadius="xl" p={5} mb={4} borderWidth="1px" borderColor="gray.700">
          <Text fontSize="sm" fontWeight="bold" color="white" mb={4}>Atividade por Set</Text>
          <Flex gap={3} flexWrap="wrap">
            {analytics.bySet.map(({ set, actions, kills, errors }) => {
              const setData = match.sets.find(s => s.number === set)
              const won = setData ? setData.homeScore > setData.awayScore : undefined
              return (
                <Box
                  key={set}
                  flex="1"
                  minW="80px"
                  bg="gray.900"
                  borderRadius="lg"
                  p={3}
                  textAlign="center"
                  borderWidth="1px"
                  borderColor={
                    won === undefined ? 'gray.700' :
                    won ? 'green.700/50' : 'red.700/40'
                  }
                >
                  <Text fontSize="2xs" color="gray.500" mb={1} fontWeight="bold" textTransform="uppercase">
                    Set {set}
                  </Text>
                  <Text fontSize="lg" fontWeight="black" color="white">{actions}</Text>
                  <Text fontSize="2xs" color="gray.500">ações</Text>
                  <Flex justify="center" gap={2} mt={2}>
                    <Flex align="center" gap={0.5}>
                      <Box w="4px" h="4px" borderRadius="full" bg="green.400" />
                      <Text fontSize="2xs" color="gray.500">{kills}</Text>
                    </Flex>
                    <Flex align="center" gap={0.5}>
                      <Box w="4px" h="4px" borderRadius="full" bg="red.400" />
                      <Text fontSize="2xs" color="gray.500">{errors}</Text>
                    </Flex>
                  </Flex>
                </Box>
              )
            })}
          </Flex>
        </Box>
      )}

    </>
  )
}
