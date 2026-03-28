// app/api/scout-actions/route.ts
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { computeEfficiency } from '@/lib/efficiency'

// GET /api/scout-actions?matchId=... — Listar ações de uma partida
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId é obrigatório' },
        { status: 400 }
      )
    }

    const actions = await prisma.scoutAction.findMany({
      where: { matchId },
      orderBy: { timestamp: 'asc' },
    })

    return NextResponse.json(actions)
  } catch (error) {
    console.error('Erro ao buscar ações:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar ações' },
      { status: 500 }
    )
  }
}

// POST /api/scout-actions — Salvar ações em lote (auto-save durante o jogo)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { matchId, actions } = body

    if (!matchId) {
      return NextResponse.json(
        { error: 'matchId é obrigatório' },
        { status: 400 }
      )
    }

    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { error: 'actions deve ser um array com pelo menos uma ação' },
        { status: 400 }
      )
    }

    // Verificar se a partida existe
    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) {
      return NextResponse.json(
        { error: 'Partida não encontrada' },
        { status: 404 }
      )
    }

    // Construir mapa número-de-camisa → UUID para resolver player IDs
    // (ScoutAction.player armazena número da camisa, mas DB precisa de UUID)
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: match.teamId },
      select: { id: true, jerseyNumber: true },
    })
    const jerseyToUuid = new Map(teamPlayers.map((p) => [p.jerseyNumber.toString(), p.id]))

    // Buscar IDs já existentes para evitar duplicatas
    const existingIds = await prisma.scoutAction.findMany({
      where: {
        matchId,
        id: { in: actions.map((a: any) => a.id).filter(Boolean) },
      },
      select: { id: true },
    })
    const existingIdSet = new Set(existingIds.map((a) => a.id))

    // Filtrar apenas ações novas e resolver número de camisa → UUID
    const newActions = actions
      .filter((a: any) => !a.id || !existingIdSet.has(a.id))
      .map((action: any) => {
        // Resolver playerId: preferir UUID explícito (contém '-'), senão mapear número de camisa
        // Resolver UUID: preferir playerId explícito (tem '-'), senão mapear número de camisa.
        // Ações do adversário (player='0') ficam com undefined — campo opcional no schema.
        const resolvedPlayerId: string | undefined =
          (action.playerId && String(action.playerId).includes('-'))
            ? action.playerId
            : (jerseyToUuid.get(String(action.player)) ?? undefined)
        return {
          id: action.id || undefined,
          matchId,
          playerId: resolvedPlayerId,
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
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)

    if (newActions.length === 0) {
      return NextResponse.json({ inserted: 0, message: 'Nenhuma ação nova para inserir' })
    }

    await prisma.scoutAction.createMany({
      data: newActions as Prisma.ScoutActionCreateManyInput[],
    })

    return NextResponse.json(
      { inserted: newActions.length, message: `${newActions.length} ações salvas` },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao salvar ações:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar ações' },
      { status: 500 }
    )
  }
}
