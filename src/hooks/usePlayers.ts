// app/hooks/usePlayers.ts
'use client'

import { useState, useEffect } from 'react'
import { Player, CreatePlayerInput, UpdatePlayerInput } from '@/types/player'

const STORAGE_KEY = 'scout-team-players'

export function usePlayers() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  // Carregar jogadores do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Converter strings de data de volta para objetos Date
        const playersWithDates = parsed.map((p: Player) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
        }))
        setPlayers(playersWithDates)
      }
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Salvar jogadores no localStorage
  const saveToStorage = (updatedPlayers: Player[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlayers))
      setPlayers(updatedPlayers)
    } catch (error) {
      console.error('Erro ao salvar jogadores:', error)
      throw error
    }
  }

  // Criar novo jogador
  const createPlayer = (input: CreatePlayerInput): Player => {
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const updatedPlayers = [...players, newPlayer]
    saveToStorage(updatedPlayers)
    return newPlayer
  }

  // Atualizar jogador
  const updatePlayer = (input: UpdatePlayerInput): Player | null => {
    const index = players.findIndex((p) => p.id === input.id)
    if (index === -1) return null

    const updatedPlayer: Player = {
      ...players[index],
      ...input,
      updatedAt: new Date(),
    }

    const updatedPlayers = [...players]
    updatedPlayers[index] = updatedPlayer
    saveToStorage(updatedPlayers)
    return updatedPlayer
  }

  // Deletar jogador
  const deletePlayer = (id: string): boolean => {
    const updatedPlayers = players.filter((p) => p.id !== id)
    if (updatedPlayers.length === players.length) return false

    saveToStorage(updatedPlayers)
    return true
  }

  // Buscar jogador por ID
  const getPlayerById = (id: string): Player | undefined => {
    return players.find((p) => p.id === id)
  }

  // Buscar jogador por número da camisa
  const getPlayerByJerseyNumber = (number: number): Player | undefined => {
    return players.find((p) => p.jerseyNumber === number)
  }

  // Verificar se número da camisa já está em uso
  const isJerseyNumberTaken = (number: number, excludeId?: string): boolean => {
    return players.some((p) => p.jerseyNumber === number && p.id !== excludeId)
  }

  return {
    players,
    loading,
    createPlayer,
    updatePlayer,
    deletePlayer,
    getPlayerById,
    getPlayerByJerseyNumber,
    isJerseyNumberTaken,
  }
}
