// src/lib/scoutColors.ts
// Sistema centralizado de cores para scout de vôlei
// Cores consistentes para todo o app: botões, badges, gráficos, etc.

export interface ScoutColor {
  hex: string
  /** Nome Chakra UI (green, blue, gray, yellow, red) */
  name: string
  label: string
}

/**
 * Cores padronizadas por nível de qualidade.
 * Usadas em todo o app para manter consistência visual.
 */
export const SCOUT_COLORS = {
  EXCELLENT: { hex: '#22C55E', name: 'green', label: 'Excelente' },
  POSITIVE:  { hex: '#3B82F6', name: 'blue', label: 'Positivo' },
  NEUTRAL:   { hex: '#9CA3AF', name: 'gray', label: 'Neutro' },
  NEGATIVE:  { hex: '#EAB308', name: 'yellow', label: 'Negativo' },
  ERROR:     { hex: '#EF4444', name: 'red', label: 'Erro' },
} as const

/** Hover colors correspondentes (tom mais escuro) */
export const SCOUT_HOVER_COLORS: Record<string, string> = {
  '#22C55E': '#16A34A',
  '#3B82F6': '#2563EB',
  '#9CA3AF': '#6B7280',
  '#EAB308': '#CA8A04',
  '#EF4444': '#DC2626',
}

/**
 * Retorna a cor baseada num valor de eficiência (-1 a +1).
 * Usado em gráficos e indicadores visuais.
 */
export function getColorByEfficiency(value: number): ScoutColor {
  if (value > 0.5) return SCOUT_COLORS.EXCELLENT
  if (value > 0) return SCOUT_COLORS.POSITIVE
  if (value === 0) return SCOUT_COLORS.NEUTRAL
  if (value > -0.5) return SCOUT_COLORS.NEGATIVE
  return SCOUT_COLORS.ERROR
}
