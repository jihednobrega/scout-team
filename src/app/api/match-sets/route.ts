// app/api/match-sets/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/match-sets?matchId=X — Listar sets de uma partida
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const matchId = searchParams.get('matchId')

  if (!matchId) {
    return NextResponse.json({ error: 'matchId é obrigatório' }, { status: 400 })
  }

  const sets = await prisma.matchSet.findMany({
    where: { matchId },
    orderBy: { number: 'asc' },
  })

  return NextResponse.json(sets)
}

// POST /api/match-sets — Criar um set dentro de uma partida
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { matchId, number } = body

    if (!matchId || number == null) {
      return NextResponse.json(
        { error: 'matchId e number são obrigatórios' },
        { status: 400 }
      )
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) {
      return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
    }

    const existing = await prisma.matchSet.findUnique({
      where: { matchId_number: { matchId, number } },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Set ${number} já existe para esta partida` },
        { status: 409 }
      )
    }

    const matchSet = await prisma.matchSet.create({
      data: { matchId, number },
    })

    return NextResponse.json(matchSet, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar set:', error)
    return NextResponse.json({ error: 'Erro ao criar set' }, { status: 500 })
  }
}
