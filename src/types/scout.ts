// app/types/scout.ts
export type ActionType = 'serve' | 'reception' | 'set' | 'attack' | 'block' | 'dig' | 'opponent_error' | 'substitution'

export type ServeSubAction = 'ace' | 'broken_pass' | 'overpass' | 'facilitated' | 'error'
export type ServeType = 'float' | 'jump' | 'directed'
export type ReceptionSubAction = 'perfect' | 'positive' | 'negative' | 'overpass' | 'error'
export type AttackSubAction = 'kill' | 'blocked' | 'replay' | 'continued' | 'error'
export type BlockSubAction = 'kill_block' | 'touch' | 'error'
export type DigSubAction = 'perfect' | 'positive' | 'bad' | 'error'
export type SetSubAction = 'perfect' | 'positive' | 'negative' | 'error'

export interface ScoutAction {
  id: string
  time: string
  player: string
  action: ActionType
  subAction: string // Stores one of the SubAction types values
  zone?: number // 1-9
  coordinates?: { x: number; y: number }
  destX?: number // coordenada de destino para heatmap (0-100%)
  destY?: number // coordenada de destino para heatmap (0-100%)
  matchId?: string
  set?: number
  timestamp: Date
  videoTimestamp?: string // MM:SS do vídeo (ex: "12:30")
  efficiencyValue?: number // -1.0 a +1.0
  phase?: 'sideout' | 'transition'
  rallyId?: string
  serveType?: ServeType // Tipo de saque: viagem, jornada, caixinha
  rotation?: number // Rotação do time (1-6) no momento da ação
  servingTeam?: 'home' | 'away' // Quem sacava no momento da ação
}

export interface Player {
  number: string
  name?: string
  position: 1 | 2 | 3 | 4 | 5 | 6
}

export interface MatchInfo {
  id: string
  homeTeam: string
  awayTeam: string
  currentSet: number
  score: { home: number; away: number }
  rotation: number
  servingPlayer: string
}

// Tipo para mapear posições da quadra (1-6) para IDs de jogadores
export type CourtPositions = {
  1: string | null
  2: string | null
  3: string | null
  4: string | null
  5: string | null
  6: string | null
}

// Tipo para controlar quem está sacando
export type ServingTeam = 'home' | 'away'

// Tipo para o fluxo do rally
export type RallyStep =
  | 'serve'      // Saque
  | 'reception'  // Recepção (após saque adversário)
  | 'block'      // Bloqueio (após saque próprio)
  | 'dig'        // Defesa
  | 'set'        // Levantamento
  | 'attack'     // Ataque

// Estado do rally
export interface RallyState {
  servingTeam: ServingTeam
  currentStep: RallyStep
  rallyActions: ScoutAction[]
}

/**
 * Registro de um ponto finalizado
 */
export interface PointRecord {
  id: string
  set: number
  score: { home: number; away: number } // Placar APÓS o ponto
  winner: 'home' | 'away'
  actions: ScoutAction[] // Ações que levaram ao ponto
  timestamp: Date
}

// ============================================================================
// GAME CONFIGURATION TYPES
// ============================================================================

/**
 * Tipo de partida
 */
export type MatchType = 'friendly' | 'championship' | 'training'

/**
 * Modelo de scout (esquema de ações)
 */
export interface ScoutModel {
  id: string
  name: string
  description: string
  fundamentals: {
    serve: boolean
    pass: boolean
    attack: boolean
    block: boolean
    dig: boolean
    set: boolean
  }
  customWeights?: Record<string, number> // -1 a +1
}

/**
 * Jogador na escalação
 */
export interface LineupPlayer {
  playerId: string
  jerseyNumber: number
  playerName: string
  position: string // ponteiro, oposto, central, levantador, libero
  isStarter: boolean
  rotationOrder?: number // 1-6 (apenas para titulares)
}

/**
 * Campos avançados de tracking
 */
export interface AdvancedTracking {
  useEPV: boolean // Expected Point Value
  trackReceptionGradeAgainst: boolean // Recepção adversária vinculada ao saque
  enableContextHashing: boolean // contextId (rotação × fase × passe × scoreDiffBucket)
  collectBlockersCount: boolean // Nº de bloqueadores por ataque
  collectChainId: boolean // Encadeamento de toques (block→dig→transition)
  enableXSR: boolean // Side-Out Real e xSR tracking
  enableEntropy: boolean // Entropia de distribuição do levantador
}

/**
 * Configuração completa do jogo
 */
export interface GameConfig {
  id?: string
  gameId: string
  date: Date
  time: string
  teamId: string
  teamName: string
  opponentId?: string
  opponentName: string
  tournament?: string
  location?: string
  matchType: MatchType
  sets?: number // Quantidade de sets (3, 5 ou personalizado)

  // Escalação
  lineup: LineupPlayer[]
  liberoId: string
  rotationStart: number[] // [1,2,3,4,5,6] - IDs das posições em ordem

  // Modelo de scout
  modelId: string
  modelName: string
  customWeights?: Record<string, number>

  // Fundamentos habilitados (serve, reception, attack são obrigatórios)
  enabledFundamentos?: string[] // ex: ['serve', 'reception', 'attack', 'block', 'dig', 'set']

  // Campos avançados
  advanced: AdvancedTracking

  // Metadados
  createdAt: Date
  updatedAt?: Date
}

/**
 * Validação do setup do jogo
 */
export interface GameSetupValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface FundamentalStats {
  label: string
  value: string | number
}

export interface PlayerStats {
  playerId: string
  matchesPlayed: number
  setsPlayed: number
  points: number
  serve: {
    total: number
    aces: number
    errors: number
    efficiency: number // (aces - errors) / total
    rating: number // 0-100
  }
  reception: {
    total: number
    perfect: number // A (Perfect)
    positive: number // B (Positive)
    errors: number
    positivity: number // (perfect + positive) / total
    perfectRate: number // perfect / total
    rating: number // 0-100
  }
  attack: {
    total: number
    kills: number
    errors: number
    blocked: number
    efficiency: number // (kills - errors - blocked) / total
    killRate: number // kills / total
    rating: number // 0-100
  }
  block: {
    total: number // Participations (might be hard to track distinct jumps)
    points: number // Kill Blocks
    errors: number // Net touches etc
    touches: number // Amortecidos
    pointsPerSet: number
    rating: number // 0-100
  }
  defense: {
    total: number
    perfect: number
    positive: number // good
    errors: number
    efficiency: number // (perfect + positive) / total
    rating: number // 0-100
  }
  set: {
    total: number
    perfect: number
    errors: number
    rating: number // 0-100
    distribution?: {
      ponteiro: number
      central: number
      oposto: number
      pipe: number
    }
  }
}

/**
 * Adversário (pode ser cadastrado rapidamente)
 */
export interface Opponent {
  id: string
  name: string
  abbreviation?: string
  logo?: string
}
