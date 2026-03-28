// src/lib/actionLabels.ts
// Mapeamento centralizado de ações de scout de vôlei.
// Conecta três representações: enum interno, label amigável em PT-BR, notação Data Volley.
//
// REGRA:
// - Na UI do app → SEMPRE labels amigáveis + cores
// - Notação Data Volley → só em relatórios exportados (Fase 3)
// - Enums internos → só no código

import { SCOUT_COLORS, SCOUT_HOVER_COLORS } from './scoutColors'

// ============================================================================
// TIPOS
// ============================================================================

export interface ActionLabelEntry {
  /** Valor do enum interno (volleyball.ts) ex: "ACE" */
  enumValue: string
  /** Texto amigável em português para exibir na UI */
  label: string
  /** Notação Data Volley profissional (não exibida na UI) */
  dataVolley: string
  /** Cor hex */
  color: string
  /** Cor hex para hover */
  hoverColor: string
  /** Nome semântico para Chakra UI (green, blue, gray, yellow, red) */
  colorName: string
  /** Valor numérico de eficiência (-1 a +1) */
  efficiencyValue: number
  /** Frase curta explicando a ação (para tooltips) */
  description: string
}

// ============================================================================
// MAPEAMENTO POR FUNDAMENTO (volleyball.ts enums)
// ============================================================================

export const SERVE_LABELS: Record<string, ActionLabelEntry> = {
  ACE: {
    enumValue: 'ACE', label: 'Ponto direto', dataVolley: 'S#',
    color: SCOUT_COLORS.EXCELLENT.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.EXCELLENT.hex],
    colorName: 'green', efficiencyValue: 1.0,
    description: 'Saque que marca ponto diretamente, sem que o adversário consiga tocar na bola',
  },
  EFFICIENT: {
    enumValue: 'EFFICIENT', label: 'Saque bom', dataVolley: 'S+',
    color: SCOUT_COLORS.POSITIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.POSITIVE.hex],
    colorName: 'blue', efficiencyValue: 0.5,
    description: 'Saque que dificulta a recepção adversária, quebrando o passe',
  },
  NEUTRAL: {
    enumValue: 'NEUTRAL', label: 'Saque ok', dataVolley: 'S!',
    color: SCOUT_COLORS.NEUTRAL.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.NEUTRAL.hex],
    colorName: 'gray', efficiencyValue: 0.0,
    description: 'Saque que passa a rede sem causar dificuldade ao adversário',
  },
  ERROR: {
    enumValue: 'ERROR', label: 'Errou o saque', dataVolley: 'S=',
    color: SCOUT_COLORS.ERROR.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.ERROR.hex],
    colorName: 'red', efficiencyValue: -1.0,
    description: 'Saque que foi para fora ou não passou a rede',
  },
}

export const PASS_LABELS: Record<string, ActionLabelEntry> = {
  A: {
    enumValue: 'A', label: 'Recepção perfeita', dataVolley: 'R#',
    color: SCOUT_COLORS.EXCELLENT.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.EXCELLENT.hex],
    colorName: 'green', efficiencyValue: 1.0,
    description: 'Recepção que chega perfeita no levantador, permitindo qualquer jogada',
  },
  B: {
    enumValue: 'B', label: 'Recepção boa', dataVolley: 'R+',
    color: SCOUT_COLORS.POSITIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.POSITIVE.hex],
    colorName: 'blue', efficiencyValue: 0.5,
    description: 'Recepção boa, mas limita algumas opções de ataque',
  },
  C: {
    enumValue: 'C', label: 'Recepção razoável', dataVolley: 'R!',
    color: SCOUT_COLORS.NEUTRAL.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.NEUTRAL.hex],
    colorName: 'gray', efficiencyValue: 0.0,
    description: 'Recepção que mantém a bola em jogo, mas com poucas opções de ataque',
  },
  ERROR: {
    enumValue: 'ERROR', label: 'Não recebeu', dataVolley: 'R=',
    color: SCOUT_COLORS.ERROR.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.ERROR.hex],
    colorName: 'red', efficiencyValue: -1.0,
    description: 'Erro de recepção que resulta em ponto para o adversário',
  },
}

export const ATTACK_LABELS: Record<string, ActionLabelEntry> = {
  POINT: {
    enumValue: 'POINT', label: 'Spike', dataVolley: 'A#',
    color: SCOUT_COLORS.EXCELLENT.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.EXCELLENT.hex],
    colorName: 'green', efficiencyValue: 1.0,
    description: 'Ataque forte que marca ponto diretamente',
  },
  TIP: {
    enumValue: 'TIP', label: 'Largada', dataVolley: 'A#',
    color: SCOUT_COLORS.EXCELLENT.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.EXCELLENT.hex],
    colorName: 'green', efficiencyValue: 1.0,
    description: 'Largada (toque suave) que cai na quadra adversária e marca ponto',
  },
  BLOCK_OUT: {
    enumValue: 'BLOCK_OUT', label: 'Explorou bloqueio!', dataVolley: 'A#',
    color: SCOUT_COLORS.EXCELLENT.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.EXCELLENT.hex],
    colorName: 'green', efficiencyValue: 1.0,
    description: 'Ataque que bate no bloqueio e sai da quadra, convertendo ponto',
  },
  EFFICIENT: {
    enumValue: 'EFFICIENT', label: 'Replay', dataVolley: 'A+',
    color: SCOUT_COLORS.POSITIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.POSITIVE.hex],
    colorName: 'blue', efficiencyValue: 0.5,
    description: 'Ataque que rebate no bloqueio intencionalmente para reciclar a jogada',
  },
  DEFENDED: {
    enumValue: 'DEFENDED', label: 'Defenderam', dataVolley: 'A!',
    color: SCOUT_COLORS.NEUTRAL.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.NEUTRAL.hex],
    colorName: 'gray', efficiencyValue: 0.0,
    description: 'Ataque que o adversário conseguiu defender sem dificuldade',
  },
  BLOCKED: {
    enumValue: 'BLOCKED', label: 'Bloquearam', dataVolley: 'A-',
    color: SCOUT_COLORS.NEGATIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.NEGATIVE.hex],
    colorName: 'yellow', efficiencyValue: -0.5,
    description: 'Ataque que foi parado pelo bloqueio adversário',
  },
  ERROR: {
    enumValue: 'ERROR', label: 'Errou o ataque', dataVolley: 'A=',
    color: SCOUT_COLORS.ERROR.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.ERROR.hex],
    colorName: 'red', efficiencyValue: -1.0,
    description: 'Ataque que foi para fora ou na rede',
  },
}

export const BLOCK_LABELS: Record<string, ActionLabelEntry> = {
  POINT: {
    enumValue: 'POINT', label: 'Ponto de bloqueio!', dataVolley: 'B#',
    color: SCOUT_COLORS.EXCELLENT.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.EXCELLENT.hex],
    colorName: 'green', efficiencyValue: 1.0,
    description: 'Bloqueio que marca ponto diretamente',
  },
  DEFLECT: {
    enumValue: 'DEFLECT', label: 'Tocou e reciclou', dataVolley: 'B+',
    color: SCOUT_COLORS.POSITIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.POSITIVE.hex],
    colorName: 'blue', efficiencyValue: 0.5,
    description: 'Bloqueio que toca na bola e permite reciclagem da jogada',
  },
  BAD_TOUCH: {
    enumValue: 'BAD_TOUCH', label: 'Toque ruim', dataVolley: 'B-',
    color: SCOUT_COLORS.NEGATIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.NEGATIVE.hex],
    colorName: 'yellow', efficiencyValue: -0.5,
    description: 'Bloqueio com toque ruim que dificulta para a própria equipe',
  },
  ERROR: {
    enumValue: 'ERROR', label: 'Errou o bloqueio', dataVolley: 'B=',
    color: SCOUT_COLORS.ERROR.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.ERROR.hex],
    colorName: 'red', efficiencyValue: -1.0,
    description: 'Erro de bloqueio (toque na rede, invasão, etc.)',
  },
}

export const DIG_LABELS: Record<string, ActionLabelEntry> = {
  A: {
    enumValue: 'A', label: 'Defesa perfeita', dataVolley: 'D#',
    color: SCOUT_COLORS.EXCELLENT.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.EXCELLENT.hex],
    colorName: 'green', efficiencyValue: 1.0,
    description: 'Defesa perfeita que permite contra-ataque com todas as opções',
  },
  B: {
    enumValue: 'B', label: 'Defendeu', dataVolley: 'D+',
    color: SCOUT_COLORS.POSITIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.POSITIVE.hex],
    colorName: 'blue', efficiencyValue: 0.5,
    description: 'Defesa que mantém a bola em jogo para transição',
  },
  C: {
    enumValue: 'C', label: 'Defendeu mal', dataVolley: 'D!',
    color: SCOUT_COLORS.NEUTRAL.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.NEUTRAL.hex],
    colorName: 'gray', efficiencyValue: 0.0,
    description: 'Defesa que mantém a bola em jogo, mas com poucas opções',
  },
  ERROR: {
    enumValue: 'ERROR', label: 'Não defendeu', dataVolley: 'D=',
    color: SCOUT_COLORS.ERROR.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.ERROR.hex],
    colorName: 'red', efficiencyValue: -1.0,
    description: 'Bola que não foi defendida, ponto adversário',
  },
}

export const SET_LABELS: Record<string, ActionLabelEntry> = {
  GOOD: {
    enumValue: 'GOOD', label: 'Levantamento ótimo', dataVolley: 'E#',
    color: SCOUT_COLORS.EXCELLENT.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.EXCELLENT.hex],
    colorName: 'green', efficiencyValue: 1.0,
    description: 'Levantamento perfeito que permite ataque com todas as opções',
  },
  OK: {
    enumValue: 'OK', label: 'Levantamento ok', dataVolley: 'E!',
    color: SCOUT_COLORS.POSITIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.POSITIVE.hex],
    colorName: 'blue', efficiencyValue: 0.5,
    description: 'Levantamento que permite ataque, mas com opções limitadas',
  },
  POOR: {
    enumValue: 'POOR', label: 'Levantamento ruim', dataVolley: 'E-',
    color: SCOUT_COLORS.NEGATIVE.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.NEGATIVE.hex],
    colorName: 'yellow', efficiencyValue: 0.0,
    description: 'Levantamento ruim que dificulta o ataque',
  },
  ERROR: {
    enumValue: 'ERROR', label: 'Errou o levantamento', dataVolley: 'E=',
    color: SCOUT_COLORS.ERROR.hex, hoverColor: SCOUT_HOVER_COLORS[SCOUT_COLORS.ERROR.hex],
    colorName: 'red', efficiencyValue: -1.0,
    description: 'Erro de levantamento (bola na rede, condução, etc.)',
  },
}

/**
 * Mapeamento completo por fundamento (usando enum keys do volleyball.ts)
 */
export const ACTION_LABEL_MAP: Record<string, Record<string, ActionLabelEntry>> = {
  SERVE: SERVE_LABELS,
  PASS: PASS_LABELS,
  ATTACK: ATTACK_LABELS,
  BLOCK: BLOCK_LABELS,
  DIG: DIG_LABELS,
  SET: SET_LABELS,
}

// ============================================================================
// MAPEAMENTO DE scout.ts (lowercase) → labels amigáveis
// O sistema de scout em tempo real usa tipos diferentes dos enums de KPI.
// Este mapeamento faz a ponte para a UI.
// ============================================================================

/** Nomes amigáveis dos fundamentos (scout.ts ActionType → label PT-BR) */
export const ACTION_NAMES: Record<string, string> = {
  serve: 'Saque',
  reception: 'Recepção',
  attack: 'Ataque',
  block: 'Bloqueio',
  dig: 'Defesa',
  set: 'Levantamento',
  opponent_error: 'Erro adversário',
  substitution: 'Substituição',
}

/**
 * Mapeamento de sub-ações do scout.ts → ActionLabelEntry
 * Chave: "action:subAction" (ex: "serve:ace")
 */
const SCOUT_SUB_ACTION_MAP: Record<string, ActionLabelEntry> = {
  // SAQUE
  'serve:ace':         SERVE_LABELS.ACE,
  'serve:broken_pass': SERVE_LABELS.EFFICIENT,
  'serve:overpass':    SERVE_LABELS.EFFICIENT,  // xeque ≈ saque bom
  'serve:facilitated': SERVE_LABELS.NEUTRAL,
  'serve:error':       SERVE_LABELS.ERROR,

  // RECEPÇÃO
  'reception:perfect':  PASS_LABELS.A,
  'reception:positive': PASS_LABELS.B,
  'reception:negative': PASS_LABELS.C,
  'reception:overpass': { ...PASS_LABELS.ERROR, label: 'Xeque', description: 'Recepção que passou direto para o lado adversário' },
  'reception:error':    PASS_LABELS.ERROR,

  // ATAQUE
  'attack:kill':      ATTACK_LABELS.POINT,
  'attack:tip':       ATTACK_LABELS.TIP,
  'attack:block_out': ATTACK_LABELS.BLOCK_OUT,
  'attack:replay':    ATTACK_LABELS.EFFICIENT,
  'attack:continued': ATTACK_LABELS.DEFENDED,
  'attack:blocked':   ATTACK_LABELS.BLOCKED,
  'attack:error':     ATTACK_LABELS.ERROR,

  // BLOQUEIO
  'block:kill_block': BLOCK_LABELS.POINT,
  'block:touch':      BLOCK_LABELS.DEFLECT,
  'block:error':      BLOCK_LABELS.ERROR,

  // DEFESA
  'dig:perfect':  DIG_LABELS.A,
  'dig:positive': DIG_LABELS.B,
  'dig:bad':      DIG_LABELS.C,
  'dig:error':    DIG_LABELS.ERROR,

  // LEVANTAMENTO
  'set:perfect':  SET_LABELS.GOOD,
  'set:positive': SET_LABELS.OK,
  'set:negative': SET_LABELS.POOR,
  'set:error':    SET_LABELS.ERROR,
}

/**
 * Labels específicos que diferem do mapeamento padrão do volleyball.ts
 * para manter compatibilidade com a UX existente do scout em tempo real.
 * Ex: "broken_pass" no scout → "Quebrou passe" na UI (não "Saque bom")
 */
const SCOUT_LABEL_OVERRIDES: Record<string, string> = {
  'serve:broken_pass': 'Quebrou passe',
  'serve:overpass':    'Xeque',
  'serve:facilitated': 'Facilitado',
  'reception:perfect':  'Recepção perfeita (A)',
  'reception:positive': 'Recepção boa (B)',
  'reception:negative': 'Recepção razoável (C)',
  'reception:overpass': 'Xeque',
  'attack:kill':      'Spike',
  'attack:tip':       'Largada',
  'attack:block_out': 'Explorou bloqueio!',
  'attack:replay':    'Replay',
  'attack:continued': 'Defendido',
  'attack:blocked':   'Bloqueado',
  'block:kill_block': 'Ponto de bloqueio!',
  'block:touch':      'Amortecido',
  'dig:perfect':  'Defesa perfeita',
  'dig:positive': 'Defendeu',
  'dig:bad':      'Defendeu mal',
  'set:perfect':  'Levantamento ótimo',
  'set:positive': 'Levantamento ok',
  'set:negative': 'Levantamento ruim',
}

// ============================================================================
// FUNÇÕES HELPER
// ============================================================================

/**
 * Retorna o entry completo para uma sub-ação do scout em tempo real.
 * @param action - Tipo do fundamento (scout.ts): 'serve', 'attack', etc.
 * @param subAction - Sub-ação: 'ace', 'kill', 'perfect', etc.
 */
export function getScoutActionEntry(action: string, subAction: string): ActionLabelEntry | null {
  const key = `${action}:${subAction}`
  return SCOUT_SUB_ACTION_MAP[key] ?? null
}

/**
 * Retorna o label amigável de uma sub-ação do scout.
 * Usa overrides específicos quando existem (ex: "Quebrou passe" em vez de "Saque bom").
 */
export function getActionLabel(action: string, subAction: string): string {
  const key = `${action}:${subAction}`
  if (SCOUT_LABEL_OVERRIDES[key]) return SCOUT_LABEL_OVERRIDES[key]
  const entry = SCOUT_SUB_ACTION_MAP[key]
  if (entry) return entry.label
  // Fallback: capitaliza a sub-ação
  return subAction.charAt(0).toUpperCase() + subAction.slice(1).replace(/_/g, ' ')
}

/**
 * Retorna a cor hex de uma sub-ação do scout.
 */
export function getActionColor(action: string, subAction: string): string {
  const entry = getScoutActionEntry(action, subAction)
  return entry?.color ?? SCOUT_COLORS.NEUTRAL.hex
}

/**
 * Retorna a cor hover hex de uma sub-ação do scout.
 */
export function getActionHoverColor(action: string, subAction: string): string {
  const entry = getScoutActionEntry(action, subAction)
  return entry?.hoverColor ?? SCOUT_HOVER_COLORS[SCOUT_COLORS.NEUTRAL.hex]
}

/**
 * Retorna o nome Chakra da cor (green.400, blue.400, etc.)
 * para uso direto em propriedades de cor do Chakra UI.
 */
export function getActionChakraColor(action: string, subAction: string): string {
  const entry = getScoutActionEntry(action, subAction)
  const name = entry?.colorName ?? 'gray'
  return `${name}.400`
}

/**
 * Retorna a notação Data Volley de uma sub-ação.
 * Só para uso em relatórios exportados.
 */
export function getActionDataVolley(action: string, subAction: string): string {
  const entry = getScoutActionEntry(action, subAction)
  return entry?.dataVolley ?? ''
}

/**
 * Retorna o nome amigável de um fundamento.
 */
export function getActionName(action: string): string {
  return ACTION_NAMES[action] ?? action
}

/**
 * Helper para construir a lista de sub-ações com label e cor para UI.
 * Usado pelo ActionPanel para renderizar botões.
 */
// ============================================================================
// ABREVIAÇÕES DE MÉTRICAS PARA TABELAS E HEADERS COMPACTOS
// ============================================================================

/** Abreviações padronizadas para métricas em tabelas compactas */
export const METRIC_LABELS: Record<string, string> = {
  // Fundamentos abreviados
  aces: 'Ptos Dir.',
  blocks_short: 'Bloq.',
  serve_percent: '%Saq',
  reception_percent: '%Rec',
  points: 'Pts',
  total: 'Tot',

  // Sub-métricas de Ataque
  attack_wins: 'Pts',
  attack_errors: 'Erros',
  attack_percent: '%',

  // Sub-métricas de Levantamento
  set_excellent: 'Perf.',
  set_errors: 'Erros',

  // Sub-métricas de Saque
  serve_ace: 'Aces',
  serve_errors: 'Erros',

  // Sub-métricas de Recepção
  reception_positive: 'Pos%',
  reception_perfect: 'Prf%',

  // Bloqueio
  block_points: 'Pts',
  block_touches: 'Toques',

  // Métricas gerais
  efficiency: 'Efic.',
  kill_rate: '% Conv.',
  balance: 'Saldo',
  rating: '0-10',

  // Fallbacks
  unknown_player: 'Desconhecido',
}

/** Labels de qualidade para badges e comparações de rally (PointHistoryLog, etc.) */
export const QUALITY_LABELS: Record<string, string> = {
  'Perfect': 'Perfeito',
  'Ace': 'Pto direto',
  'Kill': 'Ponto',
  'Error': 'Erro',
  'Good': 'Bom',
  'Bad': 'Ruim',
  'Neutral': 'Neutro',
  'Blocked': 'Bloqueado',
  'Defended': 'Defendido',
}

/**
 * Traduz uma label de qualidade do inglês para PT-BR.
 * Usado em badges de qualidade de rally (PointHistoryLog, etc.)
 */
export function getQualityLabel(quality: string): string {
  return QUALITY_LABELS[quality] ?? quality
}

export function getSubActionsForUI(action: string): Array<{
  id: string
  label: string
  color: string
  hoverColor: string
}> {
  // Definição da ordem das sub-ações por fundamento (scout.ts types)
  const subActionOrder: Record<string, string[]> = {
    serve:     ['ace', 'broken_pass', 'overpass', 'facilitated', 'error'],
    reception: ['perfect', 'positive', 'negative', 'overpass', 'error'],
    attack:    ['kill', 'tip', 'block_out', 'replay', 'continued', 'blocked', 'error'],
    block:     ['kill_block', 'touch', 'error'],
    dig:       ['perfect', 'positive', 'bad', 'error'],
    set:       ['perfect', 'positive', 'negative', 'error'],
  }

  const subs = subActionOrder[action] ?? []
  return subs.map((id) => ({
    id,
    label: getActionLabel(action, id),
    color: getActionColor(action, id),
    hoverColor: getActionHoverColor(action, id),
  }))
}
