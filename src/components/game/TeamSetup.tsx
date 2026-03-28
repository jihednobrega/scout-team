// components/game/TeamSetup.tsx
'use client'

import { Box, Flex, Text, Button, Input, Checkbox, Select } from '@chakra-ui/react'
import { LineupPlayer } from '@/types/scout'

interface TeamSetupProps {
  lineup: LineupPlayer[]
  setLineup: (lineup: LineupPlayer[]) => void
  liberoId: string
  setLiberoId: (id: string) => void
  onImportActiveRoster: () => void
}

export default function TeamSetup({
  lineup,
  setLineup,
  liberoId,
  setLiberoId,
  onImportActiveRoster,
}: TeamSetupProps) {
  const handleStarterChange = (playerId: string, isStarter: boolean) => {
    setLineup(
      lineup.map((player) =>
        player.playerId === playerId
          ? { ...player, isStarter, rotationOrder: isStarter ? player.rotationOrder : undefined }
          : player
      )
    )
  }

  const handleRotationChange = (playerId: string, rotation: number | undefined) => {
    setLineup(
      lineup.map((player) =>
        player.playerId === playerId ? { ...player, rotationOrder: rotation } : player
      )
    )
  }

  const starters = lineup.filter((p) => p.isStarter).sort((a, b) => (a.rotationOrder || 0) - (b.rotationOrder || 0))
  const reserves = lineup.filter((p) => !p.isStarter)

  return (
    <Box
      bg="gray.800"
      borderRadius="lg"
      p={6}
      borderWidth="1px"
      borderColor="gray.700"
      mb={4}
    >
      <Flex alignItems="center" justifyContent="space-between" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="white">
          👥 Configuração do Time
        </Text>
        <Button
          size="sm"
          bg="purple.600"
          color="white"
          _hover={{ bg: 'purple.700' }}
          onClick={onImportActiveRoster}
        >
          📥 Importar Elenco Ativo
        </Button>
      </Flex>

      {/* Titulares */}
      <Box mb={4}>
        <Text fontSize="md" fontWeight="semibold" color="blue.400" mb={3}>
          ⭐ Titulares ({starters.length}/6)
        </Text>
        {starters.length === 0 ? (
          <Box
            bg="gray.900"
            borderRadius="md"
            p={4}
            borderWidth="1px"
            borderColor="gray.700"
            textAlign="center"
          >
            <Text color="gray.500" fontSize="sm">
              Nenhum titular selecionado. Marque os jogadores como titulares abaixo.
            </Text>
          </Box>
        ) : (
          <Box display="grid" gap={2}>
            {starters.map((player) => (
              <Flex
                key={player.playerId}
                bg="gray.900"
                borderRadius="md"
                p={3}
                borderWidth="1px"
                borderColor="blue.500/30"
                alignItems="center"
                justifyContent="space-between"
              >
                <Flex alignItems="center" gap={3} flex="1">
                  <Box
                    bg="blue.600"
                    color="white"
                    w="40px"
                    h="40px"
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontWeight="bold"
                    fontSize="lg"
                  >
                    {player.jerseyNumber}
                  </Box>
                  <Box flex="1">
                    <Text color="white" fontWeight="semibold" fontSize="sm">
                      {player.playerName}
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                      {player.position}
                    </Text>
                  </Box>
                </Flex>

                <Flex alignItems="center" gap={3}>
                  {/* Ordem de Rotação */}
                  <Box>
                    <Text fontSize="xs" color="gray.400" mb={1}>
                      Rotação
                    </Text>
                    <Select
                      value={player.rotationOrder || ''}
                      onChange={(e) =>
                        handleRotationChange(
                          player.playerId,
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      size="sm"
                      bg="gray.800"
                      borderColor="gray.600"
                      color="white"
                    >
                      <option value="">-</option>
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <option key={num} value={num}>
                          P{num}
                        </option>
                      ))}
                    </Select>
                  </Box>

                  {/* Líbero */}
                  <Box>
                    <Text fontSize="xs" color="gray.400" mb={1}>
                      Líbero
                    </Text>
                    <Checkbox
                      isChecked={liberoId === player.playerId}
                      onChange={(e) =>
                        setLiberoId(e.target.checked ? player.playerId : '')
                      }
                      colorScheme="orange"
                      size="md"
                    >
                      <Text fontSize="xs" color="white">Sim</Text>
                    </Checkbox>
                  </Box>

                  {/* Remover */}
                  <Button
                    size="xs"
                    bg="red.600"
                    color="white"
                    _hover={{ bg: 'red.700' }}
                    onClick={() => handleStarterChange(player.playerId, false)}
                  >
                    ❌
                  </Button>
                </Flex>
              </Flex>
            ))}
          </Box>
        )}
      </Box>

      {/* Reservas */}
      <Box>
        <Text fontSize="md" fontWeight="semibold" color="gray.400" mb={3}>
          💺 Reservas ({reserves.length})
        </Text>
        {reserves.length === 0 ? (
          <Box
            bg="gray.900"
            borderRadius="md"
            p={4}
            borderWidth="1px"
            borderColor="gray.700"
            textAlign="center"
          >
            <Text color="gray.500" fontSize="sm">
              Todos os jogadores estão na escalação titular.
            </Text>
          </Box>
        ) : (
          <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
            {reserves.map((player) => (
              <Flex
                key={player.playerId}
                bg="gray.900"
                borderRadius="md"
                p={3}
                borderWidth="1px"
                borderColor="gray.700"
                alignItems="center"
                justifyContent="space-between"
              >
                <Flex alignItems="center" gap={3} flex="1">
                  <Box
                    bg="gray.700"
                    color="white"
                    w="32px"
                    h="32px"
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontWeight="bold"
                    fontSize="sm"
                  >
                    {player.jerseyNumber}
                  </Box>
                  <Box flex="1">
                    <Text color="white" fontSize="sm">
                      {player.playerName}
                    </Text>
                    <Text color="gray.500" fontSize="xs">
                      {player.position}
                    </Text>
                  </Box>
                </Flex>

                <Button
                  size="xs"
                  bg="green.600"
                  color="white"
                  _hover={{ bg: 'green.700' }}
                  onClick={() => handleStarterChange(player.playerId, true)}
                >
                  ➕ Titular
                </Button>
              </Flex>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
