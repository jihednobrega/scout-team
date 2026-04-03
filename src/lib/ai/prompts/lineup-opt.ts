/**
 * Prompt Builder: Otimização de Escalação (Tier A — Claude Sonnet)
 * Sugere ajustes de escalação baseado em dados agregados
 */

import type { AIPrompt } from '../types'

interface LineupOptData {
  teamName: string
  totalMatches: number
  winRate: number
  players: Array<{
    name: string
    position: string
    matchesPlayed: number
    rating: number
    attackEff: number
    receptionEff: number
    serveEff: number
  }>
  rotationStats: Array<{
    rotation: number
    winRate: number
    sideOutEfficiency: number
    breakPointEfficiency: number
  }>
}

export function buildLineupOptPrompt(data: LineupOptData): AIPrompt {
  const playerLines = data.players
    .sort((a, b) => b.rating - a.rating)
    .map(p => `  - ${p.name} (${p.position}): nota ${p.rating.toFixed(1)}, ${p.matchesPlayed} jogos, atk ${p.attackEff.toFixed(0)}%, rec ${p.receptionEff.toFixed(0)}%, saq ${p.serveEff.toFixed(0)}%`)
    .join('\n')

  const rotLines = data.rotationStats
    .map(r => `  - P${r.rotation}: Win ${r.winRate.toFixed(0)}%, SO ${r.sideOutEfficiency.toFixed(0)}%, BP ${r.breakPointEfficiency.toFixed(0)}%`)
    .join('\n')

  return {
    systemPrompt: `Você é um analista tático de voleibol especializado em otimização de escalação. Com base nos dados da equipe, analise e sugira:

1. **Avaliação do Elenco** — visão geral do nível de cada jogador disponível
2. **Escalação Ideal** — sugira 6 titulares + líbero com justificativa
3. **Rotações Problemáticas** — identifique rotações fracas e sugira ajustes (substituição tática, mudança de formação)
4. **Combinações Ofensivas** — sugestões de distribuição baseadas nos perfis dos atacantes
5. **Matchup Strategy** — em quais rotações priorizar side-out vs. break-point

Responda em português brasileiro. Use markdown. Considere que o sistema 5-1 é o mais comum.`,

    userMessage: `**Equipe:** ${data.teamName}
**Partidas:** ${data.totalMatches} (${data.winRate.toFixed(0)}% vitórias)

**Elenco disponível:**
${playerLines}

**Performance por rotação (agregado):**
${rotLines}`,
  }
}
