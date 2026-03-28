import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')

  if (!teamId) {
    return NextResponse.json({ error: 'teamId é obrigatório' }, { status: 400 })
  }

  try {
    const presets = await prisma.playerPreset.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(presets)
  } catch (error) {
    console.error('Erro ao buscar presets:', error)
    return NextResponse.json({ error: 'Erro ao buscar presets' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, teamId, playerIds } = await request.json()

    if (!name || !teamId || !Array.isArray(playerIds) || playerIds.length === 0) {
      return NextResponse.json(
        { error: 'name, teamId e playerIds são obrigatórios' },
        { status: 400 }
      )
    }

    const existing = await prisma.playerPreset.findUnique({
      where: { teamId_name: { teamId, name: name.trim() } },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Já existe um preset com o nome "${name}" nesta equipe` },
        { status: 400 }
      )
    }

    const preset = await prisma.playerPreset.create({
      data: {
        name: name.trim(),
        teamId,
        playerIds: JSON.stringify(playerIds),
      },
    })

    return NextResponse.json(preset, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar preset:', error)
    return NextResponse.json({ error: 'Erro ao criar preset' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
    }

    await prisma.playerPreset.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar preset:', error)
    return NextResponse.json({ error: 'Erro ao deletar preset' }, { status: 500 })
  }
}
