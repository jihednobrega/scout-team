/**
 * KPIs de Levantamento (Set)
 */

import { Kpi, SetAction, SetDestination, SetQuality } from '@/types/volleyball'

export function computeSetKpis(actions: SetAction[]): Kpi[] {
  const totalSets = actions.length

  if (totalSets === 0) {
    return getEmptyKpis()
  }

  // Distribuição por destino
  const toOutside = actions.filter((a) => a.destination === SetDestination.TO_OUTSIDE).length
  const toOpposite = actions.filter((a) => a.destination === SetDestination.TO_OPPOSITE).length
  const toMiddle = actions.filter((a) => a.destination === SetDestination.TO_MIDDLE).length
  const toPipe = actions.filter((a) => a.destination === SetDestination.TO_PIPE).length
  const errors = actions.filter((a) => a.destination === SetDestination.ERROR).length

  const outsideRate = toOutside / totalSets
  const oppositeRate = toOpposite / totalSets
  const middleRate = toMiddle / totalSets
  const pipeRate = toPipe / totalSets
  const errorRate = errors / totalSets

  // Qualidade do levantamento
  const good = actions.filter((a) => a.quality === SetQuality.GOOD).length
  const ok = actions.filter((a) => a.quality === SetQuality.OK).length
  const poor = actions.filter((a) => a.quality === SetQuality.POOR).length
  const qualityErrors = actions.filter((a) => a.quality === SetQuality.ERROR).length

  const qualityIndex =
    actions.reduce((sum, a) => {
      const values = {
        [SetQuality.GOOD]: 1.0,
        [SetQuality.OK]: 0.5,
        [SetQuality.POOR]: 0.0,
        [SetQuality.ERROR]: -1.0,
      }
      return sum + (values[a.quality] || 0)
    }, 0) / totalSets

  // Cálculo de entropia (diversidade de distribuição)
  const distribution = [outsideRate, oppositeRate, middleRate, pipeRate].filter((rate) => rate > 0)
  const entropy =
    distribution.length > 1
      ? -distribution.reduce((sum, p) => sum + p * Math.log2(p), 0)
      : 0

  return [
    {
      key: 'setDistributionOutside',
      label: 'Distribuição Ponta%',
      value: outsideRate,
      sampleSize: totalSets,
      explanation: 'Proporção de levantamentos para a ponta (outside).',
      formula: 'toOutside / totalSets',
      bounds: { min: 0, max: 1 },
      format: 'percentage',
    },
    {
      key: 'setDistributionOpposite',
      label: 'Distribuição Oposto%',
      value: oppositeRate,
      sampleSize: totalSets,
      explanation: 'Proporção de levantamentos para o oposto.',
      formula: 'toOpposite / totalSets',
      bounds: { min: 0, max: 1 },
      format: 'percentage',
    },
    {
      key: 'setDistributionMiddle',
      label: 'Distribuição Meio%',
      value: middleRate,
      sampleSize: totalSets,
      explanation: 'Proporção de levantamentos para o meio.',
      formula: 'toMiddle / totalSets',
      bounds: { min: 0, max: 1 },
      format: 'percentage',
    },
    {
      key: 'setDistributionPipe',
      label: 'Distribuição Pipe%',
      value: pipeRate,
      sampleSize: totalSets,
      explanation: 'Proporção de levantamentos para pipe (ataque de fundo).',
      formula: 'toPipe / totalSets',
      bounds: { min: 0, max: 1 },
      format: 'percentage',
    },
    {
      key: 'setEntropy',
      label: 'Entropia de Distribuição',
      value: entropy,
      sampleSize: totalSets,
      explanation:
        'Mede a imprevisibilidade do levantador. Valores mais altos indicam distribuição mais variada.',
      formula: '-Σ(p × log₂(p)) para cada destino',
      bounds: { min: 0, max: 2, ideal: '> 1.2' },
      format: 'decimal',
    },
    {
      key: 'setQuality',
      label: 'Qualidade Média',
      value: qualityIndex,
      sampleSize: totalSets,
      explanation: 'Índice de qualidade: GOOD (+1), OK (+0.5), POOR (0), ERROR (-1).',
      formula: 'Σ qualityValue / totalSets',
      bounds: { min: -1, max: 1, ideal: '> 0.40' },
      format: 'index',
    },
    {
      key: 'setErrorRate',
      label: 'Erro de Levantamento%',
      value: errorRate,
      sampleSize: totalSets,
      explanation: 'Proporção de levantamentos que resultam em erro.',
      formula: 'errors / totalSets',
      bounds: { min: 0, max: 1, ideal: '< 0.10 (10%)' },
      format: 'percentage',
    },
  ]
}

function getEmptyKpis(): Kpi[] {
  return [
    {
      key: 'setDistributionOutside',
      label: 'Distribuição Ponta%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'toOutside / totalSets',
      format: 'percentage',
    },
    {
      key: 'setQuality',
      label: 'Qualidade Média',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'Σ qualityValue / totalSets',
      format: 'index',
    },
    {
      key: 'setErrorRate',
      label: 'Erro de Levantamento%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'errors / totalSets',
      format: 'percentage',
    },
  ]
}

export function computeSetTotals(actions: SetAction[]) {
  return {
    totalSets: actions.length,
    toOutside: actions.filter((a) => a.destination === SetDestination.TO_OUTSIDE).length,
    toOpposite: actions.filter((a) => a.destination === SetDestination.TO_OPPOSITE).length,
    toMiddle: actions.filter((a) => a.destination === SetDestination.TO_MIDDLE).length,
    toPipe: actions.filter((a) => a.destination === SetDestination.TO_PIPE).length,
    errors: actions.filter((a) => a.destination === SetDestination.ERROR).length,
  }
}
