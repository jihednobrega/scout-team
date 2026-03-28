import { NextResponse } from 'next/server'
import { createClient } from '@libsql/client'
import { prisma } from '@/lib/prisma'

// Helper: convert Date to ISO string (Turso stores dates as TEXT)
const d = (date: Date | null | undefined): string | null =>
  date ? date.toISOString() : null

export async function POST() {
  const url = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    return NextResponse.json(
      { error: 'TURSO_DATABASE_URL não configurado. Preencha o .env e reinicie o servidor.' },
      { status: 400 }
    )
  }

  // Conecta diretamente ao Turso (sem réplica local)
  const turso = createClient({ url, authToken: token ?? undefined })

  // ── 1. Criar schema no Turso ─────────────────────────────────────────
  const schemaSql = [
    `CREATE TABLE IF NOT EXISTS "teams" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "logo" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "players" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "teamId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "jerseyNumber" INTEGER NOT NULL,
      "position" TEXT NOT NULL,
      "secondaryPositions" TEXT NOT NULL DEFAULT '[]',
      "photo" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "players_teamId_jerseyNumber_key" ON "players"("teamId", "jerseyNumber")`,
    `CREATE TABLE IF NOT EXISTS "matches" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "teamId" TEXT NOT NULL,
      "opponent" TEXT NOT NULL,
      "homeTeam" TEXT NOT NULL,
      "awayTeam" TEXT NOT NULL,
      "tournament" TEXT,
      "location" TEXT,
      "date" TEXT NOT NULL,
      "result" TEXT NOT NULL,
      "finalScore" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'in_progress',
      "sets" TEXT NOT NULL,
      "stats" TEXT,
      "duration" INTEGER,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "scout_actions" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "matchId" TEXT NOT NULL,
      "playerId" TEXT,
      "time" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "subAction" TEXT NOT NULL,
      "zone" INTEGER NOT NULL,
      "coordinateX" REAL NOT NULL,
      "coordinateY" REAL NOT NULL,
      "setNumber" INTEGER NOT NULL,
      "timestamp" TEXT NOT NULL,
      "videoTimestamp" TEXT,
      "efficiencyValue" REAL,
      "phase" TEXT,
      "rallyId" TEXT,
      "fullData" TEXT,
      "createdAt" TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "opponents" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "abbreviation" TEXT,
      "logo" TEXT,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "opponents_name_key" ON "opponents"("name")`,
    `CREATE TABLE IF NOT EXISTS "player_presets" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "teamId" TEXT NOT NULL,
      "playerIds" TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      "updatedAt" TEXT NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "player_presets_teamId_name_key" ON "player_presets"("teamId", "name")`,
  ]

  for (const sql of schemaSql) {
    await turso.execute(sql)
  }

  // ── 2. Ler dados do SQLite local ────────────────────────────────────
  const [teams, players, matches, actions, opponents] = await Promise.all([
    prisma.team.findMany(),
    prisma.player.findMany(),
    prisma.match.findMany(),
    prisma.scoutAction.findMany(),
    prisma.opponent.findMany(),
  ])

  // Player presets (tabela pode não existir localmente em todos os ambientes)
  let presets: Awaited<ReturnType<typeof prisma.playerPreset.findMany>> = []
  try {
    presets = await prisma.playerPreset.findMany()
  } catch {
    // tabela não encontrada localmente, ignora
  }

  // ── 3. Upsert para o Turso ──────────────────────────────────────────

  for (const t of teams) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO teams (id, name, logo, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?)`,
      args: [t.id, t.name, t.logo ?? null, d(t.createdAt)!, d(t.updatedAt)!],
    })
  }

  for (const p of players) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO players
              (id, teamId, name, jerseyNumber, position, secondaryPositions, photo, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [p.id, p.teamId, p.name, p.jerseyNumber, p.position, p.secondaryPositions, p.photo, d(p.createdAt)!, d(p.updatedAt)!],
    })
  }

  for (const m of matches) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO matches
              (id, teamId, opponent, homeTeam, awayTeam, tournament, location,
               date, result, finalScore, status, sets, stats, duration, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        m.id, m.teamId, m.opponent, m.homeTeam, m.awayTeam,
        m.tournament ?? null, m.location ?? null,
        d(m.date)!, m.result, m.finalScore,
        (m as Record<string, unknown>).status as string ?? 'in_progress',
        m.sets, m.stats ?? null, m.duration ?? null,
        d(m.createdAt)!, d(m.updatedAt)!,
      ],
    })
  }

  for (const a of actions) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO scout_actions
              (id, matchId, playerId, time, action, subAction, zone,
               coordinateX, coordinateY, setNumber, timestamp, videoTimestamp,
               efficiencyValue, phase, rallyId, fullData, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        a.id, a.matchId, a.playerId ?? null, a.time,
        a.action, a.subAction, a.zone,
        a.coordinateX, a.coordinateY, a.setNumber,
        d(a.timestamp)!,
        (a as Record<string, unknown>).videoTimestamp as string ?? null,
        (a as Record<string, unknown>).efficiencyValue as number ?? null,
        (a as Record<string, unknown>).phase as string ?? null,
        (a as Record<string, unknown>).rallyId as string ?? null,
        (a as Record<string, unknown>).fullData as string ?? null,
        d(a.createdAt)!,
      ],
    })
  }

  for (const o of opponents) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO opponents (id, name, abbreviation, logo, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [o.id, o.name, o.abbreviation ?? null, o.logo ?? null, d(o.createdAt)!, d(o.updatedAt)!],
    })
  }

  for (const pr of presets) {
    await turso.execute({
      sql: `INSERT OR REPLACE INTO player_presets (id, name, teamId, playerIds, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [pr.id, pr.name, pr.teamId, pr.playerIds, d(pr.createdAt)!, d(pr.updatedAt)!],
    })
  }

  return NextResponse.json({
    success: true,
    syncedAt: new Date().toISOString(),
    counts: {
      teams: teams.length,
      players: players.length,
      matches: matches.length,
      actions: actions.length,
      opponents: opponents.length,
      presets: presets.length,
    },
  })
}
