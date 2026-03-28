'use client'

import { useState, useCallback, useRef } from 'react'
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Input,
  VStack,
  HStack,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
  Divider,
} from '@chakra-ui/react'
import {
  IoShieldOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoAddOutline,
  IoSettingsOutline,
  IoCloudUploadOutline,
  IoCheckmarkCircleOutline,
} from 'react-icons/io5'
import { useTeamContext } from '@/contexts/TeamContext'
import { useTeams, Team } from '@/hooks/useTeams'
import { ImageCropEditor } from '@/components/squad/ImageCropEditor'

export default function SettingsPage() {
  const { selectedTeam, setSelectedTeam } = useTeamContext()
  const { teams, loading, createTeam, updateTeam, deleteTeam } = useTeams()
  const toast = useToast()

  // ── Publish / sync ──
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)

  const handlePublish = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error ?? 'Erro ao publicar', status: 'error', duration: 5000, isClosable: true })
        return
      }
      setLastSynced(new Date())
      toast({ title: 'Publicado com sucesso!', description: 'Os dados estão disponíveis no portal.', status: 'success', duration: 4000 })
    } catch {
      toast({ title: 'Erro de conexão ao publicar', status: 'error', duration: 4000 })
    } finally {
      setIsSyncing(false)
    }
  }

  // ── Create team modal ──
  const { isOpen: isCreateOpen, onOpen: openCreate, onClose: closeCreate } = useDisclosure()
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamLogo, setNewTeamLogo] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // ── Edit team state ──
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const { isOpen: isEditOpen, onOpen: openEdit, onClose: closeEdit } = useDisclosure()
  const [editName, setEditName] = useState('')
  const [editLogo, setEditLogo] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // ── Delete confirmation ──
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)
  const { isOpen: isDeleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure()
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteInputRef = useRef<HTMLInputElement>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return
    setIsCreating(true)
    try {
      const team = await createTeam({ name: newTeamName.trim(), logo: newTeamLogo || undefined })
      if (team) {
        toast({ title: 'Equipe criada com sucesso', status: 'success', duration: 3000 })
        setNewTeamName('')
        setNewTeamLogo('')
        closeCreate()
        // Auto-select if no team selected
        if (!selectedTeam) setSelectedTeam(team)
      }
    } catch {
      toast({ title: 'Erro ao criar equipe', status: 'error', duration: 3000 })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditTeam = (team: Team) => {
    setEditingTeam(team)
    setEditName(team.name)
    setEditLogo(team.logo || '')
    openEdit()
  }

  const handleSaveEdit = async () => {
    if (!editingTeam || !editName.trim()) return
    setIsSaving(true)
    try {
      const updated = await updateTeam(editingTeam.id, {
        name: editName.trim(),
        logo: editLogo || undefined,
      })
      if (updated) {
        toast({ title: 'Equipe atualizada', status: 'success', duration: 3000 })
        if (selectedTeam?.id === editingTeam.id) setSelectedTeam(updated)
        closeEdit()
        setEditingTeam(null)
      }
    } catch {
      toast({ title: 'Erro ao atualizar equipe', status: 'error', duration: 3000 })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTeam = (team: Team) => {
    setDeletingTeam(team)
    setDeleteConfirmText('')
    openDelete()
  }

  const confirmDelete = async () => {
    if (!deletingTeam) return
    setIsDeleting(true)
    try {
      const success = await deleteTeam(deletingTeam.id)
      if (success) {
        toast({ title: 'Equipe removida', status: 'success', duration: 3000 })
        if (selectedTeam?.id === deletingTeam.id) setSelectedTeam(null)
        closeDelete()
        setDeletingTeam(null)
      }
    } catch {
      toast({ title: 'Erro ao remover equipe', status: 'error', duration: 3000 })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateCropComplete = useCallback((croppedImage: string) => {
    setNewTeamLogo(croppedImage)
  }, [])

  const handleEditCropComplete = useCallback((croppedImage: string) => {
    setEditLogo(croppedImage)
  }, [])

  return (
    <Box
      maxW="900px"
      mx="auto"
      px={{ base: 4, md: 6 }}
      py={{ base: 6, md: 8 }}
    >
      {/* ── Header ── */}
      <Flex align="center" gap={3} mb={6}>
        <Flex
          align="center"
          justify="center"
          w="40px"
          h="40px"
          borderRadius="12px"
          bg="gray.800/50"
          border="1px solid"
          borderColor="gray.700"
        >
          <Icon as={IoSettingsOutline} color="gray.400" boxSize={5} />
        </Flex>
        <Heading color="white" size={{ base: 'lg', md: 'xl' }}>
          Configurações
        </Heading>
      </Flex>

      <VStack spacing={6} align="stretch">
        {/* ═══════ SECTION: Teams ═══════ */}
        <Box>
          <Flex align="center" justify="space-between" mb={4}>
            <Flex align="center" gap={2}>
              <Icon as={IoShieldOutline} color="blue.400" boxSize={4} />
              <Text color="white" fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em">
                Equipes
              </Text>
            </Flex>
            <Button
              size="xs"
              colorScheme="blue"
              fontWeight="700"
              fontSize="xs"
              leftIcon={<Icon as={IoAddOutline} boxSize={4} />}
              onClick={openCreate}
            >
              Nova equipe
            </Button>
          </Flex>

          {/* Team list */}
          <Box
            bg="gray.900/60"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.700"
            overflow="hidden"
          >
            {loading ? (
              <Flex p={8} align="center" justify="center">
                <Text color="gray.500" fontSize="sm">Carregando equipes...</Text>
              </Flex>
            ) : teams.length === 0 ? (
              <Flex direction="column" align="center" gap={2} p={8}>
                <Icon as={IoShieldOutline} color="gray.600" boxSize={10} />
                <Text color="gray.500" fontSize="sm">Nenhuma equipe cadastrada</Text>
                <Text color="gray.500" fontSize="xs">Crie sua primeira equipe para começar</Text>
              </Flex>
            ) : (
              <VStack spacing={0} align="stretch" divider={<Divider borderColor="gray.700/50" />}>
                {teams.map((team) => {
                  const isSelected = selectedTeam?.id === team.id
                  return (
                    <Flex
                      key={team.id}
                      align="center"
                      gap={3}
                      px={4}
                      py={3}
                      cursor="pointer"
                      bg={isSelected ? 'whiteAlpha.50' : 'transparent'}
                      _hover={{ bg: 'whiteAlpha.50' }}
                      transition="background 0.15s"
                      onClick={() => setSelectedTeam(team)}
                    >
                      {/* Team logo/placeholder */}
                      <Flex
                        w="40px"
                        h="40px"
                        borderRadius="10px"
                        overflow="hidden"
                        bg="gray.700/50"
                        align="center"
                        justify="center"
                        flexShrink={0}
                        border={isSelected ? '2px solid' : '1px solid'}
                        borderColor={isSelected ? 'blue.400' : 'whiteAlpha.100'}
                      >
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt={team.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <Icon as={IoShieldOutline} color="gray.500" boxSize={5} />
                        )}
                      </Flex>

                      {/* Team info */}
                      <Box flex={1} minW={0}>
                        <Flex align="center" gap={2}>
                          <Text color="white" fontSize="sm" fontWeight="700" noOfLines={1}>
                            {team.name}
                          </Text>
                          {isSelected && (
                            <Box
                              px={1.5}
                              py={0.5}
                              borderRadius="md"
                              bg="blue.500"
                              fontSize="9px"
                              fontWeight="800"
                              color="white"
                              letterSpacing="0.05em"
                              lineHeight="1"
                            >
                              ATIVA
                            </Box>
                          )}
                        </Flex>
                        <HStack spacing={3} mt={0.5}>
                          <Text color="gray.500" fontSize="xs">
                            {team._count?.players ?? 0} atletas
                          </Text>
                          <Text color="gray.500" fontSize="xs">
                            {team._count?.matches ?? 0} jogos
                          </Text>
                        </HStack>
                      </Box>

                      {/* Actions */}
                      <HStack spacing={1}>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="gray.500"
                          minW="28px"
                          h="28px"
                          p={0}
                          borderRadius="lg"
                          _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                          onClick={(e) => { e.stopPropagation(); handleEditTeam(team) }}
                          aria-label="Editar equipe"
                        >
                          <Icon as={IoCreateOutline} boxSize={4} />
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          color="gray.500"
                          minW="28px"
                          h="28px"
                          p={0}
                          borderRadius="lg"
                          _hover={{ color: 'red.400', bg: 'whiteAlpha.100' }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteTeam(team) }}
                          aria-label="Remover equipe"
                        >
                          <Icon as={IoTrashOutline} boxSize={4} />
                        </Button>
                      </HStack>
                    </Flex>
                  )
                })}
              </VStack>
            )}
          </Box>
        </Box>

        {/* ═══════ SECTION: Publish Portal ═══════ */}
        <Box>
          <Flex align="center" gap={2} mb={4}>
            <Icon as={IoCloudUploadOutline} color="green.400" boxSize={4} />
            <Text color="white" fontSize="sm" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em">
              Portal
            </Text>
          </Flex>
          <Box
            bg="gray.900/60"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.700"
            px={4}
            py={4}
          >
            <Text color="gray.400" fontSize="sm" mb={1}>
              Publicar dados para o portal
            </Text>
            <Text color="gray.600" fontSize="xs" mb={4} lineHeight="1.5">
              Sincroniza o banco local com o Turso, tornando as partidas e estatísticas visíveis para atletas e treinadores no portal.
            </Text>

            {lastSynced && (
              <Flex align="center" gap={1.5} mb={3}>
                <Icon as={IoCheckmarkCircleOutline} color="green.400" boxSize={3.5} />
                <Text color="green.400" fontSize="xs">
                  Última publicação: {lastSynced.toLocaleString('pt-BR')}
                </Text>
              </Flex>
            )}

            <Button
              colorScheme="green"
              size="sm"
              fontWeight="700"
              leftIcon={<Icon as={IoCloudUploadOutline} boxSize={4} />}
              isLoading={isSyncing}
              loadingText="Publicando..."
              onClick={handlePublish}
            >
              Publicar agora
            </Button>
          </Box>
        </Box>

        {/* ═══════ SECTION: About ═══════ */}
        <Box>
          <Flex align="center" gap={2} mb={4}>
            <Text color="gray.500" fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.08em">
              Sobre
            </Text>
          </Flex>
          <Box
            bg="gray.900/60"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.700"
            px={4}
            py={3}
          >
            <Text color="gray.400" fontSize="xs" lineHeight="1.6">
              Scout Team — Plataforma de scout e análise de voleibol.
            </Text>
            <Text color="gray.500" fontSize="10px" mt={1}>
              Versão 1.0.0
            </Text>
          </Box>
        </Box>
      </VStack>

      {/* ═══════ MODAL: Create Team ═══════ */}
      <Modal isOpen={isCreateOpen} onClose={closeCreate} size="lg" isCentered motionPreset="slideInBottom">
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
          <ModalHeader color="white" fontWeight="800" fontSize="lg" pb={0} pt={6} px={6}>
            Nova equipe
          </ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} top={5} right={5} />

          <ModalBody px={6} pb={6} pt={4}>
            <form onSubmit={handleCreateTeam}>
              <VStack spacing={5} align="stretch">
                {/* Logo */}
                <Box>
                  <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                    Logo / Escudo
                  </Text>
                  <ImageCropEditor
                    key={isCreateOpen ? 'create-open' : 'create-closed'}
                    onCropComplete={handleCreateCropComplete}
                  />
                </Box>

                {/* Name */}
                <Box>
                  <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                    Nome da equipe
                  </Text>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Ex: Vôlei Santos FC"
                    bg="gray.800/50"
                    border="1px solid"
                    borderColor="gray.700"
                    borderRadius="xl"
                    color="white"
                    fontSize="sm"
                    _placeholder={{ color: 'whiteAlpha.300' }}
                    _hover={{ borderColor: 'whiteAlpha.200' }}
                    _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px rgba(66,153,225,0.4)' }}
                    required
                  />
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
                    isLoading={isCreating}
                    loadingText="Criando..."
                    transition="all 0.2s"
                  >
                    Criar equipe
                  </Button>
                  <Button
                    onClick={closeCreate}
                    variant="ghost"
                    color="gray.400"
                    borderRadius="xl"
                    fontWeight="600"
                    fontSize="sm"
                    h="42px"
                    _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                  >
                    Cancelar
                  </Button>
                </Flex>
              </VStack>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ═══════ MODAL: Edit Team ═══════ */}
      <Modal isOpen={isEditOpen} onClose={closeEdit} size="lg" isCentered motionPreset="slideInBottom">
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
          <ModalHeader color="white" fontWeight="800" fontSize="lg" pb={0} pt={6} px={6}>
            Editar equipe
          </ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} top={5} right={5} />

          <ModalBody px={6} pb={6} pt={4}>
            <VStack spacing={5} align="stretch">
              {/* Logo */}
              <Box>
                <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                  Logo / Escudo
                </Text>
                {editingTeam?.logo && !editLogo.startsWith('data:') ? (
                  <Flex direction="column" align="center" gap={3}>
                    <Box
                      w="140px"
                      h="140px"
                      borderRadius="16px"
                      overflow="hidden"
                      border="2px solid"
                      borderColor="blue.400"
                      boxShadow="0 0 20px rgba(66,153,225,0.15)"
                    >
                      <img
                        src={editingTeam.logo}
                        alt="Logo atual"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <Text color="gray.500" fontSize="xs">Envie uma nova imagem para substituir</Text>
                  </Flex>
                ) : null}
                <Box mt={editingTeam?.logo && !editLogo.startsWith('data:') ? 3 : 0}>
                  <ImageCropEditor
                    key={isEditOpen ? 'edit-open' : 'edit-closed'}
                    onCropComplete={handleEditCropComplete}
                  />
                </Box>
              </Box>

              {/* Name */}
              <Box>
                <Text color="gray.400" fontSize="xs" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
                  Nome da equipe
                </Text>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  bg="gray.800/50"
                  border="1px solid"
                  borderColor="gray.700"
                  borderRadius="xl"
                  color="white"
                  fontSize="sm"
                  _hover={{ borderColor: 'whiteAlpha.200' }}
                  _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px rgba(66,153,225,0.4)' }}
                />
              </Box>

              {/* Actions */}
              <Flex gap={3} pt={2}>
                <Button
                  flex={1}
                  colorScheme="blue"
                  fontWeight="700"
                  fontSize="sm"
                  h="42px"
                  isLoading={isSaving}
                  loadingText="Salvando..."
                  transition="all 0.2s"
                  onClick={handleSaveEdit}
                >
                  Salvar alterações
                </Button>
                <Button
                  onClick={closeEdit}
                  variant="ghost"
                  color="gray.400"
                  borderRadius="xl"
                  fontWeight="600"
                  fontSize="sm"
                  h="42px"
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                >
                  Cancelar
                </Button>
              </Flex>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ═══════ MODAL: Delete Confirmation ═══════ */}
      <Modal isOpen={isDeleteOpen} onClose={closeDelete} size="md" isCentered motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
        <ModalContent
          bg="gray.900"
          border="1px solid"
          borderColor="red.900"
          borderRadius="2xl"
          boxShadow="0 24px 80px rgba(0,0,0,0.6)"
          mx={4}
        >
          <ModalHeader color="white" fontWeight="800" fontSize="lg" pb={0} pt={6} px={6}>
            Remover equipe
          </ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} top={5} right={5} />

          <ModalBody px={6} pb={6} pt={4}>
            <VStack spacing={4} align="stretch">
              <Box
                bg="rgba(254,178,178,0.06)"
                border="1px solid"
                borderColor="red.900"
                borderRadius="xl"
                p={4}
              >
                <Text color="red.300" fontSize="sm" fontWeight="600">
                  Esta ação é irreversível. Todos os jogadores, partidas e dados de scout associados à equipe serão permanentemente removidos.
                </Text>
              </Box>

              <Box>
                <Text color="gray.400" fontSize="xs" mb={2}>
                  Digite <strong style={{ color: 'white' }}>{deletingTeam?.name}</strong> para confirmar:
                </Text>
                <Input
                  ref={deleteInputRef}
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={deletingTeam?.name}
                  bg="gray.800/50"
                  border="1px solid"
                  borderColor="gray.700"
                  borderRadius="xl"
                  color="white"
                  fontSize="sm"
                  _placeholder={{ color: 'whiteAlpha.200' }}
                  _focus={{ borderColor: 'red.400', boxShadow: '0 0 0 1px rgba(254,178,178,0.3)' }}
                />
              </Box>

              <Flex gap={3} pt={1}>
                <Button
                  flex={1}
                  bg="red.600"
                  color="white"
                  borderRadius="xl"
                  fontWeight="700"
                  fontSize="sm"
                  h="42px"
                  isLoading={isDeleting}
                  loadingText="Removendo..."
                  isDisabled={deleteConfirmText !== deletingTeam?.name}
                  _hover={{ bg: 'red.500' }}
                  _disabled={{ opacity: 0.4, cursor: 'not-allowed', _hover: { bg: 'red.600' } }}
                  onClick={confirmDelete}
                >
                  Remover permanentemente
                </Button>
                <Button
                  onClick={closeDelete}
                  variant="ghost"
                  color="gray.400"
                  borderRadius="xl"
                  fontWeight="600"
                  fontSize="sm"
                  h="42px"
                  _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                >
                  Cancelar
                </Button>
              </Flex>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  )
}
