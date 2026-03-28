'use client'

import HeatmapCourt, { type ModeConfig, type ErrorInfoConfig } from './HeatmapCourt'

const ATTACK_MODES: Record<string, ModeConfig> = {
  all: {
    label: 'Todos',
    colors: ['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.85)'],
    rgb: '59,130,246',
    buttonColor: 'blue.600',
    filterFn: () => true,
  },
  points: {
    label: 'Pontos',
    colors: ['rgba(34, 197, 94, 0.1)', 'rgba(22, 163, 74, 0.85)'],
    rgb: '34,197,94',
    buttonColor: 'green.600',
    // kill (spike) + tip (largada) — ambos registram zona de destino
    // block_out (explorar bloqueio) pontua mas não registra zona
    filterFn: (a) => a.subAction === 'kill' || a.subAction === 'tip',
  },
  inefficient: {
    label: 'Ineficientes',
    colors: ['rgba(249, 115, 22, 0.1)', 'rgba(234, 88, 12, 0.85)'],
    rgb: '249,115,22',
    buttonColor: 'orange.600',
    // "Defendido" (continued) = adversário defendeu sem dificuldade
    filterFn: (a) => a.subAction === 'continued',
  },
}

const ATTACK_MODE_ORDER = ['all', 'points', 'inefficient']

const ATTACK_ERROR_INFO: ErrorInfoConfig[] = [
  {
    label: 'Erros',
    filterFn: (a) => a.subAction === 'error',
    color: 'red.400',
  },
  {
    label: 'Bloqueados',
    filterFn: (a) => a.subAction === 'blocked',
    color: 'orange.400',
  },
]

interface AttackHeatmapProps {
  matchId?: string
  teamId?: string
  defaultPlayerId?: string
  players?: { id: string; name: string; jerseyNumber: number }[]
  availableSets?: number[]
  compact?: boolean
  title?: string
}

export default function AttackHeatmap(props: AttackHeatmapProps) {
  return (
    <HeatmapCourt
      actionType="attack"
      modes={ATTACK_MODES}
      modeOrder={ATTACK_MODE_ORDER}
      defaultMode="all"
      errorInfo={ATTACK_ERROR_INFO}
      defaultTitle="Mapa de ataque"
      countLabel="Ataques"
      successSubAction="kill"
      loadingText="Carregando dados de ataque..."
      emptyText="Nenhum dado de ataque com coordenadas de destino disponível."
      {...props}
    />
  )
}
