import { redirect, notFound } from 'next/navigation'
import { Box, Flex, Text, HStack, VStack, Grid } from '@chakra-ui/react'
import Link from 'next/link'
import { IoArrowBackOutline, IoPersonOutline } from 'react-icons/io5'
import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import {
  calculatePlayerStats, calculateRatingFromStats,
  formatPercentage, formatNumber,
} from '@/utils/stats'
import { ScoutAction, ActionType } from '@/types/scout'
import AttackHeatmap from '@/components/statistics/AttackHeatmap'
import ServeHeatmap from '@/components/statistics/ServeHeatmap'
import { PlayerRadarChart } from '@/components/portal/PlayerRadarChart'

// ─── design tokens ────────────────────────────────────────────────────────────
const BG        = '#080810'
const CARD_BG   = 'rgba(255,255,255,0.028)'
const CARD_BR   = 'rgba(255,255,255,0.07)'
const ACCENT    = '#22D3EE'
const FONT_NUM  = 'var(--font-barlow), sans-serif'
const FONT_BODY = 'var(--font-jakarta), sans-serif'

const POSITION_LABELS: Record<string, string> = {
  setter: 'Levantador', opposite: 'Oposto', outside: 'Ponteiro',
  middle: 'Central', libero: 'Líbero', universal: 'Universal',
}

const FUND_CONFIG: Record<string, { icon: string; hex: string; gradient: string }> = {
  'Saque':        { icon: '/icons/serve.svg',     hex: '#38BDF8', gradient: 'linear-gradient(90deg,#0369A1,#38BDF8)' },
  'Recepção':     { icon: '/icons/reception.svg', hex: '#4ADE80', gradient: 'linear-gradient(90deg,#166534,#4ADE80)' },
  'Ataque':       { icon: '/icons/attack.svg',    hex: '#F87171', gradient: 'linear-gradient(90deg,#9B2C2C,#F87171)' },
  'Bloqueio':     { icon: '/icons/block.svg',     hex: '#FB923C', gradient: 'linear-gradient(90deg,#9C4221,#FB923C)' },
  'Defesa':       { icon: '/icons/defense.svg',   hex: '#A78BFA', gradient: 'linear-gradient(90deg,#4C1D95,#A78BFA)' },
  'Levantamento': { icon: '/icons/set.svg',       hex: '#FCD34D', gradient: 'linear-gradient(90deg,#92400E,#FCD34D)' },
}

function ratingHex(r: number) {
  if (r >= 7)   return '#22C55E'
  if (r >= 5.5) return '#22D3EE'
  if (r >= 4)   return '#FBBF24'
  return '#F87171'
}

function SectionHeader({ label, accent = ACCENT }: { label: string; accent?: string }) {
  return (
    <Flex align="center" gap={2} mb={3}>
      <Box w="2px" h="12px" borderRadius="full" style={{ background: accent }} />
      <Text fontSize="9px" fontWeight="700" letterSpacing="0.14em" textTransform="uppercase"
        style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}>
        {label}
      </Text>
    </Flex>
  )
}

function FundCard({
  icon, name, gradient, mainValue, mainLabel, rating, details,
}: {
  icon: string; name: string; gradient: string
  mainValue: string; mainLabel: string; rating: number
  details: { label: string; value: number | string; color: string }[]
}) {
  const barW = Math.round((rating / 10) * 100)
  const rColor = ratingHex(rating)
  return (
    <Box position="relative" overflow="hidden" borderRadius="16px"
      style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
      <Box position="absolute" left={0} top={0} bottom={0} w="3px" style={{ background: gradient }} />
      <Box pl={5} pr={4} pt={3.5} pb={3}>
        <Flex justify="space-between" align="center" mb={2}>
          <HStack spacing={1.5}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt="" width={26} height={26} style={{ display: 'block', objectFit: 'contain' }} />
            <Text fontSize="10px" fontWeight="700" letterSpacing="0.14em" textTransform="uppercase"
              style={{ color: 'rgba(255,255,255,0.45)', fontFamily: FONT_BODY }}>{name}</Text>
          </HStack>
          <Box px={1.5} py={0.5} borderRadius="6px"
            style={{ background: `${rColor}18`, border: `1px solid ${rColor}35` }}>
            <Text style={{ fontFamily: FONT_NUM, fontSize: '11px', fontWeight: 700, color: rColor }}>
              {rating.toFixed(1)}
            </Text>
          </Box>
        </Flex>
        <Flex align="baseline" gap={2} mb={2.5}>
          <Text lineHeight={1} style={{ fontFamily: FONT_NUM, fontSize: '38px', fontWeight: 800, color: 'white' }}>
            {mainValue}
          </Text>
          <Text fontSize="11px" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
            {mainLabel}
          </Text>
        </Flex>
        <Box h="2px" borderRadius="full" mb={3} style={{ background: 'rgba(255,255,255,0.06)' }}>
          <Box h="full" borderRadius="full" style={{ width: `${barW}%`, background: gradient }} />
        </Box>
        <Flex gap={4}>
          {details.map((d) => (
            <Box key={d.label}>
              <Text lineHeight={1} style={{ fontFamily: FONT_NUM, fontSize: '18px', fontWeight: 700, color: d.color }}>
                {d.value}
              </Text>
              <Text mt={0.5} fontSize="8px" fontWeight="600" textTransform="uppercase" letterSpacing="0.1em"
                style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>
                {d.label}
              </Text>
            </Box>
          ))}
        </Flex>
      </Box>
    </Box>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default async function TreinadorAtletaPage({
  params,
}: {
  params: Promise<{ matchId: string; playerId: string }>
}) {
  const session = await getPortalSession()
  if (!session || session.role !== 'coach') redirect('/portal/login')

  const { matchId, playerId } = await params

  const [match, player] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId, teamId: session.teamId } }),
    prisma.player.findUnique({ where: { id: playerId, teamId: session.teamId } }),
  ])
  if (!match || !player) notFound()

  const prismaActions = await prisma.scoutAction.findMany({
    where: { matchId },
    select: {
      id: true, matchId: true, playerId: true, time: true,
      action: true, subAction: true, zone: true,
      coordinateX: true, coordinateY: true, setNumber: true,
      timestamp: true, efficiencyValue: true, phase: true, rallyId: true,
    },
  })

  const actions: ScoutAction[] = prismaActions.map((a) => ({
    id: a.id, matchId: a.matchId, player: a.playerId ?? '',
    time: a.time, action: a.action as ActionType,
    subAction: a.subAction, zone: a.zone,
    coordinates: { x: a.coordinateX, y: a.coordinateY },
    set: a.setNumber, timestamp: a.timestamp,
    efficiencyValue: a.efficiencyValue ?? undefined,
    phase: a.phase as 'sideout' | 'transition' | undefined,
    rallyId: a.rallyId ?? undefined,
  }))

  const won = match.result === 'vitoria'
  const playerActions = prismaActions.filter((a) => a.playerId === playerId)

  const stats        = calculatePlayerStats(playerId, actions, 1)
  const playerRating = calculateRatingFromStats(stats)
  const overallRating = playerRating.friendlyRating

  const hasAttacks = playerActions.some((a) => a.action === 'attack')
  const hasServes  = playerActions.some((a) => a.action === 'serve')
  const isSetter   = playerActions.some((a) => a.action === 'set')

  const distribution = stats.set.distribution
  const distTotal = distribution
    ? distribution.ponteiro + distribution.central + distribution.oposto + distribution.pipe
    : 0

  // Radar chart
  const chartData = [
    { subject: 'Saque',    A: playerRating.ratingByFundamental['serve']?.friendly ?? 0,     fullMark: 10 },
    { subject: 'Recepção', A: playerRating.ratingByFundamental['reception']?.friendly ?? 0, fullMark: 10 },
    { subject: 'Ataque',   A: playerRating.ratingByFundamental['attack']?.friendly ?? 0,    fullMark: 10 },
    { subject: 'Bloqueio', A: playerRating.ratingByFundamental['block']?.friendly ?? 0,     fullMark: 10 },
    { subject: 'Defesa',   A: playerRating.ratingByFundamental['dig']?.friendly ?? 0,       fullMark: 10 },
    { subject: 'Levant.',  A: playerRating.ratingByFundamental['set']?.friendly ?? 0,       fullMark: 10 },
  ]

  // Fund cards
  const fundItems = [
    stats.serve.total > 0 && {
      icon: '/icons/serve.svg', name: 'Saque', gradient: 'linear-gradient(90deg,#0369A1,#38BDF8)',
      mainValue: formatPercentage(stats.serve.efficiency), mainLabel: 'Eficiência',
      rating: playerRating.ratingByFundamental['serve']?.friendly ?? 0,
      details: [
        { label: 'Aces',  value: stats.serve.aces,   color: '#4ADE80' },
        { label: 'Erros', value: stats.serve.errors,  color: '#F87171' },
        { label: 'Total', value: stats.serve.total,   color: 'rgba(255,255,255,0.4)' },
      ],
    },
    stats.reception.total > 0 && {
      icon: '/icons/reception.svg', name: 'Recepção', gradient: 'linear-gradient(90deg,#166534,#4ADE80)',
      mainValue: formatPercentage(stats.reception.positivity), mainLabel: 'Positividade',
      rating: playerRating.ratingByFundamental['reception']?.friendly ?? 0,
      details: [
        { label: 'Perf.',  value: stats.reception.perfect,  color: '#4ADE80' },
        { label: 'Posit.', value: stats.reception.positive, color: '#38BDF8' },
        { label: 'Erros',  value: stats.reception.errors,   color: '#F87171' },
      ],
    },
    stats.attack.total > 0 && {
      icon: '/icons/attack.svg', name: 'Ataque', gradient: 'linear-gradient(90deg,#9B2C2C,#F87171)',
      mainValue: formatPercentage(stats.attack.efficiency), mainLabel: 'Eficiência',
      rating: playerRating.ratingByFundamental['attack']?.friendly ?? 0,
      details: [
        { label: 'Pontos', value: stats.attack.kills,   color: '#4ADE80' },
        { label: 'Bloq.',  value: stats.attack.blocked, color: '#FB923C' },
        { label: 'Erros',  value: stats.attack.errors,  color: '#F87171' },
      ],
    },
    stats.block.total > 0 && {
      icon: '/icons/block.svg', name: 'Bloqueio', gradient: 'linear-gradient(90deg,#9C4221,#FB923C)',
      mainValue: formatNumber(stats.block.pointsPerSet), mainLabel: 'Pts/Set',
      rating: playerRating.ratingByFundamental['block']?.friendly ?? 0,
      details: [
        { label: 'Pontos', value: stats.block.points,  color: '#4ADE80' },
        { label: 'Toques', value: stats.block.touches, color: '#38BDF8' },
        { label: 'Erros',  value: stats.block.errors,  color: '#F87171' },
      ],
    },
    stats.defense.total > 0 && {
      icon: '/icons/defense.svg', name: 'Defesa', gradient: 'linear-gradient(90deg,#4C1D95,#A78BFA)',
      mainValue: formatPercentage(stats.defense.efficiency), mainLabel: 'Eficácia',
      rating: playerRating.ratingByFundamental['dig']?.friendly ?? 0,
      details: [
        { label: 'Perf.',  value: stats.defense.perfect,  color: '#4ADE80' },
        { label: 'Posit.', value: stats.defense.positive, color: '#38BDF8' },
        { label: 'Erros',  value: stats.defense.errors,   color: '#F87171' },
      ],
    },
    stats.set.total > 0 && {
      icon: '/icons/set.svg', name: 'Levantamento', gradient: 'linear-gradient(90deg,#92400E,#FCD34D)',
      mainValue: formatPercentage(stats.set.total > 0 ? stats.set.perfect / stats.set.total : 0),
      mainLabel: 'Precisão',
      rating: playerRating.ratingByFundamental['set']?.friendly ?? 0,
      details: [
        { label: 'Perf.',  value: stats.set.perfect, color: '#4ADE80' },
        { label: 'Erros',  value: stats.set.errors,  color: '#F87171' },
        { label: 'Total',  value: stats.set.total,   color: 'rgba(255,255,255,0.4)' },
      ],
    },
  ].filter(Boolean) as Parameters<typeof FundCard>[0][]

  return (
    <Box minH="100dvh" style={{ background: BG, fontFamily: FONT_BODY }} pb={12}>

      {/* ═══ HERO ════════════════════════════════════════════════════════ */}
      <Box position="relative" overflow="hidden"
        style={{
          background: 'linear-gradient(160deg, #0D0D1C 0%, #11112A 55%, #080810 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Jersey watermark */}
        <Box position="absolute" style={{
          right: '-0.04em', bottom: '-0.12em',
          fontFamily: FONT_NUM, fontSize: '220px', fontWeight: 800,
          color: 'rgba(255,255,255,0.035)', lineHeight: 1,
          userSelect: 'none', pointerEvents: 'none',
        }}>
          {player.jerseyNumber}
        </Box>

        {/* Cyan glow */}
        <Box position="absolute" style={{
          top: '10%', left: '-20%', width: '260px', height: '260px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <Box position="relative" px={4} pt={5} pb={6}>
          {/* Back */}
          <Link href={`/portal/treinador/partida/${matchId}`}
            style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <Flex align="center" gap={2} mb={7}>
              <Box display="inline-flex" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <IoArrowBackOutline size={15} />
              </Box>
              <Text fontSize="10px" fontWeight="600" letterSpacing="0.12em" textTransform="uppercase"
                style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}>
                {match.homeTeam} × {match.awayTeam}
              </Text>
            </Flex>
          </Link>

          {/* Match badge */}
          <Box display="inline-flex" mb={4} px={2.5} py={1} borderRadius="8px"
            style={{
              background: won ? 'rgba(34,197,94,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${won ? 'rgba(34,197,94,0.25)' : 'rgba(248,113,113,0.25)'}`,
            }}>
            <Text fontSize="9px" fontWeight="700" letterSpacing="0.1em"
              style={{ fontFamily: FONT_NUM, color: won ? '#4ADE80' : '#F87171' }}>
              {match.finalScore} · {won ? 'VITÓRIA' : 'DERROTA'}
            </Text>
          </Box>

          {/* Athlete hero */}
          <Flex gap={4} align="flex-start">
            {/* Photo */}
            <Box position="relative" flexShrink={0}>
              <Box position="absolute" style={{
                inset: '-3px', borderRadius: '18px',
                background: `linear-gradient(135deg, ${ACCENT}50, ${ACCENT}10)`,
                filter: 'blur(6px)',
              }} />
              <Box position="relative" w="88px" h="108px" borderRadius="16px" overflow="hidden"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}>
                {player.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={player.photo} alt={player.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <Flex w="full" h="full" align="center" justify="center">
                    <Box color="whiteAlpha.300" display="inline-flex">
                      <IoPersonOutline size={28} />
                    </Box>
                  </Flex>
                )}
                <Box position="absolute" bottom={0} left={0} right={0} h="40px"
                  style={{ background: 'linear-gradient(to top, rgba(13,13,28,0.8) 0%, transparent 100%)' }} />
              </Box>
              {/* Rating badge */}
              <Box position="absolute" bottom="-8px" right="-8px"
                px={2} py={1} borderRadius="8px"
                style={{
                  background: '#0D0D1C',
                  border: `1.5px solid ${ratingHex(overallRating)}`,
                  boxShadow: `0 0 12px ${ratingHex(overallRating)}40`,
                }}>
                <Text lineHeight={1}
                  style={{ fontFamily: FONT_NUM, fontSize: '15px', fontWeight: 800, color: ratingHex(overallRating) }}>
                  {overallRating.toFixed(1)}
                </Text>
              </Box>
            </Box>

            {/* Identity */}
            <Box flex={1} minW={0} pt={1}>
              <Text color="white" lineHeight={1} mb={1} noOfLines={2}
                style={{ fontFamily: FONT_NUM, fontSize: '26px', fontWeight: 800,
                  letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
                {player.name}
              </Text>
              <Box display="inline-flex" alignItems="center" px={2} py={0.5} mb={3} borderRadius="6px"
                style={{ background: `rgba(34,211,238,0.1)`, border: `1px solid rgba(34,211,238,0.25)` }}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.12em" textTransform="uppercase"
                  style={{ fontFamily: FONT_BODY, color: ACCENT }}>
                  {POSITION_LABELS[player.position] ?? player.position}
                </Text>
              </Box>
            </Box>
          </Flex>

          {/* Stats strip */}
          <Flex mt={6} pt={5} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Pontos', value: stats.points,     color: '#FCD34D' },
              { label: 'Sets',   value: stats.setsPlayed, color: 'rgba(255,255,255,0.9)' },
            ].map((item, i, arr) => (
              <Box key={item.label} flex={1} textAlign="center"
                style={i < arr.length - 1 ? { borderRight: '1px solid rgba(255,255,255,0.06)' } : {}}>
                <Text lineHeight={1}
                  style={{ fontFamily: FONT_NUM, fontSize: '30px', fontWeight: 800, color: item.color }}>
                  {item.value}
                </Text>
                <Text mt={1.5} fontSize="9px" fontWeight="600" textTransform="uppercase" letterSpacing="0.12em"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                  {item.label}
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>
      </Box>

      {/* ═══ CONTENT ════════════════════════════════════════════════════ */}
      <VStack spacing={6} align="stretch" px={4} mt={6}>

        {/* Radar */}
        {chartData.some((d) => d.A > 0) && (
          <Box>
            <SectionHeader label="Perfil técnico" />
            <Box borderRadius="20px" overflow="hidden"
              style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
              <Box h="220px">
                <PlayerRadarChart data={chartData} playerName={player.name} />
              </Box>
            </Box>
          </Box>
        )}

        {/* Fundamentos */}
        {fundItems.length > 0 && (
          <Box>
            <SectionHeader label="Estatísticas da partida" />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={2.5}>
              {fundItems.map((fund) => <FundCard key={fund.name} {...fund} />)}
            </Grid>
          </Box>
        )}

        {/* Heatmaps */}
        {(hasAttacks || hasServes) && (
          <Box>
            <SectionHeader label="Mapas de calor" accent="#A78BFA" />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              {hasAttacks && (
                <AttackHeatmap matchId={matchId} defaultPlayerId={playerId} compact />
              )}
              {hasServes && (
                <ServeHeatmap matchId={matchId} defaultPlayerId={playerId} compact />
              )}
            </Grid>
          </Box>
        )}

        {/* Distribuição do levantador */}
        {isSetter && distTotal > 0 && distribution && (
          <Box>
            <SectionHeader label="Distribuição de levantamento" accent="#FCD34D" />
            <Box borderRadius="16px" p={4}
              style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
              <Text mb={4} fontSize="11px" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                {distTotal} levantamentos
              </Text>
              {[
                { label: 'Ponteiro', value: distribution.ponteiro, color: '#4ADE80' },
                { label: 'Oposto',   value: distribution.oposto,   color: '#A78BFA' },
                { label: 'Central',  value: distribution.central,  color: '#38BDF8' },
                { label: 'Pipe',     value: distribution.pipe,     color: '#FB923C' },
              ]
                .filter((d) => d.value > 0)
                .sort((a, b) => b.value - a.value)
                .map((d) => {
                  const pct = Math.round((d.value / distTotal) * 100)
                  return (
                    <Box key={d.label} mb={3.5}>
                      <Flex justify="space-between" align="baseline" mb={1.5}>
                        <Text fontSize="11px" fontWeight="600" textTransform="uppercase" letterSpacing="0.1em"
                          style={{ color: 'rgba(255,255,255,0.5)', fontFamily: FONT_BODY }}>
                          {d.label}
                        </Text>
                        <Flex align="baseline" gap={1}>
                          <Text lineHeight={1}
                            style={{ fontFamily: FONT_NUM, fontSize: '20px', fontWeight: 800, color: d.color }}>
                            {pct}
                          </Text>
                          <Text fontSize="10px" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>%</Text>
                          <Text fontSize="10px" ml={1} style={{ color: 'rgba(255,255,255,0.2)', fontFamily: FONT_BODY }}>
                            ({d.value})
                          </Text>
                        </Flex>
                      </Flex>
                      <Box h="4px" borderRadius="full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <Box h="full" borderRadius="full"
                          style={{ width: `${pct}%`, background: d.color, opacity: 0.75 }} />
                      </Box>
                    </Box>
                  )
                })}
            </Box>
          </Box>
        )}

        {/* Sem dados */}
        {playerActions.length === 0 && (
          <Box borderRadius="16px" p={6} textAlign="center"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
            <Text fontSize="13px" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>
              Nenhuma ação registrada para este atleta nesta partida
            </Text>
          </Box>
        )}

      </VStack>
    </Box>
  )
}
