/**
 * Provider OpenAI — GPT-4o-mini (sem streaming)
 * Usado para insights Tier B (rápidos e baratos)
 */

import OpenAI from 'openai'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY não configurada')
    client = new OpenAI({ apiKey })
  }
  return client
}

const MODEL = 'gpt-4o-mini'

export async function callGPTMini(params: {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
}): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const openai = getClient()
  const { systemPrompt, userMessage, maxTokens = 512 } = params

  const response = await openai.chat.completions.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const inputTokens = response.usage?.prompt_tokens ?? 0
  const outputTokens = response.usage?.completion_tokens ?? 0

  return { text, inputTokens, outputTokens }
}
