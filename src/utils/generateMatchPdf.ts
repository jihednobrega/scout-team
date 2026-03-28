// utils/generateMatchPdf.ts
// Generates a professional Data Volley-style match report PDF.
// Uses jsPDF + jsPDF-AutoTable. Notation: #/+/!/−/= appears ONLY in this PDF.

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/** Sub-ações de ataque que contam como ponto (kill) */
const ATTACK_KILL_SUBS = new Set(['kill', 'tip', 'block_out'])
const isAttackKill = (subAction: string) => ATTACK_KILL_SUBS.has(subAction)

// ============================================================================
// TYPES
// ============================================================================

interface PrismaAction {
  id: string
  matchId: string
  playerId: string
  action: string
  subAction: string
  zone: number
  setNumber: number
  efficiencyValue: number | null
  phase: string | null
  rallyId: string | null
  fullData: string | null
  timestamp?: string // ISO string — needed for duration & partial scores
}

interface PrismaMatch {
  id: string
  homeTeam: string
  awayTeam: string
  opponent: string
  tournament: string | null
  location: string | null
  date: Date
  result: string
  finalScore: string
  sets: string
  duration: number | null
  statistician?: string | null
  actions: PrismaAction[]
}

interface PrismaPlayer {
  id: string
  name: string
  jerseyNumber: number
  position: string
}

interface SetInfo {
  number: number
  homeScore: number
  awayScore: number
  duration?: number
}

/** Format set score as "25-20" */
const fmtSetScore = (s: SetInfo) => `${s.homeScore}-${s.awayScore}`

interface EnrichedSetInfo {
  number: number
  homeScore: number
  awayScore: number
  score: string     // formatted "25-20" for display
  durationMin: number | null
  at8: string
  at16: string
  at2021: string
  firstServerId: string | null
}


// ============================================================================
// PLAYER STATS CALCULATION
// ============================================================================

interface PlayerPdfStats {
  playerId: string
  name: string
  jersey: number
  position: string
  setsPlayed: number[]
  totalPoints: number
  breakPoints: number
  pointsWon: number
  pointsLost: number
  vpBalance: number
  serveTotal: number
  serveErrors: number
  serveAces: number
  recTotal: number
  recErrors: number
  recPositiveRate: number
  recPerfectRate: number
  atkTotal: number
  atkErrors: number
  atkBlocked: number
  atkKills: number
  atkEfficiency: number
  blockPoints: number
  rating: number
}

interface TeamSetStats {
  setNumber: number
  totalPoints: number
  breakPoints: number
  vpBalance: number
  serveTotal: number
  serveErrors: number
  serveAces: number
  recTotal: number
  recErrors: number
  recPositiveRate: number
  recPerfectRate: number
  atkTotal: number
  atkErrors: number
  atkBlocked: number
  atkKills: number
  atkEfficiency: number
  blockPoints: number
}

function calcPlayerStats(player: PrismaPlayer, actions: PrismaAction[]): PlayerPdfStats {
  const pa = actions.filter((a) => a.playerId === player.id)
  const setsPlayed = [...new Set(pa.map((a) => a.setNumber))].sort()

  const serves = pa.filter((a) => a.action === 'serve')
  const serveAces = serves.filter((a) => a.subAction === 'ace').length
  const serveErrors = serves.filter((a) => a.subAction === 'error').length

  const recs = pa.filter((a) => a.action === 'reception')
  const recPerfect = recs.filter((a) => a.subAction === 'perfect').length
  const recPositive = recs.filter((a) => a.subAction === 'positive').length
  const recErrors = recs.filter((a) => a.subAction === 'error').length

  const atks = pa.filter((a) => a.action === 'attack')
  const atkKills = atks.filter((a) => isAttackKill(a.subAction)).length
  const atkErrors = atks.filter((a) => a.subAction === 'error').length
  const atkBlocked = atks.filter((a) => a.subAction === 'blocked').length

  const blocks = pa.filter((a) => a.action === 'block')
  const blockPoints = blocks.filter((a) => a.subAction === 'kill_block' || a.subAction === 'point').length
  const blockErrors = blocks.filter((a) => a.subAction === 'error').length

  const totalPoints = serveAces + atkKills + blockPoints
  const pointsLost = serveErrors + atkErrors + atkBlocked + recErrors + blockErrors
  const vpBalance = totalPoints - pointsLost

  const breakPoints = pa.filter(
    (a) =>
      a.phase === 'transition' &&
      ((a.action === 'attack' && isAttackKill(a.subAction)) ||
        (a.action === 'serve' && a.subAction === 'ace') ||
        (a.action === 'block' && (a.subAction === 'kill_block' || a.subAction === 'point')))
  ).length

  const recPositiveRate = recs.length > 0 ? ((recPerfect + recPositive) / recs.length) * 100 : 0
  const recPerfectRate = recs.length > 0 ? (recPerfect / recs.length) * 100 : 0
  const atkEfficiency = atks.length > 0 ? ((atkKills - atkErrors - atkBlocked) / atks.length) * 100 : 0

  const effValues = pa.map((a) => a.efficiencyValue).filter((v): v is number => v !== null)
  const avgEff = effValues.length > 0 ? effValues.reduce((s, v) => s + v, 0) / effValues.length : 0
  const rating = Math.max(0, Math.min(10, 5 + avgEff * 5))

  return {
    playerId: player.id, name: player.name, jersey: player.jerseyNumber,
    position: player.position, setsPlayed,
    totalPoints, breakPoints, pointsWon: totalPoints, pointsLost, vpBalance,
    serveTotal: serves.length, serveErrors, serveAces,
    recTotal: recs.length, recErrors, recPositiveRate, recPerfectRate,
    atkTotal: atks.length, atkErrors, atkBlocked, atkKills, atkEfficiency,
    blockPoints, rating,
  }
}

function calcSetTeamStats(actions: PrismaAction[], setNumber: number): TeamSetStats {
  const sa = actions.filter((a) => a.setNumber === setNumber)

  const serves = sa.filter((a) => a.action === 'serve')
  const serveAces = serves.filter((a) => a.subAction === 'ace').length
  const serveErrors = serves.filter((a) => a.subAction === 'error').length

  const recs = sa.filter((a) => a.action === 'reception')
  const recPerfect = recs.filter((a) => a.subAction === 'perfect').length
  const recPositive = recs.filter((a) => a.subAction === 'positive').length
  const recErrors = recs.filter((a) => a.subAction === 'error').length

  const atks = sa.filter((a) => a.action === 'attack')
  const atkKills = atks.filter((a) => isAttackKill(a.subAction)).length
  const atkErrors = atks.filter((a) => a.subAction === 'error').length
  const atkBlocked = atks.filter((a) => a.subAction === 'blocked').length

  const blocks = sa.filter((a) => a.action === 'block')
  const blockPoints = blocks.filter((a) => a.subAction === 'kill_block' || a.subAction === 'point').length
  const blockErrors = blocks.filter((a) => a.subAction === 'error').length

  const totalPoints = serveAces + atkKills + blockPoints
  const pointsLost = serveErrors + atkErrors + atkBlocked + recErrors + blockErrors
  const vpBalance = totalPoints - pointsLost

  const breakPoints = sa.filter(
    (a) =>
      a.phase === 'transition' &&
      ((a.action === 'attack' && isAttackKill(a.subAction)) ||
        (a.action === 'serve' && a.subAction === 'ace') ||
        (a.action === 'block' && (a.subAction === 'kill_block' || a.subAction === 'point')))
  ).length

  const recPositiveRate = recs.length > 0 ? ((recPerfect + recPositive) / recs.length) * 100 : 0
  const recPerfectRate = recs.length > 0 ? (recPerfect / recs.length) * 100 : 0
  const atkEfficiency = atks.length > 0 ? ((atkKills - atkErrors - atkBlocked) / atks.length) * 100 : 0

  return {
    setNumber,
    totalPoints, breakPoints, vpBalance,
    serveTotal: serves.length, serveErrors, serveAces,
    recTotal: recs.length, recErrors, recPositiveRate, recPerfectRate,
    atkTotal: atks.length, atkErrors, atkBlocked, atkKills, atkEfficiency,
    blockPoints,
  }
}

// ============================================================================
// SET ENRICHMENT: partial scores, duration, first server
// ============================================================================

function calcSetDuration(actions: PrismaAction[], setNumber: number): number | null {
  const ts = actions
    .filter((a) => a.setNumber === setNumber && a.timestamp)
    .map((a) => new Date(a.timestamp!).getTime())
    .filter((t) => !isNaN(t))

  if (ts.length < 2) return null
  return Math.round((Math.max(...ts) - Math.min(...ts)) / 60000)
}

function calcPartialScores(
  actions: PrismaAction[],
  setNumber: number
): { at8: string; at16: string; at2021: string } {
  const setActions = actions.filter((a) => a.setNumber === setNumber && a.rallyId)

  // Group by rallyId preserving insertion order (actions pre-sorted by timestamp)
  const rallyMap = new Map<string, PrismaAction[]>()
  const rallyOrder: string[] = []

  for (const action of setActions) {
    const rid = action.rallyId!
    if (!rallyMap.has(rid)) {
      rallyMap.set(rid, [])
      rallyOrder.push(rid)
    }
    rallyMap.get(rid)!.push(action)
  }

  let home = 0
  let away = 0
  let at8 = '-'
  let at16 = '-'
  let at2021 = '-'

  for (const rid of rallyOrder) {
    const ra = rallyMap.get(rid)!
    let scored: 'home' | 'away' | null = null

    // Scan from the end to find terminal action
    for (let i = ra.length - 1; i >= 0; i--) {
      const a = ra[i]
      if (
        (a.action === 'attack' && isAttackKill(a.subAction)) ||
        (a.action === 'serve' && a.subAction === 'ace') ||
        (a.action === 'block' && (a.subAction === 'kill_block' || a.subAction === 'point')) ||
        a.action === 'opponent_error'
      ) {
        scored = 'home'
        break
      }
      if (
        (a.action === 'serve' && a.subAction === 'error') ||
        (a.action === 'attack' && (a.subAction === 'error' || a.subAction === 'blocked')) ||
        (a.action === 'reception' && a.subAction === 'error') ||
        (a.action === 'dig' && a.subAction === 'error') ||
        (a.action === 'set' && a.subAction === 'error') ||
        (a.action === 'block' && a.subAction === 'error')
      ) {
        scored = 'away'
        break
      }
    }

    if (scored === 'home') home++
    else if (scored === 'away') away++
    else continue // indeterminate rally — skip

    const total = home + away
    if (at8 === '-' && total >= 8) at8 = `${home}-${away}`
    if (at16 === '-' && total >= 16) at16 = `${home}-${away}`
    if (at2021 === '-' && Math.max(home, away) >= 20) at2021 = `${home}-${away}`
  }

  return { at8, at16, at2021 }
}

function calcFirstServer(
  actions: PrismaAction[],
  setNumber: number
): string | null {
  const firstServe = actions.find(
    (a) => a.setNumber === setNumber && a.action === 'serve' && a.playerId
  )
  return firstServe?.playerId ?? null
}

// ============================================================================
// RECEPTION → ATTACK ANALYSIS
// ============================================================================

interface RecAttackRow {
  label: string
  errors: number
  blocked: number
  pointsPct: number
  total: number
}

function calcReceptionAttack(actions: PrismaAction[]): RecAttackRow[] {
  const rallies = new Map<string, PrismaAction[]>()
  actions.forEach((a) => {
    if (!a.rallyId) return
    if (!rallies.has(a.rallyId)) rallies.set(a.rallyId, [])
    rallies.get(a.rallyId)!.push(a)
  })

  const goodRec = { errors: 0, blocked: 0, kills: 0, total: 0 }
  const badRec  = { errors: 0, blocked: 0, kills: 0, total: 0 }
  const counter = { errors: 0, blocked: 0, kills: 0, total: 0 }

  rallies.forEach((rallyActions) => {
    const sorted = rallyActions.sort((a, b) => a.setNumber - b.setNumber)
    const rec = sorted.find((a) => a.action === 'reception')
    const attacks = sorted.filter((a) => a.action === 'attack')
    if (attacks.length === 0) return

    const firstAtk = attacks[0]
    if (rec) {
      const isGood = rec.subAction === 'perfect' || rec.subAction === 'positive'
      const bucket = isGood ? goodRec : badRec
      bucket.total++
      if (isAttackKill(firstAtk.subAction)) bucket.kills++
      if (firstAtk.subAction === 'error') bucket.errors++
      if (firstAtk.subAction === 'blocked') bucket.blocked++
    } else if (sorted.some((a) => a.action === 'dig')) {
      counter.total++
      if (isAttackKill(firstAtk.subAction)) counter.kills++
      if (firstAtk.subAction === 'error') counter.errors++
      if (firstAtk.subAction === 'blocked') counter.blocked++
    }
  })

  const pct = (kills: number, total: number) => (total > 0 ? (kills / total) * 100 : 0)

  return [
    { label: '1° Atq. Rec. Boa (+#)', errors: goodRec.errors, blocked: goodRec.blocked, pointsPct: pct(goodRec.kills, goodRec.total), total: goodRec.total },
    { label: '1° Atq. Rec. Ruim (-!)',  errors: badRec.errors,  blocked: badRec.blocked,  pointsPct: pct(badRec.kills, badRec.total),  total: badRec.total },
    { label: 'Contra-ataque',           errors: counter.errors, blocked: counter.blocked, pointsPct: pct(counter.kills, counter.total), total: counter.total },
  ]
}

// ============================================================================
// ROTATION STATS
// ============================================================================

interface RotationRow { rotation: number; pointsWon: number; pointsLost: number; balance: number }

function calcRotationStats(actions: PrismaAction[]): RotationRow[] {
  const rallies = new Map<string, { rotation: number | null; actions: PrismaAction[] }>()

  actions.forEach((a) => {
    if (!a.rallyId) return
    if (!rallies.has(a.rallyId)) {
      const full = a.fullData ? JSON.parse(a.fullData) : {}
      rallies.set(a.rallyId, { rotation: full.rotation ?? null, actions: [] })
    }
    rallies.get(a.rallyId)!.actions.push(a)
  })

  const stats = new Map<number, { won: number; lost: number }>()
  for (let i = 1; i <= 6; i++) stats.set(i, { won: 0, lost: 0 })

  rallies.forEach(({ rotation, actions: ra }) => {
    if (rotation == null || rotation < 1 || rotation > 6) return
    const s = stats.get(rotation)!
    const last = ra[ra.length - 1]
    if (!last) return

    const isPositive =
      (last.action === 'attack' && isAttackKill(last.subAction)) ||
      (last.action === 'serve' && last.subAction === 'ace') ||
      (last.action === 'block' && (last.subAction === 'kill_block' || last.subAction === 'point'))

    const isNegative =
      last.subAction === 'error' ||
      (last.action === 'attack' && last.subAction === 'blocked')

    if (isPositive) s.won++
    else if (isNegative) s.lost++
  })

  return Array.from(stats.entries()).map(([rot, s]) => ({
    rotation: rot, pointsWon: s.won, pointsLost: s.lost, balance: s.won - s.lost,
  }))
}

// ============================================================================
// MACRO METRICS
// ============================================================================

interface MacroMetrics {
  recTotal: number; pointsSO: number; recPerPoint: number
  serveTotal: number; pointsBP: number; servePerBP: number
}

function calcMacroMetrics(actions: PrismaAction[]): MacroMetrics {
  const recs   = actions.filter((a) => a.action === 'reception')
  const serves = actions.filter((a) => a.action === 'serve')

  const soPoints = actions.filter(
    (a) =>
      a.phase === 'sideout' &&
      ((a.action === 'attack' && isAttackKill(a.subAction)) ||
        (a.action === 'block' && (a.subAction === 'kill_block' || a.subAction === 'point')))
  ).length

  const bpPoints = actions.filter(
    (a) =>
      (a.phase === 'transition' &&
        ((a.action === 'attack' && isAttackKill(a.subAction)) ||
          (a.action === 'block' && (a.subAction === 'kill_block' || a.subAction === 'point')))) ||
      (a.action === 'serve' && a.subAction === 'ace')
  ).length

  return {
    recTotal: recs.length,
    pointsSO: soPoints,
    recPerPoint: soPoints > 0 ? recs.length / soPoints : 0,
    serveTotal: serves.length,
    pointsBP: bpPoints,
    servePerBP: bpPoints > 0 ? serves.length / bpPoints : 0,
  }
}

// ============================================================================
// HELPERS
// ============================================================================

const fmtPct = (v: number) => (v === 0 ? '-' : `${v.toFixed(0)}%`)
const fmtVP  = (v: number) => (v > 0 ? `+${v}` : v === 0 ? '0' : `${v}`)
const fmtDur = (min: number | null) => (min ? `${min}'` : '-')

// ============================================================================
// HEADER DRAWING — PAGE 1 (full) & subsequent pages (compact)
// ============================================================================

function drawPage1Header(
  doc: jsPDF,
  match: PrismaMatch,
  enrichedSets: EnrichedSetInfo[],
  pageW: number,
  headerH: number,
  margin: number,
) {
  // Background
  doc.setFillColor(20, 31, 52)
  doc.rect(0, 0, pageW, headerH, 'F')

  const leftColW = Math.floor(pageW * 0.61) // ~180mm on A4 landscape
  const rightX   = leftColW + 4

  // Vertical divider
  doc.setDrawColor(80, 100, 130)
  doc.setLineWidth(0.3)
  doc.line(leftColW, 3, leftColW, headerH - 3)

  // ---- LEFT COLUMN ----
  let ly = 5.5

  // Competition name
  if (match.tournament) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(200, 220, 255)
    doc.text(match.tournament.toUpperCase(), margin, ly)
    ly += 5
  }

  // Team names + score  (largest element)
  const scoreStr = match.finalScore || '0-0'
  const scoreCenterX = leftColW / 2

  // Compute positions at font size 18 before drawing
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  const realScoreW = doc.getTextWidth(scoreStr)
  const scoreX = scoreCenterX - realScoreW / 2

  // Team names flanking the score
  doc.setFontSize(13)
  const homeNameW = doc.getTextWidth(match.homeTeam)
  const homeX = Math.max(margin, scoreX - homeNameW - 4)

  // Team names
  doc.setTextColor(180, 210, 245)
  doc.text(match.homeTeam, homeX, ly + 6)
  doc.text(match.awayTeam, scoreX + realScoreW + 4, ly + 6)

  // Score (largest element — drawn on top of team names area)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(scoreStr, scoreX, ly + 6)

  ly += 13

  // Separator line
  doc.setDrawColor(60, 80, 110)
  doc.setLineWidth(0.25)
  doc.line(margin, ly, leftColW - 4, ly)
  ly += 3.5

  // Meta info row
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(160, 190, 220)
  const dateStr = (match.date instanceof Date ? match.date : new Date(match.date))
    .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })

  const metaParts = [
    dateStr,
    match.location ?? null,
    match.duration ? `Duração: ${match.duration} min` : null,
  ].filter(Boolean).join('  ·  ')

  doc.text(metaParts, margin, ly)

  // ---- RIGHT COLUMN — SET TABLE ----
  if (enrichedSets.length === 0) return

  let ry = 3.5

  // Section label
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(160, 190, 220)
  doc.text('PLACAR POR SET', rightX, ry)
  ry += 3.5

  // Column definitions
  const COL_WIDTHS = [10, 10, 42, 20] // Set | Dur | Parciais | Final
  const COL_LABELS = ['Set', 'Dur', 'Parciais', 'Final']
  const ROW_H = 4.5
  const cellXs: number[] = []
  let cx = rightX
  COL_WIDTHS.forEach((w) => { cellXs.push(cx); cx += w })

  // Header row background
  doc.setFillColor(35, 55, 85)
  doc.rect(rightX, ry, COL_WIDTHS.reduce((a, b) => a + b, 0), ROW_H, 'F')

  // Header labels
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(180, 210, 240)
  COL_LABELS.forEach((label, i) => {
    const cx2 = cellXs[i] + COL_WIDTHS[i] / 2
    doc.text(label, cx2, ry + ROW_H * 0.65, { align: 'center' })
  })
  ry += ROW_H

  // Draw border lines helper
  const drawTableBorder = (x: number, y: number, w: number, h: number) => {
    doc.setDrawColor(50, 75, 110)
    doc.setLineWidth(0.2)
    doc.rect(x, y, w, h)
  }

  // Data rows
  enrichedSets.forEach((s, idx) => {
    const rowBg = idx % 2 === 0 ? [28, 45, 72] : [24, 38, 62]
    doc.setFillColor(rowBg[0], rowBg[1], rowBg[2])
    const totalW = COL_WIDTHS.reduce((a, b) => a + b, 0)
    doc.rect(rightX, ry, totalW, ROW_H, 'F')
    drawTableBorder(rightX, ry, totalW, ROW_H)

    const parciais = [s.at8, s.at16, s.at2021].filter(v => v && v !== '-').join('  ·  ') || '-'
    const cols = [
      `Set ${s.number}`,
      fmtDur(s.durationMin),
      parciais,
      s.score,
    ]

    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(230, 240, 255)
    cols.forEach((val, i) => {
      const cx2 = cellXs[i] + COL_WIDTHS[i] / 2
      doc.text(val || '-', cx2, ry + ROW_H * 0.68, { align: 'center' })
    })

    ry += ROW_H
  })

  // Outer border
  const totalW = COL_WIDTHS.reduce((a, b) => a + b, 0)
  doc.setDrawColor(60, 90, 130)
  doc.setLineWidth(0.3)
  doc.rect(rightX, 7, totalW, enrichedSets.length * ROW_H + ROW_H)

}

function drawCompactHeader(
  doc: jsPDF,
  match: PrismaMatch,
  pageW: number,
  headerH: number,
  margin: number,
) {
  doc.setFillColor(20, 31, 52)
  doc.rect(0, 0, pageW, headerH, 'F')

  // Tournament
  if (match.tournament) {
    doc.setFontSize(6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(140, 170, 210)
    doc.text(match.tournament, margin, 5)
  }

  // Teams + Score
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(match.homeTeam, margin, 11)
  doc.text(match.awayTeam, pageW - margin, 11, { align: 'right' })

  doc.setFontSize(12)
  const slH = match.finalScore || '0-0'
  const sW = doc.getTextWidth(slH)
  doc.text(slH, pageW / 2 - sW / 2, 11)

  doc.setFontSize(6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 150, 190)
  const dateStr = (match.date instanceof Date ? match.date : new Date(match.date)).toLocaleDateString('pt-BR')
  const sub = [dateStr, match.location, match.duration ? `${match.duration} min` : null].filter(Boolean).join(' | ')
  doc.text(sub, pageW / 2, 15.5, { align: 'center' })
}

// ============================================================================
// PDF GENERATION
// ============================================================================

export function generateMatchReportPdf(
  match: PrismaMatch,
  players: PrismaPlayer[],
): ArrayBuffer {
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()   // 297
  const pageH = doc.internal.pageSize.getHeight()  // 210
  const margin = 8

  // Page 1 header is tall (full info + set table)
  const PAGE1_HEADER_H = 44
  // Compact header for pages 2+
  const COMPACT_HEADER_H = 18
  const footerTopY = pageH - 12

  // Content starts after page-1 header
  let y = PAGE1_HEADER_H + 3

  // AutoTable top margin for new pages spawned inside tables = compact header + 2
  const autoTopMargin = COMPACT_HEADER_H + 2

  const getSafeY = (fallback: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = (doc as any).lastAutoTable || (doc as any).previousAutoTable
    return table ? (table.finalY as number) : fallback
  }

  const ensureSpace = (currentY: number, neededSpace: number) => {
    if (currentY + neededSpace > footerTopY) {
      doc.addPage()
      return autoTopMargin + 2
    }
    return currentY
  }

  const sectionLabel = (text: string, currentY: number, x: number = margin) => {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 41, 59)
    doc.text(text.toUpperCase(), x, currentY)
    return currentY + 3.5
  }

  // ── Prepare data ────────────────────────────────────────────────────────────
  // Normalize stored sets — handle both formats:
  //   new: { number, homeScore, awayScore }
  //   legacy: { set, score } where score = "25 x 20" or "25-20"
  const rawSets: Record<string, unknown>[] = JSON.parse(match.sets || '[]')
  const sets: SetInfo[] = rawSets.map((s) => {
    if (typeof s.number === 'number') {
      return s as unknown as SetInfo
    }
    // Legacy fallback
    const legacyScore = String(s.score ?? '')
    const parts = legacyScore.split(/[\sx-]+/).map(Number)
    return {
      number: Number(s.set ?? 0),
      homeScore: parts[0] ?? 0,
      awayScore: parts[1] ?? 0,
    }
  }).filter((s) => s.number > 0)
  const actions = match.actions

  // Enrich sets with computed data
  const enrichedSets: EnrichedSetInfo[] = sets.map((s) => ({
    ...s,
    score: fmtSetScore(s),
    durationMin:   calcSetDuration(actions, s.number),
    firstServerId: calcFirstServer(actions, s.number),
    ...calcPartialScores(actions, s.number),
  }))

  // Player stats
  const playerStats = players
    .map((p) => calcPlayerStats(p, actions))
    .filter((s) => s.setsPlayed.length > 0)
    .sort((a, b) => b.totalPoints - a.totalPoints)

  // Team totals (accumulated from all actions)
  const totals = playerStats.reduce(
    (acc, s) => ({
      totalPoints: acc.totalPoints + s.totalPoints,
      breakPoints: acc.breakPoints + s.breakPoints,
      vpBalance:   acc.vpBalance   + s.vpBalance,
      serveTotal:  acc.serveTotal  + s.serveTotal,
      serveErrors: acc.serveErrors + s.serveErrors,
      serveAces:   acc.serveAces   + s.serveAces,
      recTotal:    acc.recTotal    + s.recTotal,
      recErrors:   acc.recErrors   + s.recErrors,
      atkTotal:    acc.atkTotal    + s.atkTotal,
      atkErrors:   acc.atkErrors   + s.atkErrors,
      atkBlocked:  acc.atkBlocked  + s.atkBlocked,
      atkKills:    acc.atkKills    + s.atkKills,
      blockPoints: acc.blockPoints + s.blockPoints,
    }),
    { totalPoints: 0, breakPoints: 0, vpBalance: 0, serveTotal: 0, serveErrors: 0,
      serveAces: 0, recTotal: 0, recErrors: 0, atkTotal: 0, atkErrors: 0,
      atkBlocked: 0, atkKills: 0, blockPoints: 0 }
  )

  const totalRecPositiveRate = totals.recTotal > 0
    ? (actions.filter(a => a.action === 'reception' && (a.subAction === 'perfect' || a.subAction === 'positive')).length / totals.recTotal) * 100
    : 0
  const totalRecPerfectRate = totals.recTotal > 0
    ? (actions.filter(a => a.action === 'reception' && a.subAction === 'perfect').length / totals.recTotal) * 100
    : 0
  const totalAtkEfficiency = totals.atkTotal > 0
    ? ((totals.atkKills - totals.atkErrors - totals.atkBlocked) / totals.atkTotal * 100)
    : 0

  // ── Common autoTable config ──────────────────────────────────────────────────
  const autoTableConfig = {
    theme: 'grid' as const,
    styles: {
      fontSize: 6.5, cellPadding: 1.3, halign: 'center' as const,
      textColor: [0, 0, 0] as [number, number, number],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [30, 41, 59] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold' as const, fontSize: 6,
    },
    margin: { left: margin, right: margin, top: autoTopMargin + 2, bottom: 14 },
  }

  // ========================================================================
  // 1. PLAYER PERFORMANCE TABLE (group headers + player rows + totals + set rows)
  // ========================================================================
  y = ensureSpace(y, 40)
  y = sectionLabel(`DESEMPENHO INDIVIDUAL — ${match.homeTeam}`, y)

  const playerRows = playerStats.map((s) => [
    s.jersey.toString(),
    s.name,
    s.setsPlayed.join(','),
    s.rating.toFixed(1),
    s.totalPoints.toString(), s.breakPoints.toString(), fmtVP(s.vpBalance),
    `${s.serveTotal}`, `${s.serveErrors}`, `${s.serveAces}`,
    `${s.recTotal}`, `${s.recErrors}`, fmtPct(s.recPositiveRate), fmtPct(s.recPerfectRate),
    `${s.atkTotal}`, `${s.atkErrors}`, `${s.atkBlocked}`, `${s.atkKills}`,
    fmtPct(s.atkEfficiency), `${s.blockPoints}`,
  ])

  const totalsRow = [
    '', 'TOTAL EQUIPE', '', '',
    `${totals.totalPoints}`, `${totals.breakPoints}`, fmtVP(totals.vpBalance),
    `${totals.serveTotal}`, `${totals.serveErrors}`, `${totals.serveAces}`,
    `${totals.recTotal}`, `${totals.recErrors}`, fmtPct(totalRecPositiveRate), fmtPct(totalRecPerfectRate),
    `${totals.atkTotal}`, `${totals.atkErrors}`, `${totals.atkBlocked}`, `${totals.atkKills}`,
    fmtPct(totalAtkEfficiency), `${totals.blockPoints}`,
  ]

  // Set breakdown rows (appended after totals)
  const setRows = enrichedSets.map((es) => {
    const st = calcSetTeamStats(actions, es.number)
    return [
      '', `Set ${es.number}  (${es.score})`, '', '',
      `${st.totalPoints}`, `${st.breakPoints}`, fmtVP(st.vpBalance),
      `${st.serveTotal}`, `${st.serveErrors}`, `${st.serveAces}`,
      `${st.recTotal}`, `${st.recErrors}`, fmtPct(st.recPositiveRate), fmtPct(st.recPerfectRate),
      `${st.atkTotal}`, `${st.atkErrors}`, `${st.atkBlocked}`, `${st.atkKills}`,
      fmtPct(st.atkEfficiency), `${st.blockPoints}`,
    ]
  })

  const allBodyRows = [...playerRows, totalsRow, ...setRows]
  const totalsRowIndex = playerRows.length
  const firstSetRowIndex = totalsRowIndex + 1

  autoTable(doc, {
    ...autoTableConfig,
    startY: y,
    head: [
      // Row 1: group headers
      [
        { content: '#',    rowSpan: 2, styles: { valign: 'middle', halign: 'center' as const } },
        { content: 'Nome', rowSpan: 2, styles: { valign: 'middle', halign: 'left'   as const } },
        { content: 'Sets', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'Voto', rowSpan: 2, styles: { valign: 'middle' } },
        { content: 'PONTOS',   colSpan: 3, styles: { halign: 'center' as const, fillColor: [30, 41, 59] as [number,number,number] } },
        { content: 'SAQUE',    colSpan: 3, styles: { halign: 'center' as const, fillColor: [42, 55, 75] as [number,number,number] } },
        { content: 'RECEPÇÃO', colSpan: 4, styles: { halign: 'center' as const, fillColor: [30, 41, 59] as [number,number,number] } },
        { content: 'ATAQUE',   colSpan: 5, styles: { halign: 'center' as const, fillColor: [42, 55, 75] as [number,number,number] } },
        { content: 'BK',       rowSpan: 2, styles: { valign: 'middle' } },
      ],
      // Row 2: individual column labels
      [
        'Tot', 'BP', 'V-P',
        'Tot', 'Err', 'Pts',
        'Tot', 'Err', 'Pos%', 'Prf%',
        'Tot', 'Err', 'Blo', 'Pts', 'Pts%',
      ],
    ],
    body: allBodyRows,
    styles: { fontSize: 6.5, cellPadding: 1.2, halign: 'center', textColor: [0, 0, 0], lineWidth: 0.15 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 30, halign: 'left' },
      2: { cellWidth: 14 },
      3: { cellWidth: 9 },
    },
    didParseCell: (data) => {
      const ri = data.row.index

      // Totals row
      if (data.section === 'body' && ri === totalsRowIndex) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [219, 234, 254] // blue-100
      }

      // Set breakdown rows
      if (data.section === 'body' && ri >= firstSetRowIndex) {
        data.cell.styles.fontStyle = 'italic'
        data.cell.styles.fillColor = [241, 245, 249] // slate-100
        data.cell.styles.fontSize  = 6
        data.cell.styles.textColor = [71, 85, 105]
      }

      // V-P column (index 6) color coding
      if (data.column.index === 6 && data.section === 'body') {
        const val = parseInt(data.cell.text[0] || '0')
        if (val > 0) data.cell.styles.textColor = [22, 163, 74]
        else if (val < 0) data.cell.styles.textColor = [220, 38, 38]
      }

      // Head row alternating group colors
      if (data.section === 'head' && data.row.index === 1) {
        data.cell.styles.fillColor = [51, 65, 85]
        data.cell.styles.fontSize  = 5.5
      }
    },
  })
  y = getSafeY(y) + 6

  // ========================================================================
  // 2. RECEPTION ANALYSIS
  // ========================================================================
  const recAtk    = calcReceptionAttack(actions)
  const hasRecAtk = recAtk.some((r) => r.total > 0)

  if (hasRecAtk) {
    y = ensureSpace(y, 32)
    y = sectionLabel(`CAUSAS DE PONTO NA RECEPÇÃO — ${match.homeTeam}`, y)
    autoTable(doc, {
      ...autoTableConfig,
      startY: y,
      head: [['', 'Err', 'Blo', 'Pts%', 'Tot']],
      body: recAtk.map((r) => [r.label, `${r.errors}`, `${r.blocked}`, fmtPct(r.pointsPct), `${r.total}`]),
      headStyles: { fillColor: [42, 55, 75] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const, fontSize: 6 },
      columnStyles: { 0: { halign: 'left', cellWidth: 52 } },
      tableWidth: 'wrap',
    })
    y = getSafeY(y) + 6
  }

  // ========================================================================
  // 3. ROTATION STATS + MACRO METRICS — side by side
  // ========================================================================
  const rotStats   = calcRotationStats(actions)
  const macro      = calcMacroMetrics(actions)
  const hasRot     = rotStats.some((r) => r.pointsWon > 0 || r.pointsLost > 0)
  const hasMacro   = macro.recTotal > 0 || macro.serveTotal > 0

  if (hasRot || hasMacro) {
    y = ensureSpace(y, 36)
    let finalYLeft = y
    let finalYRight = y
    const startY = y

    if (hasRot) {
      sectionLabel('SALDO POR ROTAÇÃO', startY, margin)
      autoTable(doc, {
        ...autoTableConfig,
        startY: startY + 4,
        margin: { left: margin, right: pageW / 2 + 5, top: autoTopMargin + 2, bottom: 14 },
        head: [['', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']],
        body: [
          ['Ganhos',  ...rotStats.map((r) => `${r.pointsWon}`)],
          ['Perdidos',...rotStats.map((r) => `${r.pointsLost}`)],
          ['Saldo',   ...rotStats.map((r) => fmtVP(r.balance))],
        ],
        headStyles: { fillColor: [42, 55, 75] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const, fontSize: 6 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 20 } },
        tableWidth: 'wrap',
        didParseCell: (data) => {
          if (data.row.index === 2 && data.column.index > 0 && data.section === 'body') {
            const val = parseInt(data.cell.text[0] || '0')
            if (val > 0) data.cell.styles.textColor = [22, 163, 74]
            else if (val < 0) data.cell.styles.textColor = [220, 38, 38]
          }
        },
      })
      finalYLeft = getSafeY(startY + 4)
    }

    if (hasMacro) {
      sectionLabel('MÉTRICAS MACRO', startY, pageW / 2 + 5)

      const soRatio = macro.recPerPoint > 0 ? `1 ponto a cada ${macro.recPerPoint.toFixed(1)} rec.` : '—'
      const bpRatio = macro.servePerBP  > 0 ? `1 break a cada ${macro.servePerBP.toFixed(1)} srv.` : '—'

      autoTable(doc, {
        ...autoTableConfig,
        startY: startY + 4,
        margin: { left: pageW / 2 + 5, right: margin, top: autoTopMargin + 2, bottom: 14 },
        head: [['Fundamento', 'Total', 'Pontos', 'Eficiência']],
        body: [
          ['Recepção → Side-Out', `${macro.recTotal} rec`,   `${macro.pointsSO} pts SO`, soRatio],
          ['Saque → Break Point', `${macro.serveTotal} srv`, `${macro.pointsBP} pts BP`, bpRatio],
        ],
        headStyles: { fillColor: [42, 55, 75] as [number,number,number], textColor: [255,255,255] as [number,number,number], fontStyle: 'bold' as const, fontSize: 6 },
        columnStyles: {
          0: { halign: 'left', cellWidth: 48 },
          3: { halign: 'left', cellWidth: 58 },
        },
        tableWidth: 'wrap',
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            data.cell.styles.fontStyle = 'bold'
            data.cell.styles.textColor = [30, 64, 120]
          }
        },
      })
      finalYRight = getSafeY(startY + 4)
    }

    y = Math.max(finalYLeft, finalYRight) + 6
  }

  // ========================================================================
  // HEADERS & FOOTERS (all pages)
  // ========================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages = (doc as any).internal.getNumberOfPages()

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)

    if (p === 1) {
      drawPage1Header(doc, match, enrichedSets, pageW, PAGE1_HEADER_H, margin)
    } else {
      drawCompactHeader(doc, match, pageW, COMPACT_HEADER_H, margin)
    }

    // Footer
    const fy = pageH - 4
    doc.setFontSize(6)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(148, 163, 184)
    doc.text('Scout-Team — Relatório gerado automaticamente', margin, fy)
    doc.text(`Pág. ${p}/${totalPages}`, pageW / 2, fy, { align: 'center' })
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      pageW - margin, fy, { align: 'right' }
    )
  }

  return doc.output('arraybuffer')
}
