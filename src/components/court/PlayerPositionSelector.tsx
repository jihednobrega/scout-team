// components/court/PlayerPositionSelector.tsx
'use client'

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex,
  Text,
  Image,
  Badge,
} from '@chakra-ui/react'
import { Player } from '@/types/player'

interface PlayerPositionSelectorProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  position: number // 1-6 (Zona Visual)
  rotation: number // 1-6 (Posição do Levantador)
  onSelectPlayer: (playerId: string) => void
}

// Função auxiliar para calcular a posição lógica (P1-P6) baseada na zona visual e rotação
const getLogicalPosition = (visualPos: number, rotation: number): number => {
  // Fórmula: ((Visual - Rotation + 6) % 6) + 1
  // Ex: Visual 1, Rotation 1 => ((1-1+6)%6)+1 = 1 (Levantador)
  // Ex: Visual 2, Rotation 2 => ((2-2+6)%6)+1 = 1 (Levantador)
  // Ex: Visual 1, Rotation 6 => ((1-6+6)%6)+1 = 2 (Ponteiro 1)
  const val = ((visualPos - rotation + 6) % 6) + 1
  return val === 0 ? 6 : val
}

// Mapeamento de posição da quadra para função do jogador
// Formação 5-1 padrão de vôlei:
// P1 = Levantador (zona 1 - fundo direita)
// P2 = Ponteiro (zona 2 - rede direita)
// P3 = Central (zona 3 - rede centro)
// P4 = Oposto (zona 4 - rede esquerda)
// P5 = Ponteiro (zona 5 - fundo esquerda)
// P6 = Central (zona 6 - fundo centro)
// P6 = Central (zona 6 - fundo centro)
const getRoleForLogicalPosition = (logicalPos: number): string => {
  const roleMap: Record<number, string> = {
    1: 'levantador', // Levantador sempre na posição 1
    2: 'ponteiro',   // Ponteiro na rede direita
    3: 'central',    // Central na rede centro
    4: 'oposto',     // Oposto na rede esquerda
    5: 'ponteiro',   // Ponteiro no fundo esquerda
    6: 'central',    // Central no fundo centro
  }
  return roleMap[logicalPos] || ''
}

const getZoneLabel = (position: number): string => {
  const labelMap: Record<number, string> = {
    1: 'Zona 1 (Fundo Direita)',
    2: 'Zona 2 (Rede Direita)',
    3: 'Zona 3 (Rede Centro)',
    4: 'Zona 4 (Rede Esquerda)',
    5: 'Zona 5 (Fundo Esquerda)',
    6: 'Zona 6 (Fundo Centro)',
  }
  return labelMap[position] || `Zona ${position}`
}

export default function PlayerPositionSelector({
  isOpen,
  onClose,
  players,
  position,
  rotation,
  onSelectPlayer,
}: PlayerPositionSelectorProps) {
  const logicalPos = getLogicalPosition(position, rotation)
  const preferredRole = getRoleForLogicalPosition(logicalPos)
  const zoneLabel = getZoneLabel(position)
  const roleLabel = preferredRole.charAt(0).toUpperCase() + preferredRole.slice(1)

  // Separar jogadores por prioridade
  const priorityPlayers = players.filter((p) => p.position === preferredRole)
  const otherPlayers = players.filter((p) => p.position !== preferredRole)

  const handleSelect = (playerId: string) => {
    onSelectPlayer(playerId)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="2xl">
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
      <ModalContent
        bg="gray.900"
        borderColor="blue.700"
        borderWidth="2px"
        borderRadius="xl"
        maxH="90vh"
      >
        <ModalHeader color="white" fontSize="xl" fontWeight="bold">
          Selecionar Jogador - {zoneLabel}
          <Text fontSize="sm" color="gray.400" fontWeight="normal">
            Recomendado: {roleLabel}
          </Text>
        </ModalHeader>
        <ModalCloseButton color="white" />

        <ModalBody pb={6} overflowY="auto">
          {/* Jogadores Prioritários */}
          {priorityPlayers.length > 0 && (
            <Box mb={6}>
              <Flex alignItems="center" gap={2} mb={3}>
                <Text fontSize="md" fontWeight="bold" color="green.400">
                  ⭐ Recomendados para esta posição
                </Text>
                <Badge colorScheme="green" fontSize="xs">
                  {priorityPlayers.length}
                </Badge>
              </Flex>
              <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={3}>
                {priorityPlayers.map((player) => (
                  <Box
                    key={player.id}
                    onClick={() => handleSelect(player.id)}
                    bg="green.900/30"
                    borderRadius="lg"
                    p={3}
                    borderWidth="2px"
                    borderColor="green.500"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      transform: 'translateY(-4px)',
                      boxShadow: 'lg',
                      borderColor: 'green.400',
                      bg: 'green.900/50',
                    }}
                  >
                    <Box
                      h="120px"
                      w="full"
                      borderRadius="md"
                      overflow="hidden"
                      position="relative"
                      mb={2}
                    >
                      <Image
                        src={player.photo}
                        alt={player.name}
                        objectFit="cover"
                        w="full"
                        h="full"
                      />
                    </Box>
                    <Badge colorScheme="green" mb={1} fontSize="xs">
                      #{player.jerseyNumber}
                    </Badge>
                    <Text
                      color="white"
                      fontWeight="bold"
                      fontSize="sm"
                      noOfLines={1}
                    >
                      {player.name}
                    </Text>
                    <Text color="green.300" fontSize="xs" textTransform="capitalize">
                      {player.position}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Outros Jogadores */}
          {otherPlayers.length > 0 && (
            <Box>
              <Flex alignItems="center" gap={2} mb={3}>
                <Text fontSize="md" fontWeight="bold" color="gray.400">
                  Outros jogadores
                </Text>
                <Badge colorScheme="gray" fontSize="xs">
                  {otherPlayers.length}
                </Badge>
              </Flex>
              <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap={3}>
                {otherPlayers.map((player) => (
                  <Box
                    key={player.id}
                    onClick={() => handleSelect(player.id)}
                    bg="gray.800"
                    borderRadius="lg"
                    p={3}
                    borderWidth="1px"
                    borderColor="gray.700"
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      transform: 'translateY(-4px)',
                      boxShadow: 'lg',
                      borderColor: 'blue.500',
                      bg: 'gray.700',
                    }}
                  >
                    <Box
                      h="120px"
                      w="full"
                      borderRadius="md"
                      overflow="hidden"
                      position="relative"
                      mb={2}
                    >
                      <Image
                        src={player.photo}
                        alt={player.name}
                        objectFit="cover"
                        w="full"
                        h="full"
                      />
                    </Box>
                    <Badge colorScheme="blue" mb={1} fontSize="xs">
                      #{player.jerseyNumber}
                    </Badge>
                    <Text
                      color="white"
                      fontWeight="bold"
                      fontSize="sm"
                      noOfLines={1}
                    >
                      {player.name}
                    </Text>
                    <Text color="gray.400" fontSize="xs" textTransform="capitalize">
                      {player.position}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Sem jogadores disponíveis */}
          {players.length === 0 && (
            <Box
              bg="gray.800"
              borderRadius="lg"
              p={6}
              textAlign="center"
              borderWidth="1px"
              borderColor="gray.700"
            >
              <Text color="gray.400" fontSize="md">
                Nenhum jogador disponível
              </Text>
              <Text color="gray.500" fontSize="sm" mt={2}>
                Todos os jogadores já estão em quadra
              </Text>
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
