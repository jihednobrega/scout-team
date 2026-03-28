import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Button,
  Box,
  Flex,
  Text,
  Image,
  Badge,
  Grid,
} from '@chakra-ui/react'
import { Player } from '@/types/player'
import { useState } from 'react'

interface SubstitutionModalProps {
  isOpen: boolean
  onClose: () => void
  playersOnCourt: Player[]
  benchPlayers: Player[]
  onConfirmSubstitution: (playerOutId: string, playerInId: string) => void
}

export default function SubstitutionModal({
  isOpen,
  onClose,
  playersOnCourt,
  benchPlayers,
  onConfirmSubstitution,
}: SubstitutionModalProps) {
  const [selectedPlayerOut, setSelectedPlayerOut] = useState<string | null>(null)
  const [selectedPlayerIn, setSelectedPlayerIn] = useState<string | null>(null)

  const handleConfirm = () => {
    if (selectedPlayerOut && selectedPlayerIn) {
      onConfirmSubstitution(selectedPlayerOut, selectedPlayerIn)
      onClose()
      setSelectedPlayerOut(null)
      setSelectedPlayerIn(null)
    }
  }

  const PlayerCard = ({ player, isSelected, onClick, type }: { player: Player, isSelected: boolean, onClick: () => void, type: 'out' | 'in' }) => (
    <Box
      onClick={onClick}
      bg={isSelected ? (type === 'out' ? 'red.900/40' : 'green.900/40') : 'gray.800'}
      borderColor={isSelected ? (type === 'out' ? 'red.500' : 'green.500') : 'gray.700'}
      borderWidth="2px"
      borderRadius="lg"
      p={2}
      cursor="pointer"
      transition="all 0.2s"
      _hover={{ transform: 'translateY(-2px)', borderColor: type === 'out' ? 'red.400' : 'green.400' }}
      opacity={isSelected ? 1 : 0.8}
    >
      <Flex align="center" gap={3}>
        <Box
          w="12"
          h="12"
          borderRadius="full"
          overflow="hidden"
          borderWidth="2px"
          borderColor={type === 'out' ? 'red.500' : 'green.500'}
        >
          <Image src={player.photo} alt={player.name} w="full" h="full" objectFit="cover" />
        </Box>
        <Box>
          <Flex align="center" gap={2}>
            <Badge colorScheme={type === 'out' ? 'red' : 'green'}>#{player.jerseyNumber}</Badge>
            <Text fontWeight="bold" fontSize="sm" color="white" noOfLines={1}>{player.name}</Text>
          </Flex>
          <Text fontSize="xs" color="gray.400" textTransform="capitalize">{player.position}</Text>
        </Box>
      </Flex>
    </Box>
  )

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="4xl">
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
      <ModalContent bg="gray.900" borderColor="blue.500" borderWidth="1px">
        <ModalHeader color="white">Realizar Substituição</ModalHeader>
        <ModalCloseButton color="white" />
        
        <ModalBody>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
            {/* Quem Sai */}
            <Box>
              <Flex align="center" gap={2} mb={4}>
                <Box w="3" h="3" borderRadius="full" bg="red.500" />
                <Text color="red.400" fontWeight="bold" fontSize="lg">QUEM SAI (Quadra)</Text>
              </Flex>
              <Grid templateColumns="1fr" gap={3} maxH="400px" overflowY="auto" pr={2}>
                {playersOnCourt.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isSelected={selectedPlayerOut === player.id}
                    onClick={() => setSelectedPlayerOut(player.id)}
                    type="out"
                  />
                ))}
              </Grid>
            </Box>

            {/* Quem Entra */}
            <Box>
              <Flex align="center" gap={2} mb={4}>
                <Box w="3" h="3" borderRadius="full" bg="green.500" />
                <Text color="green.400" fontWeight="bold" fontSize="lg">QUEM ENTRA (Banco)</Text>
              </Flex>
              <Grid templateColumns="1fr" gap={3} maxH="400px" overflowY="auto" pr={2}>
                {benchPlayers.map(player => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isSelected={selectedPlayerIn === player.id}
                    onClick={() => setSelectedPlayerIn(player.id)}
                    type="in"
                  />
                ))}
              </Grid>
            </Box>
          </Grid>
        </ModalBody>

        <ModalFooter borderTopWidth="1px" borderColor="gray.800">
          <Button variant="ghost" mr={3} onClick={onClose} color="gray.400">
            Cancelar
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleConfirm}
            isDisabled={!selectedPlayerOut || !selectedPlayerIn}
            leftIcon={<Text>🔄</Text>}
          >
            Confirmar Substituição
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
