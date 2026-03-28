// app/api/scout-actions/heatmap/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export interface HeatmapAction {
  id: string
  playerId: string
  action: string
  subAction: string
  zone: number
  setNumber: number
  phase: string | null
  destX: number
  destY: number
  destZone: number
  rotation: number | null
  serveType: string | null
}

/** @deprecated Use HeatmapAction instead */
export type HeatmapAttack = HeatmapAction

/**
 * GET /api/scout-actions/heatmap?matchId=...&type=attack|serve&playerId=...&setNumber=...&rotation=...
 * Returns actions with destination coordinates for heatmap visualization.
 * `type` defaults to "attack". Use "serve" for serve heatmap.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get('matchId')
    const teamId = searchParams.get('teamId')
    const actionType = searchParams.get('type') || 'attack'
    const playerId = searchParams.get('playerId')
    const setNumber = searchParams.get('setNumber')
    const rotation = searchParams.get('rotation')

    // Build where clause
    const where: Record<string, unknown> = {
      action: actionType,
    }

    if (matchId) {
      where.matchId = matchId
    } else if (teamId) {
      where.match = { teamId }
    } else {
      return NextResponse.json(
        { error: 'matchId ou teamId é obrigatório' },
        { status: 400 }
      )
    }

    if (playerId) where.playerId = playerId
    if (setNumber) where.setNumber = parseInt(setNumber)

    const actions = await prisma.scoutAction.findMany({
      where,
      select: {
        id: true,
        playerId: true,
        action: true,
        subAction: true,
        zone: true,
        setNumber: true,
        phase: true,
        fullData: true,
      },
      orderBy: { timestamp: 'asc' },
    })

    // Parse fullData and extract destination coordinates
    const result: HeatmapAction[] = actions
      .map((a) => {
        const full = a.fullData ? JSON.parse(a.fullData as string) : {}
        if (full.destX == null || full.destY == null) return null

        // Filter by rotation if specified
        if (rotation && full.rotation !== parseInt(rotation)) return null

        return {
          id: a.id,
          playerId: a.playerId,
          action: a.action,
          subAction: a.subAction,
          zone: a.zone,
          setNumber: a.setNumber,
          phase: a.phase,
          destX: full.destX,
          destY: full.destY,
          destZone: full.destZone ?? 0,
          rotation: full.rotation ?? null,
          serveType: full.serveType ?? null,
        }
      })
      .filter((a): a is HeatmapAction => a !== null)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao buscar dados do heatmap:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do heatmap' },
      { status: 500 }
    )
  }
}
