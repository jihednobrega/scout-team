/**
 * KPI Cruzado: Eficiência de Ataque por Qualidade de Recepção
 *
 * Conecta a recepção com o ataque subsequente no mesmo rally.
 * Separa em três cenários:
 * 1. 1° ataque após recepção boa (A/B)
 * 2. 1° ataque após recepção ruim (C/Erro)
 * 3. Contra-ataque (transição)
 *
 * Usa o campo `rallyId` para agrupar ações do mesmo rally.
 * Fallback: agrupa por sequência temporal dentro do mesmo set.
 */

import { ScoutAction } from '@/types/scout'

// ============================================================================
// TIPOS
// ============================================================================

export interface AttackScenarioStats {
  total: number
  points: number       // kill / ace do ataque
  errors: number       // erro de ataque
  blocked: number      // ataque bloqueado
  efficiency: number   // (points - errors - blocked) / total
  pointPercentage: number // points / total
}

export interface ReceptionAttackAnalysis {
  afterGoodPass: AttackScenarioStats
  afterBadPass: AttackScenarioStats
  counterAttack: AttackScenarioStats
  /** Diferença em pontos percentuais entre recepção boa e ruim */
  conversionDelta: number | null
  /** Formato compatível Data Volley para exportação futura (Fase 3) */
  dataVolleyFormat: {
    afterGoodPass: { err: number; blo: number; ptsPercent: number; total: number }
    afterBadPass: { err: number; blo: number; ptsPercent: number; total: number }
    counterAttack: { err: number; blo: number; ptsPercent: number; total: number }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Recepção boa = passe A (perfect) ou B (positive) */
function isGoodReception(subAction: string): boolean {
  return subAction === 'perfect' || subAction === 'positive'
}

/** Recepção ruim = passe C (negative) ou erro */
function isBadReception(subAction: string): boolean {
  return subAction === 'negative' || subAction === 'overpass' || subAction === 'error'
}

function isReception(action: ScoutAction): boolean {
  return action.action === 'reception'
}

function isAttack(action: ScoutAction): boolean {
  return action.action === 'attack'
}

/** Classifica o resultado do ataque */
function classifyAttackResult(subAction: string): 'point' | 'error' | 'blocked' | 'neutral' {
  switch (subAction) {
    case 'kill': return 'point'
    case 'error': return 'error'
    case 'blocked': return 'blocked'
    default: return 'neutral' // replay, continued
  }
}

function createEmptyStats(): AttackScenarioStats {
  return { total: 0, points: 0, errors: 0, blocked: 0, efficiency: 0, pointPercentage: 0 }
}

function finalizeStats(stats: AttackScenarioStats): AttackScenarioStats {
  if (stats.total === 0) return stats
  stats.efficiency = (stats.points - stats.errors - stats.blocked) / stats.total
  stats.pointPercentage = stats.points / stats.total
  return stats
}

// ============================================================================
// AGRUPAMENTO POR RALLY
// ============================================================================

/**
 * Agrupa ações por rallyId.
 * Se rallyId não estiver disponível, usa fallback temporal:
 * ações do mesmo set entre dois pontos consecutivos.
 */
function groupByRally(actions: ScoutAction[]): ScoutAction[][] {
  // Tenta agrupar por rallyId primeiro
  const hasRallyId = actions.some(a => a.rallyId)

  if (hasRallyId) {
    const rallyMap = new Map<string, ScoutAction[]>()
    for (const action of actions) {
      if (!action.rallyId) continue
      const group = rallyMap.get(action.rallyId) ?? []
      group.push(action)
      rallyMap.set(action.rallyId, group)
    }
    return Array.from(rallyMap.values())
  }

  // Fallback: agrupa por sequência temporal dentro do mesmo set.
  // Cada "rally" termina quando uma ação gera ponto (eficiência +1 ou -1 para kill/ace/error).
  const rallies: ScoutAction[][] = []
  let currentRally: ScoutAction[] = []

  // Ordena por timestamp
  const sorted = [...actions].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  for (const action of sorted) {
    currentRally.push(action)

    // Verifica se a ação encerra o rally
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

  // Último rally se não terminou
  if (currentRally.length > 0) {
    rallies.push(currentRally)
  }

  return rallies
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

/**
 * Analisa a eficiência de ataque por qualidade de recepção.
 *
 * @param actions - Array de ScoutActions (pode ser filtrado por matchId antes)
 * @param matchId - Opcional: filtrar por partida específica
 */
export function analyzeReceptionAttack(
  actions: ScoutAction[],
  matchId?: string
): ReceptionAttackAnalysis {
  // Filtrar por matchId se especificado
  const filtered = matchId
    ? actions.filter(a => a.matchId === matchId)
    : actions

  const afterGoodPass = createEmptyStats()
  const afterBadPass = createEmptyStats()
  const counterAttack = createEmptyStats()

  const rallies = groupByRally(filtered)

  for (const rally of rallies) {
    // Encontrar a primeira recepção do rally
    const firstReception = rally.find(a => isReception(a))

    // Encontrar todos os ataques do rally
    const attacks = rally.filter(a => isAttack(a))

    if (attacks.length === 0) continue

    // Primeiro ataque = o primeiro ataque do rally
    const firstAttack = attacks[0]
    const subsequentAttacks = attacks.slice(1)

    // Classificar o primeiro ataque pelo cenário de recepção
    if (firstReception) {
      const attackResult = classifyAttackResult(firstAttack.subAction)
      const targetStats = isGoodReception(firstReception.subAction)
        ? afterGoodPass
        : isBadReception(firstReception.subAction)
          ? afterBadPass
          : null // Não deveria acontecer, mas safety

      if (targetStats) {
        targetStats.total++
        if (attackResult === 'point') targetStats.points++
        else if (attackResult === 'error') targetStats.errors++
        else if (attackResult === 'blocked') targetStats.blocked++
      }
    }
    // Se não há recepção no rally (ex: rally de break-point),
    // o primeiro ataque é tratado como contra-ataque
    else {
      const attackResult = classifyAttackResult(firstAttack.subAction)
      counterAttack.total++
      if (attackResult === 'point') counterAttack.points++
      else if (attackResult === 'error') counterAttack.errors++
      else if (attackResult === 'blocked') counterAttack.blocked++
    }

    // Ataques subsequentes são sempre contra-ataque (transição)
    for (const attack of subsequentAttacks) {
      const attackResult = classifyAttackResult(attack.subAction)
      counterAttack.total++
      if (attackResult === 'point') counterAttack.points++
      else if (attackResult === 'error') counterAttack.errors++
      else if (attackResult === 'blocked') counterAttack.blocked++
    }
  }

  // Calcular percentuais
  finalizeStats(afterGoodPass)
  finalizeStats(afterBadPass)
  finalizeStats(counterAttack)

  // Delta de conversão
  const conversionDelta = (afterGoodPass.total > 0 && afterBadPass.total > 0)
    ? (afterGoodPass.pointPercentage - afterBadPass.pointPercentage)
    : null

  return {
    afterGoodPass,
    afterBadPass,
    counterAttack,
    conversionDelta,
    dataVolleyFormat: {
      afterGoodPass: {
        err: afterGoodPass.errors,
        blo: afterGoodPass.blocked,
        ptsPercent: afterGoodPass.pointPercentage,
        total: afterGoodPass.total,
      },
      afterBadPass: {
        err: afterBadPass.errors,
        blo: afterBadPass.blocked,
        ptsPercent: afterBadPass.pointPercentage,
        total: afterBadPass.total,
      },
      counterAttack: {
        err: counterAttack.errors,
        blo: counterAttack.blocked,
        ptsPercent: counterAttack.pointPercentage,
        total: counterAttack.total,
      },
    },
  }
}
