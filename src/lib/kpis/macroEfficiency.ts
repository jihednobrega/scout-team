/**
 * KPI Macro: Eficiência de Side-Out, Break, e Razões
 *
 * Métricas de time que contextualizam a performance geral
 * com referências profissionais (bom/ruim).
 *
 * Usa PointHistory[] para dados de pontuação (servingTeam + winner)
 * e ScoutAction[] para contagens de saques/recepções.
 */

import { PointHistory } from '@/utils/mockData'
import { ScoutAction } from '@/types/scout'

// ============================================================================
// TIPOS
// ============================================================================

export type EfficiencyRating = 'excelente' | 'bom' | 'regular' | 'ruim'

export interface RatedMetric {
  percentage: number
  pointsWon: number
  totalRallies: number
  rating: EfficiencyRating
  ratingColor: string
}

export interface RatioMetric {
  value: number | null // null se divisão por zero
  numerator: number
  denominator: number
  isGood: boolean // true se abaixo do threshold "bom"
}

export interface MacroEfficiency {
  sideOut: RatedMetric
  breakPoint: RatedMetric
  serveToBreakRatio: RatioMetric
  receptionToSideOutRatio: RatioMetric
  hasData: boolean
}

// ============================================================================
// RATINGS
// ============================================================================

const RATING_COLORS: Record<EfficiencyRating, string> = {
  excelente: '#22C55E',
  bom: '#3B82F6',
  regular: '#EAB308',
  ruim: '#EF4444',
}

export function getSideOutRating(percentage: number): EfficiencyRating {
  if (percentage >= 60) return 'excelente'
  if (percentage >= 55) return 'bom'
  if (percentage >= 48) return 'regular'
  return 'ruim'
}

export function getBreakRating(percentage: number): EfficiencyRating {
  if (percentage >= 45) return 'excelente'
  if (percentage >= 40) return 'bom'
  if (percentage >= 33) return 'regular'
  return 'ruim'
}

/** Thresholds para a barra de referência visual */
export const SIDE_OUT_THRESHOLDS = [
  { label: 'Ruim', max: 48, color: '#EF4444' },
  { label: 'Regular', max: 55, color: '#EAB308' },
  { label: 'Bom', max: 60, color: '#3B82F6' },
  { label: 'Excelente', max: 100, color: '#22C55E' },
]

export const BREAK_THRESHOLDS = [
  { label: 'Ruim', max: 33, color: '#EF4444' },
  { label: 'Regular', max: 40, color: '#EAB308' },
  { label: 'Bom', max: 45, color: '#3B82F6' },
  { label: 'Excelente', max: 100, color: '#22C55E' },
]

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Calcula métricas macro de eficiência do time.
 *
 * @param pointHistory - Histórico de pontos (com servingTeam e winner)
 * @param scoutActions - Ações de scout (para contar saques e recepções)
 */
export function calculateMacroEfficiency(
  pointHistory: PointHistory[],
  scoutActions?: ScoutAction[],
): MacroEfficiency {
  if (!pointHistory || pointHistory.length === 0) {
    return {
      sideOut: { percentage: 0, pointsWon: 0, totalRallies: 0, rating: 'ruim', ratingColor: RATING_COLORS.ruim },
      breakPoint: { percentage: 0, pointsWon: 0, totalRallies: 0, rating: 'ruim', ratingColor: RATING_COLORS.ruim },
      serveToBreakRatio: { value: null, numerator: 0, denominator: 0, isGood: false },
      receptionToSideOutRatio: { value: null, numerator: 0, denominator: 0, isGood: false },
      hasData: false,
    }
  }

  // ---- Side-Out e Break a partir do PointHistory ----
  let sideOutOpportunities = 0
  let sideOutConverted = 0
  let breakOpportunities = 0
  let breakConverted = 0

  for (const point of pointHistory) {
    if (point.servingTeam === 'away') {
      // Time está recebendo → oportunidade de side-out
      sideOutOpportunities++
      if (point.winner === 'home') sideOutConverted++
    } else {
      // Time está sacando → oportunidade de break
      breakOpportunities++
      if (point.winner === 'home') breakConverted++
    }
  }

  const sideOutPct = sideOutOpportunities > 0
    ? (sideOutConverted / sideOutOpportunities) * 100
    : 0
  const breakPct = breakOpportunities > 0
    ? (breakConverted / breakOpportunities) * 100
    : 0

  const sideOutRating = getSideOutRating(sideOutPct)
  const breakRating = getBreakRating(breakPct)

  // ---- Razões (saques e recepções) ----
  let totalServes = 0
  let totalReceptions = 0

  if (scoutActions) {
    totalServes = scoutActions.filter(a => a.action === 'serve').length
    totalReceptions = scoutActions.filter(a => a.action === 'reception').length
  } else {
    // Estimativa: cada rally de break começa com 1 saque nosso
    totalServes = breakOpportunities
    // Estimativa: cada rally de side-out começa com 1 recepção nossa
    totalReceptions = sideOutOpportunities
  }

  const serveToBreak: RatioMetric = {
    value: breakConverted > 0 ? totalServes / breakConverted : null,
    numerator: totalServes,
    denominator: breakConverted,
    isGood: breakConverted > 0 ? (totalServes / breakConverted) <= 5 : false,
  }

  const receptionToSideOut: RatioMetric = {
    value: sideOutConverted > 0 ? totalReceptions / sideOutConverted : null,
    numerator: totalReceptions,
    denominator: sideOutConverted,
    isGood: sideOutConverted > 0 ? (totalReceptions / sideOutConverted) <= 2 : false,
  }

  return {
    sideOut: {
      percentage: sideOutPct,
      pointsWon: sideOutConverted,
      totalRallies: sideOutOpportunities,
      rating: sideOutRating,
      ratingColor: RATING_COLORS[sideOutRating],
    },
    breakPoint: {
      percentage: breakPct,
      pointsWon: breakConverted,
      totalRallies: breakOpportunities,
      rating: breakRating,
      ratingColor: RATING_COLORS[breakRating],
    },
    serveToBreakRatio: serveToBreak,
    receptionToSideOutRatio: receptionToSideOut,
    hasData: true,
  }
}
