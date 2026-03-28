// app/api/preferences/selected-team/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const DEVICE_COOKIE = 'deviceId'

async function getOrCreateDeviceId() {
  const store = await cookies()
  let deviceId = store.get(DEVICE_COOKIE)?.value
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    // cookie por 180 dias
    store.set(DEVICE_COOKIE, deviceId, {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 180,
      path: '/',
    })
  }
  return deviceId
}

export async function GET() {
  try {
    const deviceId = await getOrCreateDeviceId()

    const pref = await prisma.userPreference.findUnique({
      where: { deviceId },
      include: {
        selectedTeam: true,
      },
    })

    return NextResponse.json({
      deviceId,
      teamId: pref?.selectedTeamId ?? null,
      team: pref?.selectedTeam ?? null,
    })
  } catch (error) {
    console.error('Erro ao carregar preferência de equipe:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar preferência de equipe' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const deviceId = await getOrCreateDeviceId()
    const body = await request.json()
    const { teamId } = body as { teamId?: string | null }

    if (typeof teamId === 'undefined') {
      return NextResponse.json(
        { error: 'teamId é obrigatório' },
        { status: 400 }
      )
    }

    if (teamId === null) {
      const pref = await prisma.userPreference.upsert({
        where: { deviceId },
        update: { selectedTeamId: null },
        create: { deviceId, selectedTeamId: null },
        include: { selectedTeam: true },
      })

      return NextResponse.json({
        deviceId,
        teamId: pref.selectedTeamId,
        team: pref.selectedTeam,
      })
    }

    // valida time existente
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    if (!team) {
      return NextResponse.json(
        { error: 'Equipe não encontrada' },
        { status: 404 }
      )
    }

    const pref = await prisma.userPreference.upsert({
      where: { deviceId },
      update: { selectedTeamId: teamId },
      create: { deviceId, selectedTeamId: teamId },
      include: { selectedTeam: true },
    })

    return NextResponse.json({
      deviceId,
      teamId: pref.selectedTeamId,
      team: pref.selectedTeam,
    })
  } catch (error) {
    console.error('Erro ao salvar preferência de equipe:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar preferência de equipe' },
      { status: 500 }
    )
  }
}
