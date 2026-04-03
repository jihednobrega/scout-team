/**
 * Prompt Builder: Explicador de Métricas (Tier B — GPT-4o-mini)
 * Explica uma métrica em linguagem simples
 */

import type { AIPrompt } from '../types'

const METRIC_CONTEXT: Record<string, string> = {
  attack_efficiency: 'Eficiência de Ataque — mede (kills - erros) / total de ataques. Escala de -1 a +1.',
  serve_efficiency: 'Eficiência de Saque — média ponderada dos resultados de saque (ace=+1, eficiente=+0.5, neutro=0, erro=-1).',
  reception_efficiency: 'Eficiência de Recepção — qualidade da recepção (A=+1, B=+0.5, C=-0.5, erro=-1).',
  hitting_percentage: 'Hitting Percentage — fórmula americana: (kills - erros) / tentativas. Referência: >0.300 é excelente.',
  sideout_rate: 'Taxa de Side-Out — percentual de rallies ganhos quando o time está recebendo.',
  breakpoint_rate: 'Taxa de Break-Point — percentual de rallies ganhos quando o time está sacando.',
  player_rating: 'Nota do Jogador — escala de 0 a 10 baseada na eficiência ponderada de todos os fundamentos.',
  setter_entropy: 'Entropia Tática do Levantador — mede variedade de distribuição. Alta = imprevisível = melhor.',
  rotation_balance: 'Equilíbrio de Rotação — diferença de performance entre a melhor e pior rotação (P1-P6).',
}

export function buildMetricExplainerPrompt(metricKey: string, value?: string): AIPrompt {
  const context = METRIC_CONTEXT[metricKey] || metricKey

  return {
    systemPrompt: `Você é um professor de voleibol explicando uma métrica estatística para um atleta ou treinador iniciante. Explique em 2-3 frases simples (máximo 200 caracteres): o que a métrica mede, o que é um valor bom vs. ruim, e por que ela importa no jogo. Responda em português brasileiro. Não use markdown.`,
    userMessage: `Métrica: ${context}${value ? `\nValor atual: ${value}` : ''}`,
  }
}
