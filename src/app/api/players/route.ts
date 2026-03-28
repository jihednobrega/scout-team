// app/api/players/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const missingSecondaryColumnMessages = [
  'no such column: secondaryPositions',
  "Unknown column 'secondaryPositions'",
]

const duplicateSecondaryColumnMessages = [
  'duplicate column name: secondaryPositions',
  'duplicate column name: secondarypositions',
  'column "secondaryPositions" of relation "players" already exists',
]

const normalizeSecondaryPositions = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : []
    } catch {
      return []
    }
  }

  return []
}

const isMissingSecondaryColumnError = (error: unknown) =>
  error instanceof Error &&
  missingSecondaryColumnMessages.some((message) =>
    error.message.includes(message)
  )

const isDuplicateSecondaryColumnError = (error: unknown) =>
  error instanceof Error &&
  duplicateSecondaryColumnMessages.some((message) =>
    error.message.includes(message)
  )

const ensureSecondaryPositionsColumn = async () => {
  try {
    await prisma.$executeRawUnsafe(
      "ALTER TABLE players ADD COLUMN secondaryPositions TEXT DEFAULT '[]'"
    )
    await prisma.$executeRawUnsafe(
      "UPDATE players SET secondaryPositions = '[]' WHERE secondaryPositions IS NULL"
    )
  } catch (error) {
    if (!isDuplicateSecondaryColumnError(error)) {
      throw error
    }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')

  if (!teamId) {
    return NextResponse.json({ error: 'teamId é obrigatório' }, { status: 400 })
  }

  const fetchPlayers = async (retry = false) => {
    try {
      const players = await prisma.player.findMany({
        where: { teamId },
        orderBy: { jerseyNumber: 'asc' },
      })

      return NextResponse.json(players)
    } catch (error) {
      if (!retry && isMissingSecondaryColumnError(error)) {
        await ensureSecondaryPositionsColumn()
        return fetchPlayers(true)
      }

      console.error('Erro ao buscar jogadores:', error)
      const message =
        error instanceof Error ? error.message : 'Erro ao buscar jogadores'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return fetchPlayers()
}

export async function POST(request: Request) {
  const body = await request.json()

  const handleCreate = async (retry = false): Promise<Response> => {
    try {
      const { teamId, name, jerseyNumber, position, secondaryPositions, photo } =
        body

      if (!teamId || !name || !jerseyNumber || !position || !photo) {
        return NextResponse.json(
          { error: 'Todos os campos são obrigatórios' },
          { status: 400 }
        )
      }

      if (!Array.isArray(secondaryPositions)) {
        return NextResponse.json(
          { error: 'secondaryPositions deve ser um array' },
          { status: 400 }
        )
      }

      const jerseyNumberInt = parseInt(jerseyNumber, 10)
      if (
        Number.isNaN(jerseyNumberInt) ||
        jerseyNumberInt < 1 ||
        jerseyNumberInt > 99
      ) {
        return NextResponse.json(
          { error: 'Número da camisa inválido' },
          { status: 400 }
        )
      }

      const existing = await prisma.player.findFirst({
        where: {
          teamId,
          jerseyNumber: jerseyNumberInt,
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: `Número ${jerseyNumber} já está em uso nesta equipe` },
          { status: 400 }
        )
      }

      const player = await prisma.player.create({
        data: {
          teamId,
          name,
          jerseyNumber: jerseyNumberInt,
          position,
          secondaryPositions: JSON.stringify(
            normalizeSecondaryPositions(secondaryPositions)
          ),
          photo,
        },
      })

      return NextResponse.json(player, { status: 201 })
    } catch (error) {
      if (!retry && isMissingSecondaryColumnError(error)) {
        await ensureSecondaryPositionsColumn()
        return handleCreate(true)
      }

      console.error('Erro ao criar jogador:', error)
      const message =
        error instanceof Error ? error.message : 'Erro ao criar jogador'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return handleCreate()
}

export async function PUT(request: Request) {
  const body = await request.json()

  const handleUpdate = async (retry = false): Promise<Response> => {
    try {
      const { id, name, jerseyNumber, position, secondaryPositions, photo } =
        body

      if (!id) {
        return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
      }

      const player = await prisma.player.findUnique({ where: { id } })
      if (!player) {
        return NextResponse.json(
          { error: 'Jogador não encontrado' },
          { status: 404 }
        )
      }

      const jerseyNumberInt =
        jerseyNumber !== undefined
          ? parseInt(jerseyNumber, 10)
          : player.jerseyNumber

      if (
        Number.isNaN(jerseyNumberInt) ||
        jerseyNumberInt < 1 ||
        jerseyNumberInt > 99
      ) {
        return NextResponse.json(
          { error: 'Número da camisa inválido' },
          { status: 400 }
        )
      }

      if (jerseyNumberInt !== player.jerseyNumber) {
        const existing = await prisma.player.findFirst({
          where: {
            teamId: player.teamId,
            jerseyNumber: jerseyNumberInt,
            NOT: { id },
          },
        })

        if (existing) {
          return NextResponse.json(
            { error: `Número ${jerseyNumberInt} já está em uso nesta equipe` },
            { status: 400 }
          )
        }
      }

      const nextSecondary =
        secondaryPositions !== undefined
          ? normalizeSecondaryPositions(secondaryPositions)
          : normalizeSecondaryPositions(player.secondaryPositions)

      const updated = await prisma.player.update({
        where: { id },
        data: {
          name:
            typeof name === 'string' && name.trim().length > 0
              ? name
              : player.name,
          jerseyNumber: jerseyNumberInt,
          position:
            typeof position === 'string' && position.trim().length > 0
              ? position
              : player.position,
          secondaryPositions: JSON.stringify(nextSecondary),
          photo:
            typeof photo === 'string' && photo.trim().length > 0
              ? photo
              : player.photo,
        },
      })

      return NextResponse.json(updated)
    } catch (error) {
      if (!retry && isMissingSecondaryColumnError(error)) {
        await ensureSecondaryPositionsColumn()
        return handleUpdate(true)
      }

      console.error('Erro ao atualizar jogador:', error)
      const message =
        error instanceof Error ? error.message : 'Erro ao atualizar jogador'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  return handleUpdate()
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
    }

    await prisma.player.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar jogador:', error)
    const message =
      error instanceof Error ? error.message : 'Erro ao deletar jogador'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
