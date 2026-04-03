// GET /api/players/stats?teamId=... — Stats agregadas de todos os jogadores
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ScoutAction } from '@/types/scout'
import { calculatePlayerStats } from '@/utils/stats'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'teamId é obrigatório' }, { status: 400 })
    }

    // Buscar todas as partidas finalizadas da equipe com suas ações
    const matches = await prisma.match.findMany({
      where: { teamId, status: 'finalized' },
      include: {
        actions: {
          select: {
            id: true,
            playerId: true,
            action: true,
            subAction: true,
            zone: true,
            setNumber: true,
            matchId: true,
            efficiencyValue: true,
            phase: true,
            rallyId: true,
            timestamp: true,
          },
        },
      },
    })

    // Mapear ações do Prisma para o formato ScoutAction do frontend
    const allActions: ScoutAction[] = matches.flatMap((m) =>
      m.actions.map((a) => ({
        id: a.id,
        time: '',
        player: a.playerId || '',
        action: a.action as ScoutAction['action'],
        subAction: a.subAction,
        zone: a.zone,
        coordinates: { x: 0, y: 0 },
        matchId: a.matchId,
        set: a.setNumber,
        timestamp: a.timestamp,
        efficiencyValue: a.efficiencyValue ?? undefined,
        phase: (a.phase as 'sideout' | 'transition') || undefined,
        rallyId: a.rallyId ?? undefined,
      }))
    )

    // Buscar jogadores da equipe
    const players = await prisma.player.findMany({
      where: { teamId },
      select: { id: true },
    })

    // Contar partidas em que cada jogador participou
    const playerMatchCounts = new Map<string, number>()
    for (const match of matches) {
      const playerIds = new Set(match.actions.map((a) => a.playerId).filter(Boolean))
      for (const pid of playerIds) {
        playerMatchCounts.set(pid!, (playerMatchCounts.get(pid!) || 0) + 1)
      }
    }

    // Calcular stats para cada jogador
    const statsMap: Record<string, ReturnType<typeof calculatePlayerStats>> = {}
    for (const player of players) {
      const matchesPlayed = playerMatchCounts.get(player.id) || 0
      statsMap[player.id] = calculatePlayerStats(player.id, allActions, matchesPlayed)
    }

    return NextResponse.json({
      totalMatches: matches.length,
      playerStats: statsMap,
    })
  } catch (error) {
    console.error('Erro ao calcular stats:', error)
    return NextResponse.json({ error: 'Erro ao calcular stats' }, { status: 500 })
  }
}
