// app/api/teams/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/teams - Listar todas as equipes
export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        _count: {
          select: { players: true, matches: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Erro ao buscar equipes:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar equipes' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Criar nova equipe
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, logo } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Nome da equipe é obrigatório' },
        { status: 400 }
      )
    }

    const team = await prisma.team.create({
      data: {
        name,
        logo,
      },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar equipe:', error)
    return NextResponse.json(
      { error: 'Erro ao criar equipe' },
      { status: 500 }
    )
  }
}

// PUT /api/teams - Atualizar equipe
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, name, logo } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID da equipe é obrigatório' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (logo !== undefined) data.logo = logo

    const team = await prisma.team.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { players: true, matches: true },
        },
      },
    })

    return NextResponse.json(team)
  } catch (error) {
    console.error('Erro ao atualizar equipe:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar equipe' },
      { status: 500 }
    )
  }
}

// DELETE /api/teams - Deletar equipe
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da equipe é obrigatório' },
        { status: 400 }
      )
    }

    await prisma.team.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar equipe:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar equipe' },
      { status: 500 }
    )
  }
}
