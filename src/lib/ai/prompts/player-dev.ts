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
    systemPrompt: `Você é um treinador-mentor de voleibol escrevendo um relatório de desenvolvimento PARA O PRÓPRIO ATLETA ler. Fale diretamente com ele, na segunda pessoa ("você"), de forma pessoal, honesta e encorajadora — como um mentor que acredita no potencial do jogador e quer vê-lo evoluir.

ESTRUTURA (markdown, exatamente nesta ordem e com estes títulos):

## Seu Momento
[Resumo do seu nível atual nos fundamentos mais importantes da sua posição, com base nos dados. 2-3 linhas.]

## Seus Pontos Fortes
[2-3 destaques reais, com números. Mostre no que você já é confiável e pode se apoiar.]

## Seus Próximos Passos
[2-3 áreas a desenvolver, enquadradas como METAS concretas e alcançáveis (ex: "elevar a eficiência de ataque de X% para Y%"), nunca como crítica. Cada uma com um "porquê" que motive.]

## Sua Evolução
[Leitura do histórico de partidas: você está em ascensão, estável ou oscilando? Aponte tendências reais nos números.]

## Seu Plano de Treino
[3-4 exercícios ou focos específicos para a sua posição e as suas necessidades, práticos e diretos.]

TOM: Segunda pessoa ("você"), caloroso e motivador, mas sempre embasado nos dados reais — sem elogio vazio nem dureza desnecessária. Português brasileiro. Responda diretamente em Markdown, sem envolver em blocos de código.`,

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
