/**
 * Prompt Builder: Visão Geral das Estatísticas da Equipe (Tier A — Claude Sonnet)
 * Análise completa cobrindo KPIs, jogadores, estratégia, rotações e padrões.
 */

import type { AIPrompt } from '../types'

interface StatsOverviewData {
  teamName: string
  totalMatches: number
  wins: number
  losses: number
  attackEfficiency: number
  receptionEfficiency: number
  acePercentage: number
  blockKillsPerMatch: number
  players: Array<{
    name: string
    position: string
    matchesPlayed: number
    rating: number
    attackEff: number
    receptionEff: number
    serveEff: number
  }>
  attackByPosition: Array<{ label: string; kills: number; errors: number; total: number }>
  receptionByPosition: Array<{ label: string; efficiency: number; total: number }>
  setterDistribution: Array<{ label: string; value: number }>
  rotationStats: Array<{
    rotation: number
    winRate: number
    sideOutEfficiency: number
    breakPointEfficiency: number
    attackEfficiency: number
    receptionEfficiency: number
  }>
  /** Ataques agrupados por zona da quadra (1-6) */
  attackByZone: Array<{ zone: number; kills: number; errors: number; total: number }>
  /** Saques agrupados por zona de origem (1-6) */
  serveByZone: Array<{ zone: number; aces: number; errors: number; total: number }>
}

export function buildStatsOverviewPrompt(data: StatsOverviewData): AIPrompt {
  const winRate = data.totalMatches > 0 ? (data.wins / data.totalMatches) * 100 : 0

  const playerLines = data.players
    .sort((a, b) => b.rating - a.rating)
    .map(p => `  - ${p.name} (${p.position}): nota ${p.rating.toFixed(1)}, ${p.matchesPlayed} jogos | atk ${p.attackEff.toFixed(0)}% rec ${p.receptionEff.toFixed(0)}% saq ${p.serveEff.toFixed(0)}%`)
    .join('\n')

  const atkByPos = data.attackByPosition
    .filter(p => p.total > 0)
    .map(p => `  - ${p.label}: ${p.kills}K / ${p.errors}E / ${p.total}T (${p.total > 0 ? ((p.kills - p.errors) / p.total * 100).toFixed(0) : 0}% ef)`)
    .join('\n')

  const recByPos = data.receptionByPosition
    .filter(p => p.total > 0)
    .map(p => `  - ${p.label}: ${p.efficiency.toFixed(0)}% ef (${p.total} tentativas)`)
    .join('\n')

  const setterDist = data.setterDistribution
    .filter(s => s.value > 0)
    .map(s => `  - ${s.label}: ${s.value}%`)
    .join('\n')

  const rotLines = data.rotationStats
    .map(r => `  - P${r.rotation}: Win ${r.winRate.toFixed(0)}% | SO ${r.sideOutEfficiency.toFixed(0)}% | BP ${r.breakPointEfficiency.toFixed(0)}% | Atk ${r.attackEfficiency.toFixed(0)}% | Rec ${r.receptionEfficiency.toFixed(0)}%`)
    .join('\n')

  const ZONE_LABEL: Record<number, string> = { 1: 'Z1(direita-fundo)', 2: 'Z2(direita-frente)', 3: 'Z3(centro-frente)', 4: 'Z4(esquerda-frente)', 5: 'Z5(esquerda-fundo)', 6: 'Z6(centro-fundo)' }

  const atkZoneLines = data.attackByZone
    .filter(z => z.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(z => `  - ${ZONE_LABEL[z.zone] || `Z${z.zone}`}: ${z.total} ataques, ${z.kills}K / ${z.errors}E (${z.total > 0 ? ((z.kills - z.errors) / z.total * 100).toFixed(0) : 0}% ef)`)
    .join('\n')

  const serveZoneLines = data.serveByZone
    .filter(z => z.total > 0)
    .sort((a, b) => b.total - a.total)
    .map(z => `  - ${ZONE_LABEL[z.zone] || `Z${z.zone}`}: ${z.total} saques, ${z.aces} aces / ${z.errors} erros`)
    .join('\n')

  return {
    systemPrompt: `Você é um analista tático de voleibol de alto nível. Com base nos dados completos da equipe, gere uma análise estratégica abrangente estruturada em:

## 1. Diagnóstico Geral
Resumo do momento da equipe: resultados, pontos fortes e fraquezas críticas.

## 2. Análise Individual dos Atletas
Destaque os 3 melhores performers e identifique quem precisa de mais atenção.

## 3. Eficiência Ofensiva
Analise o ataque por posição, distribuição do levantador e zonas de origem dos ataques (heatmap). Identifique onde o ataque é mais e menos eficiente.

## 4. Sistema Defensivo e Saque
Avalie recepção por posição e padrões de saque por zona. Identifique vulnerabilidades defensivas e oportunidades no saque.

## 5. Análise de Rotações
Identifique as 2 melhores e 2 piores rotações. Explique o que pode estar causando os resultados.

## 6. Recomendações Táticas
Liste de 3 a 5 ações concretas de treinamento ou ajustes táticos prioritários.

Responda em português brasileiro. Use markdown conforme a estrutura acima.`,

    userMessage: `**Equipe:** ${data.teamName}
**Resultados:** ${data.totalMatches} partidas — ${data.wins}V / ${data.losses}D (${winRate.toFixed(0)}% vitórias)
**KPIs gerais:** Eficiência ataque ${data.attackEfficiency.toFixed(1)}% | Recepção ${data.receptionEfficiency.toFixed(1)}% | Aces ${data.acePercentage.toFixed(1)}% | Bloqueios/jogo ${data.blockKillsPerMatch.toFixed(1)}

**Atletas:**
${playerLines}

**Ataque por posição:**
${atkByPos || '  — sem dados'}

**Recepção por posição:**
${recByPos || '  — sem dados'}

**Distribuição do levantador:**
${setterDist || '  — sem dados'}

**Performance por rotação:**
${rotLines}

**Ataque por zona da quadra (heatmap ofensivo):**
${atkZoneLines || '  — sem dados'}

**Saque por zona de origem (heatmap de saque):**
${serveZoneLines || '  — sem dados'}`,
  }
}
