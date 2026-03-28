/**
 * KPIs de Defesa (Dig)
 */

import { Kpi, DigAction, DigSubAction } from '@/types/volleyball'

export function computeDigKpis(actions: DigAction[]): Kpi[] {
  const totalDigs = actions.length

  if (totalDigs === 0) {
    return getEmptyKpis()
  }

  const digA = actions.filter((a) => a.subAction === DigSubAction.A).length
  const digB = actions.filter((a) => a.subAction === DigSubAction.B).length
  const digC = actions.filter((a) => a.subAction === DigSubAction.C).length
  const errors = actions.filter((a) => a.subAction === DigSubAction.ERROR).length

  const digARate = digA / totalDigs
  const digBRate = digB / totalDigs
  const digCRate = digC / totalDigs
  const errorRate = errors / totalDigs
  const efficiencyIndex = actions.reduce((sum, a) => sum + a.efficiencyValue, 0) / totalDigs

  return [
    {
      key: 'digARate',
      label: 'Defesa A%',
      value: digARate,
      sampleSize: totalDigs,
      explanation: 'Proporção de defesas perfeitas (bola ideal para contra-ataque).',
      formula: 'digA / totalDigs',
      bounds: { min: 0, max: 1, ideal: '> 0.30 (30%)' },
      format: 'percentage',
    },
    {
      key: 'digBRate',
      label: 'Defesa B%',
      value: digBRate,
      sampleSize: totalDigs,
      explanation: 'Proporção de defesas médias (bola jogável).',
      formula: 'digB / totalDigs',
      bounds: { min: 0, max: 1, ideal: '0.30-0.40' },
      format: 'percentage',
    },
    {
      key: 'digCRate',
      label: 'Defesa C%',
      value: digCRate,
      sampleSize: totalDigs,
      explanation: 'Proporção de defesas ruins (limitam contra-ataque).',
      formula: 'digC / totalDigs',
      bounds: { min: 0, max: 1, ideal: '< 0.20 (20%)' },
      format: 'percentage',
    },
    {
      key: 'digErrorRate',
      label: 'Erro de Defesa%',
      value: errorRate,
      sampleSize: totalDigs,
      explanation: 'Proporção de defesas que resultam em erro.',
      formula: 'errors / totalDigs',
      bounds: { min: 0, max: 1, ideal: '< 0.15 (15%)' },
      format: 'percentage',
    },
    {
      key: 'digEfficiency',
      label: 'Índice de Defesa',
      value: efficiencyIndex,
      sampleSize: totalDigs,
      explanation: 'Índice ponderado: A (+1), B (+0.5), C (0), erro (-1).',
      formula: 'Σ efficiencyValue / totalDigs',
      bounds: { min: -1, max: 1, ideal: '> 0.25' },
      format: 'index',
    },
  ]
}

function getEmptyKpis(): Kpi[] {
  return [
    {
      key: 'digARate',
      label: 'Defesa A%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'digA / totalDigs',
      format: 'percentage',
    },
    {
      key: 'digBRate',
      label: 'Defesa B%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'digB / totalDigs',
      format: 'percentage',
    },
    {
      key: 'digCRate',
      label: 'Defesa C%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'digC / totalDigs',
      format: 'percentage',
    },
    {
      key: 'digErrorRate',
      label: 'Erro de Defesa%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'errors / totalDigs',
      format: 'percentage',
    },
    {
      key: 'digEfficiency',
      label: 'Índice de Defesa',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'Σ efficiencyValue / totalDigs',
      format: 'index',
    },
  ]
}

export function computeDigTotals(actions: DigAction[]) {
  return {
    totalDigs: actions.length,
    digA: actions.filter((a) => a.subAction === DigSubAction.A).length,
    digB: actions.filter((a) => a.subAction === DigSubAction.B).length,
    digC: actions.filter((a) => a.subAction === DigSubAction.C).length,
    errors: actions.filter((a) => a.subAction === DigSubAction.ERROR).length,
  }
}
