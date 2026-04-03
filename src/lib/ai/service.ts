/**
 * Service Layer — Orquestrador de IA com cache
 *
 * Fluxo: cache check → load data → build prompt → call provider → persist
 */

import { prisma } from '@/lib/prisma'
import { streamClaude, callClaude } from './providers/anthropic'
import { buildMatchAnalysisPrompt } from './prompts/match-analysis'
import { buildMatchSummaryPrompt } from './prompts/match-summary'
import { buildAthleteInsightPrompt } from './prompts/athlete-insight'
import { buildTeamHealthPrompt } from './prompts/team-health'
import { buildPostGamePrompt } from './prompts/post-game'
import { buildMetricExplainerPrompt } from './prompts/metric-explainer'
import { buildPlayerDevPrompt } from './prompts/player-dev'
import { buildTacticalBriefPrompt } from './prompts/tactical-brief'
import { buildLineupOptPrompt } from './prompts/lineup-opt'
import { buildPatternInsightsPrompt } from './prompts/pattern-insights'
import { buildStatsOverviewPrompt } from './prompts/stats-overview'
import {
  type AIGenerateRequest,
  type AIInsightResult,
  type AIPrompt,
  INSIGHT_CONFIG,
  estimateCostBRL,
} from './types'

// ─── Cache ────────────────────────────────────────────────────────────────────

async function findCachedInsight(req: AIGenerateRequest): Promise<AIInsightResult | null> {
  const insight = await prisma.aIInsight.findFirst({
    where: {
      type: req.type,
      teamId: req.teamId,
      matchId: req.matchId ?? null,
      playerId: req.playerId ?? null,
      metricKey: req.metricKey ?? null,
    },
  })

  if (!insight) return null

  return {
    id: insight.id,
    type: insight.type as AIInsightResult['type'],
    response: insight.response,
    cached: true,
    createdAt: insight.createdAt,
    provider: insight.provider as AIInsightResult['provider'],
    tokensUsed: insight.tokensUsed,
    costEstimate: insight.costEstimate,
  }
}

async function persistInsight(
  req: AIGenerateRequest,
  prompt: string,
  response: string,
  provider: string,
  tier: string,
  tokensUsed?: number,
  costEstimate?: number
): Promise<string> {
  if (!response?.trim()) {
    console.warn('[AI Persist] Resposta vazia — insight não salvo.')
    throw new Error('Resposta vazia, insight não salvo')
  }

  // Deleta cache antigo se existir (para upsert limpo)
  await prisma.aIInsight.deleteMany({
    where: {
      type: req.type,
      teamId: req.teamId,
      matchId: req.matchId ?? null,
      playerId: req.playerId ?? null,
      metricKey: req.metricKey ?? null,
    },
  })

  const insight = await prisma.aIInsight.create({
    data: {
      type: req.type,
      tier,
      provider,
      matchId: req.matchId ?? null,
      playerId: req.playerId ?? null,
      teamId: req.teamId,
      metricKey: req.metricKey ?? null,
      prompt,
      response,
      tokensUsed: tokensUsed ?? null,
      costEstimate: costEstimate ?? null,
    },
  })

  return insight.id
}

// ─── Rate Limit Simples ───────────────────────────────────────────────────────

const recentCalls = new Map<string, number>()
const COOLDOWN_MS = 60_000

function checkRateLimit(req: AIGenerateRequest): void {
  const key = `${req.type}:${req.matchId ?? ''}:${req.playerId ?? ''}:${req.teamId}`
  const lastCall = recentCalls.get(key)
  if (lastCall && Date.now() - lastCall < COOLDOWN_MS) {
    throw new Error('Aguarde antes de regenerar. Tente novamente em alguns segundos.')
  }
  recentCalls.set(key, Date.now())
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

async function loadMatchData(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { actions: true, team: { include: { players: true } } },
  })
  if (!match) throw new Error(`Partida ${matchId} não encontrada`)
  return match
}

function buildPlayerInfoMap(players: Array<{ id: string; name: string; jerseyNumber: number; position: string }>) {
  const map: Record<string, { name: string; number: string; position: string }> = {}
  for (const p of players) {
    map[p.id] = { name: p.name, number: String(p.jerseyNumber), position: p.position }
  }
  return map
}

// ─── Prompt Builder Router ────────────────────────────────────────────────────

async function buildPrompt(req: AIGenerateRequest): Promise<AIPrompt> {
  switch (req.type) {
    case 'match_analysis': {
      if (!req.matchId) throw new Error('matchId obrigatório para match_analysis')
      const data = await loadMatchData(req.matchId)
      const playerInfoMap = buildPlayerInfoMap(data.team.players)
      const matchObj = {
        ...data,
        sets: JSON.parse(data.sets || '[]'),
        stats: data.stats ? JSON.parse(data.stats) : undefined,
      }
      const actions = data.actions.map((a: { playerId: string | null; setNumber: number; [key: string]: unknown }) => ({
        ...a,
        player: a.playerId ?? '',
        set: a.setNumber,
      }))
      return buildMatchAnalysisPrompt(matchObj as any, actions as any, playerInfoMap)
    }

    case 'match_summary': {
      if (!req.matchId) throw new Error('matchId obrigatório para match_summary')
      const mData = await loadMatchData(req.matchId)
      const sets = JSON.parse(mData.sets || '[]')
      const setsStr = sets.map((s: { homeScore?: number; home?: number; awayScore?: number; away?: number }, i: number) => {
        const h = s.homeScore ?? s.home ?? 0
        const a = s.awayScore ?? s.away ?? 0
        return `Set ${i + 1}: ${h}-${a}`
      }).join(', ')
      return buildMatchSummaryPrompt({
        homeTeam: mData.homeTeam,
        awayTeam: mData.awayTeam,
        finalScore: mData.finalScore,
        result: mData.result,
        sets: setsStr,
        date: new Date(mData.date).toLocaleDateString('pt-BR'),
        tournament: mData.tournament,
        totalActions: mData.actions.length,
      })
    }

    case 'athlete_insight': {
      if (!req.playerId) throw new Error('playerId obrigatório para athlete_insight')
      const player = await prisma.player.findUnique({ where: { id: req.playerId } })
      if (!player) throw new Error('Jogador não encontrado')
      const allActions = await prisma.scoutAction.findMany({
        where: { match: { teamId: req.teamId }, playerId: req.playerId },
      })
      const matchCount = new Set(allActions.map(a => a.matchId)).size
      const { calculatePlayerStats, calculateRatingFromStats } = await import('@/utils/stats')
      const stats = calculatePlayerStats(req.playerId, allActions.map(a => ({
        ...a, player: a.playerId ?? '', set: a.setNumber,
      })) as any, 1)
      const rating = calculateRatingFromStats(stats)
      return buildAthleteInsightPrompt({
        playerName: player.name,
        position: player.position,
        totalMatches: matchCount,
        avgRating: rating.friendlyRating,
        stats: {
          attackKills: stats.attack.kills,
          attackTotal: stats.attack.total,
          serveAces: stats.serve.aces,
          serveTotal: stats.serve.total,
          receptionPerfect: stats.reception.perfect,
          receptionTotal: stats.reception.total,
          blockPoints: stats.block.points,
          blockTotal: stats.block.total,
        },
      })
    }

    case 'team_health': {
      const team = await prisma.team.findUnique({ where: { id: req.teamId } })
      if (!team) throw new Error('Equipe não encontrada')
      const matches = await prisma.match.findMany({
        where: { teamId: req.teamId, status: 'finalized' },
        orderBy: { date: 'desc' },
        take: 20,
        include: { actions: { select: { efficiencyValue: true, playerId: true } } },
      })
      const wins = matches.filter(m => m.result === 'vitoria').length
      const recentResults = matches.slice(0, 5).map(m => m.result)
      const allEff = matches.flatMap(m => m.actions.filter(a => a.efficiencyValue != null).map(a => a.efficiencyValue!))
      const avgEff = allEff.length > 0 ? allEff.reduce((a, b) => a + b, 0) / allEff.length : 0
      return buildTeamHealthPrompt({
        teamName: team.name,
        totalMatches: matches.length,
        wins,
        losses: matches.length - wins,
        avgEfficiency: avgEff,
        recentResults,
        topPlayer: 'N/A',
        topPlayerRating: 0,
      })
    }

    case 'post_game_reflection': {
      if (!req.matchId || !req.playerId) throw new Error('matchId e playerId obrigatórios')
      const pgMatch = await loadMatchData(req.matchId)
      const pgPlayer = await prisma.player.findUnique({ where: { id: req.playerId } })
      if (!pgPlayer) throw new Error('Jogador não encontrado')
      const pgActions = pgMatch.actions.filter(a => a.playerId === req.playerId)
      const { calculatePlayerStats, calculateRatingFromStats } = await import('@/utils/stats')
      const pgStats = calculatePlayerStats(req.playerId!, pgActions.map(a => ({
        ...a, player: a.playerId ?? '', set: a.setNumber,
      })) as any, 1)
      const pgRating = calculateRatingFromStats(pgStats)
      return buildPostGamePrompt({
        playerName: pgPlayer.name,
        position: pgPlayer.position,
        opponent: pgMatch.awayTeam,
        result: pgMatch.result,
        rating: pgRating.friendlyRating,
        stats: {
          attackKills: pgStats.attack.kills,
          attackErrors: pgStats.attack.errors,
          attackTotal: pgStats.attack.total,
          serveAces: pgStats.serve.aces,
          serveErrors: pgStats.serve.errors,
          receptionPerfect: pgStats.reception.perfect,
          receptionErrors: pgStats.reception.errors,
          blockPoints: pgStats.block.points,
        },
      })
    }

    case 'metric_explainer': {
      if (!req.metricKey) throw new Error('metricKey obrigatório para metric_explainer')
      return buildMetricExplainerPrompt(req.metricKey, req.metricValue)
    }

    case 'player_dev': {
      if (!req.playerId) throw new Error('playerId obrigatório para player_dev')
      const devPlayer = await prisma.player.findUnique({ where: { id: req.playerId } })
      if (!devPlayer) throw new Error('Jogador não encontrado')
      const devActions = await prisma.scoutAction.findMany({
        where: { match: { teamId: req.teamId }, playerId: req.playerId },
        include: { match: { select: { awayTeam: true, date: true } } },
      })
      const { calculatePlayerStats, calculateRatingFromStats } = await import('@/utils/stats')
      const devStats = calculatePlayerStats(req.playerId, devActions.map(a => ({
        ...a, player: a.playerId ?? '', set: a.setNumber,
      })) as any, 1)
      const devRating = calculateRatingFromStats(devStats)

      // Build match history
      const matchMap = new Map<string, { opponent: string; date: string; actions: typeof devActions }>()
      for (const a of devActions) {
        if (!matchMap.has(a.matchId)) {
          matchMap.set(a.matchId, { opponent: a.match.awayTeam, date: new Date(a.match.date).toLocaleDateString('pt-BR'), actions: [] })
        }
        matchMap.get(a.matchId)!.actions.push(a)
      }
      const matchHistory = Array.from(matchMap.entries()).map(([, m]) => {
        const mStats = calculatePlayerStats(req.playerId!, m.actions.map(a => ({ ...a, player: a.playerId ?? '', set: a.setNumber })) as any, 1)
        const mRating = calculateRatingFromStats(mStats)
        const kills = mStats.attack.kills
        const aces = mStats.serve.aces
        const blocks = mStats.block.points
        return {
          opponent: m.opponent,
          date: m.date,
          points: kills + aces + blocks,
          efficiency: mStats.attack.total > 0 ? (mStats.attack.kills - mStats.attack.errors) / mStats.attack.total * 100 : 0,
          rating: mRating.friendlyRating,
        }
      }).slice(0, 10)

      return buildPlayerDevPrompt({
        playerName: devPlayer.name,
        position: devPlayer.position,
        totalMatches: matchMap.size,
        avgRating: devRating.friendlyRating,
        stats: {
          attackKills: devStats.attack.kills,
          attackErrors: devStats.attack.errors,
          attackTotal: devStats.attack.total,
          serveAces: devStats.serve.aces,
          serveErrors: devStats.serve.errors,
          serveTotal: devStats.serve.total,
          receptionPerfect: devStats.reception.perfect,
          receptionErrors: devStats.reception.errors,
          receptionTotal: devStats.reception.total,
          blockPoints: devStats.block.points,
          blockTotal: devStats.block.total,
        },
        matchHistory,
      })
    }

    case 'tactical_brief': {
      if (!req.matchId) throw new Error('matchId obrigatório para tactical_brief')
      const tbMatch = await loadMatchData(req.matchId)
      const tbSets = JSON.parse(tbMatch.sets || '[]')
      const tbSetsStr = tbSets.map((s: { homeScore?: number; home?: number; awayScore?: number; away?: number }, i: number) => {
        const h = s.homeScore ?? s.home ?? 0
        const a = s.awayScore ?? s.away ?? 0
        return `Set ${i + 1}: ${h}-${a}`
      }).join(', ')

      // Build attack/reception by position
      const tbPlayers = tbMatch.team.players
      const positionMap: Record<string, string> = {}
      for (const p of tbPlayers) positionMap[p.id] = p.position

      const atkByPos: Record<string, { kills: number; errors: number; total: number }> = {}
      const recByPos: Record<string, { perfect: number; errors: number; total: number }> = {}

      for (const a of tbMatch.actions) {
        const pos = positionMap[a.playerId ?? ''] || 'desconhecido'
        if (a.action === 'attack') {
          if (!atkByPos[pos]) atkByPos[pos] = { kills: 0, errors: 0, total: 0 }
          atkByPos[pos].total++
          if (a.subAction === 'kill' || a.subAction === 'tip' || a.subAction === 'block_out') atkByPos[pos].kills++
          if (a.subAction === 'error') atkByPos[pos].errors++
        }
        if (a.action === 'reception') {
          if (!recByPos[pos]) recByPos[pos] = { perfect: 0, errors: 0, total: 0 }
          recByPos[pos].total++
          if (a.subAction === 'perfect') recByPos[pos].perfect++
          if (a.subAction === 'error' || a.subAction === 'overpass') recByPos[pos].errors++
        }
      }

      const attackByPosition = Object.entries(atkByPos).map(([label, d]) => ({ label, ...d }))
      const receptionByPosition = Object.entries(recByPos).map(([label, d]) => ({
        label,
        efficiency: d.total > 0 ? (d.perfect / d.total) * 100 : 0,
        perfect: d.perfect,
        errors: d.errors,
        total: d.total,
      }))

      // Setter distribution
      const setActions = tbMatch.actions.filter(a => a.action === 'set')
      const setTotal = setActions.length
      const setByTarget: Record<string, number> = {}
      for (const a of setActions) {
        const target = a.subAction || 'outro'
        setByTarget[target] = (setByTarget[target] || 0) + 1
      }
      const setterDistribution = Object.entries(setByTarget).map(([label, count]) => ({
        label,
        value: setTotal > 0 ? Math.round((count / setTotal) * 100) : 0,
      }))

      return buildTacticalBriefPrompt({
        homeTeam: tbMatch.homeTeam,
        awayTeam: tbMatch.awayTeam,
        result: tbMatch.result,
        finalScore: tbMatch.finalScore,
        sets: tbSetsStr,
        attackByPosition,
        receptionByPosition,
        setterDistribution,
        totalActions: tbMatch.actions.length,
      })
    }

    case 'lineup_opt': {
      const loTeam = await prisma.team.findUnique({ where: { id: req.teamId }, include: { players: true } })
      if (!loTeam) throw new Error('Equipe não encontrada')
      const loMatches = await prisma.match.findMany({
        where: { teamId: req.teamId, status: 'finalized' },
        include: { actions: true },
      })
      const wins = loMatches.filter(m => m.result === 'vitoria').length
      const { calculatePlayerStats, calculateRatingFromStats } = await import('@/utils/stats')

      const allActions = loMatches.flatMap(m => m.actions)
      const playerData = loTeam.players.map(p => {
        const pActions = allActions.filter(a => a.playerId === p.id)
        const matchesPlayed = new Set(pActions.map(a => a.matchId)).size
        if (matchesPlayed === 0) return {
          name: p.name, position: p.position, matchesPlayed: 0,
          rating: 0, attackEff: 0, receptionEff: 0, serveEff: 0,
        }
        const pStats = calculatePlayerStats(p.id, pActions.map(a => ({ ...a, player: a.playerId ?? '', set: a.setNumber })) as any, 1)
        const pRating = calculateRatingFromStats(pStats)
        return {
          name: p.name,
          position: p.position,
          matchesPlayed,
          rating: pRating.friendlyRating,
          attackEff: pStats.attack.total > 0 ? (pStats.attack.kills - pStats.attack.errors) / pStats.attack.total * 100 : 0,
          receptionEff: pStats.reception.total > 0 ? pStats.reception.perfect / pStats.reception.total * 100 : 0,
          serveEff: pStats.serve.total > 0 ? pStats.serve.aces / pStats.serve.total * 100 : 0,
        }
      })

      // Rotation stats (simplified — aggregate across matches)
      const rotationStats = [1, 2, 3, 4, 5, 6].map(r => ({ rotation: r, winRate: 0, sideOutEfficiency: 0, breakPointEfficiency: 0 }))

      return buildLineupOptPrompt({
        teamName: loTeam.name,
        totalMatches: loMatches.length,
        winRate: loMatches.length > 0 ? (wins / loMatches.length) * 100 : 0,
        players: playerData,
        rotationStats,
      })
    }

    case 'pattern_insights': {
      const piTeam = await prisma.team.findUnique({ where: { id: req.teamId } })
      if (!piTeam) throw new Error('Equipe não encontrada')
      const piMatches = await prisma.match.findMany({
        where: { teamId: req.teamId, status: 'finalized' },
        select: { result: true, stats: true },
      })
      const piWins = piMatches.filter(m => m.result === 'vitoria').length

      // Extract rotation stats from match stats JSON (pre-computed by statistics API)
      const allRotStats: Record<number, { winRates: number[]; soEff: number[]; bpEff: number[]; atkEff: number[]; recEff: number[] }> = {}
      for (const m of piMatches) {
        if (!m.stats) continue
        const parsed = JSON.parse(m.stats)
        const rotations = parsed.rotationStats || parsed.rotations || []
        for (const r of rotations) {
          const rNum = r.rotation ?? r.number
          if (!rNum || rNum < 1 || rNum > 6) continue
          if (!allRotStats[rNum]) allRotStats[rNum] = { winRates: [], soEff: [], bpEff: [], atkEff: [], recEff: [] }
          if (r.winRate != null) allRotStats[rNum].winRates.push(r.winRate)
          if (r.sideOutEfficiency != null) allRotStats[rNum].soEff.push(r.sideOutEfficiency)
          if (r.breakPointEfficiency != null) allRotStats[rNum].bpEff.push(r.breakPointEfficiency)
          if (r.attackEfficiency != null) allRotStats[rNum].atkEff.push(r.attackEfficiency)
          if (r.receptionEfficiency != null) allRotStats[rNum].recEff.push(r.receptionEfficiency)
        }
      }

      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
      const rotationStats = [1, 2, 3, 4, 5, 6].map(r => {
        const d = allRotStats[r] || { winRates: [], soEff: [], bpEff: [], atkEff: [], recEff: [] }
        return {
          rotation: r,
          winRate: avg(d.winRates),
          sideOutEfficiency: avg(d.soEff),
          breakPointEfficiency: avg(d.bpEff),
          attackEfficiency: avg(d.atkEff),
          receptionEfficiency: avg(d.recEff),
        }
      })

      return buildPatternInsightsPrompt({
        teamName: piTeam.name,
        totalMatches: piMatches.length,
        rotationStats,
        winRate: piMatches.length > 0 ? (piWins / piMatches.length) * 100 : 0,
      })
    }

    case 'stats_overview': {
      const soTeam = await prisma.team.findUnique({ where: { id: req.teamId }, include: { players: true } })
      if (!soTeam) throw new Error('Equipe não encontrada')
      const soMatches = await prisma.match.findMany({
        where: { teamId: req.teamId, status: 'finalized' },
        include: { actions: true },
      })

      const wins = soMatches.filter((m: any) => m.result === 'vitoria').length
      const allActions = soMatches.flatMap((m: any) => m.actions)
      const { calculatePlayerStats, calculateRatingFromStats } = await import('@/utils/stats')

      // KPIs globais
      const atkActions = allActions.filter((a: any) => a.action === 'attack')
      const recActions = allActions.filter((a: any) => a.action === 'reception')
      const serveActions = allActions.filter((a: any) => a.action === 'serve')
      const blockActions = allActions.filter((a: any) => a.action === 'block')

      const atkKillCount = atkActions.filter((a: any) => a.subAction === 'kill' || a.subAction === 'tip' || a.subAction === 'block_out').length
      const attackEfficiency = atkActions.length > 0
        ? ((atkKillCount - atkActions.filter((a: any) => a.subAction === 'error').length) / atkActions.length) * 100 : 0
      const receptionEfficiency = recActions.length > 0
        ? (recActions.filter((a: any) => a.subAction === 'perfect').length / recActions.length) * 100 : 0
      const acePercentage = serveActions.length > 0
        ? (serveActions.filter((a: any) => a.subAction === 'ace').length / serveActions.length) * 100 : 0
      const blockKillsPerMatch = soMatches.length > 0
        ? blockActions.filter((a: any) => a.subAction === 'kill_block').length / soMatches.length : 0

      // Jogadores
      const playerData = soTeam.players.map((p: any) => {
        const pActions = allActions.filter((a: any) => a.playerId === p.id)
        const matchesPlayed = new Set(pActions.map((a: any) => a.matchId)).size
        if (matchesPlayed === 0) return { name: p.name, position: p.position, matchesPlayed: 0, rating: 0, attackEff: 0, receptionEff: 0, serveEff: 0 }
        const pStats = calculatePlayerStats(p.id, pActions.map((a: any) => ({ ...a, player: a.playerId ?? '', set: a.setNumber })), 1)
        const pRating = calculateRatingFromStats(pStats)
        return {
          name: p.name, position: p.position, matchesPlayed,
          rating: pRating.friendlyRating,
          attackEff: pStats.attack.total > 0 ? (pStats.attack.kills - pStats.attack.errors) / pStats.attack.total * 100 : 0,
          receptionEff: pStats.reception.total > 0 ? pStats.reception.perfect / pStats.reception.total * 100 : 0,
          serveEff: pStats.serve.total > 0 ? pStats.serve.aces / pStats.serve.total * 100 : 0,
        }
      })

      // Ataque por posição
      const positionMap: Record<string, string> = {}
      for (const p of soTeam.players) positionMap[p.id] = p.position
      const atkByPos: Record<string, { kills: number; errors: number; total: number }> = {}
      const recByPos: Record<string, { perfect: number; total: number }> = {}
      for (const a of allActions) {
        const pos = positionMap[a.playerId ?? ''] || 'desconhecido'
        if (a.action === 'attack') {
          if (!atkByPos[pos]) atkByPos[pos] = { kills: 0, errors: 0, total: 0 }
          atkByPos[pos].total++
          if (a.subAction === 'kill' || a.subAction === 'tip' || a.subAction === 'block_out') atkByPos[pos].kills++
          if (a.subAction === 'error') atkByPos[pos].errors++
        }
        if (a.action === 'reception') {
          if (!recByPos[pos]) recByPos[pos] = { perfect: 0, total: 0 }
          recByPos[pos].total++
          if (a.subAction === 'perfect') recByPos[pos].perfect++
        }
      }

      // Distribuição do levantador
      const setActions = allActions.filter((a: any) => a.action === 'set')
      const setTotal = setActions.length
      const setByTarget: Record<string, number> = {}
      for (const a of setActions) { const t = a.subAction || 'outro'; setByTarget[t] = (setByTarget[t] || 0) + 1 }
      const setterDistribution = Object.entries(setByTarget).map(([label, count]) => ({
        label, value: setTotal > 0 ? Math.round((count / setTotal) * 100) : 0,
      }))

      // Rotações (do stats JSON)
      const allRotStats: Record<number, { winRates: number[]; soEff: number[]; bpEff: number[]; atkEff: number[]; recEff: number[] }> = {}
      for (const m of soMatches) {
        if (!m.stats) continue
        const parsed = JSON.parse(m.stats)
        const rotations = parsed.rotationStats || parsed.rotations || []
        for (const r of rotations) {
          const rNum = r.rotation ?? r.number
          if (!rNum || rNum < 1 || rNum > 6) continue
          if (!allRotStats[rNum]) allRotStats[rNum] = { winRates: [], soEff: [], bpEff: [], atkEff: [], recEff: [] }
          if (r.winRate != null) allRotStats[rNum].winRates.push(r.winRate)
          if (r.sideOutEfficiency != null) allRotStats[rNum].soEff.push(r.sideOutEfficiency)
          if (r.breakPointEfficiency != null) allRotStats[rNum].bpEff.push(r.breakPointEfficiency)
          if (r.attackEfficiency != null) allRotStats[rNum].atkEff.push(r.attackEfficiency)
          if (r.receptionEfficiency != null) allRotStats[rNum].recEff.push(r.receptionEfficiency)
        }
      }
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a: number, b: number) => a + b, 0) / arr.length : 0
      const rotationStats = [1, 2, 3, 4, 5, 6].map(r => {
        const d = allRotStats[r] || { winRates: [], soEff: [], bpEff: [], atkEff: [], recEff: [] }
        return { rotation: r, winRate: avg(d.winRates), sideOutEfficiency: avg(d.soEff), breakPointEfficiency: avg(d.bpEff), attackEfficiency: avg(d.atkEff), receptionEfficiency: avg(d.recEff) }
      })

      // Zonas (heatmap) — agrega ataques e saques por zona 1-6
      const atkZoneMap: Record<number, { kills: number; errors: number; total: number }> = {}
      const serveZoneMap: Record<number, { aces: number; errors: number; total: number }> = {}
      for (const a of allActions) {
        const z = a.zone
        if (!z || z < 1 || z > 6) continue
        if (a.action === 'attack') {
          if (!atkZoneMap[z]) atkZoneMap[z] = { kills: 0, errors: 0, total: 0 }
          atkZoneMap[z].total++
          if (a.subAction === 'kill' || a.subAction === 'tip' || a.subAction === 'block_out') atkZoneMap[z].kills++
          if (a.subAction === 'error') atkZoneMap[z].errors++
        }
        if (a.action === 'serve') {
          if (!serveZoneMap[z]) serveZoneMap[z] = { aces: 0, errors: 0, total: 0 }
          serveZoneMap[z].total++
          if (a.subAction === 'ace') serveZoneMap[z].aces++
          if (a.subAction === 'error') serveZoneMap[z].errors++
        }
      }
      const attackByZone = [1,2,3,4,5,6].map(z => ({ zone: z, ...(atkZoneMap[z] || { kills: 0, errors: 0, total: 0 }) }))
      const serveByZone = [1,2,3,4,5,6].map(z => ({ zone: z, ...(serveZoneMap[z] || { aces: 0, errors: 0, total: 0 }) }))

      return buildStatsOverviewPrompt({
        teamName: soTeam.name,
        totalMatches: soMatches.length,
        wins,
        losses: soMatches.length - wins,
        attackEfficiency,
        receptionEfficiency,
        acePercentage,
        blockKillsPerMatch,
        players: playerData,
        attackByPosition: Object.entries(atkByPos).map(([label, d]) => ({ label, ...d })),
        receptionByPosition: Object.entries(recByPos).map(([label, d]) => ({ label, efficiency: d.total > 0 ? d.perfect / d.total * 100 : 0, total: d.total })),
        setterDistribution,
        rotationStats,
        attackByZone,
        serveByZone,
      })
    }

    default:
      throw new Error(`Prompt builder para "${req.type}" ainda não implementado`)
  }
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export type GenerateResult =
  | { mode: 'cached'; insight: AIInsightResult }
  | { mode: 'streaming'; stream: ReadableStream<Uint8Array>; onComplete: () => Promise<AIInsightResult> }
  | { mode: 'complete'; insight: AIInsightResult }

export async function generateInsight(req: AIGenerateRequest): Promise<GenerateResult> {
  const config = INSIGHT_CONFIG[req.type]
  if (!config) throw new Error(`Tipo de insight desconhecido: ${req.type}`)

  // 1. Check cache
  if (!req.forceRegenerate) {
    const cached = await findCachedInsight(req)
    if (cached) return { mode: 'cached', insight: cached }
  }

  // 2. Rate limit
  if (req.forceRegenerate) {
    checkRateLimit(req)
  }

  // 3. Build prompt
  const prompt = await buildPrompt(req)

  // 4. Route to provider
  if (config.tier === 'A') {
    // Tier A: streaming (Anthropic)
    const { stream, getUsage } = await streamClaude({
      systemPrompt: prompt.systemPrompt,
      userMessage: prompt.userMessage,
      maxTokens: config.maxTokens,
    })

    const onComplete = async (): Promise<AIInsightResult> => {
      const usage = await getUsage()
      const cost = estimateCostBRL(config.provider, usage.inputTokens, usage.outputTokens)
      const totalTokens = usage.inputTokens + usage.outputTokens
      const id = await persistInsight(
        req, prompt.userMessage, usage.fullText,
        config.provider, config.tier, totalTokens, cost
      )
      return {
        id, type: req.type, response: usage.fullText, cached: false,
        createdAt: new Date(), provider: config.provider,
        tokensUsed: totalTokens, costEstimate: cost,
      }
    }

    return { mode: 'streaming', stream, onComplete }
  } else {
    // Tier B: completo (Anthropic)
    const result = await callClaude({
      systemPrompt: prompt.systemPrompt,
      userMessage: prompt.userMessage,
      maxTokens: config.maxTokens,
    })

    const cost = estimateCostBRL(config.provider, result.inputTokens, result.outputTokens)
    const totalTokens = result.inputTokens + result.outputTokens
    const id = await persistInsight(
      req, prompt.userMessage, result.text,
      config.provider, config.tier, totalTokens, cost
    )

    return {
      mode: 'complete',
      insight: {
        id, type: req.type, response: result.text, cached: false,
        createdAt: new Date(), provider: config.provider,
        tokensUsed: totalTokens, costEstimate: cost,
      },
    }
  }
}
