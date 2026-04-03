import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Box, Flex, Text, VStack, HStack, Grid } from '@chakra-ui/react'
import { IoPersonOutline } from 'react-icons/io5'
import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import { LogoutButton } from '@/components/portal/LogoutButton'
import AIInsightCard from '@/components/ai/AIInsightCard'
import { PlayerRadarChart } from '@/components/portal/PlayerRadarChart'
import {
  calculatePlayerStats, calculateRatingFromStats,
  formatPercentage, formatNumber,
} from '@/utils/stats'
import { ScoutAction, ActionType } from '@/types/scout'

// ─── design tokens ───────────────────────────────────────────────────────────
const BG        = '#080810'
const CARD_BG   = 'rgba(255,255,255,0.028)'
const CARD_BR   = 'rgba(255,255,255,0.07)'
const ACCENT    = '#22D3EE'   // cyan elétrico
const FONT_NUM  = 'var(--font-barlow), sans-serif'
const FONT_BODY = 'var(--font-jakarta), sans-serif'

// ─── helpers ─────────────────────────────────────────────────────────────────
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

function ratingHex(r: number): string {
  if (r >= 7)   return '#22C55E'
  if (r >= 5.5) return '#22D3EE'
  if (r >= 4)   return '#FBBF24'
  return '#F87171'
}


function MatchRow({ match }: {
  match: { id: string; homeTeam: string; awayTeam: string; finalScore: string; result: string }
}) {
  const won = match.result === 'vitoria'
  return (
    <Link href={`/portal/atleta/partida/${match.id}`} style={{ display: 'block' }}>
    <Flex align="center" gap={3} px={4} py={3}
      borderBottom="1px solid" borderColor="whiteAlpha.50" _last={{ borderBottom: 'none' }}
      _hover={{ background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
      transition="background 0.15s">
      {/* badge colorido com placar — verde=vitória, vermelho=derrota */}
      <Box
        px={2.5} py={1} borderRadius="7px" flexShrink={0}
        style={{
          background: won ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
          border: `1px solid ${won ? 'rgba(34,197,94,0.28)' : 'rgba(248,113,113,0.28)'}`,
        }}
      >
        <Text
          style={{
            fontFamily: FONT_NUM,
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '0.06em',
            color: won ? '#4ADE80' : '#F87171',
          }}>
          {match.finalScore}
        </Text>
      </Box>
      <Text noOfLines={1} fontSize="13px" color="rgba(255,255,255,0.7)"
        flex={1} minW={0} style={{ fontFamily: FONT_BODY }}>
        {match.homeTeam} × {match.awayTeam}
      </Text>
      {/* seta indicando que é clicável */}
      <Text fontSize="14px" color="rgba(255,255,255,0.2)" flexShrink={0}>›</Text>
    </Flex>
    </Link>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default async function AtletaPortalPage() {
  const session = await getPortalSession()
  if (!session || session.role !== 'athlete') redirect('/portal/login')

  const [team, player, matches] = await Promise.all([
    prisma.team.findUnique({ where: { id: session.teamId } }),
    session.playerId ? prisma.player.findUnique({ where: { id: session.playerId } }) : null,
    prisma.match.findMany({
      where: { teamId: session.teamId, status: 'finalized' },
      orderBy: { date: 'desc' },
      take: 8,
    }),
  ])

  const prismaActions = session.playerId
    ? await prisma.scoutAction.findMany({
        where: { match: { teamId: session.teamId, status: 'finalized' } },
        select: {
          id: true, matchId: true, playerId: true, time: true,
          action: true, subAction: true, zone: true,
          coordinateX: true, coordinateY: true, setNumber: true,
          timestamp: true, videoTimestamp: true,
          efficiencyValue: true, phase: true, rallyId: true,
        },
      })
    : []

  const actions: ScoutAction[] = prismaActions.map((a) => ({
    id: a.id, matchId: a.matchId, player: a.playerId ?? '',
    time: a.time, action: a.action as ActionType,
    subAction: a.subAction, zone: a.zone,
    coordinates: { x: a.coordinateX, y: a.coordinateY },
    set: a.setNumber, timestamp: a.timestamp,
    videoTimestamp: a.videoTimestamp ?? undefined,
    efficiencyValue: a.efficiencyValue ?? undefined,
    phase: a.phase as 'sideout' | 'transition' | undefined,
    rallyId: a.rallyId ?? undefined,
  }))

  const playerMatchIds = new Set(
    actions.filter((a) => a.player === session.playerId).map((a) => a.matchId)
  )
  const matchesPlayed = playerMatchIds.size

  const stats = session.playerId && actions.length > 0
    ? calculatePlayerStats(session.playerId, actions, matchesPlayed)
    : null

  const playerRating = stats ? calculateRatingFromStats(stats) : null
  const overallRating = playerRating?.friendlyRating ?? 0

  const chartData = playerRating ? [
    { subject: 'Saque',    A: playerRating.ratingByFundamental['serve']?.friendly ?? 0,     fullMark: 10 },
    { subject: 'Recepção', A: playerRating.ratingByFundamental['reception']?.friendly ?? 0, fullMark: 10 },
    { subject: 'Ataque',   A: playerRating.ratingByFundamental['attack']?.friendly ?? 0,    fullMark: 10 },
    { subject: 'Bloqueio', A: playerRating.ratingByFundamental['block']?.friendly ?? 0,     fullMark: 10 },
    { subject: 'Defesa',   A: playerRating.ratingByFundamental['dig']?.friendly ?? 0,       fullMark: 10 },
    { subject: 'Levant.',  A: playerRating.ratingByFundamental['set']?.friendly ?? 0,       fullMark: 10 },
  ] : []

  const fundamentals = stats && playerRating ? [
    {
      name: 'Saque', mainLabel: 'Eficiência',
      mainValue: formatPercentage(stats.serve.efficiency),
      rating: playerRating.ratingByFundamental['serve']?.friendly ?? 0,
      show: stats.serve.total > 0,
      details: [
        { label: 'Aces',  value: stats.serve.aces },
        { label: 'Erros', value: stats.serve.errors },
        { label: 'Total', value: stats.serve.total },
      ],
    },
    {
      name: 'Recepção', mainLabel: 'Positividade',
      mainValue: formatPercentage(stats.reception.positivity),
      rating: playerRating.ratingByFundamental['reception']?.friendly ?? 0,
      show: stats.reception.total > 0,
      details: [
        { label: 'Perf.',  value: stats.reception.perfect },
        { label: 'Posit.', value: stats.reception.positive },
        { label: 'Erros',  value: stats.reception.errors },
      ],
    },
    {
      name: 'Ataque', mainLabel: 'Eficiência',
      mainValue: formatPercentage(stats.attack.efficiency),
      rating: playerRating.ratingByFundamental['attack']?.friendly ?? 0,
      show: stats.attack.total > 0,
      details: [
        { label: 'Pontos', value: stats.attack.kills },
        { label: 'Bloq.',  value: stats.attack.blocked },
        { label: 'Erros',  value: stats.attack.errors },
      ],
    },
    {
      name: 'Bloqueio', mainLabel: 'Pts/Set',
      mainValue: formatNumber(stats.block.pointsPerSet),
      rating: playerRating.ratingByFundamental['block']?.friendly ?? 0,
      show: stats.block.total > 0,
      details: [
        { label: 'Pontos',  value: stats.block.points },
        { label: 'Toques',  value: stats.block.touches },
        { label: 'Erros',   value: stats.block.errors },
      ],
    },
    {
      name: 'Defesa', mainLabel: 'Eficácia',
      mainValue: formatPercentage(stats.defense.efficiency),
      rating: playerRating.ratingByFundamental['dig']?.friendly ?? 0,
      show: stats.defense.total > 0,
      details: [
        { label: 'Perf.',  value: stats.defense.perfect },
        { label: 'Posit.', value: stats.defense.positive },
        { label: 'Erros',  value: stats.defense.errors },
      ],
    },
    {
      name: 'Levantamento', mainLabel: 'Precisão',
      mainValue: formatPercentage(stats.set.total > 0 ? stats.set.perfect / stats.set.total : 0),
      rating: playerRating.ratingByFundamental['set']?.friendly ?? 0,
      show: stats.set.total > 0,
      details: [
        { label: 'Perf.',  value: stats.set.perfect },
        { label: 'Erros',  value: stats.set.errors },
        { label: 'Total',  value: stats.set.total },
      ],
    },
  ].filter((f) => f.show) : []

  const wins = matches.filter((m) => m.result === 'vitoria').length
  const playerName = player?.name ?? session.name.split(' ')[0]

  return (
    <Box minH="100dvh" style={{ background: BG, fontFamily: FONT_BODY }} pb={12}>

      {/* ════════════════════════════════════════════════════════════════
          HERO — player card
      ════════════════════════════════════════════════════════════════ */}
      <Box
        position="relative" overflow="hidden"
        style={{
          background: 'linear-gradient(160deg, #0D0D1C 0%, #11112A 55%, #080810 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Jersey number watermark */}
        {player?.jerseyNumber && (
          <Box
            position="absolute"
            style={{
              right: '-0.04em', bottom: '-0.12em',
              fontFamily: FONT_NUM, fontSize: '220px', fontWeight: 800,
              color: 'rgba(255,255,255,0.04)', lineHeight: 1,
              userSelect: 'none', pointerEvents: 'none',
            }}
          >
            {player.jerseyNumber}
          </Box>
        )}

        {/* Glow blob */}
        <Box
          position="absolute" style={{
            top: '10%', left: '-20%',
            width: '260px', height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(34,211,238,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <Box position="relative" px={4} pt={5} pb={6}>

          {/* Top bar */}
          <Flex align="center" justify="space-between" mb={7}>
            <Flex align="center" gap={2}>
              {team?.logo && (
                <Box
                  w="24px" h="24px" borderRadius="6px" overflow="hidden" flexShrink={0}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <img
                    src={team.logo} alt={team.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </Box>
              )}
              <Text
                fontSize="10px" fontWeight="600" letterSpacing="0.14em"
                textTransform="uppercase"
                style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}
              >
                {team?.name ?? 'Portal'}
              </Text>
            </Flex>
            <LogoutButton />
          </Flex>

          {/* Main hero row: photo + identity */}
          <Flex gap={4} align="flex-start">

            {/* Photo — rectangular card style */}
            <Box position="relative" flexShrink={0}>
              {/* Glow ring around photo */}
              <Box
                position="absolute" style={{
                  inset: '-3px', borderRadius: '18px',
                  background: `linear-gradient(135deg, ${ACCENT}50, ${ACCENT}10)`,
                  filter: 'blur(6px)',
                }}
              />
              <Box
                position="relative" w="88px" h="108px" borderRadius="16px"
                overflow="hidden" style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {player?.photo ? (
                  <img
                    src={player.photo} alt={playerName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <Flex w="full" h="full" align="center" justify="center">
                    <Box color="whiteAlpha.300" display="inline-flex">
                      <IoPersonOutline size={28} />
                    </Box>
                  </Flex>
                )}
                {/* Bottom gradient overlay on photo */}
                <Box
                  position="absolute" bottom={0} left={0} right={0} h="40px"
                  style={{
                    background: 'linear-gradient(to top, rgba(13,13,28,0.8) 0%, transparent 100%)',
                  }}
                />
              </Box>

              {/* Nota badge — canto inferior direito da foto */}
              {playerRating && (
                <Box
                  position="absolute" bottom="-8px" right="-8px"
                  px={2} py={1} borderRadius="8px"
                  style={{
                    background: '#0D0D1C',
                    border: `1.5px solid ${ratingHex(overallRating)}`,
                    boxShadow: `0 0 12px ${ratingHex(overallRating)}40`,
                  }}
                >
                  <Text
                    lineHeight={1}
                    style={{ fontFamily: FONT_NUM, fontSize: '15px', fontWeight: 800, color: ratingHex(overallRating) }}
                  >
                    {overallRating.toFixed(1)}
                  </Text>
                </Box>
              )}
            </Box>

            {/* Identity + rating */}
            <Box flex={1} minW={0} pt={1}>
              {/* Name */}
              <Text
                color="white" lineHeight={1} mb={1}
                noOfLines={2}
                style={{
                  fontFamily: FONT_NUM, fontSize: '26px', fontWeight: 800,
                  letterSpacing: '-0.01em', textTransform: 'uppercase',
                }}
              >
                {playerName}
              </Text>

              {/* Position badge */}
              <Box
                display="inline-flex" alignItems="center"
                px={2} py={0.5} mb={4} borderRadius="6px"
                style={{
                  background: `rgba(34,211,238,0.1)`,
                  border: `1px solid rgba(34,211,238,0.25)`,
                }}
              >
                <Text
                  fontSize="9px" fontWeight="700" letterSpacing="0.12em"
                  textTransform="uppercase"
                  style={{ fontFamily: FONT_BODY, color: ACCENT }}
                >
                  {POSITION_LABELS[player?.position ?? ''] ?? player?.position ?? '—'}
                </Text>
              </Box>

            </Box>
          </Flex>

          {/* Stats strip — Partidas · Sets · Pontos */}
          {stats && (
            <Flex
              mt={6} pt={5}
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {[
                { label: 'Partidas', value: stats.matchesPlayed, color: 'rgba(255,255,255,0.9)' },
                { label: 'Sets',     value: stats.setsPlayed,    color: 'rgba(255,255,255,0.9)' },
                { label: 'Pontos',   value: stats.points,        color: '#FCD34D' },
              ].map((item, i, arr) => (
                <Box
                  key={item.label} flex={1} textAlign="center"
                  style={i < arr.length - 1
                    ? { borderRight: '1px solid rgba(255,255,255,0.06)' }
                    : {}}
                >
                  <Text
                    lineHeight={1}
                    style={{ fontFamily: FONT_NUM, fontSize: '30px', fontWeight: 800, color: item.color }}
                  >
                    {item.value}
                  </Text>
                  <Text
                    mt={1.5} fontSize="9px" fontWeight="600"
                    textTransform="uppercase" letterSpacing="0.12em"
                    style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}
                  >
                    {item.label}
                  </Text>
                </Box>
              ))}
            </Flex>
          )}
        </Box>
      </Box>

      {/* ════════════════════════════════════════════════════════════════
          RADAR CHART
      ════════════════════════════════════════════════════════════════ */}
      {chartData.length > 0 && (
        <Box px={4} pt={6} pb={2}>
          <Flex align="center" gap={2} mb={3}>
            <Box w="2px" h="12px" borderRadius="full" style={{ background: ACCENT }} />
            <Text
              fontSize="9px" fontWeight="700" letterSpacing="0.14em" textTransform="uppercase"
              style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}
            >
              Perfil Técnico
            </Text>
          </Flex>
          <Box
            borderRadius="20px" overflow="hidden"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}
          >
            <Box h="220px">
              <PlayerRadarChart data={chartData} playerName={playerName} />
            </Box>
          </Box>
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════════════
          FUNDAMENTOS
      ════════════════════════════════════════════════════════════════ */}
      {fundamentals.length > 0 && (
        <Box px={4} pt={6}>
          <Flex align="center" gap={2} mb={4}>
            <Box w="2px" h="12px" borderRadius="full" style={{ background: ACCENT }} />
            <Text
              fontSize="9px" fontWeight="700" letterSpacing="0.14em" textTransform="uppercase"
              style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}
            >
              Fundamentos · {stats?.matchesPlayed} {stats?.matchesPlayed === 1 ? 'partida' : 'partidas'}
            </Text>
          </Flex>

          <VStack spacing={2.5} align="stretch">
            {fundamentals.map((fund) => {
              const cfg = FUND_CONFIG[fund.name]
              const barW = Math.round((fund.rating / 10) * 100)
              const rColor = ratingHex(fund.rating)
              return (
                <Box
                  key={fund.name}
                  position="relative" overflow="hidden" borderRadius="16px"
                  style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}
                >
                  {/* Left colored border */}
                  <Box
                    position="absolute" left={0} top={0} bottom={0} w="3px"
                    style={{ background: cfg.gradient }}
                  />

                  <Box pl={5} pr={4} pt={3.5} pb={3}>
                    {/* Row 1: name + rating badge */}
                    <Flex justify="space-between" align="center" mb={2}>
                      <HStack spacing={1.5}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={cfg.icon} alt="" width={26} height={26} style={{ display: 'block', objectFit: 'contain' }} />
                        <Text
                          fontSize="10px" fontWeight="700" letterSpacing="0.14em"
                          textTransform="uppercase"
                          style={{ color: 'rgba(255,255,255,0.45)', fontFamily: FONT_BODY }}
                        >
                          {fund.name}
                        </Text>
                      </HStack>
                      <Box
                        px={1.5} py={0.5} borderRadius="6px"
                        style={{ background: `${rColor}18`, border: `1px solid ${rColor}35` }}
                      >
                        <Text
                          style={{ fontFamily: FONT_NUM, fontSize: '11px', fontWeight: 700, color: rColor }}
                        >
                          {fund.rating.toFixed(1)}
                        </Text>
                      </Box>
                    </Flex>

                    {/* Row 2: main value */}
                    <Flex align="baseline" gap={2} mb={2.5}>
                      <Text
                        lineHeight={1}
                        style={{
                          fontFamily: FONT_NUM, fontSize: '42px', fontWeight: 800,
                          color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.02em',
                        }}
                      >
                        {fund.mainValue}
                      </Text>
                      <Text
                        fontSize="11px" fontWeight="500"
                        style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}
                      >
                        {fund.mainLabel}
                      </Text>
                    </Flex>

                    {/* Row 3: rating bar */}
                    <Box
                      h="2px" borderRadius="full" mb={3}
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <Box
                        h="full" borderRadius="full"
                        style={{ width: `${barW}%`, background: cfg.gradient }}
                      />
                    </Box>

                    {/* Row 4: detail chips */}
                    <Flex gap={4}>
                      {fund.details.map((d) => (
                        <Box key={d.label}>
                          <Text
                            lineHeight={1}
                            style={{
                              fontFamily: FONT_NUM, fontSize: '18px', fontWeight: 700,
                              color: cfg.hex,
                            }}
                          >
                            {d.value}
                          </Text>
                          <Text
                            mt={0.5} fontSize="8px" fontWeight="600"
                            textTransform="uppercase" letterSpacing="0.1em"
                            style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}
                          >
                            {d.label}
                          </Text>
                        </Box>
                      ))}
                    </Flex>
                  </Box>
                </Box>
              )
            })}
          </VStack>
        </Box>
      )}

      {!stats && (
        <Box mx={4} mt={6} borderRadius="16px" p={6} textAlign="center"
          style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
          <Text fontSize="13px" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>
            Nenhuma ação registrada ainda
          </Text>
        </Box>
      )}

      {/* ════════════════════════════════════════════════════════════════
          RESULTADOS DA EQUIPE
      ════════════════════════════════════════════════════════════════ */}
      <Box px={4} pt={6}>
        <Flex align="center" gap={2} mb={4}>
          <Box w="2px" h="12px" borderRadius="full" style={{ background: '#FCD34D' }} />
          <Text
            fontSize="9px" fontWeight="700" letterSpacing="0.14em" textTransform="uppercase"
            style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}
          >
            Equipe
          </Text>
        </Flex>

        <Grid templateColumns="repeat(3, 1fr)" gap={2}>
          {[
            { label: 'Partidas', value: matches.length, color: ACCENT },
            { label: 'Vitórias', value: wins,           color: '#4ADE80' },
            { label: 'Derrotas', value: matches.length - wins, color: '#F87171' },
          ].map((item) => (
            <Box
              key={item.label} textAlign="center" py={4} borderRadius="14px"
              style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}
            >
              <Text
                lineHeight={1}
                style={{ fontFamily: FONT_NUM, fontSize: '32px', fontWeight: 800, color: item.color }}
              >
                {item.value}
              </Text>
              <Text
                mt={1.5} fontSize="8px" fontWeight="600" textTransform="uppercase" letterSpacing="0.12em"
                style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}
              >
                {item.label}
              </Text>
            </Box>
          ))}
        </Grid>
      </Box>

      {/* ════════════════════════════════════════════════════════════════
          ÚLTIMAS PARTIDAS
      ════════════════════════════════════════════════════════════════ */}
      {matches.length > 0 && (
        <Box px={4} pt={6}>
          <Flex align="center" gap={2} mb={4}>
            <Box w="2px" h="12px" borderRadius="full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            <Text
              fontSize="9px" fontWeight="700" letterSpacing="0.14em" textTransform="uppercase"
              style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}
            >
              Últimas partidas
            </Text>
          </Flex>
          <Box borderRadius="16px" overflow="hidden"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
            {matches.map((m) => <MatchRow key={m.id} match={m} />)}
          </Box>
        </Box>
      )}

      {/* Insight IA — feedback do atleta */}
      {session.playerId && (
        <Box mt={6}>
          <AIInsightCard
            type="athlete_insight"
            teamId={session.teamId}
            playerId={session.playerId}
            accent={ACCENT}
          />
        </Box>
      )}

    </Box>
  )
}
