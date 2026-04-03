/**
 * Prompt Builder: Resumo Rápido de Partida (Tier B — GPT-4o-mini)
 * Gera 3-4 linhas resumindo a partida
 */

import type { AIPrompt } from '../types'

interface MatchData {
  homeTeam: string
  awayTeam: string
  finalScore: string
  result: string
  sets: string
  date: string
  tournament?: string | null
  totalActions: number
}

export function buildMatchSummaryPrompt(data: MatchData): AIPrompt {
  return {
    systemPrompt: `Você é um analista de voleibol. Gere um resumo MUITO curto (3-4 linhas, máximo 300 caracteres) da partida descrita. Destaque o resultado, o momento decisivo e um ponto notável. Seja direto e objetivo. Responda em português brasileiro. Não use markdown, apenas texto corrido.`,
    userMessage: `Partida: ${data.homeTeam} vs ${data.awayTeam}
Resultado: ${data.result === 'vitoria' ? 'Vitória' : 'Derrota'} — ${data.finalScore}
Sets: ${data.sets}
Data: ${data.date}
${data.tournament ? `Competição: ${data.tournament}` : ''}
Total de ações registradas: ${data.totalActions}`,
  }
}
