/**
 * Prompt Builder: Briefing Tático (Tier A — Claude Sonnet)
 *
 * Público-alvo: o TREINADOR. Documento de trabalho privado — não visto pelos atletas.
 * Honesto e acionável: nomeia atletas tanto nos destaques quanto nos pontos de atenção,
 * para orientar decisões de escalação, sistema e treino.
 */

import type { AIPrompt } from '../types'

interface PlayerPerformance {
  name: string
  position: string
  points: number
  rating: number
  attackKills: number
  attackErrors: number
  attackTotal: number
  serveAces: number
  serveErrors: number
  receptionPerfect: number
  receptionErrors: number
  receptionTotal: number
  blockPoints: number
}

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
  playerPerformance: PlayerPerformance[]
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

  const playerLines = data.playerPerformance.length > 0
    ? data.playerPerformance
        .map(p => {
          const atkEff = p.attackTotal > 0
            ? `${((p.attackKills - p.attackErrors) / p.attackTotal * 100).toFixed(0)}%`
            : 'n/d'
          const recEff = p.receptionTotal > 0
            ? `${(p.receptionPerfect / p.receptionTotal * 100).toFixed(0)}%`
            : 'n/d'
          return `  - ${p.name} (${p.position}) — nota ${p.rating.toFixed(1)}, ${p.points} pts | ` +
            `Ataque: ${p.attackKills}K/${p.attackErrors}E de ${p.attackTotal} (ef. ${atkEff}) | ` +
            `Saque: ${p.serveAces}ace/${p.serveErrors}E | ` +
            `Recepção: ${p.receptionPerfect}A/${p.receptionErrors}E de ${p.receptionTotal} (${recEff}) | ` +
            `Bloqueio: ${p.blockPoints}pts`
        })
        .join('\n')
    : '  Dados individuais não disponíveis'

  return {
    systemPrompt: `Você é um analista tático de voleibol de elite, produzindo um briefing CONFIDENCIAL para o TREINADOR da equipe. Este é um documento de trabalho privado — não será visto pelos atletas.

SEU OBJETIVO: dar ao treinador uma leitura tática honesta e acionável da partida, que oriente decisões de escalação, ajustes de sistema e prioridades de treino.

POSTURA: Técnico, direto e sem rodeios. Aqui a honestidade vale mais que o tom motivacional. Nomeie atletas tanto nos destaques quanto nos pontos de atenção — o treinador precisa saber exatamente quem sustentou a equipe e quem precisa de trabalho individual específico.

ESTRUTURA (markdown, nesta ordem):

## Leitura da Partida
Diagnóstico tático do jogo: o que decidiu o resultado, a dinâmica de cada set, onde a equipe ganhou ou perdeu o controle.

## Ataque
Eficiência por posição e dos atletas-chave. Quem está finalizando bem, quem está sendo bloqueado ou errando demais, como se distribuíram os pontos.

## Recepção e Passe
Qualidade por posição e individual. Quem sustentou o passe, quem vazou e o impacto disso no side-out.

## Distribuição do Levantador
Equilíbrio e previsibilidade da distribuição. Quem foi mais acionado, quem foi subutilizado, e o ajuste recomendado.

## Atletas em Foco
2 a 4 atletas que merecem atenção do treinador — tanto quem está em alta (e deve ser valorizado/aproveitado) quanto quem precisa de trabalho individual, com a recomendação concreta para cada um.

## Ajustes Táticos
3 a 4 ajustes acionáveis de sistema, escalação ou rotação para as próximas partidas.

## Prioridades de Treino
2 a 3 focos prioritários de treino, ordenados por impacto, embasados nos dados.

REGRAS:
• Português brasileiro, markdown. Responda diretamente, sem envolver em blocos de código.
• Cite números específicos dos dados fornecidos.
• Não invente dados ausentes — se faltar informação para uma seção, seja breve ou indique "dados insuficientes".
• Seja conciso e denso — é um briefing de trabalho, não um relatório acadêmico.`,

    userMessage: `**${data.homeTeam} vs ${data.awayTeam}**
Resultado: ${data.result} — ${data.finalScore}
Sets: ${data.sets}
Total de ações: ${data.totalActions}

**Desempenho individual dos atletas:**
${playerLines}

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
