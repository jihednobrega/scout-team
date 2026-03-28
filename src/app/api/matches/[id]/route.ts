// app/api/matches/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/matches/:id — Obter partida completa com ações
export async function GET(_request: Request, { params }: RouteParams) {
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
      return NextResponse.json(
        { error: 'Partida não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(match)
  } catch (error) {
    console.error('Erro ao buscar partida:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar partida' },
      { status: 500 }
    )
  }
}

// PUT /api/matches/:id — Atualizar dados da partida
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.match.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Partida não encontrada' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.result) updateData.result = body.result
    if (body.finalScore) updateData.finalScore = body.finalScore
    if (body.sets) updateData.sets = JSON.stringify(body.sets)
    if (body.stats) updateData.stats = JSON.stringify(body.stats)
    if (body.duration !== undefined) updateData.duration = body.duration
    if (body.status) updateData.status = body.status

    const updated = await prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { actions: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar partida:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar partida' },
      { status: 500 }
    )
  }
}

// DELETE /api/matches/:id — Deletar partida e ações (cascade)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params

    const existing = await prisma.match.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Partida não encontrada' },
        { status: 404 }
      )
    }

    await prisma.match.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar partida:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar partida' },
      { status: 500 }
    )
  }
}
