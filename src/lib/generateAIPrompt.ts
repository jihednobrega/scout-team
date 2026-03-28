/**
 * Gerador de Prompt para Análise por IA
 * Converte dados de scout de uma partida em texto estruturado para análise externa por IA
 */

import { GameMatch } from '@/types/game'
import { ScoutAction } from '@/types/scout'
import { calculatePlayerStats } from '@/utils/stats'

type PlayerInfo = Record<string, { name: string; number: string; position: string }>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, total: number): string {
  if (!total) return '0.0'
  return ((num / total) * 100).toFixed(1)
}

function avgEff(arr: ScoutAction[]): number {
  const vals = arr.filter((a) => a.efficiencyValue != null).map((a) => a.efficiencyValue as number)
  if (!vals.length) return 0
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function effStr(val: number): string {
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}`
}

function countSub(arr: ScoutAction[], ...subs: string[]): number {
  return arr.filter((a) => subs.some((s) => a.subAction?.toLowerCase() === s.toLowerCase())).length
}

function posLabel(pos: string): string {
  const map: Record<string, string> = {
    levantador: 'LEV',
    oposto: 'OPO',
    ponteiro: 'PON',
    central: 'CEN',
    libero: 'LIB',
    líbero: 'LIB',
  }
  return map[pos?.toLowerCase()] ?? pos?.slice(0, 3).toUpperCase() ?? '?'
}

function parseSets(match: GameMatch): Array<{ home: number; away: number }> {
  const raw: any[] = match.sets || []
  return raw.map((s: any) => {
    if ('homeScore' in s) return { home: s.homeScore, away: s.awayScore }
    if ('home' in s) return { home: s.home, away: s.away }
    if ('score' in s) {
      const parts = String(s.score).split('-')
      return { home: Number(parts[0]) || 0, away: Number(parts[1]) || 0 }
    }
    return { home: 0, away: 0 }
  })
}

// ─── System Prompt (Agente) ────────────────────────────────────────────────────

export const AGENT_SYSTEM_PROMPT = `Você é um analista especialista em voleibol de alto nível, com profundo conhecimento em metodologia FIVB, Data Volley e análise de desempenho esportivo. Você combina experiência prática de treinamento com análise quantitativa rigorosa de dados.

SUAS RESPONSABILIDADES:
• Interpretar dados estatísticos de scout de voleibol com precisão técnica
• Identificar padrões táticos e técnicos a partir dos números
• Correlacionar fundamentos (ex: qualidade da recepção → eficiência no ataque)
• Fornecer recomendações acionáveis, priorizadas por impacto no resultado

DIRETRIZES DE ANÁLISE:
• Contextualize números com referências de alto nível (ex: eficiência de ataque >50% é excelente em nível nacional)
• Diferencie problemas sistêmicos de variações pontuais de uma partida
• Considere o placar set a set — identifique em quais momentos a equipe cedeu ou dominou
• Se dados forem insuficientes (ex: <5 ações de um fundamento), indique isso explicitamente

FORMATO OBRIGATÓRIO DE RESPOSTA:
Use Markdown com os seguintes cabeçalhos exatamente nesta ordem:

## DIAGNÓSTICO GERAL
[Avaliação geral da performance, 3-4 linhas, mencione resultado e contexto]

## PONTOS FORTES
[Top 3, com números específicos que embasam cada ponto]

## PONTOS CRÍTICOS
[Top 3 áreas de melhoria com maior impacto no desempenho]

## ANÁLISE POR FUNDAMENTO
[Para cada fundamento com dados suficientes: classificação (fraco/regular/bom/excelente) + observação]

## DESTAQUES INDIVIDUAIS
[Top 3 jogadores que se sobressaíram + 1 jogador que requer atenção]

## RECOMENDAÇÕES TÁTICAS
[3-5 ajustes táticos concretos para as próximas partidas]

## PRIORIDADES DE TREINO
[Top 3 focos para o próximo treino, ordenados por prioridade]

REGRAS:
• Sempre responda em português brasileiro
• Seja específico — cite números e percentuais dos dados fornecidos
• Não invente dados que não estejam no relatório
• Se algo não puder ser avaliado por falta de dados, diga "dados insuficientes"

FORMATO DE ENTREGA:
Envolva TODA a sua resposta em um único bloco de código Markdown, usando a linguagem "markdown":

\`\`\`markdown
[sua análise completa aqui]
\`\`\`

Isso facilita a cópia e importação da análise pelo sistema.`

// ─── Main Function ─────────────────────────────────────────────────────────────

export function generateAIPromptText(
  match: GameMatch,
  actions: ScoutAction[],
  playerInfoMap: PlayerInfo
): string {
  const dateStr =
    match.date instanceof Date
      ? match.date.toLocaleDateString('pt-BR')
      : new Date(match.date).toLocaleDateString('pt-BR')

  const sets = parseSets(match)
  const homeSets = sets.filter((s) => s.home > s.away).length
  const awaySets = sets.filter((s) => s.away > s.home).length
  const resultado = homeSets > awaySets ? 'VITÓRIA' : 'DERROTA'

  const teamActions = actions.filter((a) => a.action !== 'opponent_error')

  const serves = teamActions.filter((a) => a.action === 'serve')
  const receptions = teamActions.filter((a) => a.action === 'reception')
  const attacks = teamActions.filter((a) => a.action === 'attack')
  const blockActions = teamActions.filter((a) => a.action === 'block')
  const digs = teamActions.filter((a) => a.action === 'dig')
  const setActions = teamActions.filter((a) => a.action === 'set')

  const playerIds = [...new Set(teamActions.map((a) => a.player))]
  const playerStats = playerIds
    .map((pid) => ({
      pid,
      info: playerInfoMap[pid] ?? { name: pid, number: '?', position: '?' },
      stats: calculatePlayerStats(pid, actions, 1),
    }))
    .sort((a, b) => b.stats.points - a.stats.points)

  const setNumbers = [...new Set(teamActions.map((a) => a.set))]
    .filter(Boolean)
    .sort((a, b) => (a as number) - (b as number))

  const lines: string[] = []

  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('   RELATÓRIO SCOUT — ANÁLISE DE PARTIDA DE VOLEIBOL')
  lines.push('   Sistema: Scout Team | Gerado automaticamente')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')

  // ── Contexto ──
  lines.push('## CONTEXTO DA PARTIDA')
  lines.push('')
  lines.push(`- **Time Analisado:** ${match.homeTeam}`)
  lines.push(`- **Adversário:** ${match.awayTeam}`)
  lines.push(`- **Data:** ${dateStr}`)
  if (match.tournament) lines.push(`- **Competição:** ${match.tournament}`)
  if (match.location) lines.push(`- **Local:** ${match.location}`)
  lines.push(`- **Resultado:** ${resultado} (${homeSets}×${awaySets} sets)`)
  lines.push(`- **Placar Final:** ${match.finalScore || `${homeSets}-${awaySets}`}`)
  lines.push(`- **Total de Ações Registradas:** ${teamActions.length}`)
  if (match.duration) lines.push(`- **Duração:** ${match.duration} minutos`)
  lines.push('')

  // ── Sets ──
  lines.push('## RESULTADO POR SET')
  lines.push('')
  sets.forEach((s, i) => {
    const w = s.home > s.away ? match.homeTeam : match.awayTeam
    lines.push(`- Set ${i + 1}: **${s.home}–${s.away}** (vencedor: ${w})`)
  })
  lines.push('')

  // ── KPIs ──
  lines.push('## KPIs POR FUNDAMENTO (TIME ANALISADO)')
  lines.push('')

  if (serves.length > 0) {
    const aces = countSub(serves, 'ace')
    const errs = countSub(serves, 'error')
    const eff = avgEff(serves)
    lines.push('### Saque')
    lines.push(`| Métrica | Valor |`)
    lines.push(`|---------|-------|`)
    lines.push(`| Total de saques | ${serves.length} |`)
    lines.push(`| Aces | ${aces} (${pct(aces, serves.length)}%) |`)
    lines.push(`| Erros | ${errs} (${pct(errs, serves.length)}%) |`)
    lines.push(`| Eficiência média | ${effStr(eff)} |`)
    lines.push('')
  }

  if (receptions.length > 0) {
    const perfect = countSub(receptions, 'perfect', 'excellent', 'a')
    const positive = countSub(receptions, 'positive', 'good', 'b')
    const errs = countSub(receptions, 'error')
    const negative = Math.max(0, receptions.length - perfect - positive - errs)
    const eff = avgEff(receptions)
    lines.push('### Recepção')
    lines.push(`| Métrica | Valor |`)
    lines.push(`|---------|-------|`)
    lines.push(`| Total | ${receptions.length} |`)
    lines.push(`| Perfeitas (A) | ${perfect} (${pct(perfect, receptions.length)}%) |`)
    lines.push(`| Positivas (B) | ${positive} (${pct(positive, receptions.length)}%) |`)
    lines.push(`| Negativas (C) | ${negative} (${pct(negative, receptions.length)}%) |`)
    lines.push(`| Erros | ${errs} (${pct(errs, receptions.length)}%) |`)
    lines.push(`| Eficiência média | ${effStr(eff)} |`)
    lines.push('')
  }

  if (attacks.length > 0) {
    const kills = countSub(attacks, 'kill', 'tip', 'block_out')
    const efficient = countSub(attacks, 'efficient')
    const blocked = countSub(attacks, 'blocked')
    const errs = countSub(attacks, 'error')
    const eff = avgEff(attacks)
    lines.push('### Ataque')
    lines.push(`| Métrica | Valor |`)
    lines.push(`|---------|-------|`)
    lines.push(`| Total | ${attacks.length} |`)
    lines.push(`| Kills (pontos diretos) | ${kills} (${pct(kills, attacks.length)}%) |`)
    lines.push(`| Eficientes | ${efficient} (${pct(efficient, attacks.length)}%) |`)
    lines.push(`| Bloqueados | ${blocked} (${pct(blocked, attacks.length)}%) |`)
    lines.push(`| Erros | ${errs} (${pct(errs, attacks.length)}%) |`)
    lines.push(`| Eficiência média | ${effStr(eff)} |`)
    lines.push('')
  }

  if (blockActions.length > 0) {
    const points = countSub(blockActions, 'kill_block', 'point')
    const touches = countSub(blockActions, 'touch', 'deflect', 'bad_touch')
    const errs = countSub(blockActions, 'error')
    lines.push('### Bloqueio')
    lines.push(`| Métrica | Valor |`)
    lines.push(`|---------|-------|`)
    lines.push(`| Total | ${blockActions.length} |`)
    lines.push(`| Pontos de bloqueio | ${points} (${pct(points, blockActions.length)}%) |`)
    lines.push(`| Toques/Desvios | ${touches} (${pct(touches, blockActions.length)}%) |`)
    lines.push(`| Erros | ${errs} (${pct(errs, blockActions.length)}%) |`)
    lines.push('')
  }

  if (digs.length > 0) {
    const perfect = countSub(digs, 'perfect', 'excellent', 'a')
    const errs = countSub(digs, 'error')
    const eff = avgEff(digs)
    lines.push('### Defesa (Dig)')
    lines.push(`| Métrica | Valor |`)
    lines.push(`|---------|-------|`)
    lines.push(`| Total | ${digs.length} |`)
    lines.push(`| Perfeitas | ${perfect} (${pct(perfect, digs.length)}%) |`)
    lines.push(`| Erros | ${errs} (${pct(errs, digs.length)}%) |`)
    lines.push(`| Eficiência média | ${effStr(eff)} |`)
    lines.push('')
  }

  if (setActions.length > 0) {
    const errs = countSub(setActions, 'error')
    const eff = avgEff(setActions)
    lines.push('### Levantamento')
    lines.push(`| Métrica | Valor |`)
    lines.push(`|---------|-------|`)
    lines.push(`| Total | ${setActions.length} |`)
    lines.push(`| Erros | ${errs} (${pct(errs, setActions.length)}%) |`)
    lines.push(`| Eficiência média | ${effStr(eff)} |`)
    lines.push('')
  }

  // ── Player Stats ──
  if (playerStats.length > 0) {
    lines.push('## ESTATÍSTICAS INDIVIDUAIS')
    lines.push('')
    lines.push('| # | Nome | Pos | Ataques | Kills | A.Eff | Saques | Aces | Recep. | Rec.A | Bloq.Pts | Pontos |')
    lines.push('|---|------|-----|---------|-------|-------|--------|------|--------|-------|----------|--------|')
    playerStats.forEach(({ info, stats }) => {
      lines.push(
        `| #${info.number} | ${info.name} | ${posLabel(info.position)} ` +
          `| ${stats.attack.total} | ${stats.attack.kills} | - ` +
          `| ${stats.serve.total} | ${stats.serve.aces} ` +
          `| ${stats.reception.total} | ${stats.reception.perfect} ` +
          `| ${stats.block.points} | **${stats.points}** |`
      )
    })
    lines.push('')
  }

  // ── Set by Set ──
  if (setNumbers.length > 1) {
    lines.push('## ANÁLISE SET A SET')
    lines.push('')
    setNumbers.forEach((setNum) => {
      const sa = teamActions.filter((a) => a.set === setNum)
      const sv = sa.filter((a) => a.action === 'serve')
      const at = sa.filter((a) => a.action === 'attack')
      const rc = sa.filter((a) => a.action === 'reception')
      const setScore = sets[(setNum as number) - 1]
      const scoreStr = setScore ? `${setScore.home}–${setScore.away}` : 'N/A'
      const kills = countSub(at, 'kill', 'tip', 'block_out')
      const aces = countSub(sv, 'ace')
      const recPerf = countSub(rc, 'perfect', 'excellent', 'a')

      lines.push(`**Set ${setNum}** (${scoreStr}) — ${sa.length} ações`)
      lines.push(
        `- Ataques: ${at.length} | Kills: ${kills} (${pct(kills, at.length)}%) | ` +
          `Saques: ${sv.length} | Aces: ${aces} | ` +
          `Recepções: ${rc.length} | Perfeitas: ${recPerf}`
      )
      lines.push('')
    })
  }

  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('   FIM DO RELATÓRIO DE DADOS')
  lines.push('═══════════════════════════════════════════════════════════════')

  return lines.join('\n')
}

// ─── Full Prompt (System + Data) ───────────────────────────────────────────────

export function generateFullPrompt(
  match: GameMatch,
  actions: ScoutAction[],
  playerInfoMap: PlayerInfo
): string {
  const dataReport = generateAIPromptText(match, actions, playerInfoMap)
  return `${AGENT_SYSTEM_PROMPT}\n\n---\n\n${dataReport}`
}
