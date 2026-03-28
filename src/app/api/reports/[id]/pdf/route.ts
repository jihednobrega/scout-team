import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateMatchReportPdf } from '@/utils/generateMatchPdf'

/**
 * GET /api/reports/[id]/pdf
 * Generates a professional Data Volley-style PDF for the given match.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        actions: {
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
    }

    // Get all players that participated in this match
    const playerIds = [...new Set(match.actions.filter(a => a.action !== 'opponent_error').map((a) => a.playerId))].filter((id): id is string => id !== null)
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
      },
    })

    // Map Prisma types to PDF generator types
    const matchData = {
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      opponent: match.opponent,
      tournament: match.tournament,
      location: match.location,
      date: match.date,
      result: match.result,
      finalScore: match.finalScore,
      sets: match.sets,
      duration: match.duration,
      actions: match.actions.map((a) => ({
        id: a.id,
        matchId: a.matchId,
        playerId: a.playerId ?? '',
        action: a.action,
        subAction: a.subAction,
        zone: a.zone,
        setNumber: a.setNumber,
        efficiencyValue: a.efficiencyValue,
        phase: a.phase,
        rallyId: a.rallyId,
        fullData: a.fullData,
        timestamp: a.timestamp.toISOString(),
      })),
    }

    const pdfBuffer = generateMatchReportPdf(matchData, players)

    // Build filename
    const dateStr = new Date(match.date).toISOString().split('T')[0]
    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '-').replace(/-+/g, '-')
    const filename = `Scout-Team_${sanitize(match.homeTeam)}_vs_${sanitize(match.awayTeam)}_${dateStr}.pdf`

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório PDF' },
      { status: 500 }
    )
  }
}
