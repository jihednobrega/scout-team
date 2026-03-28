// app/components/court/LineupModal.tsx
'use client'

import { useEffect } from 'react'
import { Box, Flex, Text, Image, Button, Grid } from '@chakra-ui/react'
import { Player } from '@/types/player'
import { CourtPositions } from '@/types/game'

interface LineupModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  courtPositions: CourtPositions
  onPositionChange: (position: number, playerId: string | null) => void
}

export default function LineupModal({
  isOpen,
  onClose,
  players,
  courtPositions,
  onPositionChange,
}: LineupModalProps) {
  // Bloquear scroll do body quando modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup: garantir que o scroll volte ao normal quando o componente desmontar
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  // Jogadores que já estão em quadra
  const playersOnCourt = Object.values(courtPositions).filter((id) => id !== null)

  // Jogadores disponíveis (não estão em quadra)
  const availablePlayers = players.filter((p) => !playersOnCourt.includes(p.id))

  // Pegar jogador por ID
  const getPlayerById = (id: string | null): Player | null => {
    if (!id) return null
    return players.find((p) => p.id === id) || null
  }

  // Remover jogador de uma posição
  const removeFromPosition = (position: number) => {
    onPositionChange(position, null)
  }

  // Adicionar jogador em uma posição vazia
  const addToPosition = (position: number, playerId: string) => {
    onPositionChange(position, playerId)
  }

  // Handler para fechar sem propagação
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  // Handler para o backdrop (fundo escuro)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="rgba(0, 0, 0, 0.8)"
      zIndex={100}
      display="flex"
      alignItems="center"
      justifyContent="center"
      onClick={handleBackdropClick}
    >
      <Box
        bg="gray.900"
        borderRadius="2xl"
        p={6}
        maxW="1000px"
        w="90%"
        maxH="90vh"
        overflowY="auto"
        onClick={(e) => e.stopPropagation()}
        borderWidth="2px"
        borderColor="blue.500/30"
      >
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Text fontSize="2xl" fontWeight="bold" color="white">
            ⚙️ Escalação do Time
          </Text>
          <Button onClick={handleClose} colorScheme="blue">
            Fechar
          </Button>
        </Flex>

        <Flex gap={6} direction={{ base: 'column', lg: 'row' }}>
          {/* Posições da Quadra */}
          <Box flex="1">
            <Text fontSize="lg" fontWeight="bold" color="white" mb={4}>
              Posições em Quadra
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
              {[1, 2, 3, 4, 5, 6].map((position) => {
                const player = getPlayerById(courtPositions[position as keyof CourtPositions])
                return (
                  <Box
                    key={position}
                    bg={player ? 'blue.900/50' : 'gray.800'}
                    borderRadius="lg"
                    p={4}
                    borderWidth="2px"
                    borderColor={player ? 'blue.500/50' : 'gray.700'}
                    minH="120px"
                  >
                    <Text fontSize="sm" fontWeight="bold" color="gray.400" mb={2}>
                      Posição {position}
                    </Text>
                    {player ? (
                      <Flex alignItems="center" gap={3}>
                        <Image
                          src={player.photo}
                          alt={player.name}
                          boxSize="50px"
                          borderRadius="full"
                          objectFit="cover"
                        />
                        <Box flex="1">
                          <Text color="white" fontWeight="bold" fontSize="sm">
                            #{player.jerseyNumber}
                          </Text>
                          <Text color="gray.300" fontSize="xs" css={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {player.name}
                          </Text>
                        </Box>
                        <Button
                          size="sm"
                          colorScheme="red"
                          onClick={() => removeFromPosition(position)}
                        >
                          ✕
                        </Button>
                      </Flex>
                    ) : (
                      <Flex alignItems="center" justifyContent="center" h="50px">
                        <Text color="gray.500" fontSize="sm">
                          Vazia
                        </Text>
                      </Flex>
                    )}
                  </Box>
                )
              })}
            </Grid>
          </Box>

          {/* Jogadores Disponíveis */}
          <Box flex="1">
            <Text fontSize="lg" fontWeight="bold" color="white" mb={4}>
              Jogadores Disponíveis ({availablePlayers.length})
            </Text>
            <Flex direction="column" gap={2}>
              {availablePlayers.length === 0 ? (
                <Box bg="gray.800" borderRadius="lg" p={4} textAlign="center">
                  <Text color="gray.500">
                    Todos os jogadores estão em quadra
                  </Text>
                </Box>
              ) : (
                availablePlayers.map((player) => {
                  // Encontrar primeira posição vazia
                  const emptyPosition = ([1, 2, 3, 4, 5, 6] as const).find(
                    (pos) => courtPositions[pos] === null
                  )

                  return (
                    <Flex
                      key={player.id}
                      bg="gray.800"
                      borderRadius="lg"
                      p={3}
                      alignItems="center"
                      gap={3}
                      borderWidth="1px"
                      borderColor="gray.700"
                      _hover={{ borderColor: 'blue.500/50', bg: 'gray.700' }}
                    >
                      <Image
                        src={player.photo}
                        alt={player.name}
                        boxSize="40px"
                        borderRadius="full"
                        objectFit="cover"
                      />
                      <Box flex="1">
                        <Text color="white" fontWeight="bold" fontSize="sm">
                          #{player.jerseyNumber} {player.name}
                        </Text>
                        <Text color="gray.400" fontSize="xs">
                          {player.position}
                        </Text>
                      </Box>
                      {emptyPosition && (
                        <Button
                          size="sm"
                          colorScheme="green"
                          onClick={() => addToPosition(emptyPosition, player.id)}
                        >
                          + Pos {emptyPosition}
                        </Button>
                      )}
                    </Flex>
                  )
                })
              )}
            </Flex>
          </Box>
        </Flex>
      </Box>
    </Box>
  )
}
