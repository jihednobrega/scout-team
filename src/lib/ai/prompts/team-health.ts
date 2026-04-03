/**
 * Prompt Builder: Saúde do Time (Tier B — GPT-4o-mini)
 * Avaliação rápida para o dashboard do treinador
 */

import type { AIPrompt } from '../types'

interface TeamHealthData {
  teamName: string
  totalMatches: number
  wins: number
  losses: number
  avgEfficiency: number
  recentResults: string[] // ['vitoria', 'derrota', ...]
  topPlayer: string
  topPlayerRating: number
}

export function buildTeamHealthPrompt(data: TeamHealthData): AIPrompt {
  const winRate = data.totalMatches > 0 ? ((data.wins / data.totalMatches) * 100).toFixed(0) : '0'
  const recentForm = data.recentResults.slice(0, 5).map(r => r === 'vitoria' ? 'V' : 'D').join('')

  return {
    systemPrompt: `Você é um analista de voleibol. Faça uma avaliação rápida da saúde do time em UM parágrafo (4-5 linhas, máximo 400 caracteres). Mencione: forma recente, ponto forte atual, e uma prioridade para a semana. Seja direto. Responda em português brasileiro. Não use markdown.`,
    userMessage: `Time: ${data.teamName}
Partidas: ${data.totalMatches} (${data.wins}V / ${data.losses}D — ${winRate}%)
Forma recente: ${recentForm || 'sem dados'}
Eficiência média: ${data.avgEfficiency.toFixed(2)}
Destaque: ${data.topPlayer} (nota ${data.topPlayerRating.toFixed(1)})`,
  }
}
