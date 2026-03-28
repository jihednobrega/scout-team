// app/api/matches/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeEfficiency } from '@/lib/efficiency'

// GET /api/matches?teamId=... — Listar partidas de uma equipe
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId é obrigatório' },
        { status: 400 }
      )
    }

    const status = searchParams.get('status')

    const where: Record<string, unknown> = { teamId }
    if (status) {
      where.status = status
    } else {
      // Por padrão, excluir partidas em andamento das listagens
      where.status = { not: 'in_progress' }
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        _count: {
          select: { actions: true },
        },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(matches)
  } catch (error) {
    console.error('Erro ao buscar partidas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar partidas' },
      { status: 500 }
    )
  }
}

// POST /api/matches — Criar partida com ações (transação atômica)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      teamId,
      homeTeam,
      awayTeam,
      tournament,
      location,
      date,
      result,
      finalScore,
      sets,
      stats,
      duration,
      actions,
    } = body

    // Validações
    if (!teamId || !homeTeam || !awayTeam || !result || !finalScore) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: teamId, homeTeam, awayTeam, result, finalScore' },
        { status: 400 }
      )
    }

    if (!['vitoria', 'derrota', 'em_andamento'].includes(result)) {
      return NextResponse.json(
        { error: 'result deve ser "vitoria", "derrota" ou "em_andamento"' },
        { status: 400 }
      )
    }

    // Verificar se o time existe
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json(
        { error: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    // Criar partida + ações em transação
    const match = await prisma.$transaction(async (tx) => {
      const createdMatch = await tx.match.create({
        data: {
          teamId,
          homeTeam,
          awayTeam,
          opponent: awayTeam,
          tournament: tournament || null,
          location: location || null,
          date: new Date(date),
          result,
          finalScore,
          sets: JSON.stringify(sets || []),
          stats: stats ? JSON.stringify(stats) : null,
          duration: duration || null,
          status: body.status || 'in_progress',
        },
      })

      // Inserir ações em batch se houver
      if (actions && Array.isArray(actions) && actions.length > 0) {
        const actionsData = actions.map((action: any) => ({
          id: action.id || undefined,
          matchId: createdMatch.id,
          playerId: action.playerId || action.player,
          time: action.time || '',
          action: action.action,
          subAction: action.subAction,
          zone: action.zone ?? 0,
          coordinateX: action.coordinateX ?? action.coordinates?.x ?? 0,
          coordinateY: action.coordinateY ?? action.coordinates?.y ?? 0,
          setNumber: action.setNumber ?? action.set ?? 1,
          timestamp: action.timestamp ? new Date(action.timestamp) : new Date(),
          videoTimestamp: action.videoTimestamp || null,
          efficiencyValue: computeEfficiency(action.action, action.subAction),
          phase: action.phase || null,
          rallyId: action.rallyId || null,
          fullData: action.fullData
            ? (typeof action.fullData === 'string' ? action.fullData : JSON.stringify(action.fullData))
            : null,
        }))

        await tx.scoutAction.createMany({
          data: actionsData,
        })
      }

      return createdMatch
    })

    // Retornar partida com contagem de ações
    const matchWithCount = await prisma.match.findUnique({
      where: { id: match.id },
      include: {
        _count: { select: { actions: true } },
      },
    })

    return NextResponse.json(matchWithCount, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar partida:', error)
    return NextResponse.json(
      { error: 'Erro ao criar partida' },
      { status: 500 }
    )
  }
}
