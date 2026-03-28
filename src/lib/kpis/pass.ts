/**
 * KPIs de Recepção (Pass)
 * Baseado em metodologias FIVB e Data Volley
 */

import { Kpi, PassAction, PassSubAction } from '@/types/volleyball'

export function computePassKpis(actions: PassAction[]): Kpi[] {
  const totalPasses = actions.length

  if (totalPasses === 0) {
    return getEmptyKpis()
  }

  const passA = actions.filter((a) => a.subAction === PassSubAction.A).length
  const passB = actions.filter((a) => a.subAction === PassSubAction.B).length
  const passC = actions.filter((a) => a.subAction === PassSubAction.C).length
  const errors = actions.filter((a) => a.subAction === PassSubAction.ERROR).length

  const passARate = passA / totalPasses
  const passBRate = passB / totalPasses
  const passCRate = passC / totalPasses
  const errorRate = errors / totalPasses
  const efficiencyIndex = actions.reduce((sum, a) => sum + a.efficiencyValue, 0) / totalPasses
  const perfectPassRate = passARate // Alias para recepção perfeita

  return [
    {
      key: 'passARate',
      label: 'Recepção A%',
      value: passARate,
      sampleSize: totalPasses,
      explanation: 'Proporção de recepções perfeitas (bola ideal para o levantador).',
      formula: 'passA / totalPasses',
      bounds: { min: 0, max: 1, ideal: '> 0.40 (40%)' },
      format: 'percentage',
    },
    {
      key: 'passBRate',
      label: 'Recepção B%',
      value: passBRate,
      sampleSize: totalPasses,
      explanation: 'Proporção de recepções médias (bola jogável mas não ideal).',
      formula: 'passB / totalPasses',
      bounds: { min: 0, max: 1, ideal: '0.30-0.40' },
      format: 'percentage',
    },
    {
      key: 'passCRate',
      label: 'Recepção C%',
      value: passCRate,
      sampleSize: totalPasses,
      explanation: 'Proporção de recepções ruins (limitam opções de ataque).',
      formula: 'passC / totalPasses',
      bounds: { min: 0, max: 1, ideal: '< 0.15 (15%)' },
      format: 'percentage',
    },
    {
      key: 'passErrorRate',
      label: 'Erro de Recepção%',
      value: errorRate,
      sampleSize: totalPasses,
      explanation: 'Proporção de recepções que resultam em erro direto (ponto adversário).',
      formula: 'errors / totalPasses',
      bounds: { min: 0, max: 1, ideal: '< 0.10 (10%)' },
      format: 'percentage',
    },
    {
      key: 'passEfficiency',
      label: 'Índice de Recepção',
      value: efficiencyIndex,
      sampleSize: totalPasses,
      explanation:
        'Índice ponderado que mede a qualidade média da recepção (A=+1, B=+0.5, C=0, Erro=-1).',
      formula: 'Σ efficiencyValue / totalPasses',
      bounds: { min: -1, max: 1, ideal: '> 0.30' },
      format: 'index',
    },
    {
      key: 'perfectPassRate',
      label: 'Taxa de Passes Perfeitos',
      value: perfectPassRate,
      sampleSize: totalPasses,
      explanation: 'Mesmo que Recepção A% - recepções que geram todas as opções de ataque.',
      formula: 'passA / totalPasses',
      bounds: { min: 0, max: 1, ideal: '> 0.40 (40%)' },
      format: 'percentage',
    },
  ]
}

function getEmptyKpis(): Kpi[] {
  return [
    {
      key: 'passARate',
      label: 'Recepção A%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'passA / totalPasses',
      format: 'percentage',
    },
    {
      key: 'passBRate',
      label: 'Recepção B%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'passB / totalPasses',
      format: 'percentage',
    },
    {
      key: 'passCRate',
      label: 'Recepção C%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'passC / totalPasses',
      format: 'percentage',
    },
    {
      key: 'passErrorRate',
      label: 'Erro de Recepção%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'errors / totalPasses',
      format: 'percentage',
    },
    {
      key: 'passEfficiency',
      label: 'Índice de Recepção',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'Σ efficiencyValue / totalPasses',
      format: 'index',
    },
  ]
}

export function computePassTotals(actions: PassAction[]) {
  return {
    totalPasses: actions.length,
    passA: actions.filter((a) => a.subAction === PassSubAction.A).length,
    passB: actions.filter((a) => a.subAction === PassSubAction.B).length,
    passC: actions.filter((a) => a.subAction === PassSubAction.C).length,
    errors: actions.filter((a) => a.subAction === PassSubAction.ERROR).length,
  }
}
