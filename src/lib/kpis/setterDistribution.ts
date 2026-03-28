/**
 * KPI Cruzado: Distribuição do Levantador por Qualidade de Passe
 *
 * Analisa para onde o levantador distribui as bolas dependendo da
 * qualidade da recepção. Revela padrões táticos.
 *
 * Destino do levantamento é inferido por:
 * 1. Campo `zone` da ação de ataque seguinte no rally
 * 2. Se zona não disponível, marcado como 'unknown'
 *
 * Mapa de zonas → destino:
 * - Zona 4 = Ponta (outside)
 * - Zona 2 = Oposto (opposite)
 * - Zona 3 = Meio (middle)
 * - Zona 1, 5, 6 = Pipe (back row attack)
 */

import { ScoutAction } from '@/types/scout'

// ============================================================================
// TIPOS
// ============================================================================

export type SetDestinationKey = 'outside' | 'opposite' | 'middle' | 'pipe'

export interface DestinationStats {
  count: number
  percentage: number
  /** Eficiência do ataque nesse destino: (points - errors - blocked) / count */
  attackEfficiency: number
  /** % de conversão: points / count */
  attackPointPct: number
  points: number
  errors: number
  blocked: number
}

export interface DistributionBreakdown {
  total: number
  byDestination: Record<SetDestinationKey, DestinationStats>
}

export interface SetterDistributionAnalysis {
  passA: DistributionBreakdown
  passB: DistributionBreakdown
  passC: DistributionBreakdown
  counterAttack: DistributionBreakdown
  /** True se dados de destino (zona) estão disponíveis */
  hasDestinationData: boolean
  /** True se ações de SET estão registradas */
  hasSetActions: boolean
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const DESTINATION_LABELS: Record<SetDestinationKey, string> = {
  outside: 'Ponta',
  opposite: 'Oposto',
  middle: 'Meio',
  pipe: 'Pipe (fundo)',
}

export const DESTINATION_COLORS: Record<SetDestinationKey, string> = {
  outside: '#3B82F6',   // azul
  opposite: '#F97316',  // laranja
  middle: '#22C55E',    // verde
  pipe: '#8B5CF6',      // roxo
}

const DESTINATION_ORDER: SetDestinationKey[] = ['outside', 'opposite', 'middle', 'pipe']

// ============================================================================
// HELPERS
// ============================================================================

/** Mapeia zona da quadra → destino do levantamento */
function zoneToDestination(zone: number | undefined): SetDestinationKey | null {
  if (zone === undefined || zone === null) return null
  // Normalizar zonas adversárias (11-16) para zonas padrão (1-6)
  const normalized = zone > 10 ? zone - 10 : zone
  switch (normalized) {
    case 4: return 'outside'
    case 2: return 'opposite'
    case 3: return 'middle'
    case 1:
    case 5:
    case 6: return 'pipe'
    default: return null
  }
}

function isReception(a: ScoutAction): boolean {
  return a.action === 'reception'
}

function isAttack(a: ScoutAction): boolean {
  return a.action === 'attack'
}

function isSet(a: ScoutAction): boolean {
  return a.action === 'set'
}

function createEmptyBreakdown(): DistributionBreakdown {
  return {
    total: 0,
    byDestination: {
      outside:  { count: 0, percentage: 0, attackEfficiency: 0, attackPointPct: 0, points: 0, errors: 0, blocked: 0 },
      opposite: { count: 0, percentage: 0, attackEfficiency: 0, attackPointPct: 0, points: 0, errors: 0, blocked: 0 },
      middle:   { count: 0, percentage: 0, attackEfficiency: 0, attackPointPct: 0, points: 0, errors: 0, blocked: 0 },
      pipe:     { count: 0, percentage: 0, attackEfficiency: 0, attackPointPct: 0, points: 0, errors: 0, blocked: 0 },
    },
  }
}

function classifyAttackResult(subAction: string): 'point' | 'error' | 'blocked' | 'neutral' {
  switch (subAction) {
    case 'kill': return 'point'
    case 'error': return 'error'
    case 'blocked': return 'blocked'
    default: return 'neutral'
  }
}

function finalizeBreakdown(bd: DistributionBreakdown): void {
  if (bd.total === 0) return
  for (const key of DESTINATION_ORDER) {
    const dest = bd.byDestination[key]
    dest.percentage = dest.count / bd.total
    if (dest.count > 0) {
      dest.attackEfficiency = (dest.points - dest.errors - dest.blocked) / dest.count
      dest.attackPointPct = dest.points / dest.count
    }
  }
}

/** Agrupa ações por rallyId, com fallback temporal */
function groupByRally(actions: ScoutAction[]): ScoutAction[][] {
  const hasRallyId = actions.some(a => a.rallyId)

  if (hasRallyId) {
    const map = new Map<string, ScoutAction[]>()
    for (const action of actions) {
      if (!action.rallyId) continue
      const group = map.get(action.rallyId) ?? []
      group.push(action)
      map.set(action.rallyId, group)
    }
    return Array.from(map.values())
  }

  // Fallback temporal
  const rallies: ScoutAction[][] = []
  let currentRally: ScoutAction[] = []
  const sorted = [...actions].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  for (const action of sorted) {
    currentRally.push(action)
    const isRallyEnder = (
      (action.action === 'attack' && (action.subAction === 'kill' || action.subAction === 'tip' || action.subAction === 'block_out' || action.subAction === 'error')) ||
      (action.action === 'serve' && (action.subAction === 'ace' || action.subAction === 'error')) ||
      (action.action === 'reception' && action.subAction === 'error') ||
      (action.action === 'block' && action.subAction === 'kill_block') ||
      action.action === 'opponent_error'
    )
    if (isRallyEnder) {
      rallies.push(currentRally)
      currentRally = []
    }
  }
  if (currentRally.length > 0) rallies.push(currentRally)
  return rallies
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Analisa a distribuição do levantador por qualidade de recepção.
 */
export function analyzeSetterDistribution(
  actions: ScoutAction[],
  matchId?: string
): SetterDistributionAnalysis {
  const filtered = matchId ? actions.filter(a => a.matchId === matchId) : actions

  const hasSetActions = filtered.some(a => isSet(a))
  let hasDestinationData = false

  const passA = createEmptyBreakdown()
  const passB = createEmptyBreakdown()
  const passC = createEmptyBreakdown()
  const counterAttack = createEmptyBreakdown()

  const rallies = groupByRally(filtered)

  for (const rally of rallies) {
    const firstReception = rally.find(a => isReception(a))
    const attacks = rally.filter(a => isAttack(a))
    const setAction = rally.find(a => isSet(a))

    if (attacks.length === 0) continue

    // Para cada ataque, tentar determinar o destino
    const firstAttack = attacks[0]
    const subsequentAttacks = attacks.slice(1)

    // Destino inferido: prioridade 1 = zona do SET (vem do drawer), prioridade 2 = zona do ataque
    const firstDest = zoneToDestination(setAction?.zone) ?? zoneToDestination(firstAttack.zone)
    if (firstDest) hasDestinationData = true

    // Classificar o primeiro ataque
    if (firstReception && firstDest) {
      const result = classifyAttackResult(firstAttack.subAction)
      let target: DistributionBreakdown

      switch (firstReception.subAction) {
        case 'perfect': target = passA; break
        case 'positive': target = passB; break
        case 'negative':
        case 'overpass':
        case 'error': target = passC; break
        default: target = passC
      }

      target.total++
      target.byDestination[firstDest].count++
      if (result === 'point') target.byDestination[firstDest].points++
      else if (result === 'error') target.byDestination[firstDest].errors++
      else if (result === 'blocked') target.byDestination[firstDest].blocked++
    } else if (!firstReception && firstDest) {
      // Sem recepção = rally de break (contra-ataque)
      const result = classifyAttackResult(firstAttack.subAction)
      counterAttack.total++
      counterAttack.byDestination[firstDest].count++
      if (result === 'point') counterAttack.byDestination[firstDest].points++
      else if (result === 'error') counterAttack.byDestination[firstDest].errors++
      else if (result === 'blocked') counterAttack.byDestination[firstDest].blocked++
    }

    // Ataques subsequentes → contra-ataque
    for (const attack of subsequentAttacks) {
      const dest = zoneToDestination(attack.zone)
      if (!dest) continue
      hasDestinationData = true

      const result = classifyAttackResult(attack.subAction)
      counterAttack.total++
      counterAttack.byDestination[dest].count++
      if (result === 'point') counterAttack.byDestination[dest].points++
      else if (result === 'error') counterAttack.byDestination[dest].errors++
      else if (result === 'blocked') counterAttack.byDestination[dest].blocked++
    }
  }

  // Finalizar percentuais e eficiências
  finalizeBreakdown(passA)
  finalizeBreakdown(passB)
  finalizeBreakdown(passC)
  finalizeBreakdown(counterAttack)

  return {
    passA,
    passB,
    passC,
    counterAttack,
    hasDestinationData,
    hasSetActions,
  }
}
