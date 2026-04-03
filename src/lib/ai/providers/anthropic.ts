/**
 * Provider Anthropic — Claude Sonnet (streaming)
 * Usado para análises Tier A (complexas)
 */

import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')
    client = new Anthropic({ apiKey })
  }
  return client
}

const MODEL = 'claude-sonnet-4-20250514'

/** Chamada simples (não-streaming) para respostas Tier B */
export async function callClaude(params: {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
}): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const anthropic = getClient()
  const { systemPrompt, userMessage, maxTokens = 512 } = params

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  }
}

interface StreamResult {
  stream: ReadableStream<Uint8Array>
  getUsage: () => Promise<{ inputTokens: number; outputTokens: number; fullText: string }>
}

export async function streamClaude(params: {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
}): Promise<StreamResult> {
  const anthropic = getClient()
  const { systemPrompt, userMessage, maxTokens = 2048 } = params

  let inputTokens = 0
  let outputTokens = 0
  let fullText = ''
  let resolveUsage: (val: { inputTokens: number; outputTokens: number; fullText: string }) => void
  const usagePromise = new Promise<{ inputTokens: number; outputTokens: number; fullText: string }>(
    (resolve) => { resolveUsage = resolve }
  )

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    stream: true,
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const text = event.delta.text
            fullText += text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
          if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens
          }
          if (event.type === 'message_start' && event.message.usage) {
            inputTokens = event.message.usage.input_tokens
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
        resolveUsage!({ inputTokens, outputTokens, fullText })
      } catch (err) {
        controller.error(err)
        // Preserva o texto já acumulado — não descarta o que foi gerado
        resolveUsage!({ inputTokens, outputTokens, fullText })
      }
    },
  })

  return { stream, getUsage: () => usagePromise }
}
