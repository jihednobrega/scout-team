import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Box, Flex, Text, VStack, HStack, Grid } from '@chakra-ui/react'
import { getPortalSession } from '@/lib/portal-session'
import { prisma } from '@/lib/prisma'
import { LogoutButton } from '@/components/portal/LogoutButton'
import AIInsightCard from '@/components/ai/AIInsightCard'
import { PlayerCardLink } from '@/components/portal/PlayerCardLink'
import {
  calculatePlayerStats, calculateRatingFromStats,
  formatPercentage,
} from '@/utils/stats'
import { ScoutAction, ActionType } from '@/types/scout'

// ─── design tokens (idênticos ao portal do atleta) ───────────────────────────
const BG        = '#080810'
const CARD_BG   = 'rgba(255,255,255,0.028)'
const CARD_BR   = 'rgba(255,255,255,0.07)'
const ACCENT    = '#FCD34D'   // amarelo — diferencia do portal do atleta (cyan)
const FONT_NUM  = 'var(--font-barlow), sans-serif'
const FONT_BODY = 'var(--font-jakarta), sans-serif'

// ─── helpers ─────────────────────────────────────────────────────────────────
const POSITION_LABELS: Record<string, string> = {
  setter: 'Levantador', opposite: 'Oposto', outside: 'Ponteiro',
  middle: 'Central', libero: 'Líbero', universal: 'Universal',
}

function ratingHex(r: number): string {
  if (r >= 7)   return '#22C55E'
  if (r >= 5.5) return '#22D3EE'
  if (r >= 4)   return '#FBBF24'
  return '#F87171'
}

function SectionHeader({ label, accent = ACCENT }: { label: string; accent?: string }) {
  return (
    <Flex align="center" gap={2} mb={4}>
      <Box w="2px" h="12px" borderRadius="full" style={{ background: accent }} />
      <Text
        fontSize="9px" fontWeight="700" letterSpacing="0.14em" textTransform="uppercase"
        style={{ color: 'rgba(255,255,255,0.35)', fontFamily: FONT_BODY }}
      >
        {label}
      </Text>
    </Flex>
  )
}

function MatchRow({ match }: {
  match: { id: string; homeTeam: string; awayTeam: string; finalScore: string; result: string }
}) {
  const won = match.result === 'vitoria'
  return (
    <Link href={`/portal/treinador/partida/${match.id}`} style={{ display: 'block' }}>
      <Flex align="center" gap={3} px={4} py={3}
        borderBottom="1px solid" borderColor="whiteAlpha.50" _last={{ borderBottom: 'none' }}
        _hover={{ background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }}
        transition="background 0.15s">
        <Box
          px={2.5} py={1} borderRadius="7px" flexShrink={0}
          style={{
            background: won ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
            border: `1px solid ${won ? 'rgba(34,197,94,0.28)' : 'rgba(248,113,113,0.28)'}`,
          }}
        >
          <Text style={{
            fontFamily: FONT_NUM, fontWeight: 700, fontSize: '11px',
            letterSpacing: '0.06em', color: won ? '#4ADE80' : '#F87171',
          }}>
            {match.finalScore}
          </Text>
        </Box>
        <Text noOfLines={1} fontSize="13px" color="rgba(255,255,255,0.7)"
          flex={1} minW={0} style={{ fontFamily: FONT_BODY }}>
          {match.homeTeam} × {match.awayTeam}
        </Text>
        <Text fontSize="14px" color="rgba(255,255,255,0.2)" flexShrink={0}>›</Text>
      </Flex>
    </Link>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default async function TreinadorPortalPage() {
  const session = await getPortalSession()
  if (!session || session.role !== 'coach') redirect('/portal/login')

  const [team, players, matches, prismaActions] = await Promise.all([
    prisma.team.findUnique({ where: { id: session.teamId } }),
    prisma.player.findMany({
      where: { teamId: session.teamId },
      orderBy: { jerseyNumber: 'asc' },
    }),
    prisma.match.findMany({
      where: { teamId: session.teamId, status: 'finalized' },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.scoutAction.findMany({
      where: { match: { teamId: session.teamId } },
      select: {
        id: true, matchId: true, playerId: true, time: true,
        action: true, subAction: true, zone: true,
        coordinateX: true, coordinateY: true, setNumber: true,
        timestamp: true, efficiencyValue: true, phase: true, rallyId: true,
      },
    }),
  ])

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

  const wins = matches.filter((m) => m.result === 'vitoria').length

  // Métricas gerais da equipe
  const teamAtk = actions.filter((a) => a.action === 'attack')
  const teamRec = actions.filter((a) => a.action === 'reception')
  const teamSrv = actions.filter((a) => a.action === 'serve')
  function eff(list: { efficiencyValue?: number | undefined }[]) {
    if (!list.length) return null
    return Math.round((list.filter((a) => (a.efficiencyValue ?? 0) > 0).length / list.length) * 100)
  }
  const teamEffAtk = eff(teamAtk)
  const teamEffRec = eff(teamRec)
  const totalAces  = teamSrv.filter((a) => a.subAction === 'ace').length

  // Stats + rating por jogador
  const playerRows = players
    .map((p) => {
      const matchCount = new Set(actions.filter((a) => a.player === p.id).map((a) => a.matchId)).size
      const stats  = matchCount > 0 ? calculatePlayerStats(p.id, actions, matchCount) : null
      const rating = stats ? calculateRatingFromStats(stats) : null
      return { ...p, stats, rating, matchCount }
    })
    .sort((a, b) => b.matchCount - a.matchCount)

  const coachName = session.name.split(' ')[0]

  return (
    <Box minH="100dvh" style={{ background: BG, fontFamily: FONT_BODY }} pb={12}>

      {/* ════════════════════════════════════════════════════════════════
          HERO HEADER
      ════════════════════════════════════════════════════════════════ */}
      <Box
        position="relative" overflow="hidden"
        style={{
          background: 'linear-gradient(160deg, #0D0D18 0%, #12120E 55%, #080810 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Glow blob — amarelo para treinador */}
        <Box
          position="absolute" style={{
            top: '10%', right: '-10%',
            width: '220px', height: '220px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(252,211,77,0.06) 0%, transparent 70%)',
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={team.logo} alt={team.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </Box>
              )}
              <Text
                fontSize="10px" fontWeight="600" letterSpacing="0.14em" textTransform="uppercase"
                style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}
              >
                {team?.name ?? 'Portal'}
              </Text>
            </Flex>
            <LogoutButton />
          </Flex>

          {/* Identity */}
          <Box mb={1}>
            <Text
              fontSize="10px" fontWeight="600" letterSpacing="0.12em" textTransform="uppercase"
              style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}
            >
              Treinador
            </Text>
            <Text
              lineHeight={1} mt={0.5}
              style={{ fontFamily: FONT_NUM, fontSize: '30px', fontWeight: 800, color: 'white', textTransform: 'uppercase' }}
            >
              {coachName}
            </Text>
          </Box>

          {/* Stats strip — Partidas · Vitórias · Derrotas */}
          <Flex mt={5} pt={5} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { label: 'Partidas', value: matches.length, color: 'rgba(255,255,255,0.9)' },
              { label: 'Vitórias', value: wins,           color: '#4ADE80' },
              { label: 'Derrotas', value: matches.length - wins, color: '#F87171' },
            ].map((item, i, arr) => (
              <Box
                key={item.label} flex={1} textAlign="center"
                style={i < arr.length - 1 ? { borderRight: '1px solid rgba(255,255,255,0.06)' } : {}}
              >
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

      <VStack spacing={6} align="stretch" px={4} mt={6}>

        {/* ════════════════════════════════════════════════════════════════
            MÉTRICAS TÉCNICAS
        ════════════════════════════════════════════════════════════════ */}
        {actions.length > 0 && (
          <Box>
            <SectionHeader label="Métricas da equipe" accent="#22D3EE" />
            <Grid templateColumns="repeat(3, 1fr)" gap={2}>
              {[
                { label: 'Ef. Ataque',  value: teamEffAtk !== null ? `${teamEffAtk}%` : '—', color: '#4ADE80' },
                { label: 'Ef. Recepção', value: teamEffRec !== null ? `${teamEffRec}%` : '—', color: '#A78BFA' },
                { label: 'Aces',        value: totalAces, color: '#FB923C' },
              ].map((item) => (
                <Box
                  key={item.label} textAlign="center" py={4} borderRadius="14px"
                  style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}
                >
                  <Text lineHeight={1}
                    style={{ fontFamily: FONT_NUM, fontSize: '28px', fontWeight: 800, color: item.color }}>
                    {item.value}
                  </Text>
                  <Text mt={1.5} fontSize="8px" fontWeight="600" textTransform="uppercase" letterSpacing="0.12em"
                    style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                    {item.label}
                  </Text>
                </Box>
              ))}
            </Grid>
          </Box>
        )}

        {/* ════════════════════════════════════════════════════════════════
            ATLETAS
        ════════════════════════════════════════════════════════════════ */}
        {playerRows.length > 0 && (
          <Box>
            <SectionHeader label={`Atletas · ${players.length}`} accent="#A78BFA" />
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={2}>
              {playerRows.map((p) => {
                const rating = p.rating?.friendlyRating ?? null
                const atk = p.stats ? formatPercentage(p.stats.attack.efficiency) : null
                const rec = p.stats ? formatPercentage(p.stats.reception.positivity) : null
                return (
                  <Link
                    key={p.id}
                    href={`/portal/treinador/atleta/${p.id}`}
                    style={{ display: 'block', textDecoration: 'none' }}
                  >
                    <PlayerCardLink>
                      <Flex align="center" gap={3} px={4} py={3}>
                        {/* Foto / número */}
                        <Box
                          w="42px" h="42px" borderRadius="10px" overflow="hidden" flexShrink={0}
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                          {p.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          ) : (
                            <Flex w="full" h="full" align="center" justify="center">
                              <Text style={{ fontFamily: FONT_NUM, fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                                #{p.jerseyNumber}
                              </Text>
                            </Flex>
                          )}
                        </Box>

                        {/* Info */}
                        <Box flex={1} minW={0}>
                          <Text noOfLines={1} style={{ fontFamily: FONT_NUM, fontSize: '14px', fontWeight: 700, color: 'white' }}>
                            {p.name}
                          </Text>
                          <Text fontSize="10px" fontWeight="600"
                            style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                            #{p.jerseyNumber} · {POSITION_LABELS[p.position] ?? p.position}
                          </Text>
                        </Box>

                        {/* Stats + seta */}
                        <HStack spacing={2.5} flexShrink={0}>
                          {p.stats ? (
                            <>
                              {atk && atk !== '0%' && (
                                <Box textAlign="center">
                                  <Text style={{ fontFamily: FONT_NUM, fontSize: '13px', fontWeight: 700, color: '#F87171' }}>{atk}</Text>
                                  <Text fontSize="8px" textTransform="uppercase"
                                    style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>atq</Text>
                                </Box>
                              )}
                              {rec && rec !== '0%' && (
                                <Box textAlign="center">
                                  <Text style={{ fontFamily: FONT_NUM, fontSize: '13px', fontWeight: 700, color: '#4ADE80' }}>{rec}</Text>
                                  <Text fontSize="8px" textTransform="uppercase"
                                    style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>rec</Text>
                                </Box>
                              )}
                              {rating !== null && (
                                <Box px={2} py={0.5} borderRadius="7px"
                                  style={{ background: `${ratingHex(rating)}15`, border: `1px solid ${ratingHex(rating)}40` }}>
                                  <Text style={{ fontFamily: FONT_NUM, fontSize: '12px', fontWeight: 700, color: ratingHex(rating) }}>
                                    {rating.toFixed(1)}
                                  </Text>
                                </Box>
                              )}
                            </>
                          ) : (
                            <Text fontSize="10px" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: FONT_BODY }}>
                              sem ações
                            </Text>
                          )}
                          <Text fontSize="14px" style={{ color: 'rgba(255,255,255,0.2)' }}>›</Text>
                        </HStack>
                      </Flex>
                    </PlayerCardLink>
                  </Link>
                )
              })}
            </Grid>
          </Box>
        )}

        {/* ════════════════════════════════════════════════════════════════
            ÚLTIMAS PARTIDAS
        ════════════════════════════════════════════════════════════════ */}
        {matches.length > 0 && (
          <Box>
            <SectionHeader label="Últimas partidas" accent="rgba(255,255,255,0.2)" />
            <Box borderRadius="16px" overflow="hidden"
              style={{ background: CARD_BG, border: `1px solid ${CARD_BR}` }}>
              {matches.map((m) => <MatchRow key={m.id} match={m} />)}
            </Box>
          </Box>
        )}

        {/* Insight IA — saúde do time */}
        <Box w="full">
          <AIInsightCard
            type="team_health"
            teamId={session.teamId}
            accent={ACCENT}
          />
        </Box>

      </VStack>
    </Box>
  )
}
