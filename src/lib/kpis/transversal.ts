/**
 * KPIs Transversais (time/rotação/fase)
 */

import { Kpi, Action, Phase } from '@/types/volleyball'

/**
 * Calcula KPIs por rotação
 */
export function computeRotationKpis(
  actions: Action[],
  pointsFor: Record<number, number>,
  pointsAgainst: Record<number, number>
): Kpi[] {
  const rotations = [1, 2, 3, 4, 5, 6]
  const kpis: Kpi[] = []

  rotations.forEach((rotation) => {
    const rotationActions = actions.filter((a) => a.rotation === rotation)
    const pFor = pointsFor[rotation] || 0
    const pAgainst = pointsAgainst[rotation] || 0
    const balance = pFor - pAgainst
    const rallies = rotationActions.length

    if (rallies > 0) {
      const efficiency =
        rotationActions.reduce((sum, a) => sum + a.efficiencyValue, 0) / rallies

      kpis.push({
        key: `rotation${rotation}Balance`,
        label: `Rotação ${rotation} - Saldo`,
        value: balance,
        sampleSize: rallies,
        explanation: `Saldo de pontos (feitos - sofridos) na rotação ${rotation}.`,
        formula: `pointsFor - pointsAgainst`,
        format: 'integer',
      })

      kpis.push({
        key: `rotation${rotation}Efficiency`,
        label: `Rotação ${rotation} - Eficiência`,
        value: efficiency,
        sampleSize: rallies,
        explanation: `Índice de eficiência média de todas as ações na rotação ${rotation}.`,
        formula: `Σ efficiencyValue / rallies`,
        bounds: { min: -1, max: 1, ideal: '> 0.15' },
        format: 'index',
      })
    }
  })

  return kpis
}

/**
 * Calcula taxa de break-point (pontos sacando)
 */
export function computeBreakPointRate(
  totalRalliesServing: number,
  pointsWhileServing: number
): Kpi {
  const rate = totalRalliesServing > 0 ? pointsWhileServing / totalRalliesServing : 0

  return {
    key: 'breakPointRate',
    label: 'Taxa de Break-Point',
    value: rate,
    sampleSize: totalRalliesServing,
    explanation:
      'Proporção de pontos conquistados quando o time está sacando (posse de saque).',
    formula: 'pointsWhileServing / ralliesServing',
    bounds: { min: 0, max: 1, ideal: '> 0.40 (40%)' },
    format: 'percentage',
  }
}

/**
 * Calcula taxa de side-out (pontos recebendo)
 */
export function computeSideOutRate(
  totalRalliesReceiving: number,
  pointsWhileReceiving: number
): Kpi {
  const rate = totalRalliesReceiving > 0 ? pointsWhileReceiving / totalRalliesReceiving : 0

  return {
    key: 'sideOutRate',
    label: 'Taxa de Side-Out',
    value: rate,
    sampleSize: totalRalliesReceiving,
    explanation:
      'Proporção de pontos conquistados quando o time está recebendo (posse de recepção).',
    formula: 'pointsWhileReceiving / ralliesReceiving',
    bounds: { min: 0, max: 1, ideal: '> 0.55 (55%)' },
    format: 'percentage',
  }
}

/**
 * Calcula taxa de erros não forçados
 */
export function computeUnforcedErrorRate(actions: Action[]): Kpi {
  const totalActions = actions.length

  if (totalActions === 0) {
    return {
      key: 'unforcedErrorRate',
      label: 'Erro Não Forçado%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'unforcedErrors / totalActions',
      format: 'percentage',
    }
  }

  // Erros com efficiency -1.0 (simplificado)
  const errors = actions.filter((a) => a.efficiencyValue === -1.0).length
  const errorRate = errors / totalActions

  return {
    key: 'unforcedErrorRate',
    label: 'Erro Não Forçado%',
    value: errorRate,
    sampleSize: totalActions,
    explanation:
      'Proporção de erros do time sem pressão direta do adversário sobre o total de ações.',
    formula: 'errors / totalActions',
    bounds: { min: 0, max: 1, ideal: '< 0.15 (15%)' },
    format: 'percentage',
  }
}

/**
 * Calcula eficiência global do time
 */
export function computeTeamEfficiency(actions: Action[]): Kpi {
  const totalActions = actions.length

  if (totalActions === 0) {
    return {
      key: 'teamEfficiency',
      label: 'Eficiência Global',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'Σ efficiencyValue / totalActions',
      format: 'index',
    }
  }

  const efficiency = actions.reduce((sum, a) => sum + a.efficiencyValue, 0) / totalActions

  return {
    key: 'teamEfficiency',
    label: 'Eficiência Global',
    value: efficiency,
    sampleSize: totalActions,
    explanation:
      'Índice médio de eficiência considerando todas as ações do time (todos os fundamentos).',
    formula: 'Σ efficiencyValue / totalActions',
    bounds: { min: -1, max: 1, ideal: '> 0.25' },
    format: 'index',
  }
}

/**
 * Calcula todos os KPIs transversais
 */
export function computeTransversalKpis(
  actions: Action[],
  pointsFor: Record<number, number>,
  pointsAgainst: Record<number, number>,
  pointsWhileServing: number,
  pointsWhileReceiving: number
): Kpi[] {
  const servingActions = actions.filter((a) => a.phase === Phase.BREAK)
  const receivingActions = actions.filter((a) => a.phase === Phase.SIDEOUT)

  const rotationKpis = computeRotationKpis(actions, pointsFor, pointsAgainst)
  const breakPointRate = computeBreakPointRate(servingActions.length, pointsWhileServing)
  const sideOutRate = computeSideOutRate(receivingActions.length, pointsWhileReceiving)
  const unforcedErrorRate = computeUnforcedErrorRate(actions)
  const teamEfficiency = computeTeamEfficiency(actions)

  return [...rotationKpis, breakPointRate, sideOutRate, unforcedErrorRate, teamEfficiency]
}
