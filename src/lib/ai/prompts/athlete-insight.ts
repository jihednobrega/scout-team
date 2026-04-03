/**
 * Prompt Builder: Insight do Atleta (Tier B — GPT-4o-mini)
 * Feedback personalizado de 1 parágrafo para o atleta
 */

import type { AIPrompt } from '../types'

interface AthleteData {
  playerName: string
  position: string
  totalMatches: number
  avgRating: number
  stats: {
    attackKills?: number
    attackTotal?: number
    serveAces?: number
    serveTotal?: number
    receptionPerfect?: number
    receptionTotal?: number
    blockPoints?: number
    blockTotal?: number
  }
}

export function buildAthleteInsightPrompt(data: AthleteData): AIPrompt {
  const statsLines: string[] = []
  if (data.stats.attackTotal) statsLines.push(`Ataque: ${data.stats.attackKills}/${data.stats.attackTotal} kills`)
  if (data.stats.serveTotal) statsLines.push(`Saque: ${data.stats.serveAces}/${data.stats.serveTotal} aces`)
  if (data.stats.receptionTotal) statsLines.push(`Recepção: ${data.stats.receptionPerfect}/${data.stats.receptionTotal} perfeitas`)
  if (data.stats.blockTotal) statsLines.push(`Bloqueio: ${data.stats.blockPoints}/${data.stats.blockTotal} pontos`)

  return {
    systemPrompt: `Você é um analista de voleibol que dá feedback motivacional e construtivo para atletas. Gere UM parágrafo curto (4-5 linhas, máximo 400 caracteres) com: 1 ponto forte, 1 área de melhoria, e uma frase motivacional. Seja positivo mas honesto. Use linguagem acessível. Responda em português brasileiro. Não use markdown.`,
    userMessage: `Jogador: ${data.playerName} (${data.position})
Partidas jogadas: ${data.totalMatches}
Nota média: ${data.avgRating.toFixed(1)}/10
${statsLines.join('\n')}`,
  }
}
