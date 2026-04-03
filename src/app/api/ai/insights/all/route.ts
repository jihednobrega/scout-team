/**
 * GET /api/ai/insights/all?teamId=xxx
 *
 * Retorna todos os insights de IA de uma equipe,
 * com informações de partida e jogador resolvidas.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const teamId = request.nextUrl.searchParams.get('teamId')

  if (!teamId) {
    return NextResponse.json({ error: 'teamId obrigatório' }, { status: 400 })
  }

  const insights = await prisma.aIInsight.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    include: {
      match: { select: { homeTeam: true, awayTeam: true, date: true, result: true, finalScore: true } },
      player: { select: { name: true, position: true, jerseyNumber: true } },
    },
  })

  return NextResponse.json(insights)
}
