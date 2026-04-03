/**
 * Prompt Builder: Reflexão Pós-Jogo do Atleta (Tier B — GPT-4o-mini)
 * Reflexão individual sobre a performance em uma partida específica
 */

import type { AIPrompt } from '../types'

interface PostGameData {
  playerName: string
  position: string
  opponent: string
  result: string
  rating: number
  stats: {
    attackKills?: number
    attackErrors?: number
    attackTotal?: number
    serveAces?: number
    serveErrors?: number
    receptionPerfect?: number
    receptionErrors?: number
    blockPoints?: number
  }
}

export function buildPostGamePrompt(data: PostGameData): AIPrompt {
  const statsLines: string[] = []
  if (data.stats.attackTotal) statsLines.push(`Ataque: ${data.stats.attackKills} kills, ${data.stats.attackErrors} erros em ${data.stats.attackTotal}`)
  if (data.stats.serveAces) statsLines.push(`Saque: ${data.stats.serveAces} aces, ${data.stats.serveErrors ?? 0} erros`)
  if (data.stats.receptionPerfect != null) statsLines.push(`Recepção: ${data.stats.receptionPerfect} perfeitas, ${data.stats.receptionErrors ?? 0} erros`)
  if (data.stats.blockPoints) statsLines.push(`Bloqueio: ${data.stats.blockPoints} pontos`)

  return {
    systemPrompt: `Você é um analista que faz reflexões individuais pós-jogo para atletas de voleibol. Gere UM parágrafo curto (4-5 linhas, máximo 400 caracteres) com: como o atleta foi nesta partida vs. o esperado para a posição, 1 momento positivo e 1 ajuste técnico específico. Tom construtivo. Responda em português brasileiro. Não use markdown.`,
    userMessage: `Jogador: ${data.playerName} (${data.position})
Adversário: ${data.opponent}
Resultado: ${data.result === 'vitoria' ? 'Vitória' : 'Derrota'}
Nota no jogo: ${data.rating.toFixed(1)}/10
${statsLines.join('\n')}`,
  }
}
