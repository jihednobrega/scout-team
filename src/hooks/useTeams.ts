// hooks/useTeams.ts
'use client'

import { useState, useEffect } from 'react'

export interface Team {
  id: string
  name: string
  logo?: string
  createdAt: Date
  updatedAt: Date
  _count?: {
    players: number
    matches: number
  }
}

export interface CreateTeamInput {
  name: string
  logo?: string
}

interface TeamResponse {
  id: string
  name: string
  logo?: string
  createdAt: string
  updatedAt: string
  _count?: {
    players: number
    matches: number
  }
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Carregar equipes
  const fetchTeams = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/teams')

      if (!response.ok) {
        throw new Error('Erro ao carregar equipes')
      }

      const data: TeamResponse[] = await response.json()
      setTeams(data.map((team) => ({
        ...team,
        createdAt: new Date(team.createdAt),
        updatedAt: new Date(team.updatedAt),
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      console.error('Erro ao carregar equipes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  // Criar nova equipe
  const createTeam = async (input: CreateTeamInput): Promise<Team | null> => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar equipe')
      }

      const newTeam = await response.json()
      const teamWithDates = {
        ...newTeam,
        createdAt: new Date(newTeam.createdAt),
        updatedAt: new Date(newTeam.updatedAt),
      }

      setTeams([teamWithDates, ...teams])
      return teamWithDates
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar equipe')
      console.error('Erro ao criar equipe:', err)
      return null
    }
  }

  // Atualizar equipe
  const updateTeam = async (id: string, input: Partial<CreateTeamInput>): Promise<Team | null> => {
    try {
      const response = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...input }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar equipe')
      }

      const updated = await response.json()
      const teamWithDates = {
        ...updated,
        createdAt: new Date(updated.createdAt),
        updatedAt: new Date(updated.updatedAt),
      }

      setTeams((prev) => prev.map((t) => (t.id === id ? teamWithDates : t)))
      return teamWithDates
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar equipe')
      console.error('Erro ao atualizar equipe:', err)
      return null
    }
  }

  // Deletar equipe
  const deleteTeam = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/teams?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao deletar equipe')
      }

      setTeams((prev) => prev.filter((t) => t.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar equipe')
      console.error('Erro ao deletar equipe:', err)
      return false
    }
  }

  // Buscar equipe por ID
  const getTeamById = (id: string): Team | undefined => {
    return teams.find((t) => t.id === id)
  }

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    getTeamById,
    refetch: fetchTeams,
  }
}
