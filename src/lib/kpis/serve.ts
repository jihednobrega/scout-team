/**
 * KPIs de Saque (Serve)
 * Baseado em metodologias FIVB e Data Volley
 */

import { Kpi, ServeAction, ServeSubAction } from '@/types/volleyball'

export function computeServeKpis(actions: ServeAction[]): Kpi[] {
  const totalServes = actions.length

  if (totalServes === 0) {
    return getEmptyKpis()
  }

  const aces = actions.filter((a) => a.subAction === ServeSubAction.ACE).length
  const efficient = actions.filter((a) => a.subAction === ServeSubAction.EFFICIENT).length
  const neutral = actions.filter((a) => a.subAction === ServeSubAction.NEUTRAL).length
  const errors = actions.filter((a) => a.subAction === ServeSubAction.ERROR).length

  const aceRate = aces / totalServes
  const errorRate = errors / totalServes
  const pressureRate = (aces + efficient) / totalServes
  const efficiencyIndex = actions.reduce((sum, a) => sum + a.efficiencyValue, 0) / totalServes

  return [
    {
      key: 'aceRate',
      label: 'Ace%',
      value: aceRate,
      sampleSize: totalServes,
      explanation: 'Proporção de saques que resultam em ponto direto.',
      formula: 'aces / totalServes',
      bounds: { min: 0, max: 1, ideal: '> 0.10 (10%)' },
      format: 'percentage',
    },
    {
      key: 'serveErrorRate',
      label: 'Erro de Saque%',
      value: errorRate,
      sampleSize: totalServes,
      explanation: 'Proporção de saques que resultam em erro (ponto dado ao adversário).',
      formula: 'errors / totalServes',
      bounds: { min: 0, max: 1, ideal: '< 0.15 (15%)' },
      format: 'percentage',
    },
    {
      key: 'servePressure',
      label: 'Pressão de Saque%',
      value: pressureRate,
      sampleSize: totalServes,
      explanation:
        'Percentual de saques que quebram a recepção adversária (Aces + Saques Eficientes).',
      formula: '(aces + efficient) / totalServes',
      bounds: { min: 0, max: 1, ideal: '> 0.35 (35%)' },
      format: 'percentage',
    },
    {
      key: 'serveEfficiency',
      label: 'Eficiência de Saque',
      value: efficiencyIndex,
      sampleSize: totalServes,
      explanation:
        'Índice ponderado que combina ace (+1), eficiente (+0.5), neutro (0) e erro (-1).',
      formula: 'Σ efficiencyValue / totalServes',
      bounds: { min: -1, max: 1, ideal: '> 0.20' },
      format: 'index',
    },
  ]
}

function getEmptyKpis(): Kpi[] {
  return [
    {
      key: 'aceRate',
      label: 'Ace%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'aces / totalServes',
      format: 'percentage',
    },
    {
      key: 'serveErrorRate',
      label: 'Erro de Saque%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'errors / totalServes',
      format: 'percentage',
    },
    {
      key: 'servePressure',
      label: 'Pressão de Saque%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: '(aces + efficient) / totalServes',
      format: 'percentage',
    },
    {
      key: 'serveEfficiency',
      label: 'Eficiência de Saque',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'Σ efficiencyValue / totalServes',
      format: 'index',
    },
  ]
}

/**
 * Calcula totais para exibição
 */
export function computeServeTotals(actions: ServeAction[]) {
  return {
    totalServes: actions.length,
    aces: actions.filter((a) => a.subAction === ServeSubAction.ACE).length,
    efficient: actions.filter((a) => a.subAction === ServeSubAction.EFFICIENT).length,
    neutral: actions.filter((a) => a.subAction === ServeSubAction.NEUTRAL).length,
    errors: actions.filter((a) => a.subAction === ServeSubAction.ERROR).length,
  }
}
