// types/statistics.ts
import { ScoutAction } from './scout'

// Filtros disponíveis
export interface StatisticsFilters {
  matchId?: string
  playerId?: string
  set?: number
  action?: ScoutAction['action']
  zone?: number
}

// Estatísticas por jogador
export interface PlayerStatistics {
  playerId: string
  playerName: string
  jerseyNumber: number

  // Totais
  totalActions: number

  // Por fundamento
  serves: {
    total: number
    aces: number
    errors: number
    efficiency: number // (aces - errors) / total * 100
  }

  attacks: {
    total: number
    kills: number // pontos diretos
    errors: number
    blocked: number
    efficiency: number // (kills - errors - blocked) / total * 100
  }

  blocks: {
    total: number
    kills: number
    touches: number
    efficiency: number
  }

  receptions: {
    total: number
    perfect: number // recepção A
    good: number // recepção B
    poor: number // recepção C
    errors: number
    efficiency: number // (perfect + good) / total * 100
  }

  sets: {
    total: number
    assists: number // levantamentos que viraram ponto
    efficiency: number
  }

  digs: {
    total: number
    successful: number
    errors: number
    efficiency: number
  }
}

// Estatísticas por zona
export interface ZoneStatistics {
  zone: number
  totalActions: number
  actionsByType: Record<string, number>
  successRate: number
  errorRate: number
}

// Estatísticas por set
export interface SetStatistics {
  setNumber: number
  totalActions: number
  score: { home: number; away: number }
  duration?: number
  topPlayers: {
    playerId: string
    playerName: string
    actions: number
  }[]
}

// Dados para heatmap
export interface HeatmapData {
  zone: number
  x: number
  y: number
  intensity: number // 0-100
  actions: number
  successRate: number
}

// Dados agregados para gráficos
export interface ChartData {
  label: string
  value: number
  color?: string
}

// Tipos de visualização
export type VisualizationType = 'table' | 'bar' | 'pie' | 'line' | 'heatmap'

// Tipos de fundamento — reutiliza mapeamento centralizado
import { ACTION_NAMES, getActionLabel } from '@/lib/actionLabels'

export const ACTION_LABELS: Record<ScoutAction['action'], string> = {
  serve: ACTION_NAMES.serve,
  attack: ACTION_NAMES.attack,
  block: ACTION_NAMES.block,
  dig: ACTION_NAMES.dig,
  set: ACTION_NAMES.set,
  reception: ACTION_NAMES.reception,
  opponent_error: ACTION_NAMES.opponent_error,
  substitution: ACTION_NAMES.substitution,
}

// Subações por fundamento
export const SUB_ACTIONS: Record<ScoutAction['action'], string[]> = {
  serve: ['ace', 'broken_pass', 'overpass', 'facilitated', 'error'],
  attack: ['kill', 'replay', 'continued', 'blocked', 'error'],
  block: ['kill_block', 'touch', 'error'],
  reception: ['perfect', 'positive', 'negative', 'overpass', 'error'],
  set: ['perfect', 'positive', 'negative', 'error'],
  dig: ['perfect', 'positive', 'bad', 'error'],
  opponent_error: [],
  substitution: [],
}

// Labels para subações — usa mapeamento centralizado
export const SUB_ACTION_LABELS: Record<string, string> = {
  ace: getActionLabel('serve', 'ace'),
  broken_pass: getActionLabel('serve', 'broken_pass'),
  overpass: getActionLabel('serve', 'overpass'),
  facilitated: getActionLabel('serve', 'facilitated'),
  error: 'Erro',
  kill: getActionLabel('attack', 'kill'),
  replay: getActionLabel('attack', 'replay'),
  continued: getActionLabel('attack', 'continued'),
  blocked: getActionLabel('attack', 'blocked'),
  kill_block: getActionLabel('block', 'kill_block'),
  touch: getActionLabel('block', 'touch'),
  perfect: getActionLabel('dig', 'perfect'),
  positive: getActionLabel('dig', 'positive'),
  negative: getActionLabel('set', 'negative'),
  bad: getActionLabel('dig', 'bad'),
}
