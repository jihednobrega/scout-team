// components/common/StorageStatus.tsx
'use client'

import { useEffect, useState } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'

export default function StorageStatus() {
  const [status, setStatus] = useState({
    players: 0,
    matches: 0,
    lastSave: null as Date | null,
  })

  useEffect(() => {
    // Verifica dados salvos
    const checkStorage = () => {
      try {
        const playersData = localStorage.getItem('scout-team-players')
        const matchesData = localStorage.getItem('scout_matches_history')

        const players = playersData ? JSON.parse(playersData).length : 0
        const matches = matchesData ? JSON.parse(matchesData).length : 0

        setStatus({
          players,
          matches,
          lastSave: new Date(),
        })
      } catch (error) {
        console.error('Erro ao verificar storage:', error)
      }
    }

    checkStorage()

    // Atualiza a cada 5 segundos
    const interval = setInterval(checkStorage, 5000)

    return () => clearInterval(interval)
  }, [])

  if (status.players === 0 && status.matches === 0) {
    return null
  }

  return (
    <Box
      position="fixed"
      bottom={{ base: '80px', md: '20px' }}
      right="20px"
      bg="green.900"
      borderWidth="1px"
      borderColor="green.500"
      borderRadius="lg"
      p={3}
      shadow="lg"
      zIndex={1000}
      maxW="250px"
    >
      <Flex align="center" gap={2} mb={2}>
        <Box
          w="8px"
          h="8px"
          bg="green.400"
          borderRadius="full"
          animation="pulse 2s infinite"
        />
        <Text fontSize="xs" fontWeight="bold" color="green.200">
          Dados Salvos Automaticamente
        </Text>
      </Flex>

      <Flex direction="column" gap={1}>
        <Text fontSize="xs" color="green.300">
          🏐 {status.players} jogador(es)
        </Text>
        <Text fontSize="xs" color="green.300">
          📋 {status.matches} partida(s)
        </Text>
        {status.lastSave && (
          <Text fontSize="2xs" color="green.400" mt={1}>
            Último check: {status.lastSave.toLocaleTimeString('pt-BR')}
          </Text>
        )}
      </Flex>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Box>
  )
}
