/**
 * Prompt Builder: Briefing Tático (Tier A — Claude Sonnet)
 * Análise tática detalhada de uma partida para o treinador
 */

import type { AIPrompt } from '../types'

interface TacticalBriefData {
  homeTeam: string
  awayTeam: string
  result: string
  finalScore: string
  sets: string
  attackByPosition: Array<{ label: string; kills: number; errors: number; total: number }>
  receptionByPosition: Array<{ label: string; efficiency: number; perfect: number; errors: number; total: number }>
  setterDistribution: Array<{ label: string; value: number }>
  rotationStats?: Array<{ rotation: number; winRate: number; sideOutEfficiency: number; breakPointEfficiency: number }>
  totalActions: number
}

export function buildTacticalBriefPrompt(data: TacticalBriefData): AIPrompt {
  const atkLines = data.attackByPosition
    .map(a => `  - ${a.label}: ${a.kills} kills, ${a.errors} erros, ${a.total} total`)
    .join('\n')

  const recLines = data.receptionByPosition
    .map(r => `  - ${r.label}: eficiência ${r.efficiency.toFixed(1)}%, ${r.perfect} perfeitas, ${r.errors} erros (${r.total} total)`)
    .join('\n')

  const distLines = data.setterDistribution
    .map(d => `  - ${d.label}: ${d.value}%`)
    .join('\n')

  const rotLines = data.rotationStats
    ?.map(r => `  - P${r.rotation}: Win ${r.winRate.toFixed(0)}%, SO ${r.sideOutEfficiency.toFixed(0)}%, BP ${r.breakPointEfficiency.toFixed(0)}%`)
    .join('\n') || '  Dados não disponíveis'

  return {
    systemPrompt: `Você é um analista tático de voleibol profissional. Produza um briefing tático detalhado com:

1. **Resumo da Partida** — resultado, dinâmica geral, momentos-chave prováveis
2. **Análise Ofensiva** — eficiência por posição, distribuição do levantador, pontos fortes/fracos do ataque
3. **Análise da Recepção** — qualidade por posição, impacto no side-out
4. **Rotações** — rotações mais e menos eficientes, padrões de break-point
5. **Insights Táticos** — 3-4 observações táticas acionáveis para próximas partidas
6. **Recomendação para Treino** — 2-3 focos prioritários de treino baseados nos dados

Responda em português brasileiro. Use markdown. Seja analítico e direto.`,

    userMessage: `**${data.homeTeam} vs ${data.awayTeam}**
Resultado: ${data.result} — ${data.finalScore}
Sets: ${data.sets}
Total de ações: ${data.totalActions}

**Ataque por posição:**
${atkLines}

**Recepção por posição:**
${recLines}

**Distribuição do levantador:**
${distLines}

**Performance por rotação:**
${rotLines}`,
  }
}
