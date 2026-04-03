/**
 * Sistema de tipos para análise de voleibol
 * Baseado em metodologias FIVB e Data Volley
 */

// ============================================================================
// ENUMS - Fundamentos e Sub-ações
// ============================================================================

export enum ActionType {
  SERVE = 'serve',
  PASS = 'pass',
  ATTACK = 'attack',
  BLOCK = 'block',
  DIG = 'dig',
  SET = 'set',
}

// Saque
export enum ServeSubAction {
  ACE = 'ACE',
  EFFICIENT = 'EFFICIENT', // quebra recepção
  NEUTRAL = 'NEUTRAL',
  ERROR = 'ERROR',
}

export enum ServeType {
  FLOAT = 'float',
  JUMP = 'jump',
  TACTICAL = 'tactical',
}

// Recepção
export enum PassSubAction {
  A = 'A', // Perfeita
  B = 'B', // Média
  C = 'C', // Ruim
  ERROR = 'ERROR',
}

// Ataque
export enum AttackSubAction {
  POINT = 'POINT', // Kill
  EFFICIENT = 'EFFICIENT', // quebra defesa
  DEFENDED = 'DEFENDED',
  BLOCKED = 'BLOCKED',
  ERROR = 'ERROR',
}

export enum AttackType {
  OUTSIDE = 'outside',
  OPPOSITE = 'opposite',
  MIDDLE = 'middle',
  PIPE = 'pipe',
  TIP = 'tip',
}

export enum LiftCondition {
  A = 'A',
  B = 'B',
  C = 'C',
}

// Bloqueio
export enum BlockSubAction {
  POINT = 'POINT',
  DEFLECT = 'DEFLECT', // amortece
  BAD_TOUCH = 'BAD_TOUCH',
  ERROR = 'ERROR',
}

// Defesa
export enum DigSubAction {
  A = 'A',
  B = 'B',
  C = 'C',
  ERROR = 'ERROR',
}

// Levantamento
export enum SetDestination {
  TO_OUTSIDE = 'TO_OUTSIDE',
  TO_OPPOSITE = 'TO_OPPOSITE',
  TO_MIDDLE = 'TO_MIDDLE',
  TO_PIPE = 'TO_PIPE',
  ERROR = 'ERROR',
}

export enum SetQuality {
  GOOD = 'GOOD',
  OK = 'OK',
  POOR = 'POOR',
  ERROR = 'ERROR',
}

export enum SetMethod {
  HAND = 'hand',
  FOREARM = 'forearm',
  QUICK = 'quick',
}

export enum SetTempo {
  QUICK = 'quick',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum SetSituation {
  SR_A = 'SR_A', // Side-out após recepção A
  SR_B = 'SR_B',
  SR_C = 'SR_C',
  TR_A = 'TR_A', // Transition após defesa A
  TR_B = 'TR_B',
  TR_C = 'TR_C',
}

// Fase do rally
// Nota: Phase.BREAK usa o valor 'transition' para alinhar com scout.ts e os dados armazenados no DB.
// Em terminologia FIVB, "break point" equivale ao momento em que o time está sacando.
export enum Phase {
  SIDEOUT = 'sideout',     // recebendo (side-out)
  BREAK = 'transition',    // sacando (break point)
}

// ============================================================================
// TYPES - Estruturas de dados
// ============================================================================

/**
 * Ação base - todos os fundamentos herdam deste
 */
export interface BaseAction {
  id: string
  gameId: string
  setNumber: number
  rallyNumber: number
  rotation: number
  timestamp: Date
  teamId: string
  playerId: string
  actionType: ActionType
  efficiencyValue: number // -1 a +1
  phase?: Phase
  notes?: string
}

/**
 * Ação de Saque
 */
export interface ServeAction extends BaseAction {
  actionType: ActionType.SERVE
  subAction: ServeSubAction
  serveType?: ServeType
  originZone?: number // 1-6
  targetZone?: number // 1-6
  speed?: number
  direction?: string
}

/**
 * Ação de Recepção
 */
export interface PassAction extends BaseAction {
  actionType: ActionType.PASS
  subAction: PassSubAction
  receiveZone?: number // 1-6
  serveTypeAgainst?: ServeType
  isOverpass?: boolean
}

/**
 * Ação de Ataque
 */
export interface AttackAction extends BaseAction {
  actionType: ActionType.ATTACK
  subAction: AttackSubAction
  attackType?: AttackType
  originZone?: number // 2/3/4/6
  targetZone?: number // 1-6
  liftCondition?: LiftCondition
  phase?: Phase
}

/**
 * Ação de Bloqueio
 */
export interface BlockAction extends BaseAction {
  actionType: ActionType.BLOCK
  subAction: BlockSubAction
  blockers?: number // 1/2/3
  vsAttackType?: AttackType
}

/**
 * Ação de Defesa
 */
export interface DigAction extends BaseAction {
  actionType: ActionType.DIG
  subAction: DigSubAction
  vsAttackType?: AttackType
  transitionQuality?: 'good' | 'poor' | 'freeball'
}

/**
 * Ação de Levantamento
 */
export interface SetAction extends BaseAction {
  actionType: ActionType.SET
  destination: SetDestination
  quality: SetQuality
  situation?: SetSituation
  method?: SetMethod
  tempo?: SetTempo
}

/**
 * Union type de todas as ações
 */
export type Action =
  | ServeAction
  | PassAction
  | AttackAction
  | BlockAction
  | DigAction
  | SetAction

// ============================================================================
// KPI TYPES
// ============================================================================

/**
 * Estrutura de um KPI
 */
export interface Kpi {
  key: string
  label: string
  value: number
  sampleSize: number
  explanation: string // texto humano
  formula: string // fórmula resumida
  bounds?: {
    min?: number
    max?: number
    ideal?: string
  }
  format?: 'percentage' | 'decimal' | 'integer' | 'index'
}

/**
 * Resultado de análise de um fundamento
 */
export interface FundamentalAnalysis {
  fundamental: ActionType
  totals: Record<string, number>
  kpis: Kpi[]
  distribution?: Record<string, number>
  heatmap?: { zone: number; value: number }[]
}

/**
 * Filtros para análise
 */
export interface AnalysisFilters {
  gameId?: string
  gameIds?: string[] // para múltiplos jogos
  playerId?: string
  teamId?: string
  setNumber?: number
  rotation?: number
  phase?: Phase
  startDate?: Date
  endDate?: Date
}

/**
 * Relatório completo
 */
export interface VolleyballReport {
  gameId: string
  teamId: string
  filters: AnalysisFilters
  fundamentals: FundamentalAnalysis[]
  transversalKpis: Kpi[]
  metadata: {
    generatedAt: Date
    methodology: string
    references: string[]
  }
}

// ============================================================================
// CONSTANTES - Efficiency Values
// ============================================================================

export const EFFICIENCY_VALUES = {
  SERVE: {
    ACE: 1.0,
    EFFICIENT: 0.5,
    NEUTRAL: 0.0,
    ERROR: -1.0,
  },
  PASS: {
    A: 1.0,
    B: 0.5,
    C: 0.0,
    ERROR: -1.0,
  },
  ATTACK: {
    POINT: 1.0,
    EFFICIENT: 0.5,
    DEFENDED: 0.0,
    BLOCKED: -0.5,
    ERROR: -1.0,
  },
  BLOCK: {
    POINT: 1.0,
    DEFLECT: 0.5,
    BAD_TOUCH: -0.5,
    ERROR: -1.0,
  },
  DIG: {
    A: 1.0,
    B: 0.5,
    C: 0.0,
    ERROR: -1.0,
  },
  SET: {
    GOOD: 1.0,
    OK: 0.5,
    POOR: 0.0,
    ERROR: -1.0,
  },
} as const

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ZoneDistribution = {
  zone: number
  count: number
  efficiency: number
}

export type PlayerStats = {
  playerId: string
  playerName: string
  actions: number
  efficiency: number
  kpis: Kpi[]
}
