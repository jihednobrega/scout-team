/**
 * KPIs de Bloqueio (Block)
 */

import { Kpi, BlockAction, BlockSubAction } from '@/types/volleyball'

export function computeBlockKpis(actions: BlockAction[]): Kpi[] {
  const totalBlocks = actions.length

  if (totalBlocks === 0) {
    return getEmptyKpis()
  }

  const points = actions.filter((a) => a.subAction === BlockSubAction.POINT).length
  const deflects = actions.filter((a) => a.subAction === BlockSubAction.DEFLECT).length
  const badTouches = actions.filter((a) => a.subAction === BlockSubAction.BAD_TOUCH).length
  const errors = actions.filter((a) => a.subAction === BlockSubAction.ERROR).length

  const pointRate = points / totalBlocks
  const errorRate = errors / totalBlocks
  const deflectRate = deflects / totalBlocks
  const efficiencyIndex = actions.reduce((sum, a) => sum + a.efficiencyValue, 0) / totalBlocks

  return [
    {
      key: 'blockPointRate',
      label: 'Pontos de Bloqueio%',
      value: pointRate,
      sampleSize: totalBlocks,
      explanation: 'Proporção de bloqueios que resultam em ponto direto.',
      formula: 'blockPoints / totalBlocks',
      bounds: { min: 0, max: 1, ideal: '> 0.30 (30%)' },
      format: 'percentage',
    },
    {
      key: 'blockDeflectRate',
      label: 'Taxa de Amortecimento',
      value: deflectRate,
      sampleSize: totalBlocks,
      explanation:
        'Proporção de bloqueios que amortecem a bola, gerando oportunidade de contra-ataque.',
      formula: 'deflects / totalBlocks',
      bounds: { min: 0, max: 1, ideal: '> 0.25 (25%)' },
      format: 'percentage',
    },
    {
      key: 'blockErrorRate',
      label: 'Erro de Bloqueio%',
      value: errorRate,
      sampleSize: totalBlocks,
      explanation: 'Proporção de bloqueios que resultam em erro (toque na rede, invasão, etc).',
      formula: 'errors / totalBlocks',
      bounds: { min: 0, max: 1, ideal: '< 0.15 (15%)' },
      format: 'percentage',
    },
    {
      key: 'blockEfficiency',
      label: 'Índice de Bloqueio',
      value: efficiencyIndex,
      sampleSize: totalBlocks,
      explanation: 'Índice: ponto (+1), amortece (+0.5), toque ruim (-0.5), erro (-1).',
      formula: 'Σ efficiencyValue / totalBlocks',
      bounds: { min: -1, max: 1, ideal: '> 0.20' },
      format: 'index',
    },
  ]
}

function getEmptyKpis(): Kpi[] {
  return [
    {
      key: 'blockPointRate',
      label: 'Pontos de Bloqueio%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'blockPoints / totalBlocks',
      format: 'percentage',
    },
    {
      key: 'blockDeflectRate',
      label: 'Taxa de Amortecimento',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'deflects / totalBlocks',
      format: 'percentage',
    },
    {
      key: 'blockErrorRate',
      label: 'Erro de Bloqueio%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'errors / totalBlocks',
      format: 'percentage',
    },
    {
      key: 'blockEfficiency',
      label: 'Índice de Bloqueio',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'Σ efficiencyValue / totalBlocks',
      format: 'index',
    },
  ]
}

export function computeBlockTotals(actions: BlockAction[]) {
  return {
    totalBlocks: actions.length,
    points: actions.filter((a) => a.subAction === BlockSubAction.POINT).length,
    deflects: actions.filter((a) => a.subAction === BlockSubAction.DEFLECT).length,
    badTouches: actions.filter((a) => a.subAction === BlockSubAction.BAD_TOUCH).length,
    errors: actions.filter((a) => a.subAction === BlockSubAction.ERROR).length,
  }
}
