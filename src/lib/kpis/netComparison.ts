/**
 * KPI Cruzado: Comparativo de Redes
 *
 * Analisa a performance do time separando dois cenários:
 * - Levantador na rede (rotações S2, S3, S4)
 * - Oposto na rede (rotações S1, S5, S6)
 *
 * Assume sistema 5-1. Referência: Plano de jogo Minas slide 18,
 * Apostila Gui Novaes slides 7 e 12.
 */

import { PointHistory } from '@/utils/mockData'
import { ScoutAction } from '@/types/scout'

// ============================================================================
// TIPOS
// ============================================================================

export interface AttackStats {
  total: number
  points: number
  errors: number
  blocked: number
  efficiency: number // (points - errors - blocked) / total * 100
}

export interface BlockStats {
  points: number
  errors: number
}

export interface DistributionStats {
  outside: number
  opposite: number
  middle: number
  pipe: number
  total: number
}

export interface NetScenario {
  label: string
  rotations: number[]
  rallies: number
  pointsWon: number
  pointsLost: number
  balance: number
  attack: AttackStats
  block: BlockStats
  sideOutPercentage: number | null
  breakPercentage: number | null
  distribution: DistributionStats | null
}

export interface NetComparison {
  setterFront: NetScenario
  oppositeFront: NetScenario
  summary: string
  hasData: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

const SETTER_FRONT_ROTATIONS = [2, 3, 4]
const OPPOSITE_FRONT_ROTATIONS = [1, 5, 6]

function zoneToDestination(zone: number | undefined): keyof DistributionStats | null {
  if (zone === undefined || zone === null) return null
  switch (zone) {
    case 4: return 'outside'
    case 2: return 'opposite'
    case 3: return 'middle'
    case 1: case 5: case 6: return 'pipe'
    default: return null
  }
}

function createEmptyScenario(label: string, rotations: number[]): NetScenario {
  return {
    label,
    rotations,
    rallies: 0,
    pointsWon: 0,
    pointsLost: 0,
    balance: 0,
    attack: { total: 0, points: 0, errors: 0, blocked: 0, efficiency: 0 },
    block: { points: 0, errors: 0 },
    sideOutPercentage: null,
    breakPercentage: null,
    distribution: null,
  }
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

export function analyzeNetComparison(
  pointHistory: PointHistory[],
  scoutActions?: ScoutAction[]
): NetComparison {
  const setterFront = createEmptyScenario('Levantador na rede', SETTER_FRONT_ROTATIONS)
  const oppositeFront = createEmptyScenario('Oposto na rede', OPPOSITE_FRONT_ROTATIONS)

  if (!pointHistory || pointHistory.length === 0) {
    return { setterFront, oppositeFront, summary: '', hasData: false }
  }

  // Acumuladores para side-out e break
  const soData = { setter: { opp: 0, conv: 0 }, opposite: { opp: 0, conv: 0 } }
  const bkData = { setter: { opp: 0, conv: 0 }, opposite: { opp: 0, conv: 0 } }

  // Processar cada ponto
  pointHistory.forEach((point) => {
    const rot = point.rotation?.home
    if (!rot || rot < 1 || rot > 6) return

    const scenario = SETTER_FRONT_ROTATIONS.includes(rot) ? setterFront : oppositeFront
    const soKey = SETTER_FRONT_ROTATIONS.includes(rot) ? 'setter' : 'opposite'

    scenario.rallies++

    if (point.winner === 'home') {
      scenario.pointsWon++
    } else {
      scenario.pointsLost++
    }

    // Side-out vs Break
    if (point.servingTeam === 'away') {
      soData[soKey].opp++
      if (point.winner === 'home') soData[soKey].conv++
    } else {
      bkData[soKey].opp++
      if (point.winner === 'home') bkData[soKey].conv++
    }
  })

  // Calcular percentuais
  setterFront.balance = setterFront.pointsWon - setterFront.pointsLost
  oppositeFront.balance = oppositeFront.pointsWon - oppositeFront.pointsLost

  setterFront.sideOutPercentage = soData.setter.opp > 0
    ? (soData.setter.conv / soData.setter.opp) * 100 : null
  oppositeFront.sideOutPercentage = soData.opposite.opp > 0
    ? (soData.opposite.conv / soData.opposite.opp) * 100 : null

  setterFront.breakPercentage = bkData.setter.opp > 0
    ? (bkData.setter.conv / bkData.setter.opp) * 100 : null
  oppositeFront.breakPercentage = bkData.opposite.opp > 0
    ? (bkData.opposite.conv / bkData.opposite.opp) * 100 : null

  // Processar ScoutActions para ataque, bloqueio e distribuição
  if (scoutActions && scoutActions.length > 0) {
    // Mapear rallyId → cenário
    const rallyScenarioMap = new Map<string, 'setter' | 'opposite'>()
    pointHistory.forEach((point, idx) => {
      const rot = point.rotation?.home
      if (!rot) return
      const matchId = scoutActions[0]?.matchId ?? 'mock-match'
      const rallyId = `rally-${matchId}-${idx}`
      rallyScenarioMap.set(
        rallyId,
        SETTER_FRONT_ROTATIONS.includes(rot) ? 'setter' : 'opposite'
      )
    })

    // Distribuição
    const dist = {
      setter: { outside: 0, opposite: 0, middle: 0, pipe: 0, total: 0 },
      opposite: { outside: 0, opposite: 0, middle: 0, pipe: 0, total: 0 },
    }

    for (const action of scoutActions) {
      if (!action.rallyId) continue
      const key = rallyScenarioMap.get(action.rallyId)
      if (!key) continue

      const scenario = key === 'setter' ? setterFront : oppositeFront

      if (action.action === 'attack') {
        scenario.attack.total++
        if (action.subAction === 'kill' || action.subAction === 'tip' || action.subAction === 'block_out') scenario.attack.points++
        else if (action.subAction === 'error') scenario.attack.errors++
        else if (action.subAction === 'blocked') scenario.attack.blocked++

        // Distribuição
        const destination = zoneToDestination(action.zone)
        if (destination && destination !== 'total') {
          dist[key][destination]++
          dist[key].total++
        }
      }

      if (action.action === 'block') {
        if (action.subAction === 'kill_block' || action.subAction === 'point') {
          scenario.block.points++
        } else if (action.subAction === 'error') {
          scenario.block.errors++
        }
      }
    }

    // Calcular eficiência de ataque
    for (const scenario of [setterFront, oppositeFront]) {
      if (scenario.attack.total > 0) {
        scenario.attack.efficiency = ((scenario.attack.points - scenario.attack.errors - scenario.attack.blocked) / scenario.attack.total) * 100
      }
    }

    // Atribuir distribuição
    for (const [key, scenario] of [['setter', setterFront], ['opposite', oppositeFront]] as const) {
      const d = dist[key]
      if (d.total > 0) {
        scenario.distribution = { ...d }
      }
    }
  }

  // Gerar frase resumo
  const summary = generateSummary(setterFront, oppositeFront)

  const hasData = setterFront.rallies > 0 || oppositeFront.rallies > 0

  return { setterFront, oppositeFront, summary, hasData }
}

// ============================================================================
// RESUMO AUTOMÁTICO
// ============================================================================

function generateSummary(setter: NetScenario, opposite: NetScenario): string {
  if (setter.rallies === 0 && opposite.rallies === 0) return ''

  const better = setter.balance > opposite.balance ? setter : opposite
  const worse = setter.balance > opposite.balance ? opposite : setter

  if (better.balance === worse.balance) {
    return 'Performance equilibrada em ambos os cenários de rede.'
  }

  const parts: string[] = []
  parts.push(
    `Somos mais fortes com ${better.label.toLowerCase()} (${better.balance > 0 ? '+' : ''}${better.balance} pontos`
  )

  if (better.attack.total > 0) {
    parts[0] += `, ${better.attack.efficiency.toFixed(0)}% ataque`
  }
  parts[0] += ')'

  parts.push(
    `do que com ${worse.label.toLowerCase()} (${worse.balance > 0 ? '+' : ''}${worse.balance} pontos`
  )

  if (worse.attack.total > 0) {
    parts[1] += `, ${worse.attack.efficiency.toFixed(0)}% ataque`
  }
  parts[1] += ').'

  // Sugestão se diferença for significativa
  const diff = Math.abs(better.balance - worse.balance)
  if (diff >= 4) {
    const weakRotations = worse.rotations.map(r => `S${r}`).join(', ')
    parts.push(`Considere ajustar a formação nas rotações ${weakRotations}.`)
  }

  return parts.join(' ')
}
