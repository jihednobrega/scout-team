/**
 * POST /api/sync/pull
 *
 * Importa dados do Turso (cloud) de volta para o SQLite local.
 * Útil para restaurar o banco local após um reset.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { prisma } from '@/lib/prisma'

export async function POST() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    return NextResponse.json(
      { error: 'TURSO_DATABASE_URL não configurado.' },
      { status: 400 }
    )
  }

  const turso = createClient({ url, authToken: token ?? undefined })

  // ── 1. Ler do Turso ──────────────────────────────────────────────────
  const [teamsRes, playersRes, matchesRes, actionsRes, opponentsRes, presetsRes] =
    await Promise.all([
      turso.execute('SELECT * FROM teams'),
      turso.execute('SELECT * FROM players'),
      turso.execute('SELECT * FROM matches'),
      turso.execute('SELECT * FROM scout_actions'),
      turso.execute('SELECT * FROM opponents').catch(() => ({ rows: [] })),
      turso.execute('SELECT * FROM player_presets').catch(() => ({ rows: [] })),
    ])

  const col = (row: Record<string, unknown>, name: string) => row[name] ?? null
  const str = (v: unknown) => (v != null ? String(v) : null)
  const num = (v: unknown) => (v != null ? Number(v) : null)
  const date = (v: unknown) => (v != null ? new Date(String(v)) : new Date())

  // ── 2. Upsert no local ───────────────────────────────────────────────

  let counts = { teams: 0, players: 0, matches: 0, actions: 0, opponents: 0, presets: 0 }

  // Teams
  for (const row of teamsRes.rows as Record<string, unknown>[]) {
    await prisma.team.upsert({
      where: { id: str(col(row, 'id'))! },
      update: {
        name: str(col(row, 'name'))!,
        logo: str(col(row, 'logo')),
        updatedAt: date(col(row, 'updatedAt')),
      },
      create: {
        id: str(col(row, 'id'))!,
        name: str(col(row, 'name'))!,
        logo: str(col(row, 'logo')),
        createdAt: date(col(row, 'createdAt')),
        updatedAt: date(col(row, 'updatedAt')),
      },
    })
    counts.teams++
  }

  // Players
  for (const row of playersRes.rows as Record<string, unknown>[]) {
    await prisma.player.upsert({
      where: { id: str(col(row, 'id'))! },
      update: {
        name: str(col(row, 'name'))!,
        jerseyNumber: num(col(row, 'jerseyNumber'))!,
        position: str(col(row, 'position'))!,
        secondaryPositions: str(col(row, 'secondaryPositions')) ?? '[]',
        photo: str(col(row, 'photo')) ?? '',
        updatedAt: date(col(row, 'updatedAt')),
      },
      create: {
        id: str(col(row, 'id'))!,
        teamId: str(col(row, 'teamId'))!,
        name: str(col(row, 'name'))!,
        jerseyNumber: num(col(row, 'jerseyNumber'))!,
        position: str(col(row, 'position'))!,
        secondaryPositions: str(col(row, 'secondaryPositions')) ?? '[]',
        photo: str(col(row, 'photo')) ?? '',
        createdAt: date(col(row, 'createdAt')),
        updatedAt: date(col(row, 'updatedAt')),
      },
    })
    counts.players++
  }

  // Matches
  for (const row of matchesRes.rows as Record<string, unknown>[]) {
    await prisma.match.upsert({
      where: { id: str(col(row, 'id'))! },
      update: {
        opponent: str(col(row, 'opponent'))!,
        homeTeam: str(col(row, 'homeTeam'))!,
        awayTeam: str(col(row, 'awayTeam'))!,
        tournament: str(col(row, 'tournament')),
        location: str(col(row, 'location')),
        date: date(col(row, 'date')),
        result: str(col(row, 'result'))!,
        finalScore: str(col(row, 'finalScore'))!,
        status: str(col(row, 'status')) ?? 'in_progress',
        sets: str(col(row, 'sets')) ?? '[]',
        stats: str(col(row, 'stats')),
        duration: num(col(row, 'duration')),
        updatedAt: date(col(row, 'updatedAt')),
      },
      create: {
        id: str(col(row, 'id'))!,
        teamId: str(col(row, 'teamId'))!,
        opponent: str(col(row, 'opponent'))!,
        homeTeam: str(col(row, 'homeTeam'))!,
        awayTeam: str(col(row, 'awayTeam'))!,
        tournament: str(col(row, 'tournament')),
        location: str(col(row, 'location')),
        date: date(col(row, 'date')),
        result: str(col(row, 'result'))!,
        finalScore: str(col(row, 'finalScore'))!,
        status: str(col(row, 'status')) ?? 'in_progress',
        sets: str(col(row, 'sets')) ?? '[]',
        stats: str(col(row, 'stats')),
        duration: num(col(row, 'duration')),
        createdAt: date(col(row, 'createdAt')),
        updatedAt: date(col(row, 'updatedAt')),
      },
    })
    counts.matches++
  }

  // Scout actions — upsert individual (createMany com skipDuplicates não suporta SQLite)
  for (const row of actionsRes.rows as Record<string, unknown>[]) {
    const id = str(col(row, 'id'))!
    const data = {
      matchId: str(col(row, 'matchId'))!,
      playerId: str(col(row, 'playerId')),
      time: str(col(row, 'time')) ?? '',
      action: str(col(row, 'action')) ?? '',
      subAction: str(col(row, 'subAction')) ?? '',
      zone: num(col(row, 'zone')) ?? 0,
      coordinateX: Number(col(row, 'coordinateX') ?? 0),
      coordinateY: Number(col(row, 'coordinateY') ?? 0),
      setNumber: num(col(row, 'setNumber')) ?? 1,
      timestamp: date(col(row, 'timestamp')),
      videoTimestamp: str(col(row, 'videoTimestamp')),
      efficiencyValue: num(col(row, 'efficiencyValue')),
      phase: str(col(row, 'phase')),
      rallyId: str(col(row, 'rallyId')),
      fullData: str(col(row, 'fullData')),
      createdAt: date(col(row, 'createdAt')),
    }
    await prisma.scoutAction.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    })
    counts.actions++
  }

  // Opponents
  for (const row of opponentsRes.rows as Record<string, unknown>[]) {
    await prisma.opponent.upsert({
      where: { id: str(col(row, 'id'))! },
      update: {
        name: str(col(row, 'name'))!,
        abbreviation: str(col(row, 'abbreviation')),
        logo: str(col(row, 'logo')),
        updatedAt: date(col(row, 'updatedAt')),
      },
      create: {
        id: str(col(row, 'id'))!,
        name: str(col(row, 'name'))!,
        abbreviation: str(col(row, 'abbreviation')),
        logo: str(col(row, 'logo')),
        createdAt: date(col(row, 'createdAt')),
        updatedAt: date(col(row, 'updatedAt')),
      },
    })
    counts.opponents++
  }

  // Player presets
  for (const row of presetsRes.rows as Record<string, unknown>[]) {
    await prisma.playerPreset.upsert({
      where: { id: str(col(row, 'id'))! },
      update: {
        name: str(col(row, 'name'))!,
        playerIds: str(col(row, 'playerIds'))!,
        updatedAt: date(col(row, 'updatedAt')),
      },
      create: {
        id: str(col(row, 'id'))!,
        name: str(col(row, 'name'))!,
        teamId: str(col(row, 'teamId'))!,
        playerIds: str(col(row, 'playerIds'))!,
        createdAt: date(col(row, 'createdAt')),
        updatedAt: date(col(row, 'updatedAt')),
      },
    })
    counts.presets++
  }

  return NextResponse.json({
    success: true,
    pulledAt: new Date().toISOString(),
    counts,
  })
}
