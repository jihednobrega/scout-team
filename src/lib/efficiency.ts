// lib/efficiency.ts
// Mapa centralizado de eficiência por ação+subação (server-side)
// Espelha SCOUT_EFFICIENCY de utils/stats.ts para uso em API routes

const SCOUT_EFFICIENCY: Record<string, Record<string, number>> = {
  serve:     { ace: 1.0, broken_pass: 0.5, overpass: 0.5, facilitated: 0.0, error: -1.0 },
  reception: { perfect: 1.0, positive: 0.5, negative: 0.0, overpass: -1.0, error: -1.0 },
  attack:    { kill: 1.0, replay: 0.5, continued: 0.0, blocked: -0.5, error: -1.0 },
  block:     { kill_block: 1.0, point: 1.0, touch: 0.5, error: -1.0 },
  dig:       { perfect: 1.0, positive: 0.5, bad: 0.0, error: -1.0 },
  set:       { perfect: 1.0, positive: 0.5, negative: 0.0, error: -1.0 },
}

export function computeEfficiency(action: string, subAction: string): number | null {
  return SCOUT_EFFICIENCY[action]?.[subAction] ?? null
}
