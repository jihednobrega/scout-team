/**
 * Prompt Builder: Análise Completa de Partida (Tier A — Sonnet)
 * Reutiliza o prompt e formatação já existentes em generateAIPrompt.ts
 */

import { AGENT_SYSTEM_PROMPT, generateAIPromptText } from '@/lib/generateAIPrompt'
import type { GameMatch } from '@/types/game'
import type { ScoutAction } from '@/types/scout'
import type { AIPrompt } from '../types'

type PlayerInfo = Record<string, { name: string; number: string; position: string }>

export function buildMatchAnalysisPrompt(
  match: GameMatch,
  actions: ScoutAction[],
  playerInfoMap: PlayerInfo
): AIPrompt {
  // Remove a instrução de envolver em bloco de código markdown
  // já que a resposta será renderizada diretamente no app
  const systemPrompt = AGENT_SYSTEM_PROMPT.replace(
    /FORMATO DE ENTREGA:[\s\S]*$/,
    'FORMATO DE ENTREGA:\nResponda diretamente em Markdown formatado. Não envolva em blocos de código.'
  )

  return {
    systemPrompt,
    userMessage: generateAIPromptText(match, actions, playerInfoMap),
  }
}
