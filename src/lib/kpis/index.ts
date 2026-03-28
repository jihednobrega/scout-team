/**
 * Módulo Central de KPIs de Voleibol
 * Agrega todos os fundamentos e fornece funções de relatório
 */

import {
  Action,
  ActionType,
  AnalysisFilters,
  FundamentalAnalysis,
  VolleyballReport,
  ServeAction,
  PassAction,
  AttackAction,
  BlockAction,
  DigAction,
  SetAction,
} from '@/types/volleyball'

import { computeServeKpis, computeServeTotals } from './serve'
import { computePassKpis, computePassTotals } from './pass'
import { computeAttackKpis, computeAttackTotals } from './attack'
import { computeBlockKpis, computeBlockTotals } from './block'
import { computeDigKpis, computeDigTotals } from './dig'
import { computeSetKpis, computeSetTotals } from './set'
import { computeTransversalKpis } from './transversal'

/**
 * Registro central de fundamentos
 */
export const FUNDAMENTALS = {
  [ActionType.SERVE]: {
    label: 'Saque',
    icon: '🏐',
    kpiFn: computeServeKpis,
    totalsFn: computeServeTotals,
  },
  [ActionType.PASS]: {
    label: 'Recepção',
    icon: '🤲',
    kpiFn: computePassKpis,
    totalsFn: computePassTotals,
  },
  [ActionType.ATTACK]: {
    label: 'Ataque',
    icon: '⚡',
    kpiFn: computeAttackKpis,
    totalsFn: computeAttackTotals,
  },
  [ActionType.BLOCK]: {
    label: 'Bloqueio',
    icon: '🛡️',
    kpiFn: computeBlockKpis,
    totalsFn: computeBlockTotals,
  },
  [ActionType.DIG]: {
    label: 'Defesa',
    icon: '🔄',
    kpiFn: computeDigKpis,
    totalsFn: computeDigTotals,
  },
  [ActionType.SET]: {
    label: 'Levantamento',
    icon: '🙌',
    kpiFn: computeSetKpis,
    totalsFn: computeSetTotals,
  },
} as const

/**
 * Filtra ações com base nos filtros fornecidos
 */
export function filterActions(actions: Action[], filters: AnalysisFilters): Action[] {
  let filtered = actions

  if (filters.gameId) {
    filtered = filtered.filter((a) => a.gameId === filters.gameId)
  }

  if (filters.gameIds && filters.gameIds.length > 0) {
    filtered = filtered.filter((a) => filters.gameIds!.includes(a.gameId))
  }

  if (filters.playerId) {
    filtered = filtered.filter((a) => a.playerId === filters.playerId)
  }

  if (filters.teamId) {
    filtered = filtered.filter((a) => a.teamId === filters.teamId)
  }

  if (filters.setNumber !== undefined) {
    filtered = filtered.filter((a) => a.setNumber === filters.setNumber)
  }

  if (filters.rotation !== undefined) {
    filtered = filtered.filter((a) => a.rotation === filters.rotation)
  }

  if (filters.phase) {
    filtered = filtered.filter((a) => a.phase === filters.phase)
  }

  if (filters.startDate) {
    filtered = filtered.filter((a) => a.timestamp >= filters.startDate!)
  }

  if (filters.endDate) {
    filtered = filtered.filter((a) => a.timestamp <= filters.endDate!)
  }

  return filtered
}

/**
 * Analisa um fundamento específico
 */
export function analyzeFundamental(
  actions: Action[],
  fundamental: ActionType
): FundamentalAnalysis {
  const fundamentalActions = actions.filter((a) => a.actionType === fundamental)
  const config = FUNDAMENTALS[fundamental]

  if (!config) {
    throw new Error(`Fundamento desconhecido: ${fundamental}`)
  }

  // Type-casting - TypeScript não infere corretamente com union types
  // @ts-ignore - Garantido pelo filter acima
  const kpis = config.kpiFn(fundamentalActions)
  // @ts-ignore - Garantido pelo filter acima
  const totals = config.totalsFn(fundamentalActions)

  return {
    fundamental,
    totals,
    kpis,
  }
}

/**
 * Gera relatório completo
 */
export function generateReport(
  actions: Action[],
  filters: AnalysisFilters,
  pointsFor: Record<number, number> = {},
  pointsAgainst: Record<number, number> = {},
  pointsWhileServing: number = 0,
  pointsWhileReceiving: number = 0
): VolleyballReport {
  const filteredActions = filterActions(actions, filters)

  // Analisa cada fundamento
  const fundamentals: FundamentalAnalysis[] = Object.keys(FUNDAMENTALS).map((fundamental) =>
    analyzeFundamental(filteredActions, fundamental as ActionType)
  )

  // Calcula KPIs transversais
  const transversalKpis = computeTransversalKpis(
    filteredActions,
    pointsFor,
    pointsAgainst,
    pointsWhileServing,
    pointsWhileReceiving
  )

  return {
    gameId: filters.gameId || 'multiple',
    teamId: filters.teamId || 'unknown',
    filters,
    fundamentals,
    transversalKpis,
    metadata: {
      generatedAt: new Date(),
      methodology: 'Baseado em metodologias FIVB e Data Volley',
      references: [
        'FIVB - Fédération Internationale de Volleyball',
        'Data Volley - Software de análise de voleibol',
        'Coleman, J. (2002). Volleyball Performance Analysis',
        'Mesquita, I., Afonso, J. (2009). Performance Analysis in Volleyball',
      ],
    },
  }
}

/**
 * Formata valor de KPI para exibição
 */
export function formatKpiValue(value: number, format?: string): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '--'
  }

  switch (format) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`
    case 'decimal':
      return value.toFixed(2)
    case 'integer':
      return Math.round(value).toString()
    case 'index':
      return value.toFixed(2)
    default:
      return value.toFixed(2)
  }
}
