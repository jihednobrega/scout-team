// app/api/match-sets/[id]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/match-sets/:id — Atualizar ou finalizar um set
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { homeScore, awayScore, duration, status } = body

    const matchSet = await prisma.matchSet.findUnique({ where: { id } })
    if (!matchSet) {
      return NextResponse.json({ error: 'Set não encontrado' }, { status: 404 })
    }

    const updated = await prisma.matchSet.update({
      where: { id },
      data: {
        ...(homeScore != null && { homeScore }),
        ...(awayScore != null && { awayScore }),
        ...(duration != null && { duration }),
        ...(status != null && { status }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erro ao atualizar set:', error)
    return NextResponse.json({ error: 'Erro ao atualizar set' }, { status: 500 })
  }
}

// DELETE /api/match-sets/:id — Deletar um set e suas ações (CASCADE)
// Permite regravar: deletar set N → criar novo set N (mesmo number, novo UUID)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const matchSet = await prisma.matchSet.findUnique({ where: { id } })
    if (!matchSet) {
      return NextResponse.json({ error: 'Set não encontrado' }, { status: 404 })
    }

    // Desvincular ações antes de deletar (setId → null) para não perder dados
    // As ações continuam existindo na partida, apenas perdem a referência ao set
    await prisma.scoutAction.updateMany({
      where: { setId: id },
      data: { setId: null },
    })

    await prisma.matchSet.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar set:', error)
    return NextResponse.json({ error: 'Erro ao deletar set' }, { status: 500 })
  }
}
