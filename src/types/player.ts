// types/player.ts

export type VolleyballPosition =
  | 'levantador'
  | 'oposto'
  | 'central'
  | 'ponteiro'
  | 'libero'

export const POSITION_LABELS: Record<VolleyballPosition, string> = {
  levantador: 'Levantador',
  oposto: 'Oposto',
  central: 'Central',
  ponteiro: 'Ponteiro',
  libero: 'Líbero',
}

export const POSITION_OPTIONS = [
  { value: 'levantador', label: 'Levantador' },
  { value: 'oposto', label: 'Oposto' },
  { value: 'central', label: 'Central' },
  { value: 'ponteiro', label: 'Ponteiro' },
  { value: 'libero', label: 'Líbero' },
] as const

export interface Player {
  id: string
  photo: string
  name: string
  jerseyNumber: number
  position: VolleyballPosition
  secondaryPositions: VolleyballPosition[]
  createdAt: Date
  updatedAt: Date
}

export interface CreatePlayerInput {
  photo: string
  name: string
  jerseyNumber: number
  position: VolleyballPosition
  secondaryPositions: VolleyballPosition[]
}

export interface UpdatePlayerInput extends Partial<CreatePlayerInput> {
  id: string
}
