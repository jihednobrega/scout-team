// hooks/usePlayersAPI.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Player,
  CreatePlayerInput,
  UpdatePlayerInput,
  VolleyballPosition,
} from '@/types/player'

interface PlayerResponse {
  id: string
  teamId: string
  name: string
  jerseyNumber: number
  position: string
  secondaryPositions?: string | string[]
  photo: string
  createdAt: string
  updatedAt: string
}

const parseSecondaryPositions = (
  value: unknown
): VolleyballPosition[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is VolleyballPosition => typeof item === 'string')
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((item): item is VolleyballPosition => typeof item === 'string')
        : []
    } catch {
      return []
    }
  }

  return []
}

const mapResponseToPlayer = (player: PlayerResponse): Player => ({
  id: player.id,
  photo: player.photo,
  name: player.name,
  jerseyNumber: player.jerseyNumber,
  position: player.position as VolleyballPosition,
  secondaryPositions: parseSecondaryPositions(player.secondaryPositions),
  createdAt: new Date(player.createdAt),
  updatedAt: new Date(player.updatedAt),
})

export function usePlayersAPI(teamId: string | null) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayers = useCallback(async () => {
    if (!teamId) {
      setPlayers([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/players?teamId=${teamId}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar jogadores')
      }

      const data: PlayerResponse[] = await response.json()
      setPlayers(data.map(mapResponseToPlayer))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao carregar jogadores:', err)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

  const createPlayer = async (
    input: CreatePlayerInput
  ): Promise<Player | null> => {
    if (!teamId) {
      alert('Selecione uma equipe primeiro')
      return null
    }

    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...input,
          teamId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar jogador')
      }

      const newPlayer: PlayerResponse = await response.json()
      const mapped = mapResponseToPlayer(newPlayer)
      setPlayers((prev) => [...prev, mapped])
      return mapped
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar jogador'
      setError(message)
      alert(message)
      return null
    }
  }

  const updatePlayer = async (
    input: UpdatePlayerInput
  ): Promise<Player | null> => {
    try {
      const response = await fetch('/api/players', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar jogador')
      }

      const updated: PlayerResponse = await response.json()
      const mapped = mapResponseToPlayer(updated)
      setPlayers((prev) => prev.map((p) => (p.id === mapped.id ? mapped : p)))
      return mapped
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar jogador'
      setError(message)
      alert(message)
      return null
    }
  }

  const deletePlayer = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/players?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar jogador')
      }

      setPlayers((prev) => prev.filter((p) => p.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar jogador')
      console.error('Erro ao deletar jogador:', err)
      return false
    }
  }

  const getPlayerById = (id: string): Player | undefined =>
    players.find((p) => p.id === id)

  const getPlayerByJerseyNumber = (number: number): Player | undefined =>
    players.find((p) => p.jerseyNumber === number)

  const isJerseyNumberTaken = (number: number, excludeId?: string): boolean =>
    players.some((p) => p.jerseyNumber === number && p.id !== excludeId)

  return {
    players,
    loading,
    error,
    createPlayer,
    updatePlayer,
    deletePlayer,
    getPlayerById,
    getPlayerByJerseyNumber,
    isJerseyNumberTaken,
    refetch: fetchPlayers,
  }
}
