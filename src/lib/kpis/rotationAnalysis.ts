/**
 * KPI Cruzado: Análise de Performance por Rotação (S1-S6)
 *
 * Mostra como o time performa em cada rotação do levantador.
 * Usa PointHistory para dados de pontuação/rotação e ScoutAction
 * para distribuição ofensiva detalhada.
 */

import { PointHistory } from '@/utils/mockData'
import { ScoutAction } from '@/types/scout'

// ============================================================================
// TIPOS
// ============================================================================

export interface DestinationDetail {
  count: number
  percentage: number
  efficiency: number // (points - errors - blocked) / count
}

export interface RotationDistribution {
  outside: DestinationDetail
  opposite: DestinationDetail
  middle: DestinationDetail
  pipe: DestinationDetail
  total: number
}

export interface RotationStats {
  rotation: number // 1-6
  pointsWon: number
  pointsLost: number
  balance: number
  rallies: number
  sideOutOpportunities: number
  sideOutConverted: number
  sideOutPercentage: number | null
  breakOpportunities: number
  breakConverted: number
  breakPercentage: number | null
  distribution: RotationDistribution | null
}

export interface RotationAnalysisResult {
  rotations: RotationStats[]
  bestRotation: RotationStats | null
  worstRotation: RotationStats | null
  hasData: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

function zoneToDestination(zone: number | undefined): 'outside' | 'opposite' | 'middle' | 'pipe' | null {
  if (zone === undefined || zone === null) return null
  switch (zone) {
    case 4: return 'outside'
    case 2: return 'opposite'
    case 3: return 'middle'
    case 1: case 5: case 6: return 'pipe'
    default: return null
  }
}

function createEmptyDistribution(): RotationDistribution {
  return {
    outside:  { count: 0, percentage: 0, efficiency: 0 },
    opposite: { count: 0, percentage: 0, efficiency: 0 },
    middle:   { count: 0, percentage: 0, efficiency: 0 },
    pipe:     { count: 0, percentage: 0, efficiency: 0 },
    total: 0,
  }
}

function createEmptyRotation(rotation: number): RotationStats {
  return {
    rotation,
    pointsWon: 0,
    pointsLost: 0,
    balance: 0,
    rallies: 0,
    sideOutOpportunities: 0,
    sideOutConverted: 0,
    sideOutPercentage: null,
    breakOpportunities: 0,
    breakConverted: 0,
    breakPercentage: null,
    distribution: null,
  }
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Analisa a performance do time por rotação.
 *
 * @param pointHistory - Histórico de pontos com info de rotação
 * @param scoutActions - Ações de scout para detalhes de distribuição (opcional)
 */
export function analyzeByRotation(
  pointHistory: PointHistory[],
  scoutActions?: ScoutAction[]
): RotationAnalysisResult {
  if (!pointHistory || pointHistory.length === 0) {
    return { rotations: [], bestRotation: null, worstRotation: null, hasData: false }
  }

  // Inicializar stats para cada rotação
  const rotationMap = new Map<number, RotationStats>()
  for (let r = 1; r <= 6; r++) {
    rotationMap.set(r, createEmptyRotation(r))
  }

  // Processar cada ponto do histórico
  pointHistory.forEach((point, pointIndex) => {
    const rot = point.rotation?.home
    if (!rot || rot < 1 || rot > 6) return

    const stats = rotationMap.get(rot)!
    stats.rallies++

    if (point.winner === 'home') {
      stats.pointsWon++
    } else {
      stats.pointsLost++
    }

    // Side-out vs Break
    if (point.servingTeam === 'away') {
      // Time recebendo → oportunidade de side-out
      stats.sideOutOpportunities++
      if (point.winner === 'home') stats.sideOutConverted++
    } else {
      // Time sacando → oportunidade de break
      stats.breakOpportunities++
      if (point.winner === 'home') stats.breakConverted++
    }
  })

  // Calcular distribuição ofensiva por rotação (se ScoutActions disponíveis com zona)
  if (scoutActions && scoutActions.length > 0) {
    // Mapear rallyId → rotação usando pointHistory
    const rallyRotationMap = new Map<string, number>()
    pointHistory.forEach((point, idx) => {
      const rot = point.rotation?.home
      if (!rot) return
      // O rallyId segue o padrão do conversor
      const matchId = scoutActions[0]?.matchId ?? 'mock-match'
      const rallyId = `rally-${matchId}-${idx}`
      rallyRotationMap.set(rallyId, rot)
    })

    // Dados auxiliares para eficiência por destino por rotação
    const rotDistData = new Map<number, {
      outside: { count: number; points: number; errors: number; blocked: number }
      opposite: { count: number; points: number; errors: number; blocked: number }
      middle: { count: number; points: number; errors: number; blocked: number }
      pipe: { count: number; points: number; errors: number; blocked: number }
    }>()

    for (let r = 1; r <= 6; r++) {
      rotDistData.set(r, {
        outside:  { count: 0, points: 0, errors: 0, blocked: 0 },
        opposite: { count: 0, points: 0, errors: 0, blocked: 0 },
        middle:   { count: 0, points: 0, errors: 0, blocked: 0 },
        pipe:     { count: 0, points: 0, errors: 0, blocked: 0 },
      })
    }

    // Processar ataques
    const attacks = scoutActions.filter(a => a.action === 'attack')
    for (const attack of attacks) {
      const dest = zoneToDestination(attack.zone)
      if (!dest || !attack.rallyId) continue

      const rot = rallyRotationMap.get(attack.rallyId)
      if (!rot) continue

      const distData = rotDistData.get(rot)!
      distData[dest].count++
      if (attack.subAction === 'kill' || attack.subAction === 'tip' || attack.subAction === 'block_out') distData[dest].points++
      else if (attack.subAction === 'error') distData[dest].errors++
      else if (attack.subAction === 'blocked') distData[dest].blocked++
    }

    // Converter para RotationDistribution
    for (let r = 1; r <= 6; r++) {
      const data = rotDistData.get(r)!
      const total = data.outside.count + data.opposite.count + data.middle.count + data.pipe.count

      if (total > 0) {
        const dist = createEmptyDistribution()
        dist.total = total

        for (const key of ['outside', 'opposite', 'middle', 'pipe'] as const) {
          const d = data[key]
          dist[key].count = d.count
          dist[key].percentage = d.count / total
          dist[key].efficiency = d.count > 0
            ? (d.points - d.errors - d.blocked) / d.count
            : 0
        }

        rotationMap.get(r)!.distribution = dist
      }
    }
  }

  // Finalizar cálculos
  const rotations: RotationStats[] = []
  for (let r = 1; r <= 6; r++) {
    const stats = rotationMap.get(r)!
    stats.balance = stats.pointsWon - stats.pointsLost
    stats.sideOutPercentage = stats.sideOutOpportunities > 0
      ? stats.sideOutConverted / stats.sideOutOpportunities
      : null
    stats.breakPercentage = stats.breakOpportunities > 0
      ? stats.breakConverted / stats.breakOpportunities
      : null
    rotations.push(stats)
  }

  // Determinar melhor e pior rotação (com pelo menos 2 rallies)
  const withData = rotations.filter(r => r.rallies >= 2)
  const bestRotation = withData.length > 0
    ? withData.reduce((best, r) => r.balance > best.balance ? r : best)
    : null
  const worstRotation = withData.length > 0
    ? withData.reduce((worst, r) => r.balance < worst.balance ? r : worst)
    : null

  return {
    rotations,
    bestRotation,
    worstRotation,
    hasData: rotations.some(r => r.rallies > 0),
  }
}
