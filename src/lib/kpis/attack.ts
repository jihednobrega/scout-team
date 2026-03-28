/**
 * KPIs de Ataque (Attack)
 * Baseado em metodologias FIVB e Data Volley
 */

import { Kpi, AttackAction, AttackSubAction, Phase } from '@/types/volleyball'

export function computeAttackKpis(actions: AttackAction[]): Kpi[] {
  const totalAttacks = actions.length

  if (totalAttacks === 0) {
    return getEmptyKpis()
  }

  const kills = actions.filter((a) => a.subAction === AttackSubAction.POINT).length
  const efficient = actions.filter((a) => a.subAction === AttackSubAction.EFFICIENT).length
  const defended = actions.filter((a) => a.subAction === AttackSubAction.DEFENDED).length
  const blocked = actions.filter((a) => a.subAction === AttackSubAction.BLOCKED).length
  const errors = actions.filter((a) => a.subAction === AttackSubAction.ERROR).length

  // Métricas tradicionais
  const killRate = kills / totalAttacks
  const errorRate = (errors + blocked) / totalAttacks
  const hittingPercentage = (kills - errors - blocked) / totalAttacks
  const efficiencyIndex = actions.reduce((sum, a) => sum + a.efficiencyValue, 0) / totalAttacks

  // Análise por fase
  const sideoutAttacks = actions.filter((a) => a.phase === Phase.SIDEOUT)
  const breakAttacks = actions.filter((a) => a.phase === Phase.BREAK)

  const sideoutKills = sideoutAttacks.filter((a) => a.subAction === AttackSubAction.POINT).length
  const breakKills = breakAttacks.filter((a) => a.subAction === AttackSubAction.POINT).length

  const sideoutConversion = sideoutAttacks.length > 0 ? sideoutKills / sideoutAttacks.length : 0
  const breakConversion = breakAttacks.length > 0 ? breakKills / breakAttacks.length : 0

  return [
    {
      key: 'killRate',
      label: 'Kill%',
      value: killRate,
      sampleSize: totalAttacks,
      explanation: 'Proporção de ataques que resultam em ponto direto.',
      formula: 'kills / totalAttacks',
      bounds: { min: 0, max: 1, ideal: '> 0.40 (40%)' },
      format: 'percentage',
    },
    {
      key: 'hittingPercentage',
      label: 'Hitting%',
      value: hittingPercentage,
      sampleSize: totalAttacks,
      explanation:
        'Métrica clássica de eficiência ofensiva (kills - erros - bloqueios) / total de ataques.',
      formula: '(kills - errors - blocks) / totalAttacks',
      bounds: { min: -1, max: 1, ideal: '> 0.25' },
      format: 'index',
    },
    {
      key: 'attackErrorRate',
      label: 'Erro/Bloqueio%',
      value: errorRate,
      sampleSize: totalAttacks,
      explanation: 'Proporção de ataques que resultam em erro ou são bloqueados.',
      formula: '(errors + blocks) / totalAttacks',
      bounds: { min: 0, max: 1, ideal: '< 0.20 (20%)' },
      format: 'percentage',
    },
    {
      key: 'attackEfficiency',
      label: 'Índice de Ataque',
      value: efficiencyIndex,
      sampleSize: totalAttacks,
      explanation:
        'Índice ponderado: ponto (+1), eficiente (+0.5), defendido (0), bloqueado (-0.5), erro (-1).',
      formula: 'Σ efficiencyValue / totalAttacks',
      bounds: { min: -1, max: 1, ideal: '> 0.30' },
      format: 'index',
    },
    {
      key: 'sideoutConversion',
      label: 'Conversão Side-out',
      value: sideoutConversion,
      sampleSize: sideoutAttacks.length,
      explanation:
        'Eficiência de ataque na primeira bola (recebendo). Mede capacidade de finalizar após recepção.',
      formula: 'sideoutKills / sideoutAttacks',
      bounds: { min: 0, max: 1, ideal: '> 0.45 (45%)' },
      format: 'percentage',
    },
    {
      key: 'breakConversion',
      label: 'Conversão Break',
      value: breakConversion,
      sampleSize: breakAttacks.length,
      explanation:
        'Eficiência de ataque no contra-ataque (sacando). Mede capacidade de finalizar após defesa.',
      formula: 'breakKills / breakAttacks',
      bounds: { min: 0, max: 1, ideal: '> 0.35 (35%)' },
      format: 'percentage',
    },
  ]
}

function getEmptyKpis(): Kpi[] {
  return [
    {
      key: 'killRate',
      label: 'Kill%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'kills / totalAttacks',
      format: 'percentage',
    },
    {
      key: 'hittingPercentage',
      label: 'Hitting%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: '(kills - errors - blocks) / totalAttacks',
      format: 'index',
    },
    {
      key: 'attackErrorRate',
      label: 'Erro/Bloqueio%',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: '(errors + blocks) / totalAttacks',
      format: 'percentage',
    },
    {
      key: 'attackEfficiency',
      label: 'Índice de Ataque',
      value: 0,
      sampleSize: 0,
      explanation: 'Amostra insuficiente',
      formula: 'Σ efficiencyValue / totalAttacks',
      format: 'index',
    },
  ]
}

export function computeAttackTotals(actions: AttackAction[]) {
  return {
    totalAttacks: actions.length,
    kills: actions.filter((a) => a.subAction === AttackSubAction.POINT).length,
    efficient: actions.filter((a) => a.subAction === AttackSubAction.EFFICIENT).length,
    defended: actions.filter((a) => a.subAction === AttackSubAction.DEFENDED).length,
    blocked: actions.filter((a) => a.subAction === AttackSubAction.BLOCKED).length,
    errors: actions.filter((a) => a.subAction === AttackSubAction.ERROR).length,
  }
}
