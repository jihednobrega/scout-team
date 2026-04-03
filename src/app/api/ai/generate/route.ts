/**
 * POST /api/ai/generate
 *
 * Gera insight via IA ou retorna cache.
 * - Tier A (Sonnet): retorna streaming SSE
 * - Tier B (GPT-4o-mini): retorna JSON completo
 * - Cache hit: retorna JSON com cached: true
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateInsight } from '@/lib/ai/service'
import { AI_INSIGHT_TYPES, INSIGHT_CONFIG, type AIGenerateRequest } from '@/lib/ai/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, teamId, matchId, playerId, metricKey, metricValue, forceRegenerate } = body

    // Validação
    if (!type || !teamId) {
      return NextResponse.json({ error: 'type e teamId são obrigatórios' }, { status: 400 })
    }

    if (!AI_INSIGHT_TYPES.includes(type)) {
      return NextResponse.json({ error: `Tipo inválido: ${type}` }, { status: 400 })
    }

    const config = INSIGHT_CONFIG[type as keyof typeof INSIGHT_CONFIG]

    // Guard: verificar se a API key do provider está configurada
    if (config.provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY não configurada. Adicione a chave no arquivo .env' },
        { status: 503 }
      )
    }
    if (config.provider === 'openai' && !process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurada. Adicione a chave no arquivo .env' },
        { status: 503 }
      )
    }

    const req: AIGenerateRequest = {
      type: type as AIGenerateRequest['type'],
      teamId,
      matchId: matchId || undefined,
      playerId: playerId || undefined,
      metricKey: metricKey || undefined,
      metricValue: metricValue || undefined,
      forceRegenerate: forceRegenerate === true,
    }

    const result = await generateInsight(req)

    switch (result.mode) {
      case 'cached':
        return NextResponse.json({ cached: true, insight: result.insight })

      case 'complete':
        return NextResponse.json({ cached: false, insight: result.insight })

      case 'streaming': {
        const { stream, onComplete } = result

        // Lê o stream da Anthropic no servidor, envia chunks ao cliente,
        // e persiste ao final — independente de erros de conexão do cliente.
        const readable = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = stream.getReader()
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                try { controller.enqueue(value) } catch { /* cliente desconectou — continua lendo */ }
              }
            } catch (err) {
              console.error('[AI Stream Read Error]', err)
            } finally {
              // Persiste ANTES de fechar o stream — evita race condition no cache check do cliente
              try { await onComplete() } catch (err) {
                console.error('[AI Persist Error]', err)
              }
              try { controller.close() } catch {}
            }
          },
        })

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      }
    }
  } catch (err: any) {
    console.error('[AI Generate Error]', err)
    const status = err.message?.includes('Aguarde') ? 429 : 500
    return NextResponse.json(
      { error: err.message || 'Erro ao gerar insight' },
      { status }
    )
  }
}
