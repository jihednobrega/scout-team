'use client'

import HeatmapCourt, { type ModeConfig, type ErrorInfoConfig } from './HeatmapCourt'

const SERVE_MODES: Record<string, ModeConfig> = {
  all: {
    label: 'Todos',
    colors: ['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.85)'],
    rgb: '59,130,246',
    buttonColor: 'blue.600',
    filterFn: () => true,
  },
  points: {
    label: 'Aces',
    colors: ['rgba(34, 197, 94, 0.1)', 'rgba(22, 163, 74, 0.85)'],
    rgb: '34,197,94',
    buttonColor: 'green.600',
    filterFn: (a) => a.subAction === 'ace',
  },
  efficient: {
    label: 'Eficientes',
    colors: ['rgba(168, 85, 247, 0.1)', 'rgba(147, 51, 234, 0.85)'],
    rgb: '168,85,247',
    buttonColor: 'purple.600',
    // Quebrou passe (broken_pass) ou Xeque (overpass)
    filterFn: (a) => a.subAction === 'broken_pass' || a.subAction === 'overpass',
  },
  inefficient: {
    label: 'Ineficientes',
    colors: ['rgba(249, 115, 22, 0.1)', 'rgba(234, 88, 12, 0.85)'],
    rgb: '249,115,22',
    buttonColor: 'orange.600',
    // Facilitado
    filterFn: (a) => a.subAction === 'facilitated',
  },
}

const SERVE_MODE_ORDER = ['all', 'points', 'efficient', 'inefficient']

const SERVE_ERROR_INFO: ErrorInfoConfig[] = [
  {
    label: 'Erros de saque',
    filterFn: (a) => a.subAction === 'error',
    color: 'red.400',
  },
]

interface ServeHeatmapProps {
  matchId?: string
  teamId?: string
  defaultPlayerId?: string
  players?: { id: string; name: string; jerseyNumber: number }[]
  availableSets?: number[]
  compact?: boolean
  title?: string
}

export default function ServeHeatmap(props: ServeHeatmapProps) {
  return (
    <HeatmapCourt
      actionType="serve"
      modes={SERVE_MODES}
      modeOrder={SERVE_MODE_ORDER}
      defaultMode="all"
      errorInfo={SERVE_ERROR_INFO}
      defaultTitle="Mapa de saque"
      countLabel="Saques"
      successSubAction="ace"
      showRotationFilter={false}
      showServeTypeFilter={true}
      loadingText="Carregando dados de saque..."
      emptyText="Nenhum dado de saque com coordenadas de destino disponível."
      {...props}
    />
  )
}
