/**
 * Prompt Builder: Desenvolvimento do Atleta (Tier A — Claude Sonnet)
 * Análise profunda de evolução, pontos fortes/fracos e plano de treino
 */

import type { AIPrompt } from '../types'

interface PlayerDevData {
  playerName: string
  position: string
  totalMatches: number
  avgRating: number
  stats: {
    attackKills: number
    attackErrors: number
    attackTotal: number
    serveAces: number
    serveErrors: number
    serveTotal: number
    receptionPerfect: number
    receptionErrors: number
    receptionTotal: number
    blockPoints: number
    blockTotal: number
    defenseExcellent?: number
    defenseTotal?: number
  }
  matchHistory: Array<{
    opponent: string
    date: string
    points: number
    efficiency: number
    rating: number
  }>
}

export function buildPlayerDevPrompt(data: PlayerDevData): AIPrompt {
  const matchLines = data.matchHistory
    .slice(0, 10)
    .map(m => `- ${m.date} vs ${m.opponent}: ${m.points} pts, eficiência ${m.efficiency.toFixed(1)}%, nota ${m.rating.toFixed(1)}`)
    .join('\n')

  const atkEff = data.stats.attackTotal > 0
    ? ((data.stats.attackKills - data.stats.attackErrors) / data.stats.attackTotal * 100).toFixed(1)
    : '0'
  const recEff = data.stats.receptionTotal > 0
    ? ((data.stats.receptionPerfect / data.stats.receptionTotal) * 100).toFixed(1)
    : '0'
  const srvEff = data.stats.serveTotal > 0
    ? ((data.stats.serveAces / data.stats.serveTotal) * 100).toFixed(1)
    : '0'

  return {
    systemPrompt: `Você é um analista de performance de voleibol de alto nível. Analise os dados do atleta e produza um relatório de desenvolvimento com:

1. **Perfil de Performance** — resumo do nível atual do jogador em cada fundamento
2. **Pontos Fortes** — 2-3 destaques positivos com dados
3. **Pontos a Desenvolver** — 2-3 áreas que precisam de atenção, com metas objetivas
4. **Tendência de Evolução** — análise do histórico de partidas (melhorando, estável, caindo?)
5. **Sugestões de Treino** — 3-4 exercícios específicos para a posição e necessidades do atleta

Responda em português brasileiro. Use markdown para formatação. Seja direto e objetivo.`,

    userMessage: `**Atleta:** ${data.playerName}
**Posição:** ${data.position}
**Total de partidas:** ${data.totalMatches}
**Nota média:** ${data.avgRating.toFixed(1)}/10

**Estatísticas agregadas:**
- Ataque: ${data.stats.attackKills} kills, ${data.stats.attackErrors} erros, ${data.stats.attackTotal} total (eficiência: ${atkEff}%)
- Saque: ${data.stats.serveAces} aces, ${data.stats.serveErrors} erros, ${data.stats.serveTotal} total (taxa ace: ${srvEff}%)
- Recepção: ${data.stats.receptionPerfect} perfeitas, ${data.stats.receptionErrors} erros, ${data.stats.receptionTotal} total (qualidade: ${recEff}%)
- Bloqueio: ${data.stats.blockPoints} pontos em ${data.stats.blockTotal} tentativas

**Últimas partidas:**
${matchLines || 'Sem histórico disponível'}`,
  }
}
