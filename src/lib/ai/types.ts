/**
 * Tipos compartilhados da camada de IA
 */

export const AI_INSIGHT_TYPES = [
  'match_analysis',
  'player_dev',
  'tactical_brief',
  'lineup_opt',
  'stats_overview',
  'match_summary',
  'athlete_insight',
  'team_health',
  'post_game_reflection',
  'pattern_insights',
  'metric_explainer',
] as const

export type AIInsightType = (typeof AI_INSIGHT_TYPES)[number]

export type AITier = 'A' | 'B'
export type AIProvider = 'anthropic' | 'openai'

/** Mapeamento tipo → tier/provider */
export const INSIGHT_CONFIG: Record<AIInsightType, { tier: AITier; provider: AIProvider; maxTokens: number }> = {
  match_analysis:       { tier: 'A', provider: 'anthropic', maxTokens: 2048 },
  player_dev:           { tier: 'A', provider: 'anthropic', maxTokens: 1500 },
  tactical_brief:       { tier: 'A', provider: 'anthropic', maxTokens: 2048 },
  lineup_opt:           { tier: 'A', provider: 'anthropic', maxTokens: 1500 },
  stats_overview:       { tier: 'A', provider: 'anthropic', maxTokens: 4096 },
  match_summary:        { tier: 'B', provider: 'anthropic', maxTokens: 512 },
  athlete_insight:      { tier: 'B', provider: 'anthropic', maxTokens: 512 },
  team_health:          { tier: 'B', provider: 'anthropic', maxTokens: 512 },
  post_game_reflection: { tier: 'B', provider: 'anthropic', maxTokens: 512 },
  pattern_insights:     { tier: 'B', provider: 'anthropic', maxTokens: 512 },
  metric_explainer:     { tier: 'B', provider: 'anthropic', maxTokens: 256 },
}

export interface AIPrompt {
  systemPrompt: string
  userMessage: string
}

export interface AIGenerateRequest {
  type: AIInsightType
  teamId: string
  matchId?: string
  playerId?: string
  metricKey?: string
  metricValue?: string
  forceRegenerate?: boolean
}

export interface AIInsightResult {
  id: string
  type: AIInsightType
  response: string
  cached: boolean
  createdAt: Date
  provider: AIProvider
  tokensUsed?: number | null
  costEstimate?: number | null
}

/** Custo por 1M tokens (em USD) — atualizar conforme pricing muda */
export const TOKEN_PRICING: Record<AIProvider, { input: number; output: number }> = {
  anthropic: { input: 3.0,  output: 15.0 },  // Claude Sonnet 4
  openai:    { input: 0.15, output: 0.60 },   // GPT-4o-mini
}

/** Converte tokens + provider em custo estimado em BRL */
export function estimateCostBRL(
  provider: AIProvider,
  inputTokens: number,
  outputTokens: number,
  usdToBrl = 5.5
): number {
  const pricing = TOKEN_PRICING[provider]
  const usd = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  return parseFloat((usd * usdToBrl).toFixed(4))
}
