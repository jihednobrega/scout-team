'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Team } from '@/hooks/useTeams'

interface TeamContextType {
  selectedTeam: Team | null
  setSelectedTeam: (team: Team | null) => void
  selectedTeamId: string | null
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

export function TeamProvider({ children }: { children: ReactNode }) {
  const [selectedTeam, setSelectedTeamState] = useState<Team | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  // Busca equipe selecionada persistida no backend (por dispositivo)
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const res = await fetch('/api/preferences/selected-team', {
          method: 'GET',
          credentials: 'include',
        })
        if (!res.ok) return
        const data = await res.json()
        if (data?.team) {
          setSelectedTeamState({
            id: data.team.id,
            name: data.team.name,
            logo: data.team.logo ?? undefined,
            createdAt: new Date(data.team.createdAt),
            updatedAt: new Date(data.team.updatedAt),
            _count: undefined,
          })
          setSelectedTeamId(data.team.id)
        } else if (data?.teamId) {
          setSelectedTeamId(data.teamId)
        }
      } catch (e) {
        console.warn('Não foi possível carregar preferência de equipe')
      }
    }
    loadPreference()
  }, [])

  // Persiste seleção no backend e atualiza estado
  const setSelectedTeam = (team: Team | null) => {
    setSelectedTeamState(team)
    setSelectedTeamId(team?.id ?? null)
    const persistPreference = async () => {
      try {
        if (team) {
          await fetch('/api/preferences/selected-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ teamId: team.id }),
          })
        } else {
          await fetch('/api/preferences/selected-team', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ teamId: null }),
          })
        }
      } catch (e) {
        // Silencioso: não quebra UX se falhar
      }
    }

    void persistPreference()
  }

  return (
    <TeamContext.Provider
      value={{
        selectedTeam,
        setSelectedTeam,
        selectedTeamId,
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}

export function useTeamContext() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeamContext deve ser usado dentro de TeamProvider')
  }
  return context
}
