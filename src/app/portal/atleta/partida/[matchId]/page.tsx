import { redirect, notFound } from 'next/navigation'
import { Box, Flex, Text, HStack, VStack, Grid } from '@chakra-ui/react'
import Link from 'next/link'
import { IoArrowBackOutline } from 'react-icons/io5'
import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import {
  calculatePlayerStats, calculateRatingFromStats,
  formatPercentage, formatNumber,
} from '@/utils/stats'
import { ScoutAction, ActionType } from '@/types/scout'
import AttackHeatmap from '@/components/statistics/AttackHeatmap'
import ServeHeatmap from '@/components/statistics/ServeHeatmap'

// ─── design tokens (iguais ao portal/atleta/page.tsx) ────────────────────────
const BG       = '#080810'
const CARD_BG  = 'rgba(255,255,255,0.028)'
const CARD_BR  = 'rgba(255,255,255,0.07)'
const FONT_NUM = 'var(--font-barlow), sans-serif'
const FONT_BODY = 'var(--font-jakarta), sans-serif'

function ratingHex(r: number) {
  if (r >= 7)   return '#22C55E'
  if (r >= 5.5) return '#22D3EE'
  if (r >= 4)   return '#FBBF24'
  return '#F87171'
}

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({ label, accent = '#22D3EE' }: { label: string; accent?: string }) {
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

// ─── stat card (igual ao da página principal) ─────────────────────────────────
function FundCard({
  icon, name, gradient, mainValue, mainLabel, rating, details,
}: {
  icon: string; name: string; gradient: string
  mainValue: string; mainLabel: string; rating: number
  details: { label: string; value: number; color: string }[]
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
          {details.map(d => (
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
export default async function PartidaDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const session = await getPortalSession()
  if (!session || session.role !== 'athlete') redirect('/portal/login')

  const { matchId } = await params

  const match = await prisma.match.findUnique({
    where: { id: matchId, teamId: session.teamId },
  })
  if (!match) notFound()

  const prismaActions = session.playerId
    ? await prisma.scoutAction.findMany({
        where: { matchId },
        select: {
          id: true, matchId: true, playerId: true, time: true,
          action: true, subAction: true, zone: true,
          coordinateX: true, coordinateY: true, setNumber: true,
          timestamp: true, efficiencyValue: true,
          phase: true, rallyId: true, fullData: true,
        },
      })
    : []

  const actions: ScoutAction[] = prismaActions.map(a => ({
    id: a.id, matchId: a.matchId, player: a.playerId ?? '',
    time: a.time, action: a.action as ActionType,
    subAction: a.subAction, zone: a.zone,
    coordinates: { x: a.coordinateX, y: a.coordinateY },
    set: a.setNumber, timestamp: a.timestamp,
    efficiencyValue: a.efficiencyValue ?? undefined,
    phase: a.phase as 'sideout' | 'transition' | undefined,
    rallyId: a.rallyId ?? undefined,
  }))

  const stats = session.playerId
    ? calculatePlayerStats(session.playerId, actions, 1)
    : null
  const playerRating = stats ? calculateRatingFromStats(stats) : null
  const overallRating = playerRating?.friendlyRating ?? 0

  const playerActions = prismaActions.filter(a => a.playerId === session.playerId)
  const hasAttacks = playerActions.some(a => a.action === 'attack')
  const hasServes  = playerActions.some(a => a.action === 'serve')
  const isSetter   = playerActions.some(a => a.action === 'set')

  const distribution = stats?.set?.distribution
  const distTotal = distribution
    ? distribution.ponteiro + distribution.central + distribution.oposto + distribution.pipe
    : 0

  const won = match.result === 'vitoria'

  // Fundamentals to show
  const fundItems = stats && playerRating ? [
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
        { label: 'Pontos',  value: stats.block.points,  color: '#4ADE80' },
        { label: 'Toques',  value: stats.block.touches, color: '#38BDF8' },
        { label: 'Erros',   value: stats.block.errors,  color: '#F87171' },
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
  ].filter(Boolean) : []

  return (
    <Box minH="100dvh" style={{ background: BG, fontFamily: FONT_BODY }} pb={12}>

      {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
      <Box
        position="relative" overflow="hidden"
        style={{
          background: 'linear-gradient(160deg, #0D0D1C 0%, #11112A 55%, #080810 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box px={4} pt={5} pb={6}>

          {/* Back button */}
          <Link href="/portal/atleta" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <Flex align="center" gap={2} mb={6}>
              <Box display="inline-flex" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <IoArrowBackOutline size={15} />
              </Box>
              <Text fontSize="10px" fontWeight="600" letterSpacing="0.12em" textTransform="uppercase"
                style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}>
                Voltar
              </Text>
            </Flex>
          </Link>

          {/* Match title + score */}
          <Flex align="flex-start" justify="space-between" gap={3}>
            <Box flex={1} minW={0}>
              <Text noOfLines={2} lineHeight={1.15} mb={1.5}
                style={{ fontFamily: FONT_NUM, fontSize: '20px', fontWeight: 800,
                  color: 'white', textTransform: 'uppercase' }}>
                {match.homeTeam} × {match.awayTeam}
              </Text>
              <Text fontSize="11px"
                style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}>
                {new Date(match.date).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </Text>
            </Box>

            <Box textAlign="right" flexShrink={0}>
              <Text lineHeight={1} mb={1.5}
                style={{ fontFamily: FONT_NUM, fontSize: '26px', fontWeight: 800,
                  color: won ? '#22C55E' : '#F87171' }}>
                {match.finalScore}
              </Text>
              <Box display="inline-flex" px={2.5} py={1} borderRadius="8px"
                style={{
                  background: won ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
                  border: `1px solid ${won ? 'rgba(34,197,94,0.3)' : 'rgba(248,113,113,0.3)'}`,
                }}>
                <Text fontSize="9px" fontWeight="700" letterSpacing="0.1em"
                  style={{ fontFamily: FONT_NUM, color: won ? '#4ADE80' : '#F87171' }}>
                  {won ? 'VITÓRIA' : 'DERROTA'}
                </Text>
              </Box>
            </Box>
          </Flex>

          {/* Nota + pontos desta partida */}
          {playerRating && stats && (
            <Flex align="center" gap={4} mt={5} pt={4}
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Box>
                <Box display="inline-flex" alignItems="center" justifyContent="center"
                  px={3} py={1.5} borderRadius="10px"
                  style={{
                    background: `${ratingHex(overallRating)}15`,
                    border: `1.5px solid ${ratingHex(overallRating)}50`,
                  }}>
                  <Text lineHeight={1}
                    style={{ fontFamily: FONT_NUM, fontSize: '22px', fontWeight: 800,
                      color: ratingHex(overallRating) }}>
                    {overallRating.toFixed(1)}
                  </Text>
                </Box>
                <Text mt={1} fontSize="8px" fontWeight="600" textTransform="uppercase" letterSpacing="0.1em"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                  Nota
                </Text>
              </Box>

              {[
                { label: 'Pontos', value: stats.points,      color: '#FCD34D' },
                { label: 'Sets',   value: stats.setsPlayed,  color: 'rgba(255,255,255,0.7)' },
              ].map(item => (
                <Box key={item.label}>
                  <Text lineHeight={1}
                    style={{ fontFamily: FONT_NUM, fontSize: '22px', fontWeight: 800, color: item.color }}>
                    {item.value}
                  </Text>
                  <Text mt={1} fontSize="8px" fontWeight="600" textTransform="uppercase" letterSpacing="0.1em"
                    style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                    {item.label}
                  </Text>
                </Box>
              ))}
            </Flex>
          )}
        </Box>
      </Box>

      {/* ═══ CONTENT ════════════════════════════════════════════════════ */}
      <VStack spacing={6} align="stretch" px={4} mt={6}>

        {/* Fundamentos desta partida */}
        {fundItems.length > 0 && (
          <Box>
            <SectionHeader label="Estatísticas da Partida" />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={2.5}>
              {fundItems.map(fund => fund && (
                <FundCard key={fund.name} {...fund} />
              ))}
            </Grid>
          </Box>
        )}

        {/* Mapas de ataque e saque — lado a lado no desktop */}
        {(hasAttacks || hasServes) && (
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            {hasAttacks && (
              <AttackHeatmap
                matchId={matchId}
                defaultPlayerId={session.playerId ?? undefined}
                compact
              />
            )}
            {hasServes && (
              <ServeHeatmap
                matchId={matchId}
                defaultPlayerId={session.playerId ?? undefined}
                compact
              />
            )}
          </Grid>
        )}

        {/* Distribuição de levantamento */}
        {isSetter && distTotal > 0 && distribution && (
          <Box>
            <SectionHeader label="Distribuição de Levantamento" accent="#FCD34D" />
            <Box borderRadius="16px" p={4}
              style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
              <Text mb={4} fontSize="11px"
                style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                {distTotal} levantamentos
              </Text>

              {[
                { label: 'Ponteiro', value: distribution.ponteiro, color: '#4ADE80' },
                { label: 'Oposto',   value: distribution.oposto,   color: '#A78BFA' },
                { label: 'Central',  value: distribution.central,  color: '#38BDF8' },
                { label: 'Pipe',     value: distribution.pipe,     color: '#FB923C' },
              ]
                .filter(d => d.value > 0)
                .sort((a, b) => b.value - a.value)
                .map(d => {
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
                          <Text fontSize="10px" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                            %
                          </Text>
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
            <Text fontSize="13px"
              style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>
              Nenhuma ação registrada para você nesta partida
            </Text>
          </Box>
        )}

      </VStack>
    </Box>
  )
}
