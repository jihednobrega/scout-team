/**
 * Converte PointHistory[] (dados mock/histórico) para ScoutAction[]
 * para uso com análises cruzadas que operam sobre ScoutAction.
 */

import { ScoutAction } from '@/types/scout'
import { PointHistory, RallyAction } from './mockData'

/**
 * Gerador pseudoaleatório determinístico simples (para dados mock consistentes).
 * Baseado em um hash do rallyId para reprodutibilidade.
 */
function simpleHash(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0) / 4294967296
}

/** Atribui uma zona de ataque realista baseada na qualidade da recepção do rally */
function getAttackZone(rallyId: string, actionIndex: number, receptionQuality: string | null): number {
  const seed = simpleHash(`${rallyId}-zone-${actionIndex}`)

  // Distribuição varia pela qualidade do passe
  // Passe bom → mais variedade (meio, oposto, ponta, pipe)
  // Passe ruim → mais concentrado na ponta
  if (receptionQuality === 'perfect' || receptionQuality === 'positive') {
    // Passe A/B: distribuição balanceada
    if (seed < 0.35) return 4      // 35% ponta
    if (seed < 0.55) return 2      // 20% oposto
    if (seed < 0.80) return 3      // 25% meio
    return 6                        // 20% pipe
  } else {
    // Passe C/ruim ou contra-ataque: concentrado
    if (seed < 0.50) return 4      // 50% ponta
    if (seed < 0.75) return 2      // 25% oposto
    if (seed < 0.85) return 3      // 10% meio (difícil usar com passe ruim)
    return 6                        // 15% pipe
  }
}

/** Mapa de quality (mockData) → subAction (scout.ts) */
const QUALITY_TO_SUB_ACTION: Record<string, Record<string, string>> = {
  Serve: {
    Ace: 'ace',
    Perfect: 'broken_pass',
    Positive: 'broken_pass',
    Good: 'facilitated',
    Error: 'error',
  },
  Reception: {
    Perfect: 'perfect',
    Positive: 'positive',
    Good: 'positive',
    Negative: 'negative',
    Bad: 'negative',
    Error: 'error',
  },
  Attack: {
    Kill: 'kill',
    Perfect: 'kill',
    Positive: 'replay',
    Good: 'continued',
    Blocked: 'blocked',
    Error: 'error',
  },
  Block: {
    Kill: 'kill_block',
    Perfect: 'kill_block',
    Positive: 'touch',
    Good: 'touch',
    Error: 'error',
  },
  Dig: {
    Perfect: 'perfect',
    Positive: 'positive',
    Good: 'positive',
    Bad: 'bad',
    Error: 'error',
  },
  Set: {
    Perfect: 'perfect',
    Positive: 'positive',
    Good: 'positive',
    Bad: 'negative',
    Error: 'error',
  },
}

/** Mapa de action (mockData) → action (scout.ts) */
const ACTION_TYPE_MAP: Record<string, string> = {
  Serve: 'serve',
  Reception: 'reception',
  Attack: 'attack',
  Block: 'block',
  Dig: 'dig',
  Set: 'set',
}

/**
 * Converte um array de PointHistory em ScoutAction[].
 * Cada rally recebe um rallyId único para agrupamento.
 */
export function convertPointHistoryToScoutActions(
  pointHistory: PointHistory[],
  matchId?: string
): ScoutAction[] {
  const actions: ScoutAction[] = []

  pointHistory.forEach((point, pointIndex) => {
    const rallyId = `rally-${matchId ?? 'match'}-${pointIndex}`
    const baseTimestamp = new Date(2024, 0, 1, 0, 0, pointIndex) // Timestamp sintético

    // Encontrar qualidade da recepção neste rally para inferir zonas de ataque
    const receptionAction = point.rallyActions.find(ra => ra.action === 'Reception')
    const receptionQuality = receptionAction
      ? QUALITY_TO_SUB_ACTION['Reception']?.[receptionAction.quality] ?? null
      : null

    point.rallyActions.forEach((ra: RallyAction, actionIndex: number) => {
      const actionType = ACTION_TYPE_MAP[ra.action]
      if (!actionType) return

      const qualityMap = QUALITY_TO_SUB_ACTION[ra.action]
      const subAction = qualityMap?.[ra.quality] ?? 'error'

      // Atribuir zona para ataques (para análise de distribuição do levantador)
      const zone = actionType === 'attack'
        ? getAttackZone(rallyId, actionIndex, receptionQuality)
        : undefined

      actions.push({
        id: `${rallyId}-${actionIndex}`,
        time: baseTimestamp.toISOString(),
        player: ra.player,
        action: actionType as ScoutAction['action'],
        subAction,
        zone,
        matchId: matchId ?? 'mock-match',
        set: point.set,
        timestamp: new Date(baseTimestamp.getTime() + actionIndex * 1000),
        rallyId,
        phase: point.servingTeam === 'away' ? 'sideout' : 'transition',
      })
    })
  })

  return actions
}
