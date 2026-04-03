/**
 * Prompt Builder: Padrões e Insights (Tier B — GPT-4o-mini)
 * Identifica padrões rápidos nas rotações e dados do time
 */

import type { AIPrompt } from '../types'

interface PatternData {
  teamName: string
  totalMatches: number
  rotationStats: Array<{
    rotation: number
    winRate: number
    sideOutEfficiency: number
    breakPointEfficiency: number
    attackEfficiency: number
    receptionEfficiency: number
  }>
  winRate: number
}

export function buildPatternInsightsPrompt(data: PatternData): AIPrompt {
  const rotLines = data.rotationStats
    .map(r => `P${r.rotation}: Win ${r.winRate.toFixed(0)}%, SO ${r.sideOutEfficiency.toFixed(0)}%, BP ${r.breakPointEfficiency.toFixed(0)}%, Atk ${r.attackEfficiency.toFixed(0)}%, Rec ${r.receptionEfficiency.toFixed(0)}%`)
    .join(' | ')

  return {
    systemPrompt: `Você é um analista de voleibol. Identifique os 3 padrões mais relevantes nos dados de rotação da equipe. Para cada padrão, diga: o que acontece, por que provavelmente acontece, e o que fazer. Máximo 4 linhas por padrão. Responda em português brasileiro. Sem markdown.`,

    userMessage: `Equipe: ${data.teamName} (${data.totalMatches} partidas, ${data.winRate.toFixed(0)}% vitórias)
Rotações: ${rotLines}`,
  }
}
