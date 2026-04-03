/**
 * GET /api/ai/insights
 *
 * Busca insight(s) cacheado(s).
 * Query params: type, matchId, playerId, teamId, metricKey
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const teamId = searchParams.get('teamId')
    const matchId = searchParams.get('matchId')
    const playerId = searchParams.get('playerId')
    const metricKey = searchParams.get('metricKey')

    if (!type || !teamId) {
      return NextResponse.json({ error: 'type e teamId são obrigatórios' }, { status: 400 })
    }

    const insight = await prisma.aIInsight.findFirst({
      where: {
        type,
        teamId,
        matchId: matchId ?? null,
        playerId: playerId ?? null,
        metricKey: metricKey ?? null,
      },
    })

    if (!insight) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({
      found: true,
      insight: {
        id: insight.id,
        type: insight.type,
        response: insight.response,
        cached: true,
        createdAt: insight.createdAt,
        provider: insight.provider,
        tokensUsed: insight.tokensUsed,
        costEstimate: insight.costEstimate,
      },
    })
  } catch (err: any) {
    console.error('[AI Insights GET Error]', err)
    return NextResponse.json({ error: err.message || 'Erro ao buscar insight' }, { status: 500 })
  }
}
