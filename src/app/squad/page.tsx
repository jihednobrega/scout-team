
'use client'

import { useCallback, useEffect } from 'react'
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  Stack,
  Checkbox,
  useDisclosure,
  Select,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
} from '@chakra-ui/react'
import { useTeamContext } from '@/contexts/TeamContext'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import {
  Player,
  POSITION_OPTIONS,
  VolleyballPosition,
} from '@/types/player'
import { SquadGrid } from '@/components/squad/SquadGrid'
import { PlayerDetailModal } from '@/components/squad/PlayerDetailModal'
import { PlayerStats } from '@/types/scout'
import { useState, useMemo } from 'react'
import { ImageCropEditor } from '@/components/squad/ImageCropEditor'

type PlayerFormState = {
  name: string
  jerseyNumber: string
  position: VolleyballPosition
  secondaryPositions: VolleyballPosition[]
  photo: string
}

const INITIAL_FORM: PlayerFormState = {
  name: '',
  jerseyNumber: '',
  position: 'ponteiro',
  secondaryPositions: [],
  photo: '',
}

const SECONDARY_POSITION_DESCRIPTION =
  'Selecione as posições secundárias nas quais o atleta pode atuar.'

export default function SquadPage() {
  const { selectedTeamId } = useTeamContext()
  const {
    players,
    loading,
    createPlayer,
    updatePlayer,
    isJerseyNumberTaken,
  } = usePlayersAPI(selectedTeamId)

  const [formData, setFormData] = useState<PlayerFormState>(INITIAL_FORM)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [allPlayerStats, setAllPlayerStats] = useState<Record<string, PlayerStats>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Carregar stats agregadas de todos os jogadores a partir dos scouts
  const fetchPlayerStats = useCallback(async () => {
    if (!selectedTeamId) return
    try {
      const res = await fetch(`/api/players/stats?teamId=${selectedTeamId}`)
      if (res.ok) {
        const data = await res.json()
        setAllPlayerStats(data.playerStats || {})
      }
    } catch { /* silencioso */ }
  }, [selectedTeamId])

  useEffect(() => {
    fetchPlayerStats()
  }, [fetchPlayerStats])

  const {
    isOpen: isFormOpen,
    onOpen: openForm,
    onClose: closeForm,
  } = useDisclosure()

  const {
    isOpen: isDetailModalOpen,
    onOpen: openDetailModal,
    onClose: closeDetailModal,
  } = useDisclosure()

  // Form handlers
  const resetForm = () => {
    setFormData(INITIAL_FORM)
    closeForm()
  }

  const handleCropComplete = useCallback((croppedImage: string) => {
    setFormData((prev) => ({ ...prev, photo: croppedImage }))
  }, [])

  const availableSecondaryOptions = useMemo(
    () => POSITION_OPTIONS.filter((item) => item.value !== formData.position),
    [formData.position]
  )

  const toggleSecondaryPosition = (value: VolleyballPosition) => {
    setFormData((prev) => {
      const exists = prev.secondaryPositions.includes(value)
      const nextSecondary = exists
        ? prev.secondaryPositions.filter((pos) => pos !== value)
        : [...prev.secondaryPositions, value]
      return { ...prev, secondaryPositions: nextSecondary }
    })
  }

  const handlePrimaryPositionChange = (value: VolleyballPosition) => {
    setFormData((prev) => ({
      ...prev,
      position: value,
      secondaryPositions: prev.secondaryPositions.filter(
        (pos) => pos !== value
      ),
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTeamId) {
      alert('Selecione uma equipe primeiro')
      return
    }
    const jerseyNumber = Number(formData.jerseyNumber)

    if (!formData.name.trim()) {
      alert('Nome é obrigatório')
      return
    }

    if (
      !Number.isInteger(jerseyNumber) ||
      jerseyNumber < 1 ||
      jerseyNumber > 99
    ) {
      alert('Número da camisa deve ser entre 1 e 99')
      return
    }

    if (isJerseyNumberTaken(jerseyNumber)) {
      alert('Número ' + jerseyNumber + ' já está em uso nesta equipe')
      return
    }

    if (!formData.photo) {
      alert('Foto é obrigatória')
      return
    }

    setIsSubmitting(true)
    try {
      await createPlayer({
        name: formData.name,
        jerseyNumber,
        position: formData.position,
        secondaryPositions: formData.secondaryPositions,
        photo: formData.photo,
      })
      resetForm()
    } catch (error) {
      console.error('Erro ao cadastrar jogador:', error)
      alert('Erro ao cadastrar jogador')
    } finally {
      setIsSubmitting(false)
    }
  }

  const [filterPosition, setFilterPosition] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesPosition =
        filterPosition === 'all' || player.position === filterPosition
      const matchesSearch = player.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      return matchesPosition && matchesSearch
    })
  }, [players, filterPosition, searchTerm])

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player)
    openDetailModal()
  }

  if (loading) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Text color="gray.400">Carregando jogadores...</Text>
      </Flex>
    )
  }

  return (
    <Box>
      {/* ── Unified toolbar ── */}
      <Flex
        align="center"
        gap={3}
        mb={6}
        wrap="wrap"
      >
        <Flex align="baseline" gap={3} mr={{ md: 'auto' }}>
          <Heading color="white" size={{ base: 'lg', md: 'xl' }}>
            Lista de atletas
          </Heading>
          <Text
            fontSize="sm"
            color="gray.500"
            fontWeight="600"
            whiteSpace="nowrap"
          >
            {filteredPlayers.length} {filteredPlayers.length === 1 ? 'atleta' : 'atletas'}
          </Text>
        </Flex>

        <Input
          placeholder="Buscar atleta..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          bg="gray.900/80"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="xl"
          color="white"
          fontSize="sm"
          h="36px"
          _placeholder={{ color: 'gray.500' }}
          _focus={{
            borderColor: 'blue.400',
            boxShadow: '0 0 0 1px rgba(66,153,225,0.4)',
          }}
          _hover={{ borderColor: 'gray.600' }}
          w={{ base: 'full', md: '200px' }}
        />

        <Select
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
          bg="gray.900/80"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="xl"
          color="white"
          fontSize="sm"
          h="36px"
          _focus={{
            borderColor: 'blue.400',
            boxShadow: '0 0 0 1px rgba(66,153,225,0.4)',
          }}
          _hover={{ borderColor: 'gray.600' }}
          w={{ base: 'full', md: '180px' }}
        >
          <option value="all">Todas as posições</option>
          {POSITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Button
          onClick={openForm}
          size="sm"
          colorScheme="blue"
          fontWeight="700"
          fontSize="sm"
          h="36px"
          px={5}
          _hover={{
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 20px rgba(66,153,225,0.3)',
          }}
          transition="all 0.2s"
          flexShrink={0}
        >
          + Novo atleta
        </Button>
      </Flex>

      {/* ── Add Player Modal ── */}
      <Modal isOpen={isFormOpen} onClose={resetForm} size="lg" isCentered motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
        <ModalContent
          bg="gray.900"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="2xl"
          boxShadow="0 24px 80px rgba(0,0,0,0.6)"
          mx={4}
          maxH="90vh"
          overflow="auto"
        >
          <ModalHeader
            color="white"
            fontWeight="800"
            fontSize="lg"
            pb={0}
            pt={6}
            px={6}
          >
            Novo atleta
          </ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} top={5} right={5} />

          <ModalBody px={6} pb={6} pt={4}>
            <form onSubmit={handleSubmit}>
              <VStack spacing={5} align="stretch">
                {/* Photo upload with crop editor */}
                <Box>
                  <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                    Foto
                  </Text>
                  <ImageCropEditor key={isFormOpen ? 'open' : 'closed'} onCropComplete={handleCropComplete} />
                </Box>

                {/* Name */}
                <Box>
                  <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                    Nome completo
                  </Text>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Ana Silva"
                    bg="gray.800/50"
                    border="1px solid"
                    borderColor="gray.700"
                    borderRadius="xl"
                    color="white"
                    fontSize="sm"
                    _placeholder={{ color: 'gray.500' }}
                    _hover={{ borderColor: 'gray.600' }}
                    _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px rgba(66,153,225,0.4)' }}
                    required
                  />
                </Box>

                {/* Jersey number + Position — side by side */}
                <Flex gap={4}>
                  <Box flex="1">
                    <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                      Camisa
                    </Text>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={formData.jerseyNumber}
                      onChange={(e) => setFormData({ ...formData, jerseyNumber: e.target.value })}
                      placeholder="12"
                      required
                      bg="gray.800/50"
                      border="1px solid"
                      borderColor="gray.700"
                      borderRadius="xl"
                      color="white"
                      fontSize="sm"
                      _placeholder={{ color: 'gray.500' }}
                      _hover={{ borderColor: 'gray.600' }}
                      _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px rgba(66,153,225,0.4)' }}
                    />
                  </Box>
                  <Box flex="2">
                    <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                      Posição principal
                    </Text>
                    <Select
                      value={formData.position}
                      onChange={(e) => handlePrimaryPositionChange(e.target.value as VolleyballPosition)}
                      required
                      bg="gray.800/50"
                      border="1px solid"
                      borderColor="gray.700"
                      borderRadius="xl"
                      color="white"
                      fontSize="sm"
                      _hover={{ borderColor: 'gray.600' }}
                      _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px rgba(66,153,225,0.4)' }}
                    >
                      {POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  </Box>
                </Flex>

                {/* Secondary positions */}
                <Box>
                  <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={1}>
                    Posições secundárias
                  </Text>
                  <Text color="gray.500" fontSize="xs" mb={3}>
                    {SECONDARY_POSITION_DESCRIPTION}
                  </Text>
                  <Stack spacing={2} direction="row" flexWrap="wrap">
                    {availableSecondaryOptions.map((option) => {
                      const value = option.value as VolleyballPosition
                      return (
                        <Checkbox
                          key={option.value}
                          isChecked={formData.secondaryPositions.includes(value)}
                          onChange={() => toggleSecondaryPosition(value)}
                          colorScheme="blue"
                          borderColor="gray.600"
                          size="sm"
                        >
                          <Text fontSize="sm" color="gray.300">
                            {option.label}
                          </Text>
                        </Checkbox>
                      )
                    })}
                  </Stack>
                </Box>

                {/* Actions */}
                <Flex gap={3} pt={2}>
                  <Button
                    type="submit"
                    flex={1}
                    colorScheme="blue"
                    fontWeight="700"
                    fontSize="sm"
                    h="42px"
                    isLoading={isSubmitting}
                    loadingText="Salvando..."
                    transition="all 0.2s"
                  >
                    Salvar atleta
                  </Button>
                  <Button
                    onClick={resetForm}
                    variant="ghost"
                    color="gray.400"
                    borderRadius="xl"
                    fontWeight="600"
                    fontSize="sm"
                    h="42px"
                    _hover={{ color: 'white', bg: 'gray.800' }}
                  >
                    Cancelar
                  </Button>
                </Flex>
              </VStack>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Player Grid */}
      <SquadGrid players={filteredPlayers} onPlayerClick={handlePlayerClick} playerStatsMap={allPlayerStats} />

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        player={selectedPlayer}
        playerStats={selectedPlayer ? allPlayerStats[selectedPlayer.id] : undefined}
        onUpdatePlayer={updatePlayer}
      />
    </Box>
  )
}
