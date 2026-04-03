/**
 * GET /api/ai/usage
 *
 * Retorna estatísticas de uso da IA: total de chamadas, tokens, custo estimado,
 * breakdown por provider e por tipo de insight.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get('teamId')

  const where = teamId ? { teamId } : {}

  const insights = await prisma.aIInsight.findMany({
    where,
    select: {
      type: true,
      tier: true,
      provider: true,
      tokensUsed: true,
      costEstimate: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const totalCalls = insights.length
  const totalTokens = insights.reduce((sum, i) => sum + (i.tokensUsed ?? 0), 0)
  const totalCostBRL = insights.reduce((sum, i) => sum + (i.costEstimate ?? 0), 0)

  // By provider
  const byProvider: Record<string, { calls: number; tokens: number; costBRL: number }> = {}
  for (const i of insights) {
    if (!byProvider[i.provider]) byProvider[i.provider] = { calls: 0, tokens: 0, costBRL: 0 }
    byProvider[i.provider].calls++
    byProvider[i.provider].tokens += i.tokensUsed ?? 0
    byProvider[i.provider].costBRL += i.costEstimate ?? 0
  }

  // By type
  const byType: Record<string, { calls: number; tokens: number; costBRL: number; tier: string }> = {}
  for (const i of insights) {
    if (!byType[i.type]) byType[i.type] = { calls: 0, tokens: 0, costBRL: 0, tier: i.tier }
    byType[i.type].calls++
    byType[i.type].tokens += i.tokensUsed ?? 0
    byType[i.type].costBRL += i.costEstimate ?? 0
  }

  // Last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recent = insights.filter(i => i.createdAt >= sevenDaysAgo)
  const recentCostBRL = recent.reduce((sum, i) => sum + (i.costEstimate ?? 0), 0)
  const recentCalls = recent.length

  return NextResponse.json({
    totalCalls,
    totalTokens,
    totalCostBRL: parseFloat(totalCostBRL.toFixed(4)),
    recentCalls,
    recentCostBRL: parseFloat(recentCostBRL.toFixed(4)),
    byProvider,
    byType,
  })
}
