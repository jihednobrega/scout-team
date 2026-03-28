'use client'

import { useState, useEffect, useCallback } from 'react'

export interface PlayerPreset {
  id: string
  name: string
  teamId: string
  playerIds: string[]
  createdAt: Date
  updatedAt: Date
}

interface PresetResponse {
  id: string
  name: string
  teamId: string
  playerIds: string
  createdAt: string
  updatedAt: string
}

const mapResponseToPreset = (preset: PresetResponse): PlayerPreset => ({
  id: preset.id,
  name: preset.name,
  teamId: preset.teamId,
  playerIds: JSON.parse(preset.playerIds),
  createdAt: new Date(preset.createdAt),
  updatedAt: new Date(preset.updatedAt),
})

export function usePlayerPresetsAPI(teamId: string | null) {
  const [presets, setPresets] = useState<PlayerPreset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPresets = useCallback(async () => {
    if (!teamId) {
      setPresets([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/player-presets?teamId=${teamId}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar presets')
      }

      const data: PresetResponse[] = await response.json()
      setPresets(data.map(mapResponseToPreset))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao carregar presets:', err)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchPresets()
  }, [fetchPresets])

  const createPreset = async (name: string, playerIds: string[]): Promise<PlayerPreset | null> => {
    if (!teamId) return null

    try {
      const response = await fetch('/api/player-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, teamId, playerIds }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar preset')
      }

      const newPreset: PresetResponse = await response.json()
      const mapped = mapResponseToPreset(newPreset)
      setPresets((prev) => [...prev, mapped])
      return mapped
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar preset'
      setError(message)
      return null
    }
  }

  const deletePreset = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/player-presets?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar preset')
      }

      setPresets((prev) => prev.filter((p) => p.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar preset')
      console.error('Erro ao deletar preset:', err)
      return false
    }
  }

  return {
    presets,
    loading,
    error,
    createPreset,
    deletePreset,
    refetch: fetchPresets,
  }
}
