// Modal para seleção de atletas já cadastrados na equipe
'use client'

import { useState, useEffect } from 'react'
import { Box, Button, Flex, Text, Image } from '@chakra-ui/react'
import { Player } from '@/types/player'

interface PlayerSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  selected: string[]
  onSelect: (ids: string[]) => void
}

export function PlayerSelectorModal({
  isOpen,
  onClose,
  players,
  selected,
  onSelect,
}: PlayerSelectorModalProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([])

  // Reset tempSelected quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setTempSelected(selected)
    }
  }, [isOpen, selected])

  const togglePlayer = (id: string) => {
    setTempSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pid) => pid !== id)
      } else {
        return [...prev, id]
      }
    })
  }

  if (!isOpen) return null
  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      w="100vw"
      h="100vh"
      zIndex={1000}
      bg="blackAlpha.700"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Box
        bg="gray.900"
        borderRadius="lg"
        p={6}
        maxW="700px"
        w="95%"
        boxShadow="2xl"
        position="relative"
      >
        <Button
          position="absolute"
          top={2}
          right={2}
          size="sm"
          onClick={onClose}
          colorScheme="gray"
        >
          ✕
        </Button>
        <Text color="blue.300" fontWeight="bold" fontSize="xl" mb={4}>
          Selecionar Atletas
        </Text>
        <Flex wrap="wrap" gap={3} mb={2}>
          {players.length === 0 ? (
            <Text color="gray.500">Nenhum atleta cadastrado.</Text>
          ) : (
            players.map((player) => {
              const isSelected = tempSelected.includes(player.id)
              return (
                <Box
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  cursor="pointer"
                  borderWidth="2px"
                  borderColor={isSelected ? 'blue.400' : 'gray.700'}
                  bg={isSelected ? 'blue.900' : 'gray.800'}
                  borderRadius="md"
                  p={3}
                  minW="140px"
                  textAlign="center"
                  boxShadow={isSelected ? '0 0 0 2px #4299e1' : undefined}
                  transition="all 0.2s"
                >
                  <Image
                    src={player.photo || undefined}
                    alt={player.name}
                    borderRadius="md"
                    boxSize="60px"
                    objectFit="cover"
                    mb={2}
                  />
                  <Text
                    fontWeight="bold"
                    color={isSelected ? 'blue.200' : 'white'}
                  >
                    #{player.jerseyNumber} {player.name}
                  </Text>
                  <Text fontSize="sm" color="gray.400">
                    {player.position.charAt(0).toUpperCase() +
                      player.position.slice(1)}
                  </Text>
                </Box>
              )
            })
          )}
        </Flex>
        <Flex gap={2} mt={4}>
          <Button
            colorScheme="blue"
            flex={1}
            size="lg"
            onClick={() => {
              onSelect(tempSelected)
              onClose()
            }}
          >
            ✓ Adicionar {tempSelected.length} Atletas
          </Button>
          <Button variant="ghost" onClick={onClose} size="lg">
            Cancelar
          </Button>
        </Flex>
      </Box>
    </Box>
  )
}
