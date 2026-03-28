import { redirect, notFound } from 'next/navigation'
import { Box, Flex, Text, VStack, HStack, Grid } from '@chakra-ui/react'
import Link from 'next/link'
import { IoArrowBackOutline } from 'react-icons/io5'
import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import { calculatePlayerStats, calculateRatingFromStats, formatPercentage } from '@/utils/stats'
import { ScoutAction, ActionType } from '@/types/scout'
import AttackHeatmap from '@/components/statistics/AttackHeatmap'
import ServeHeatmap from '@/components/statistics/ServeHeatmap'
import { PlayerCardLink } from '@/components/portal/PlayerCardLink'

// ─── design tokens ────────────────────────────────────────────────────────────
const BG        = '#080810'
const CARD_BG   = 'rgba(255,255,255,0.028)'
const CARD_BR   = 'rgba(255,255,255,0.07)'
const ACCENT    = '#FCD34D'
const FONT_NUM  = 'var(--font-barlow), sans-serif'
const FONT_BODY = 'var(--font-jakarta), sans-serif'

const POSITION_LABELS: Record<string, string> = {
  setter: 'Levantador', opposite: 'Oposto', outside: 'Ponteiro',
  middle: 'Central', libero: 'Líbero', universal: 'Universal',
}

const FUND_CONFIG: Record<string, { icon: string; hex: string; gradient: string }> = {
  serve:     { icon: '/icons/serve.svg',     hex: '#38BDF8', gradient: 'linear-gradient(90deg,#0369A1,#38BDF8)' },
  reception: { icon: '/icons/reception.svg', hex: '#4ADE80', gradient: 'linear-gradient(90deg,#166534,#4ADE80)' },
  attack:    { icon: '/icons/attack.svg',    hex: '#F87171', gradient: 'linear-gradient(90deg,#9B2C2C,#F87171)' },
  block:     { icon: '/icons/block.svg',     hex: '#FB923C', gradient: 'linear-gradient(90deg,#9C4221,#FB923C)' },
  dig:       { icon: '/icons/defense.svg',   hex: '#A78BFA', gradient: 'linear-gradient(90deg,#4C1D95,#A78BFA)' },
  set:       { icon: '/icons/set.svg',       hex: '#FCD34D', gradient: 'linear-gradient(90deg,#92400E,#FCD34D)' },
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

// ─── page ─────────────────────────────────────────────────────────────────────
export default async function TreinadorPartidaPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const session = await getPortalSession()
  if (!session || session.role !== 'coach') redirect('/portal/login')

  const { matchId } = await params

  const [match, players] = await Promise.all([
    prisma.match.findUnique({ where: { id: matchId, teamId: session.teamId } }),
    prisma.player.findMany({
      where: { teamId: session.teamId },
      orderBy: { jerseyNumber: 'asc' },
    }),
  ])
  if (!match) notFound()

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

  // Stats por jogador
  type PlayerRow = {
    id: string; name: string; jerseyNumber: number; position: string; photo: string | null
    stats: ReturnType<typeof calculatePlayerStats>
    rating: ReturnType<typeof calculateRatingFromStats>
    hasAttacks: boolean; hasServes: boolean
  }
  const playerRows: PlayerRow[] = players
    .map((p): PlayerRow | null => {
      const pa = actions.filter((a) => a.player === p.id)
      if (pa.length === 0) return null
      const stats  = calculatePlayerStats(p.id, actions, 1)
      const rating = calculateRatingFromStats(stats)
      return {
        id: p.id, name: p.name, jerseyNumber: p.jerseyNumber,
        position: p.position, photo: p.photo ?? null,
        stats, rating,
        hasAttacks: pa.some((a) => a.action === 'attack'),
        hasServes:  pa.some((a) => a.action === 'serve'),
      }
    })
    .filter((p): p is PlayerRow => p !== null)

  // Métricas globais
  const allAtk = actions.filter((a) => a.action === 'attack')
  const allRec = actions.filter((a) => a.action === 'reception')
  const allSrv = actions.filter((a) => a.action === 'serve')
  function eff(list: { efficiencyValue?: number }[]) {
    if (!list.length) return null
    return Math.round((list.filter((a) => (a.efficiencyValue ?? 0) > 0).length / list.length) * 100)
  }
  const matchEffAtk = eff(allAtk)
  const matchEffRec = eff(allRec)
  const matchAces   = allSrv.filter((a) => a.subAction === 'ace').length
  const matchKills  = allAtk.filter((a) => a.subAction === 'kill').length

  const attackers = playerRows.filter((p) => p.hasAttacks)
  const servers   = playerRows.filter((p) => p.hasServes)

  return (
    <Box minH="100dvh" style={{ background: BG, fontFamily: FONT_BODY }} pb={12}>

      {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
      <Box position="relative" overflow="hidden"
        style={{
          background: 'linear-gradient(160deg, #0D0D18 0%, #12120E 55%, #080810 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <Box px={4} pt={5} pb={6}>
          <Link href="/portal/treinador" style={{ textDecoration: 'none', display: 'inline-flex' }}>
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

          <Flex align="flex-start" justify="space-between" gap={3}>
            <Box flex={1} minW={0}>
              <Text noOfLines={2} lineHeight={1.15} mb={1.5}
                style={{ fontFamily: FONT_NUM, fontSize: '20px', fontWeight: 800,
                  color: 'white', textTransform: 'uppercase' }}>
                {match.homeTeam} × {match.awayTeam}
              </Text>
              <Text fontSize="11px" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}>
                {new Date(match.date).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
                {match.tournament && ` · ${match.tournament}`}
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

          {actions.length > 0 && (
            <Flex align="center" gap={4} mt={5} pt={4}
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Kills',       value: matchKills,  color: '#4ADE80' },
                { label: 'Aces',        value: matchAces,   color: '#FB923C' },
                { label: 'Ef. Ataque',  value: matchEffAtk !== null ? `${matchEffAtk}%` : '—', color: '#F87171' },
                { label: 'Ef. Recep.',  value: matchEffRec !== null ? `${matchEffRec}%` : '—', color: '#A78BFA' },
              ].map((item) => (
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

        {/* Atletas — grid 2 colunas no desktop */}
        {playerRows.length > 0 && (
          <Box>
            <SectionHeader label={`Atletas · ${playerRows.length} com ações`} accent="#A78BFA" />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
              {playerRows.map((p) => {
                const overallRating = p.rating.friendlyRating
                const kills = p.stats.attack.kills
                const aces  = p.stats.serve.aces

                // Fundamentos com ações
                const funds = (Object.keys(FUND_CONFIG) as (keyof typeof FUND_CONFIG)[])
                  .map((action) => {
                    const raw = action === 'dig' ? p.stats.defense : p.stats[action as keyof typeof p.stats]
                    if (!raw || typeof raw !== 'object' || !('total' in raw) || (raw as { total: number }).total === 0) return null
                    const fundRating = p.rating.ratingByFundamental[action]?.friendly ?? 0
                    const cfg = FUND_CONFIG[action]

                    let mainVal = ''
                    if (action === 'serve')     mainVal = formatPercentage(p.stats.serve.efficiency)
                    else if (action === 'reception') mainVal = formatPercentage(p.stats.reception.positivity)
                    else if (action === 'attack')    mainVal = formatPercentage(p.stats.attack.efficiency)
                    else if (action === 'block')     mainVal = `${p.stats.block.pointsPerSet.toFixed(1)}`
                    else if (action === 'dig')       mainVal = formatPercentage(p.stats.defense.efficiency)
                    else if (action === 'set')       mainVal = formatPercentage(p.stats.set.total > 0 ? p.stats.set.perfect / p.stats.set.total : 0)

                    return { action, cfg, mainVal, fundRating }
                  })
                  .filter(Boolean) as { action: string; cfg: typeof FUND_CONFIG[string]; mainVal: string; fundRating: number }[]

                return (
                  <Link
                    key={p.id}
                    href={`/portal/treinador/partida/${matchId}/atleta/${p.id}`}
                    style={{ display: 'block', textDecoration: 'none' }}
                  >
                    <PlayerCardLink>
                      {/* Header */}
                      <Flex align="center" gap={3} px={4} pt={3.5} pb={3}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <Box
                          w="38px" h="38px" borderRadius="10px" overflow="hidden" flexShrink={0}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          {p.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.photo} alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <Flex w="full" h="full" align="center" justify="center">
                              <Text style={{ fontFamily: FONT_NUM, fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                                #{p.jerseyNumber}
                              </Text>
                            </Flex>
                          )}
                        </Box>

                        <Box flex={1} minW={0}>
                          <Text noOfLines={1} style={{ fontFamily: FONT_NUM, fontSize: '14px', fontWeight: 700, color: 'white' }}>
                            {p.name}
                          </Text>
                          <Text fontSize="10px" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                            #{p.jerseyNumber} · {POSITION_LABELS[p.position] ?? p.position}
                          </Text>
                        </Box>

                        <HStack spacing={2} flexShrink={0}>
                          {kills > 0 && (
                            <Box textAlign="center">
                              <Text style={{ fontFamily: FONT_NUM, fontSize: '13px', fontWeight: 700, color: '#4ADE80' }}>{kills}</Text>
                              <Text fontSize="8px" textTransform="uppercase"
                                style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>kills</Text>
                            </Box>
                          )}
                          {aces > 0 && (
                            <Box textAlign="center">
                              <Text style={{ fontFamily: FONT_NUM, fontSize: '13px', fontWeight: 700, color: '#FB923C' }}>{aces}</Text>
                              <Text fontSize="8px" textTransform="uppercase"
                                style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>aces</Text>
                            </Box>
                          )}
                          <Box px={2} py={0.5} borderRadius="7px"
                            style={{
                              background: `${ratingHex(overallRating)}15`,
                              border: `1px solid ${ratingHex(overallRating)}40`,
                            }}>
                            <Text style={{ fontFamily: FONT_NUM, fontSize: '12px', fontWeight: 700, color: ratingHex(overallRating) }}>
                              {overallRating.toFixed(1)}
                            </Text>
                          </Box>
                          <Text fontSize="14px" style={{ color: 'rgba(255,255,255,0.2)' }}>›</Text>
                        </HStack>
                      </Flex>

                      {/* Fundamentos mini */}
                      {funds.length > 0 && (
                        <Flex px={4} py={3} gap={0} flexWrap="wrap">
                          {funds.map((f, i) => (
                            <Flex key={f.action} align="center" gap={2}
                              pr={4} mr={4}
                              style={i < funds.length - 1
                                ? { borderRight: '1px solid rgba(255,255,255,0.06)' }
                                : {}}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={f.cfg.icon} alt="" width={18} height={18}
                                style={{ display: 'block', objectFit: 'contain', opacity: 0.7 }} />
                              <Box>
                                <Text lineHeight={1}
                                  style={{ fontFamily: FONT_NUM, fontSize: '14px', fontWeight: 700, color: f.cfg.hex }}>
                                  {f.mainVal}
                                </Text>
                                <Flex align="center" gap={1} mt={0.5}>
                                  <Box px={1} borderRadius="4px" style={{
                                    background: `${ratingHex(f.fundRating)}18`,
                                    border: `1px solid ${ratingHex(f.fundRating)}35`,
                                  }}>
                                    <Text style={{ fontFamily: FONT_NUM, fontSize: '9px', fontWeight: 700, color: ratingHex(f.fundRating) }}>
                                      {f.fundRating.toFixed(1)}
                                    </Text>
                                  </Box>
                                </Flex>
                              </Box>
                            </Flex>
                          ))}
                        </Flex>
                      )}

                      {/* Barras de progresso */}
                      {(p.stats.attack.total > 0 || p.stats.reception.total > 0) && (
                        <Flex px={4} pb={3} gap={2}>
                          {p.stats.attack.total > 0 && (
                            <Box flex={1} h="2px" borderRadius="full"
                              style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <Box h="full" borderRadius="full" style={{
                                width: formatPercentage(Math.max(0, p.stats.attack.efficiency + 0.5)),
                                background: FUND_CONFIG['attack'].gradient,
                              }} />
                            </Box>
                          )}
                          {p.stats.reception.total > 0 && (
                            <Box flex={1} h="2px" borderRadius="full"
                              style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <Box h="full" borderRadius="full" style={{
                                width: formatPercentage(p.stats.reception.positivity),
                                background: FUND_CONFIG['reception'].gradient,
                              }} />
                            </Box>
                          )}
                        </Flex>
                      )}
                    </PlayerCardLink>
                  </Link>
                )
              })}
            </Grid>
          </Box>
        )}

        {/* Heatmaps de ataque */}
        {attackers.length > 0 && (
          <Box>
            <SectionHeader label="Mapa de ataque por atleta" accent="#F87171" />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              {attackers.map((p) => (
                <AttackHeatmap key={p.id} matchId={matchId} defaultPlayerId={p.id} compact
                  title={`#${p.jerseyNumber} ${p.name}`} />
              ))}
            </Grid>
          </Box>
        )}

        {/* Heatmaps de saque */}
        {servers.length > 0 && (
          <Box>
            <SectionHeader label="Mapa de saque por atleta" accent="#38BDF8" />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
              {servers.map((p) => (
                <ServeHeatmap key={p.id} matchId={matchId} defaultPlayerId={p.id} compact
                  title={`#${p.jerseyNumber} ${p.name}`} />
              ))}
            </Grid>
          </Box>
        )}

        {actions.length === 0 && (
          <Box borderRadius="16px" p={6} textAlign="center"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
            <Text fontSize="13px" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>
              Nenhuma ação de scout registrada nesta partida
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
