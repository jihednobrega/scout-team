// utils/stats.ts
import { ScoutAction, PlayerStats } from '@/types/scout'

/**
 * Calcula estatísticas agregadas para um jogador com base em um array de ações
 */
export const calculatePlayerStats = (
  playerId: string,
  actions: ScoutAction[],
  matchesCount: number = 0
): PlayerStats => {
  // Inicialização
  const stats: PlayerStats = {
    playerId,
    matchesPlayed: matchesCount,
    setsPlayed: 0, 
    points: 0,
    serve: { total: 0, aces: 0, errors: 0, efficiency: 0, rating: 0 },
    reception: { total: 0, perfect: 0, positive: 0, errors: 0, positivity: 0, perfectRate: 0, rating: 0 },
    attack: { total: 0, kills: 0, errors: 0, blocked: 0, efficiency: 0, killRate: 0, rating: 0 },
    block: { total: 0, points: 0, errors: 0, touches: 0, pointsPerSet: 0, rating: 0 },
    defense: { total: 0, perfect: 0, positive: 0, errors: 0, efficiency: 0, rating: 0 },
    set: { total: 0, perfect: 0, errors: 0, rating: 0 },
  }

  // Filtrar ações do jogador
  const playerActions = actions.filter((a) => a.player === playerId)

  // Contar sets jogados (únicos valores de set encontrados nas ações)
  const setsPlayed = new Set(playerActions.map(a => `${a.matchId}-${a.set}`)).size
  stats.setsPlayed = setsPlayed > 0 ? setsPlayed : 1 // Fallback

  // Pré-computar distribuição do levantador: agrupar ações por rallyId
  const distribution = { ponteiro: 0, central: 0, oposto: 0, pipe: 0 }
  const rallyGroups = new Map<string, ScoutAction[]>()
  for (const a of actions) {
    if (a.rallyId) {
      if (!rallyGroups.has(a.rallyId)) rallyGroups.set(a.rallyId, [])
      rallyGroups.get(a.rallyId)!.push(a)
    }
  }

  // Para cada set do levantador, encontrar o ataque subsequente no mesmo rally
  for (const action of playerActions) {
    if (action.action !== 'set' || !action.rallyId) continue
    const rallyActions = rallyGroups.get(action.rallyId)
    if (!rallyActions) continue
    // Ordenar por timestamp e encontrar primeiro attack após o set
    const sorted = rallyActions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const setIdx = sorted.findIndex(a => a.id === action.id)
    const nextAttack = sorted.slice(setIdx + 1).find(a => a.action === 'attack')
    if (!nextAttack || !nextAttack.zone) continue
    // Mapear zona do ataque → posição alvo
    const zone = nextAttack.zone
    if (zone === 4) distribution.ponteiro++
    else if (zone === 3) distribution.central++
    else if (zone === 2) distribution.oposto++
    else if (zone === 1 || zone === 5 || zone === 6) distribution.pipe++
  }

  playerActions.forEach((action) => {
    switch (action.action) {
      case 'serve':
        stats.serve.total++
        if (action.subAction === 'ace') {
          stats.serve.aces++
          stats.points++
        }
        if (action.subAction === 'error') stats.serve.errors++
        break

      case 'reception':
        stats.reception.total++
        // perfect (A) or excellent
        if (action.subAction === 'perfect' || action.subAction === 'excellent') {
           stats.reception.perfect++
        }
        // positive (B) or good
        if (action.subAction === 'positive' || action.subAction === 'good') {
           stats.reception.positive++
        }
        if (action.subAction === 'error') stats.reception.errors++
        break

      case 'attack':
        stats.attack.total++
        if (action.subAction === 'kill' || action.subAction === 'tip' || action.subAction === 'block_out') {
          stats.attack.kills++
          stats.points++
        }
        if (action.subAction === 'error') stats.attack.errors++
        if (action.subAction === 'blocked') stats.attack.blocked++
        break

      case 'block':
        stats.block.total++
        if (action.subAction === 'kill_block' || action.subAction === 'point') {
          stats.block.points++
          stats.points++
        }
        if (action.subAction === 'error') stats.block.errors++
        if (action.subAction === 'touch') stats.block.touches++
        break

      case 'dig':
        stats.defense.total++
        if (action.subAction === 'perfect' || action.subAction === 'excellent') stats.defense.perfect++
        if (action.subAction === 'positive' || action.subAction === 'good') stats.defense.positive++
        if (action.subAction === 'error') stats.defense.errors++
        break

      case 'set':
        stats.set.total++
        if (action.subAction === 'perfect' || action.subAction === 'excellent') stats.set.perfect++
        if (action.subAction === 'error') stats.set.errors++
        break
    }
  })

  // Cálculos de Eficiência

  // Serve: (Aces - Errors) / Total
  if (stats.serve.total > 0) {
    stats.serve.efficiency = (stats.serve.aces - stats.serve.errors) / stats.serve.total
    // Rating mock: (Efficiency + 1) * 50 to map -1..1 to 0..100 roughly
    stats.serve.rating = Math.max(0, Math.min(100, (stats.serve.efficiency + 0.5) * 80))
  }

  // Reception: Positivity (Perfect + Positive) / Total
  if (stats.reception.total > 0) {
    stats.reception.positivity = (stats.reception.perfect + stats.reception.positive) / stats.reception.total
    stats.reception.perfectRate = stats.reception.perfect / stats.reception.total
    stats.reception.rating = stats.reception.positivity * 100
  }

  // Attack: Efficiency (Kills - Errors - Blocked) / Total
  if (stats.attack.total > 0) {
    stats.attack.efficiency = (stats.attack.kills - stats.attack.errors - stats.attack.blocked) / stats.attack.total
    stats.attack.killRate = stats.attack.kills / stats.attack.total
    // Rating: killRate is more important visually usually, but efficiency is better stat
    stats.attack.rating = Math.max(0, Math.min(100, stats.attack.killRate * 100 + stats.attack.efficiency * 20))
  }

  // Block: Points per Set
  if (stats.setsPlayed > 0) {
    stats.block.pointsPerSet = stats.block.points / stats.setsPlayed
    // Rating: 0.8 blocks/set is very high level.
    stats.block.rating = Math.min(100, (stats.block.pointsPerSet / 1.0) * 100)
  }

  // Defense: Efficiency (Perfect + Good) / Total
  if (stats.defense.total > 0) {
    stats.defense.efficiency = (stats.defense.perfect + stats.defense.positive) / stats.defense.total
    stats.defense.rating = stats.defense.efficiency * 100
  }
  
  // Set
  if (stats.set.total > 0) {
    stats.set.rating = (stats.set.perfect / stats.set.total) * 100
  }

  // Distribuição do levantador
  const totalDist = distribution.ponteiro + distribution.central + distribution.oposto + distribution.pipe
  if (totalDist > 0) {
    stats.set.distribution = distribution
  }

  return stats
}

// ============================================================================
// V-P (Vencidos - Perdidos): Saldo de pontos por jogador
// ============================================================================

export interface VPBreakdown {
  aces: number
  kills: number
  blockPoints: number
  serveErrors: number
  attackErrors: number
  attackBlocked: number
  receptionErrors: number
  blockErrors: number
}

export interface PlayerVP {
  pointsWon: number
  pointsLost: number
  balance: number
  breakdown: VPBreakdown
}

/**
 * Calcula o saldo de pontos (V-P) de um jogador.
 * V-P = pontos gerados diretamente − pontos perdidos diretamente.
 *
 * Pontos gerados: aces, kills (ataque), pontos de bloqueio
 * Pontos perdidos: erros de saque, erros de ataque, ataques bloqueados,
 *                  erros de recepção, erros de bloqueio
 */
export function calculatePlayerVP(
  actions: ScoutAction[],
  playerId: string
): PlayerVP {
  const breakdown: VPBreakdown = {
    aces: 0,
    kills: 0,
    blockPoints: 0,
    serveErrors: 0,
    attackErrors: 0,
    attackBlocked: 0,
    receptionErrors: 0,
    blockErrors: 0,
  }

  const playerActions = actions.filter((a) => a.player === playerId)

  for (const action of playerActions) {
    switch (action.action) {
      case 'serve':
        if (action.subAction === 'ace') breakdown.aces++
        if (action.subAction === 'error') breakdown.serveErrors++
        break
      case 'attack':
        if (action.subAction === 'kill' || action.subAction === 'tip' || action.subAction === 'block_out') breakdown.kills++
        if (action.subAction === 'error') breakdown.attackErrors++
        if (action.subAction === 'blocked') breakdown.attackBlocked++
        break
      case 'block':
        if (action.subAction === 'kill_block' || action.subAction === 'point') breakdown.blockPoints++
        if (action.subAction === 'error') breakdown.blockErrors++
        break
      case 'reception':
        if (action.subAction === 'error') breakdown.receptionErrors++
        break
    }
  }

  const pointsWon = breakdown.aces + breakdown.kills + breakdown.blockPoints
  const pointsLost =
    breakdown.serveErrors +
    breakdown.attackErrors +
    breakdown.attackBlocked +
    breakdown.receptionErrors +
    breakdown.blockErrors

  return {
    pointsWon,
    pointsLost,
    balance: pointsWon - pointsLost,
    breakdown,
  }
}

/**
 * Formata o saldo V-P com sinal: "+13", "-3", "0"
 */
export function formatVP(balance: number): string {
  if (balance > 0) return `+${balance}`
  return `${balance}`
}

/**
 * Calcula V-P a partir de PlayerStats já calculados.
 * Útil quando não se tem acesso às ações raw (ex: dados mock).
 */
export function calculateVPFromStats(stats: PlayerStats): PlayerVP {
  const breakdown: VPBreakdown = {
    aces: stats.serve.aces,
    kills: stats.attack.kills,
    blockPoints: stats.block.points,
    serveErrors: stats.serve.errors,
    attackErrors: stats.attack.errors,
    attackBlocked: stats.attack.blocked,
    receptionErrors: stats.reception.errors,
    blockErrors: stats.block.errors,
  }

  const pointsWon = breakdown.aces + breakdown.kills + breakdown.blockPoints
  const pointsLost =
    breakdown.serveErrors +
    breakdown.attackErrors +
    breakdown.attackBlocked +
    breakdown.receptionErrors +
    breakdown.blockErrors

  return {
    pointsWon,
    pointsLost,
    balance: pointsWon - pointsLost,
    breakdown,
  }
}

// ============================================================================
// NOTA DE PERFORMANCE (Rating)
// ============================================================================

/**
 * Mapeamento scout.ts sub-actions → efficiency values.
 * Alinhado com EFFICIENCY_VALUES do volleyball.ts via actionLabels.ts.
 */
const SCOUT_EFFICIENCY: Record<string, Record<string, number>> = {
  serve:     { ace: 1.0, broken_pass: 0.5, overpass: 0.5, facilitated: 0.0, error: -1.0 },
  reception: { perfect: 1.0, positive: 0.5, negative: 0.0, overpass: -1.0, error: -1.0 },
  attack:    { kill: 1.0, tip: 1.0, block_out: 1.0, replay: 0.5, continued: 0.0, blocked: -0.5, error: -1.0 },
  block:     { kill_block: 1.0, point: 1.0, touch: 0.5, error: -1.0 },
  dig:       { perfect: 1.0, positive: 0.5, bad: 0.0, error: -1.0 },
  set:       { perfect: 1.0, positive: 0.5, negative: 0.0, error: -1.0 },
}

export interface FundamentalRating {
  technical: number  // -1.0 a +1.0
  friendly: number   // 0 a 10
  count: number
}

export interface PlayerRating {
  /** Eficiência média (-1.0 a +1.0) */
  technicalRating: number
  /** Nota amigável (0 a 10) */
  friendlyRating: number
  /** Total de ações consideradas */
  totalActions: number
  /** Nota por fundamento */
  ratingByFundamental: Record<string, FundamentalRating>
}

/** Converte eficiência técnica (-1..+1) para nota amigável (0..10) */
function technicalToFriendly(technical: number): number {
  return Math.round(((technical + 1) * 5) * 10) / 10
}

/**
 * Calcula a nota de performance de um jogador a partir das ações raw.
 * Considera TODAS as ações (um líbero que recebe e defende bem terá nota alta).
 */
export function calculatePlayerRating(
  actions: ScoutAction[],
  playerId: string
): PlayerRating {
  const playerActions = actions.filter((a) => a.player === playerId)

  const fundamentalSums: Record<string, { sum: number; count: number }> = {}
  let totalSum = 0
  let totalCount = 0

  for (const action of playerActions) {
    const effMap = SCOUT_EFFICIENCY[action.action]
    if (!effMap) continue
    const eff = effMap[action.subAction]
    if (eff === undefined) continue

    totalSum += eff
    totalCount++

    if (!fundamentalSums[action.action]) {
      fundamentalSums[action.action] = { sum: 0, count: 0 }
    }
    fundamentalSums[action.action].sum += eff
    fundamentalSums[action.action].count++
  }

  const technicalRating = totalCount > 0 ? totalSum / totalCount : 0
  const friendlyRating = technicalToFriendly(technicalRating)

  const ratingByFundamental: Record<string, FundamentalRating> = {}
  for (const [fund, data] of Object.entries(fundamentalSums)) {
    const tech = data.count > 0 ? data.sum / data.count : 0
    ratingByFundamental[fund] = {
      technical: Math.round(tech * 100) / 100,
      friendly: technicalToFriendly(tech),
      count: data.count,
    }
  }

  return {
    technicalRating: Math.round(technicalRating * 100) / 100,
    friendlyRating,
    totalActions: totalCount,
    ratingByFundamental,
  }
}

/**
 * Calcula rating a partir de PlayerStats já calculados.
 * Reconstrói a eficiência média ponderada por volume de ações.
 */
export function calculateRatingFromStats(stats: PlayerStats): PlayerRating {
  const fundamentals: Array<{ key: string; efficiency: number; count: number }> = []

  if (stats.serve.total > 0) {
    fundamentals.push({ key: 'serve', efficiency: stats.serve.efficiency, count: stats.serve.total })
  }
  if (stats.reception.total > 0) {
    // Positividade (0..1) → técnico (-1..+1): mapear linearmente
    // perfect=1, positive=0.5, negative=0, error=-1
    // A positividade já é (perfect+positive)/total, que desconsidera error weight
    // Melhor: recalcular a partir das contagens
    const recSum = stats.reception.perfect * 1.0 + stats.reception.positive * 0.5 + stats.reception.errors * -1.0
    const recTotal = stats.reception.total
    fundamentals.push({ key: 'reception', efficiency: recSum / recTotal, count: recTotal })
  }
  if (stats.attack.total > 0) {
    fundamentals.push({ key: 'attack', efficiency: stats.attack.efficiency, count: stats.attack.total })
  }
  if (stats.block.total > 0) {
    const blkSum = stats.block.points * 1.0 + stats.block.touches * 0.5 + stats.block.errors * -1.0
    const blkTotal = stats.block.total
    fundamentals.push({ key: 'block', efficiency: blkSum / blkTotal, count: blkTotal })
  }
  if (stats.defense.total > 0) {
    const defSum = stats.defense.perfect * 1.0 + stats.defense.positive * 0.5 + stats.defense.errors * -1.0
    const defTotal = stats.defense.total
    fundamentals.push({ key: 'dig', efficiency: defSum / defTotal, count: defTotal })
  }
  if (stats.set.total > 0) {
    const setSum = stats.set.perfect * 1.0 + stats.set.errors * -1.0
    const setNeutral = stats.set.total - stats.set.perfect - stats.set.errors
    const setTotal = stats.set.total
    fundamentals.push({ key: 'set', efficiency: (setSum + setNeutral * 0.25) / setTotal, count: setTotal })
  }

  let weightedSum = 0
  let totalCount = 0
  const ratingByFundamental: Record<string, FundamentalRating> = {}

  for (const f of fundamentals) {
    const clamped = Math.max(-1, Math.min(1, f.efficiency))
    weightedSum += clamped * f.count
    totalCount += f.count
    ratingByFundamental[f.key] = {
      technical: Math.round(clamped * 100) / 100,
      friendly: technicalToFriendly(clamped),
      count: f.count,
    }
  }

  const technicalRating = totalCount > 0 ? weightedSum / totalCount : 0
  return {
    technicalRating: Math.round(technicalRating * 100) / 100,
    friendlyRating: technicalToFriendly(technicalRating),
    totalActions: totalCount,
    ratingByFundamental,
  }
}

/**
 * Cor hex para a nota amigável (0-10).
 */
export function getRatingColor(friendlyRating: number): string {
  if (friendlyRating >= 7.0) return '#22C55E'  // verde — ótimo
  if (friendlyRating >= 5.5) return '#3B82F6'  // azul — bom
  if (friendlyRating >= 4.0) return '#EAB308'  // amarelo — regular
  return '#EF4444'                               // vermelho — ruim
}

/**
 * Nome Chakra para a nota amigável.
 */
export function getRatingChakraColor(friendlyRating: number): string {
  if (friendlyRating >= 7.0) return 'green.300'
  if (friendlyRating >= 5.5) return 'blue.300'
  if (friendlyRating >= 4.0) return 'yellow.300'
  return 'red.300'
}

export const formatPercentage = (value: number): string => {
  return `${Math.round(value * 100)}%`
}

export const formatNumber = (value: number, decimals: number = 1): string => {
  return value.toFixed(decimals)
}
