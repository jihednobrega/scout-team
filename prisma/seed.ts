import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// ============================================================================
// EFFICIENCY MAP
// ============================================================================

const SCOUT_EFFICIENCY: Record<string, Record<string, number>> = {
  serve:     { ace: 1.0, broken_pass: 0.5, overpass: 0.5, facilitated: 0.0, error: -1.0 },
  reception: { perfect: 1.0, positive: 0.5, negative: 0.0, overpass: -1.0, error: -1.0 },
  attack:    { kill: 1.0, replay: 0.5, continued: 0.0, blocked: -0.5, error: -1.0 },
  block:     { kill_block: 1.0, point: 1.0, touch: 0.5, error: -1.0 },
  dig:       { perfect: 1.0, positive: 0.5, bad: 0.0, error: -1.0 },
  set:       { perfect: 1.0, positive: 0.5, negative: 0.0, error: -1.0 },
}

function seedComputeEfficiency(action: string, subAction: string): number | null {
  return SCOUT_EFFICIENCY[action]?.[subAction] ?? null
}

// ============================================================================
// HELPERS
// ============================================================================

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(20, 0, 0, 0)
  return d
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

function randBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function coordsForZone(zone: number): { x: number; y: number } {
  const zoneCoords: Record<number, { xMin: number; xMax: number; yMin: number; yMax: number }> = {
    1: { xMin: 67, xMax: 100, yMin: 0, yMax: 33 },
    2: { xMin: 50, xMax: 67, yMin: 0, yMax: 33 },
    3: { xMin: 50, xMax: 67, yMin: 33, yMax: 67 },
    4: { xMin: 50, xMax: 67, yMin: 67, yMax: 100 },
    5: { xMin: 67, xMax: 100, yMin: 67, yMax: 100 },
    6: { xMin: 67, xMax: 100, yMin: 33, yMax: 67 },
  }
  const c = zoneCoords[zone] || zoneCoords[1]
  return {
    x: Math.round(randBetween(c.xMin, c.xMax) * 100) / 100,
    y: Math.round(randBetween(c.yMin, c.yMax) * 100) / 100,
  }
}

// ============================================================================
// ATTACK DESTINATION COORDINATES (opponent's court)
// ============================================================================

/**
 * Zones on the OPPONENT's court (where attacks land).
 * Coordinate system: x=0-100 (left to right), y=0-100 (net to baseline).
 */
const OPPONENT_COURT_ZONES: Record<number, { xMin: number; xMax: number; yMin: number; yMax: number }> = {
  2: { xMin: 67, xMax: 98, yMin: 2, yMax: 33 },   // front-right (near net)
  3: { xMin: 33, xMax: 67, yMin: 2, yMax: 33 },   // front-center
  4: { xMin: 2, xMax: 33, yMin: 2, yMax: 33 },    // front-left
  5: { xMin: 2, xMax: 33, yMin: 67, yMax: 98 },   // back-left
  6: { xMin: 25, xMax: 75, yMin: 45, yMax: 95 },   // back-center (wider area)
  1: { xMin: 67, xMax: 98, yMin: 67, yMax: 98 },   // back-right
}

/**
 * Generate realistic destination coordinates for attacks based on attacker zone.
 * Uses fine-grained coordinate ranges (not just zone centers) to create
 * visually distinct heatmap patterns per position.
 *
 * Coordinate system: opponent's court, X=0-100 (left to right), Y=0-100 (net to baseline).
 */
interface DestBounds { xMin: number; xMax: number; yMin: number; yMax: number; zone: number }

function generateAttackDestination(attackerZone: number): { destX: number; destY: number; destZone: number } {
  let bounds: DestBounds

  switch (attackerZone) {
    case 4: { // Outside hitter (ponteiro) — diagonal cross-court dominant
      const shot = weightedPick<string>(
        ['diagonal', 'parallel', 'deep_center', 'tip', 'error'],
        [40, 20, 25, 10, 5]
      )
      switch (shot) {
        case 'diagonal':    bounds = { xMin: 60, xMax: 90, yMin: 60, yMax: 90, zone: 1 }; break
        case 'parallel':    bounds = { xMin: 70, xMax: 95, yMin: 20, yMax: 50, zone: 2 }; break
        case 'deep_center': bounds = { xMin: 30, xMax: 60, yMin: 70, yMax: 98, zone: 6 }; break
        case 'tip':         bounds = { xMin: 40, xMax: 70, yMin: 5, yMax: 25, zone: 3 }; break
        default:            bounds = { xMin: 85, xMax: 105, yMin: 0, yMax: 100, zone: 1 }; break // out
      }
      break
    }
    case 2: { // Opposite (oposto) — diagonal to zone 5 dominant
      const shot = weightedPick<string>(
        ['diagonal', 'parallel', 'deep_center', 'tip', 'error'],
        [40, 20, 25, 10, 5]
      )
      switch (shot) {
        case 'diagonal':    bounds = { xMin: 10, xMax: 40, yMin: 60, yMax: 90, zone: 5 }; break
        case 'parallel':    bounds = { xMin: 5, xMax: 30, yMin: 20, yMax: 50, zone: 4 }; break
        case 'deep_center': bounds = { xMin: 30, xMax: 60, yMin: 70, yMax: 98, zone: 6 }; break
        case 'tip':         bounds = { xMin: 30, xMax: 60, yMin: 5, yMax: 25, zone: 3 }; break
        default:            bounds = { xMin: -5, xMax: 15, yMin: 0, yMax: 100, zone: 5 }; break // out
      }
      break
    }
    case 3: { // Middle (central) — concentrated center, some angles
      const shot = weightedPick<string>(
        ['center', 'left_angle', 'right_angle', 'tip'],
        [45, 20, 25, 10]
      )
      switch (shot) {
        case 'center':      bounds = { xMin: 25, xMax: 75, yMin: 30, yMax: 80, zone: 6 }; break
        case 'left_angle':  bounds = { xMin: 10, xMax: 30, yMin: 40, yMax: 70, zone: 5 }; break
        case 'right_angle': bounds = { xMin: 70, xMax: 90, yMin: 40, yMax: 70, zone: 1 }; break
        default:            bounds = { xMin: 30, xMax: 70, yMin: 5, yMax: 25, zone: 3 }; break
      }
      break
    }
    case 6: { // Pipe (back row attack) — deep zones
      const shot = weightedPick<string>(
        ['deep_right', 'deep_center', 'deep_left', 'mid'],
        [30, 35, 25, 10]
      )
      switch (shot) {
        case 'deep_right':  bounds = { xMin: 60, xMax: 90, yMin: 65, yMax: 95, zone: 1 }; break
        case 'deep_center': bounds = { xMin: 30, xMax: 70, yMin: 70, yMax: 98, zone: 6 }; break
        case 'deep_left':   bounds = { xMin: 10, xMax: 40, yMin: 65, yMax: 95, zone: 5 }; break
        default:            bounds = { xMin: 30, xMax: 70, yMin: 40, yMax: 65, zone: 6 }; break
      }
      break
    }
    default: {
      bounds = { xMin: 20, xMax: 80, yMin: 40, yMax: 90, zone: 6 }
    }
  }

  // Clamp coordinates to 0-100 range (errors can exceed)
  const rawX = randBetween(bounds.xMin, bounds.xMax)
  const rawY = randBetween(bounds.yMin, bounds.yMax)
  return {
    destX: Math.round(Math.max(0, Math.min(100, rawX)) * 100) / 100,
    destY: Math.round(Math.max(0, Math.min(100, rawY)) * 100) / 100,
    destZone: bounds.zone,
  }
}

/**
 * Generate realistic destination coordinates for serves.
 * Fine-grained coordinate ranges to create distinct serve heatmap patterns.
 */
function generateServeDestination(): { destX: number; destY: number; destZone: number } {
  const target = weightedPick<string>(
    ['deep_right', 'deep_center', 'deep_left', 'short', 'error'],
    [30, 30, 25, 10, 5]
  )

  let bounds: DestBounds
  switch (target) {
    case 'deep_right':  bounds = { xMin: 65, xMax: 95, yMin: 65, yMax: 95, zone: 1 }; break
    case 'deep_center': bounds = { xMin: 30, xMax: 70, yMin: 70, yMax: 95, zone: 6 }; break
    case 'deep_left':   bounds = { xMin: 5, xMax: 35, yMin: 65, yMax: 95, zone: 5 }; break
    case 'short':       bounds = { xMin: 50, xMax: 90, yMin: 15, yMax: 40, zone: 2 }; break
    default:            bounds = { xMin: 0, xMax: 100, yMin: 95, yMax: 105, zone: 6 }; break // long
  }

  const rawX = randBetween(bounds.xMin, bounds.xMax)
  const rawY = randBetween(bounds.yMin, bounds.yMax)
  return {
    destX: Math.round(Math.max(0, Math.min(100, rawX)) * 100) / 100,
    destY: Math.round(Math.max(0, Math.min(100, rawY)) * 100) / 100,
    destZone: bounds.zone,
  }
}

function videoTs(setNum: number, rallyIdx: number, actionIdx: number): string {
  const baseMinutes = (setNum - 1) * 25
  const minutes = baseMinutes + Math.floor(rallyIdx * 0.8) + Math.floor(actionIdx * 0.15)
  const seconds = Math.floor(Math.random() * 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function timeStr(baseHour: number, minuteOffset: number): string {
  const h = baseHour + Math.floor(minuteOffset / 60)
  const m = minuteOffset % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ============================================================================
// IDS & DATA
// ============================================================================

const TEAM_ID = randomUUID()

const PLAYER_DATA = [
  { number: 1, name: 'Lau', position: 'ponteiro', secondary: ['libero'] },
  { number: 2, name: 'Gabriel Soares', position: 'levantador', secondary: [] },
  { number: 3, name: 'Allyson', position: 'ponteiro', secondary: [] },
  { number: 4, name: 'Mateus Soares', position: 'ponteiro', secondary: ['libero'] },
  { number: 7, name: 'Gabriel Motta', position: 'levantador', secondary: [] },
  { number: 9, name: 'João', position: 'oposto', secondary: ['ponteiro'] },
  { number: 10, name: 'Kildere', position: 'central', secondary: [] },
  { number: 11, name: 'Gabriel Macedo', position: 'ponteiro', secondary: ['libero'] },
  { number: 14, name: 'Igor', position: 'ponteiro', secondary: ['libero'] },
  { number: 15, name: 'Pedro Igor', position: 'ponteiro', secondary: [] },
  { number: 21, name: 'Jihed', position: 'ponteiro', secondary: ['oposto'] },
  { number: 25, name: 'Gilson', position: 'ponteiro', secondary: [] },
  { number: 26, name: 'Cláudio', position: 'levantador', secondary: [] },
  { number: 77, name: 'Igor Mikael', position: 'central', secondary: [] },
  { number: 99, name: 'Taynã', position: 'central', secondary: [] },
  { number: 4, name: 'Calazans', position: 'ponteiro', secondary: ['oposto'] },
  { number: 95, name: 'Ícaro', position: 'libero', secondary: [] },
  { number: 12, name: 'Raphael', position: 'libero', secondary: [] },
  { number: 98, name: 'José', position: 'oposto', secondary: ['ponteiro'] },
  { number: 97, name: 'Pedro', position: 'levantador', secondary: [] },
  { number: 96, name: 'Gabriel Arthur', position: 'central', secondary: [] },
  { number: 94, name: 'Eitor', position: 'ponteiro', secondary: ['central'] },
]

const playerIds: Record<number, string> = {}
PLAYER_DATA.forEach((p) => {
  playerIds[p.number] = randomUUID()
})

const STARTERS = [2, 10, 1, 9, 77, 3] // levantador, central, ponteiro, oposto, central, ponteiro
const LIBERO_NUMBER = 12

const OPPONENT_DATA = [
  { name: 'Teste 1', abbr: 'VED' },
  { name: 'Teste 2', abbr: 'SPV' },
  { name: 'Teste 3', abbr: 'JOI' },
]
const opponentIds = OPPONENT_DATA.map(() => randomUUID())

const MATCH_DATA = [
  {
    opponent: 'Teste 1',
    opponentIdx: 0,
    daysAgo: 14,
    location: 'Edgar Barbosa',
    tournament: 'Copa Regional RN 2026',
    matchType: 'championship',
    result: 'vitoria',
    finalScore: '3 x 1',
    sets: [
      { set: 1, home: 25, away: 20 },
      { set: 2, home: 22, away: 25 },
      { set: 3, home: 25, away: 18 },
      { set: 4, home: 25, away: 22 },
    ],
    duration: 98,
  },
  {
    opponent: 'Teste 2',
    opponentIdx: 1,
    daysAgo: 7,
    location: 'Edgar Barbosa',
    tournament: 'Copa Regional RN 2026',
    matchType: 'championship',
    result: 'derrota',
    finalScore: '1 x 3',
    sets: [
      { set: 1, home: 25, away: 23 },
      { set: 2, home: 20, away: 25 },
      { set: 3, home: 18, away: 25 },
      { set: 4, home: 21, away: 25 },
    ],
    duration: 105,
  },
  {
    opponent: 'Teste 3',
    opponentIdx: 2,
    daysAgo: 3,
    location: 'Edgar Barbosa',
    tournament: null,
    matchType: 'friendly',
    result: 'vitoria',
    finalScore: '3 x 2',
    sets: [
      { set: 1, home: 25, away: 21 },
      { set: 2, home: 23, away: 25 },
      { set: 3, home: 25, away: 27 },
      { set: 4, home: 25, away: 20 },
      { set: 5, home: 15, away: 12 },
    ],
    duration: 127,
  },
]

const matchIds = MATCH_DATA.map(() => randomUUID())
const gameConfigIds = MATCH_DATA.map(() => randomUUID())

// ============================================================================
// PLAYER SELECTION BY ROLE
// ============================================================================

const ATTACKERS_OH = [1, 3, 4, 14]   // ponteiros (outside hitters): Lau, Allyson, Mateus, Igor
const ATTACKERS_OPP = [9, 21]         // opostos: João, Jihed
const CENTRALS = [10, 77, 99]         // centrais: Kildere, Igor Mikael, Taynã
const SETTERS = [2, 7]                // levantadores: Gabriel Soares, Gabriel Motta
const LIBEROS = [12]                  // libero: Raphael

function pickAttackerByDestination(dest: 'outside' | 'opposite' | 'middle' | 'pipe'): number {
  const starters = STARTERS
  switch (dest) {
    case 'outside': return pick(ATTACKERS_OH.filter(n => starters.includes(n)))
    case 'opposite': return pick(ATTACKERS_OPP.filter(n => starters.includes(n)))
    case 'middle': return pick(CENTRALS.filter(n => starters.includes(n)))
    case 'pipe': return pick([...ATTACKERS_OH, ...ATTACKERS_OPP].filter(n => starters.includes(n)))
  }
}

function pickReceiver(): number {
  const eligible = [...ATTACKERS_OH, LIBERO_NUMBER].filter(n => STARTERS.includes(n) || LIBEROS.includes(n))
  return pick(eligible)
}

function pickServer(): number {
  return pick(STARTERS)
}

function pickSetter(): number {
  return pick(SETTERS.filter(n => STARTERS.includes(n) || n === 2))
}

function pickBlocker(): number {
  return pick([...CENTRALS, ...ATTACKERS_OH, ...ATTACKERS_OPP].filter(n => STARTERS.includes(n)))
}

function pickDigger(): number {
  return pick([LIBERO_NUMBER, ...ATTACKERS_OH].filter(n => STARTERS.includes(n) || LIBEROS.includes(n)))
}

// ============================================================================
// DESTINATION DISTRIBUTION BY PASS QUALITY
// ============================================================================

type Destination = 'outside' | 'opposite' | 'middle' | 'pipe'

const DEST_ZONES: Record<Destination, number> = {
  outside: 4,
  opposite: 2,
  middle: 3,
  pipe: 6,
}

function pickDestination(passQuality: 'A' | 'B' | 'C' | 'transition'): Destination {
  const dests: Destination[] = ['outside', 'opposite', 'middle', 'pipe']
  switch (passQuality) {
    case 'A': return weightedPick(dests, [35, 25, 28, 12])
    case 'B': return weightedPick(dests, [42, 28, 18, 12])
    case 'C': return weightedPick(dests, [52, 28, 12, 8])
    case 'transition': return weightedPick(dests, [45, 30, 15, 10])
  }
}

// ============================================================================
// RALLY GENERATION
// ============================================================================

interface RallyAction {
  action: string
  subAction: string
  zone: number
  playerNumber: number
}

/** Classifies reception quality from subAction */
function receptionToPassQuality(subAction: string): 'A' | 'B' | 'C' {
  switch (subAction) {
    case 'perfect': return 'A'
    case 'positive': return 'B'
    default: return 'C'
  }
}

/** Does this attack result end the rally? */
function attackEndsRally(subAction: string): boolean {
  return subAction === 'kill' || subAction === 'error' || subAction === 'blocked'
}

/**
 * Generate a complete side-out rally (team is receiving).
 * Sequence: Reception → Set → Attack [→ Dig → Set → Attack (transition)]
 */
function generateSideOutRally(): RallyAction[] {
  const actions: RallyAction[] = []

  // 1. Reception
  const recSub = weightedPick(
    ['perfect', 'positive', 'negative', 'error'],
    [22, 35, 28, 15]
  )
  actions.push({
    action: 'reception',
    subAction: recSub,
    zone: pick([1, 5, 6]),
    playerNumber: pickReceiver(),
  })

  // Reception error → rally over
  if (recSub === 'error') return actions

  const passQuality = receptionToPassQuality(recSub)

  // 2. Set
  const setQuality = passQuality === 'A'
    ? weightedPick(['perfect', 'positive', 'negative', 'error'], [50, 35, 10, 5])
    : passQuality === 'B'
      ? weightedPick(['perfect', 'positive', 'negative', 'error'], [30, 40, 20, 10])
      : weightedPick(['perfect', 'positive', 'negative', 'error'], [15, 30, 35, 20])

  const dest1 = pickDestination(passQuality)

  actions.push({
    action: 'set',
    subAction: setQuality,
    zone: pick([2, 3]), // setter zone
    playerNumber: pickSetter(),
  })

  if (setQuality === 'error') return actions

  // 3. First attack
  const atkSub1 = weightedPick(
    ['kill', 'replay', 'continued', 'blocked', 'error'],
    passQuality === 'A' ? [48, 12, 22, 8, 10]
      : passQuality === 'B' ? [40, 14, 24, 12, 10]
        : [30, 12, 26, 16, 16]
  )

  actions.push({
    action: 'attack',
    subAction: atkSub1,
    zone: DEST_ZONES[dest1],
    playerNumber: pickAttackerByDestination(dest1),
  })

  if (attackEndsRally(atkSub1)) return actions

  // Rally continues → transition (counter-attack): ~40% chance
  if (Math.random() < 0.4) {
    // Dig
    const digSub = weightedPick(['perfect', 'positive', 'bad', 'error'], [22, 35, 28, 15])
    actions.push({
      action: 'dig',
      subAction: digSub,
      zone: pick([1, 5, 6]),
      playerNumber: pickDigger(),
    })
    if (digSub === 'error') return actions

    // Transition set
    const tSetSub = weightedPick(['perfect', 'positive', 'negative', 'error'], [25, 40, 25, 10])
    const dest2 = pickDestination('transition')
    actions.push({
      action: 'set',
      subAction: tSetSub,
      zone: pick([2, 3]),
      playerNumber: pickSetter(),
    })
    if (tSetSub === 'error') return actions

    // Transition attack
    const atkSub2 = weightedPick(
      ['kill', 'replay', 'continued', 'blocked', 'error'],
      [38, 10, 22, 15, 15]
    )
    actions.push({
      action: 'attack',
      subAction: atkSub2,
      zone: DEST_ZONES[dest2],
      playerNumber: pickAttackerByDestination(dest2),
    })
  }

  return actions
}

/**
 * Generate a complete break rally (team is serving).
 * Sequence: Serve [→ Block] [→ Dig → Set → Attack]
 */
function generateBreakRally(): RallyAction[] {
  const actions: RallyAction[] = []

  // 1. Serve
  const serveSub = weightedPick(
    ['ace', 'broken_pass', 'overpass', 'facilitated', 'error'],
    [8, 22, 5, 48, 17]
  )
  actions.push({
    action: 'serve',
    subAction: serveSub,
    zone: 1,
    playerNumber: pickServer(),
  })

  // Ace or error → rally over
  if (serveSub === 'ace' || serveSub === 'error') return actions

  // Opponent attacks → our block (~60% of rallies)
  if (Math.random() < 0.6) {
    const blockSub = weightedPick(['kill_block', 'touch', 'error'], [15, 55, 30])
    actions.push({
      action: 'block',
      subAction: blockSub,
      zone: pick([2, 3, 4]),
      playerNumber: pickBlocker(),
    })
    if (blockSub === 'kill_block') return actions
    if (blockSub === 'error') return actions
  }

  // Dig (our defense)
  const digSub = weightedPick(['perfect', 'positive', 'bad', 'error'], [18, 32, 30, 20])
  actions.push({
    action: 'dig',
    subAction: digSub,
    zone: pick([1, 5, 6]),
    playerNumber: pickDigger(),
  })
  if (digSub === 'error') return actions

  // Counter-attack set
  const dest = pickDestination('transition')
  const setSub = weightedPick(['perfect', 'positive', 'negative', 'error'], [25, 38, 27, 10])
  actions.push({
    action: 'set',
    subAction: setSub,
    zone: pick([2, 3]),
    playerNumber: pickSetter(),
  })
  if (setSub === 'error') return actions

  // Counter-attack
  const atkSub = weightedPick(
    ['kill', 'replay', 'continued', 'blocked', 'error'],
    [36, 12, 22, 15, 15]
  )
  actions.push({
    action: 'attack',
    subAction: atkSub,
    zone: DEST_ZONES[dest],
    playerNumber: pickAttackerByDestination(dest),
  })

  return actions
}

// ============================================================================
// MATCH RALLY GENERATION
// ============================================================================

interface SeedScoutAction {
  action: string
  subAction: string
  zone: number
  playerNumber: number
  setNumber: number
  phase: 'sideout' | 'transition'
  rallyId: string
  rotation: number
}

function generateRalliesForMatch(
  matchId: string,
  sets: { set: number; home: number; away: number }[]
): SeedScoutAction[] {
  const allActions: SeedScoutAction[] = []

  for (const setInfo of sets) {
    const totalPoints = setInfo.home + setInfo.away
    let homeScore = 0
    let awayScore = 0
    let rotation = 1 // S1 to start
    let servingHome = Math.random() > 0.5 // who serves first in this set
    let rallyCount = 0

    while (homeScore < setInfo.home || awayScore < setInfo.away) {
      // Stop if we've already reached both targets
      if (homeScore >= setInfo.home && awayScore >= setInfo.away) break

      rallyCount++
      const rallyId = `rally-${matchId.slice(0, 8)}-S${setInfo.set}-R${rallyCount}`

      // Determine rally type based on who's serving
      const isSideOut = !servingHome // if opponent serves, we're in side-out
      const phase: 'sideout' | 'transition' = isSideOut ? 'sideout' : 'transition'

      // Generate rally actions
      const rallyActions = isSideOut
        ? generateSideOutRally()
        : generateBreakRally()

      // Determine who scores this rally (biased by set result)
      let homeWins: boolean
      if (homeScore >= setInfo.home) {
        homeWins = false
      } else if (awayScore >= setInfo.away) {
        homeWins = true
      } else {
        // Bias toward the actual set result
        const homeExpected = setInfo.home / totalPoints
        homeWins = Math.random() < homeExpected
      }

      if (homeWins) homeScore++
      else awayScore++

      // Add actions to the full list
      for (const ra of rallyActions) {
        allActions.push({
          action: ra.action,
          subAction: ra.subAction,
          zone: ra.zone,
          playerNumber: ra.playerNumber,
          setNumber: setInfo.set,
          phase,
          rallyId,
          rotation,
        })
      }

      // Rotation logic: rotate on side-out win (our team scores while receiving)
      if (homeWins && !servingHome) {
        // Side-out won → we rotate and now serve
        rotation = rotation === 6 ? 1 : rotation + 1
      }

      // Serving switches on side-out
      if (homeWins && !servingHome) {
        servingHome = true
      } else if (!homeWins && servingHome) {
        servingHome = false
      }
    }
  }

  return allActions
}

// ============================================================================
// MAIN SEED
// ============================================================================

async function main() {
  console.log('Limpando banco...')
  await prisma.scoutAction.deleteMany()
  await prisma.gameConfig.deleteMany()
  await prisma.match.deleteMany()
  await prisma.player.deleteMany()
  await prisma.opponent.deleteMany()
  await prisma.scoutModelSchema.deleteMany()
  await prisma.userPreference.deleteMany()
  await prisma.team.deleteMany()

  // 1. Team
  console.log('Criando equipe...')
  await prisma.team.create({
    data: { id: TEAM_ID, name: 'Aliança Vôlei', logo: null },
  })

  // 2. Players
  console.log('Criando jogadores...')
  for (const p of PLAYER_DATA) {
    try {
      await prisma.player.create({
        data: {
          id: playerIds[p.number],
          teamId: TEAM_ID,
          name: p.name,
          jerseyNumber: p.number,
          position: p.position,
          secondaryPositions: JSON.stringify(p.secondary),
          photo: '',
        },
      })
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log(`  ⚠️  Jogador ${p.name} (#${p.number}) pulado — número de camisa duplicado`)
      } else {
        throw e
      }
    }
  }

  // 3. Opponents
  console.log('Criando adversários...')
  for (let i = 0; i < OPPONENT_DATA.length; i++) {
    await prisma.opponent.create({
      data: {
        id: opponentIds[i],
        name: OPPONENT_DATA[i].name,
        abbreviation: OPPONENT_DATA[i].abbr,
        logo: null,
      },
    })
  }

  // 4. ScoutModelSchema
  console.log('Criando modelos de scout...')
  await prisma.scoutModelSchema.create({
    data: {
      id: randomUUID(),
      name: 'Completo',
      description: 'Todos os 6 fundamentos habilitados',
      fundamentals: JSON.stringify({
        serve: true, pass: true, attack: true, block: true, dig: true, set: true,
      }),
    },
  })
  await prisma.scoutModelSchema.create({
    data: {
      id: randomUUID(),
      name: 'Básico',
      description: 'Apenas Saque, Recepção e Ataque',
      fundamentals: JSON.stringify({
        serve: true, pass: true, attack: true, block: false, dig: false, set: false,
      }),
    },
  })

  // 5. Matches + Rally-based Actions + GameConfigs
  for (let mi = 0; mi < MATCH_DATA.length; mi++) {
    const md = MATCH_DATA[mi]
    const matchId = matchIds[mi]
    const matchDate = daysAgo(md.daysAgo)

    console.log(`Criando partida ${mi + 1}: vs ${md.opponent}...`)

    await prisma.match.create({
      data: {
        id: matchId,
        teamId: TEAM_ID,
        opponent: md.opponent,
        homeTeam: 'Vôlei Natal',
        awayTeam: md.opponent,
        tournament: md.tournament,
        location: md.location,
        date: matchDate,
        result: md.result,
        finalScore: md.finalScore,
        sets: JSON.stringify(md.sets.map(s => ({
          set: s.set,
          score: `${s.home}-${s.away}`,
        }))),
        stats: null,
        duration: md.duration,
      },
    })

    // GameConfig
    const lineup = STARTERS.map((num, idx) => ({
      playerId: playerIds[num],
      jerseyNumber: num,
      playerName: PLAYER_DATA.find((p) => p.number === num)!.name,
      position: PLAYER_DATA.find((p) => p.number === num)!.position,
      isStarter: true,
      rotationOrder: idx + 1,
    }))

    await prisma.gameConfig.create({
      data: {
        id: gameConfigIds[mi],
        gameId: `game-match-${mi + 1}`,
        teamId: TEAM_ID,
        date: matchDate,
        time: '20:00',
        opponentId: opponentIds[md.opponentIdx],
        opponentName: md.opponent,
        tournament: md.tournament,
        location: md.location,
        matchType: md.matchType,
        lineup: JSON.stringify(lineup),
        liberoId: playerIds[LIBERO_NUMBER],
        rotationStart: JSON.stringify([1, 2, 3, 4, 5, 6]),
        modelId: 'completo',
        modelName: 'Completo',
        customWeights: null,
        advanced: JSON.stringify({
          useEPV: false,
          trackReceptionGradeAgainst: false,
          enableContextHashing: false,
          collectBlockersCount: false,
          collectChainId: false,
          enableXSR: false,
          enableEntropy: false,
        }),
      },
    })

    // Generate rally-based actions
    const rallyActions = generateRalliesForMatch(matchId, md.sets)
    console.log(`  Gerando ${rallyActions.length} ações em rallies completos...`)

    const batchData = rallyActions.map((ra, idx) => {
      const pId = playerIds[ra.playerNumber]
      const coords = coordsForZone(ra.zone)
      const minuteOffset = Math.floor((idx / rallyActions.length) * md.duration)
      const actionTimestamp = new Date(matchDate.getTime() + minuteOffset * 60000)
      const rallyIdx = parseInt(ra.rallyId.split('-R')[1] || '0')

      // Generate destination coordinates for attacks and serves
      const isAttack = ra.action === 'attack'
      const isServe = ra.action === 'serve'
      const dest = isAttack ? generateAttackDestination(ra.zone)
        : isServe ? generateServeDestination()
        : null

      return {
        id: randomUUID(),
        matchId,
        playerId: pId,
        time: timeStr(20, minuteOffset),
        action: ra.action,
        subAction: ra.subAction,
        zone: ra.zone,
        coordinateX: coords.x,
        coordinateY: coords.y,
        setNumber: ra.setNumber,
        timestamp: actionTimestamp,
        videoTimestamp: videoTs(ra.setNumber, rallyIdx, idx % 10),
        efficiencyValue: seedComputeEfficiency(ra.action, ra.subAction),
        phase: ra.phase,
        rallyId: ra.rallyId,
        fullData: JSON.stringify({
          rotation: ra.rotation,
          zone: ra.zone,
          action: ra.action,
          subAction: ra.subAction,
          ...(dest && { destX: dest.destX, destY: dest.destY, destZone: dest.destZone }),
        }),
      }
    })

    // Batch insert in chunks of 50
    for (let i = 0; i < batchData.length; i += 50) {
      const chunk = batchData.slice(i, i + 50)
      await prisma.scoutAction.createMany({ data: chunk })
    }

    // Stats summary
    const phases = { sideout: 0, transition: 0 }
    const fundamentals: Record<string, number> = {}
    const ralliesSet = new Set<string>()
    for (const ra of rallyActions) {
      phases[ra.phase]++
      fundamentals[ra.action] = (fundamentals[ra.action] || 0) + 1
      ralliesSet.add(ra.rallyId)
    }
    console.log(`  ✅ ${batchData.length} ações | ${ralliesSet.size} rallies | SO:${phases.sideout} TR:${phases.transition}`)
    console.log(`     Fundamentos: ${Object.entries(fundamentals).map(([k, v]) => `${k}:${v}`).join(' ')}`)
  }

  // 6. UserPreference
  console.log('Criando preferência de usuário...')
  await prisma.userPreference.create({
    data: {
      id: randomUUID(),
      deviceId: 'dev-local',
      selectedTeamId: TEAM_ID,
    },
  })

  // Summary
  const counts = {
    teams: await prisma.team.count(),
    players: await prisma.player.count(),
    opponents: await prisma.opponent.count(),
    matches: await prisma.match.count(),
    actions: await prisma.scoutAction.count(),
    configs: await prisma.gameConfig.count(),
    models: await prisma.scoutModelSchema.count(),
    prefs: await prisma.userPreference.count(),
  }

  console.log('\n🏐 Seed completo!')
  console.log('─'.repeat(40))
  console.log(`  Times:        ${counts.teams}`)
  console.log(`  Jogadores:    ${counts.players}`)
  console.log(`  Adversários:  ${counts.opponents}`)
  console.log(`  Partidas:     ${counts.matches}`)
  console.log(`  Ações scout:  ${counts.actions}`)
  console.log(`  GameConfigs:  ${counts.configs}`)
  console.log(`  Modelos:      ${counts.models}`)
  console.log(`  Preferências: ${counts.prefs}`)
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
