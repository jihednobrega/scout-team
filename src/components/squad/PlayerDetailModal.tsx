import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex,
  Image,
  Text,
  Heading,
  Badge,
  Button,
  SimpleGrid,
  HStack,
  Stack,
  Checkbox,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Player, POSITION_LABELS, POSITION_OPTIONS, VolleyballPosition, UpdatePlayerInput } from '@/types/player'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useCallback } from 'react'
import { formatPercentage, formatNumber, calculateRatingFromStats, getRatingColor } from '@/utils/stats'
import { PlayerStats } from '@/types/scout'
import { ImageCropEditor } from './ImageCropEditor'
import { IoPencil } from 'react-icons/io5'

interface PlayerDetailModalProps {
  isOpen: boolean
  onClose: () => void
  player: Player | null
  playerStats?: PlayerStats | null
  onUpdatePlayer?: (input: UpdatePlayerInput) => Promise<Player | null>
}

// Fundamental config with icons and colors
const FUNDAMENTAL_CONFIG: Record<string, { icon: string; color: string; gradient: string }> = {
  'Saque':        { icon: '/icons/serve.svg',     color: '#3182ce', gradient: 'linear(to-r, blue.600, blue.400)'   },
  'Recepção':     { icon: '/icons/reception.svg', color: '#38a169', gradient: 'linear(to-r, green.600, green.400)' },
  'Ataque':       { icon: '/icons/attack.svg',    color: '#e53e3e', gradient: 'linear(to-r, red.600, red.400)'     },
  'Bloqueio':     { icon: '/icons/block.svg',     color: '#dd6b20', gradient: 'linear(to-r, orange.600, orange.400)' },
  'Defesa':       { icon: '/icons/defense.svg',   color: '#805ad5', gradient: 'linear(to-r, purple.600, purple.400)' },
  'Levantamento': { icon: '/icons/set.svg',       color: '#d69e2e', gradient: 'linear(to-r, yellow.600, yellow.400)' },
}

export function PlayerDetailModal({
  isOpen,
  onClose,
  player,
  playerStats,
  onUpdatePlayer,
}: PlayerDetailModalProps) {
  const router = useRouter()
  const textColor = useColorModeValue('gray.800', 'white')
  const secondaryText = useColorModeValue('gray.600', 'gray.400')
  const cardBg = useColorModeValue('white', 'rgba(255,255,255,0.04)')
  const cardBorder = useColorModeValue('gray.200', 'rgba(255,255,255,0.06)')

  const [isEditing, setIsEditing] = useState(false)
  const [editPhoto, setEditPhoto] = useState<string | null>(null)
  const [editSecondaryPositions, setEditSecondaryPositions] = useState<VolleyballPosition[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const startEditing = useCallback(() => {
    if (!player) return
    setEditPhoto(null)
    setEditSecondaryPositions(player.secondaryPositions || [])
    setIsEditing(true)
  }, [player])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
    setEditPhoto(null)
  }, [])

  const handleEditCrop = useCallback((croppedImage: string) => {
    setEditPhoto(croppedImage)
  }, [])

  const toggleEditSecondary = useCallback((pos: VolleyballPosition) => {
    setEditSecondaryPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
    )
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!player || !onUpdatePlayer) return
    setIsSaving(true)
    try {
      const updates: UpdatePlayerInput = {
        id: player.id,
        secondaryPositions: editSecondaryPositions,
      }
      if (editPhoto) {
        updates.photo = editPhoto
      }
      await onUpdatePlayer(updates)
      setIsEditing(false)
      setEditPhoto(null)
    } catch (err) {
      console.error('Erro ao atualizar jogador:', err)
    } finally {
      setIsSaving(false)
    }
  }, [player, onUpdatePlayer, editSecondaryPositions, editPhoto])

  const handleClose = useCallback(() => {
    setIsEditing(false)
    setEditPhoto(null)
    onClose()
  }, [onClose])

  const stats = playerStats ?? null

  // Rating unificado 0-10 (mesmo sistema dos relatórios)
  const playerRating = useMemo(() => {
    if (!stats) return null
    return calculateRatingFromStats(stats)
  }, [stats])

  // Mapeamento de chave do fundamento → nome de exibição
  const FUND_KEY_TO_NAME: Record<string, string> = {
    serve: 'Saque', reception: 'Recepção', attack: 'Ataque',
    block: 'Bloqueio', dig: 'Defesa', set: 'Levantamento',
  }

  const chartData = useMemo(() => {
    if (!playerRating) return []
    const fundKeys = ['serve', 'reception', 'attack', 'block', 'dig', 'set']
    const shortNames: Record<string, string> = {
      serve: 'Saque', reception: 'Recepção', attack: 'Ataque',
      block: 'Bloqueio', dig: 'Defesa', set: 'Levant.',
    }
    return fundKeys.map(key => ({
      subject: shortNames[key],
      A: playerRating.ratingByFundamental[key]?.friendly ?? 0,
      fullMark: 10,
    }))
  }, [playerRating])

  const fundamentals = useMemo(() => {
    if (!stats || !playerRating) return []
    return [
      {
        name: 'Saque',
        fundKey: 'serve',
        mainLabel: 'Eficiência',
        mainValue: formatPercentage(stats.serve.efficiency),
        rating: playerRating.ratingByFundamental['serve']?.friendly ?? 0,
        details: [
          { label: 'Aces', value: stats.serve.aces, color: 'green.400' },
          { label: 'Erros', value: stats.serve.errors, color: 'red.400' },
          { label: 'Total', value: stats.serve.total, color: 'gray.400' },
        ]
      },
      {
        name: 'Recepção',
        fundKey: 'reception',
        mainLabel: 'Positividade',
        mainValue: formatPercentage(stats.reception.positivity),
        rating: playerRating.ratingByFundamental['reception']?.friendly ?? 0,
        details: [
          { label: 'Perfeita', value: stats.reception.perfect, color: 'green.400' },
          { label: 'Positiva', value: stats.reception.positive, color: 'blue.300' },
          { label: 'Erros', value: stats.reception.errors, color: 'red.400' },
        ]
      },
      {
        name: 'Ataque',
        fundKey: 'attack',
        mainLabel: 'Eficiência',
        mainValue: formatPercentage(stats.attack.efficiency),
        rating: playerRating.ratingByFundamental['attack']?.friendly ?? 0,
        details: [
          { label: 'Pontos', value: stats.attack.kills, color: 'green.400' },
          { label: 'Bloq.', value: stats.attack.blocked, color: 'orange.300' },
          { label: 'Erros', value: stats.attack.errors, color: 'red.400' },
        ]
      },
      {
        name: 'Bloqueio',
        fundKey: 'block',
        mainLabel: 'Pts/Set',
        mainValue: formatNumber(stats.block.pointsPerSet),
        rating: playerRating.ratingByFundamental['block']?.friendly ?? 0,
        details: [
          { label: 'Pontos', value: stats.block.points, color: 'green.400' },
          { label: 'Tocados', value: stats.block.touches, color: 'blue.300' },
          { label: 'Erros', value: stats.block.errors, color: 'red.400' },
        ]
      },
      {
        name: 'Defesa',
        fundKey: 'dig',
        mainLabel: 'Eficácia',
        mainValue: formatPercentage(stats.defense.efficiency),
        rating: playerRating.ratingByFundamental['dig']?.friendly ?? 0,
        details: [
          { label: 'Perfeita', value: stats.defense.perfect, color: 'green.400' },
          { label: 'Positiva', value: stats.defense.positive, color: 'blue.300' },
          { label: 'Erros', value: stats.defense.errors, color: 'red.400' },
        ]
      },
      {
        name: 'Levantamento',
        fundKey: 'set',
        mainLabel: 'Precisão',
        mainValue: formatPercentage(stats.set.total > 0 ? stats.set.perfect / stats.set.total : 0),
        rating: playerRating.ratingByFundamental['set']?.friendly ?? 0,
        details: [
          { label: 'Perfeito', value: stats.set.perfect, color: 'green.400' },
          { label: 'Erros', value: stats.set.errors, color: 'red.400' },
          { label: 'Total', value: stats.set.total, color: 'gray.400' },
        ]
      },
    ]
  }, [stats, playerRating])

  const overallRating = playerRating?.friendlyRating ?? 0

  const distributionData = useMemo(() => {
    if (!stats?.set.distribution) return null
    const d = stats.set.distribution
    const total = d.ponteiro + d.central + d.oposto + d.pipe
    if (total === 0) return null
    const items = [
      { name: 'Ponteiro', shortName: 'PNT', value: d.ponteiro, color: '#48BB78', glow: 'rgba(72,187,120,0.35)', pct: Math.round((d.ponteiro / total) * 100) },
      { name: 'Central', shortName: 'CEN', value: d.central, color: '#4299E1', glow: 'rgba(66,153,225,0.35)', pct: Math.round((d.central / total) * 100) },
      { name: 'Oposto', shortName: 'OPO', value: d.oposto, color: '#9F7AEA', glow: 'rgba(159,122,234,0.35)', pct: Math.round((d.oposto / total) * 100) },
      { name: 'Pipe', shortName: 'PIPE', value: d.pipe, color: '#ED8936', glow: 'rgba(237,137,54,0.35)', pct: Math.round((d.pipe / total) * 100) },
    ]
    const maxItem = items.reduce((a, b) => (a.value > b.value ? a : b))
    return { total, items, dominantName: maxItem.name }
  }, [stats])

  if (!player) return null

  const handleFullDetailsClick = () => {
    router.push(`/squad/${player.id}`)
  }

  const availableSecondaryOptions = POSITION_OPTIONS.filter(o => o.value !== player.position)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="5xl" isCentered scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.800" backdropFilter="blur(12px)" />
      <ModalContent
        bg="gray.900"
        borderRadius="2xl"
        overflow="hidden"
        border="1px solid"
        borderColor="whiteAlpha.100"
        maxH="90vh"
      >
        <ModalCloseButton
          zIndex={20}
          color="whiteAlpha.700"
          _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
          borderRadius="full"
          top={4}
          right={4}
        />
        <ModalBody p={0}>

          {/* ═══════════ HERO SECTION ═══════════ */}
          <Box position="relative" overflow="hidden">
            {/* Background gradient */}
            <Box
              position="absolute"
              inset={0}
              bg="linear-gradient(135deg, #0f1628 0%, #1a1f3a 40%, #0d1117 100%)"
            />
            {/* Subtle grid pattern */}
            <Box
              position="absolute"
              inset={0}
              opacity={0.03}
              backgroundImage="linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)"
              backgroundSize="40px 40px"
            />
            {/* Glow accent */}
            <Box
              position="absolute"
              top="-50%"
              right="-10%"
              w="400px"
              h="400px"
              borderRadius="full"
              bg="blue.500"
              filter="blur(120px)"
              opacity={0.08}
            />

            <Flex
              position="relative"
              direction={{ base: 'column', md: 'row' }}
              align="stretch"
              minH={{ md: '340px' }}
            >
              {/* Left: Player Identity */}
              <Flex
                direction="column"
                align="center"
                justify="center"
                w={{ base: '100%', md: '280px' }}
                p={{ base: 6, md: 8 }}
                flexShrink={0}
              >
                {/* Photo with glow ring */}
                <Box position="relative" mb={5}>
                  <Box
                    position="absolute"
                    inset="-4px"
                    borderRadius="full"
                    bg="linear-gradient(135deg, #3182ce, #63b3ed, #3182ce)"
                    opacity={0.6}
                    filter="blur(4px)"
                  />
                  <Box
                    position="relative"
                    w="140px"
                    h="140px"
                    borderRadius="full"
                    overflow="hidden"
                    border="3px solid"
                    borderColor="whiteAlpha.300"
                  >
                    <Image
                      src={editPhoto || player.photo}
                      alt={player.name}
                      w="full"
                      h="full"
                      objectFit="cover"
                    />
                  </Box>
                  {/* Jersey number badge */}
                  <Flex
                    position="absolute"
                    bottom="-2px"
                    right="-2px"
                    w="40px"
                    h="40px"
                    borderRadius="full"
                    bg="blue.500"
                    border="3px solid"
                    borderColor="gray.900"
                    align="center"
                    justify="center"
                  >
                    <Text fontSize="sm" fontWeight="extrabold" color="white">
                      {player.jerseyNumber}
                    </Text>
                  </Flex>
                  {/* Edit button */}
                  {onUpdatePlayer && !isEditing && (
                    <Flex
                      position="absolute"
                      top="-2px"
                      right="-2px"
                      w="32px"
                      h="32px"
                      borderRadius="full"
                      bg="whiteAlpha.200"
                      backdropFilter="blur(8px)"
                      border="2px solid"
                      borderColor="gray.900"
                      align="center"
                      justify="center"
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{ bg: 'blue.500' }}
                      onClick={startEditing}
                    >
                      <Icon as={IoPencil} color="white" boxSize={3.5} />
                    </Flex>
                  )}
                </Box>

                <Heading
                  size="lg"
                  color="white"
                  textAlign="center"
                  lineHeight="1.2"
                  mb={2}
                >
                  {player.name}
                </Heading>
                <HStack spacing={2} mb={isEditing ? 0 : undefined}>
                  <Badge
                    bg="whiteAlpha.100"
                    color="blue.200"
                    fontSize="xs"
                    px={3}
                    py={1}
                    borderRadius="full"
                    fontWeight="semibold"
                    letterSpacing="wide"
                    textTransform="uppercase"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                  >
                    {POSITION_LABELS[player.position]}
                  </Badge>
                  {!isEditing && player.secondaryPositions?.map(pos => (
                    <Badge
                      key={pos}
                      bg="whiteAlpha.50"
                      color="whiteAlpha.500"
                      fontSize="9px"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      fontWeight="semibold"
                      letterSpacing="wide"
                      textTransform="uppercase"
                      border="1px solid"
                      borderColor="whiteAlpha.50"
                    >
                      {POSITION_LABELS[pos]}
                    </Badge>
                  ))}
                </HStack>
              </Flex>

              {/* Center: Radar Chart */}
              {stats && <Box
                flex={1}
                display="flex"
                flexDirection="column"
                justifyContent="center"
                py={4}
                pr={{ md: 4 }}
              >
                <Box h={{ base: '240px', md: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600 }}
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} hide />
                      <Radar
                        name={player.name}
                        dataKey="A"
                        stroke="#63b3ed"
                        strokeWidth={2.5}
                        fill="url(#radarGradient)"
                        fillOpacity={1}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                      <defs>
                        <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                          <stop offset="0%" stopColor="#63b3ed" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="#3182ce" stopOpacity={0.15} />
                        </radialGradient>
                      </defs>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15,22,40,0.95)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                          color: 'white',
                          fontSize: '13px',
                          padding: '8px 14px',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </Box>
              </Box>}

              {/* Right: Key Numbers */}
              {stats && <Flex
                direction="column"
                justify="center"
                gap={3}
                w={{ base: '100%', md: '160px' }}
                p={{ base: 4, md: 6 }}
                flexShrink={0}
              >
                {/* Overall Rating */}
                <Box textAlign="center" mb={2}>
                  <Box
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    w="64px"
                    h="64px"
                    borderRadius="xl"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                    mb={1}
                  >
                    <Text fontSize="2xl" fontWeight="extrabold" color={getRatingColor(overallRating)}>
                      {overallRating.toFixed(1)}
                    </Text>
                  </Box>
                  <Text fontSize="10px" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="widest" fontWeight="bold">
                    Nota
                  </Text>
                </Box>

                {[
                  { label: 'Partidas', value: stats.matchesPlayed },
                  { label: 'Sets', value: stats.setsPlayed },
                  { label: 'Pontos', value: stats.points, highlight: true },
                ].map((item) => (
                  <Box
                    key={item.label}
                    bg="whiteAlpha.50"
                    borderRadius="lg"
                    px={3}
                    py={2}
                    border="1px solid"
                    borderColor="whiteAlpha.50"
                    textAlign="center"
                  >
                    <Text
                      fontSize="xl"
                      fontWeight="extrabold"
                      color={item.highlight ? 'yellow.300' : 'white'}
                      lineHeight="1.1"
                    >
                      {item.value}
                    </Text>
                    <Text fontSize="9px" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wider" fontWeight="bold">
                      {item.label}
                    </Text>
                  </Box>
                ))}

                <Button
                  size="sm"
                  variant="ghost"
                  color="blue.300"
                  fontSize="xs"
                  fontWeight="semibold"
                  _hover={{ bg: 'whiteAlpha.100' }}
                  onClick={handleFullDetailsClick}
                  mt={1}
                >
                  Ver completo →
                </Button>
              </Flex>}
            </Flex>

            {/* ═══════════ EDIT PANEL ═══════════ */}
            {isEditing && (
              <Box
                position="relative"
                px={{ base: 4, md: 6 }}
                pb={5}
                pt={1}
              >
                <Box
                  h="1px"
                  bgGradient="linear(to-r, transparent, blue.400, cyan.300, blue.400, transparent)"
                  opacity={0.3}
                  mb={4}
                />

                <Flex
                  direction={{ base: 'column', md: 'row' }}
                  gap={6}
                >
                  {/* Photo crop */}
                  <Box flex={1}>
                    <Text
                      fontSize="10px"
                      fontWeight="extrabold"
                      textTransform="uppercase"
                      letterSpacing="widest"
                      color="blue.200"
                      mb={3}
                    >
                      Alterar foto
                    </Text>
                    <ImageCropEditor
                      key={isEditing ? 'editing' : 'closed'}
                      onCropComplete={handleEditCrop}
                    />
                  </Box>

                  {/* Secondary positions */}
                  <Box flex={1}>
                    <Text
                      fontSize="10px"
                      fontWeight="extrabold"
                      textTransform="uppercase"
                      letterSpacing="widest"
                      color="blue.200"
                      mb={3}
                    >
                      Posições secundárias
                    </Text>
                    <Stack spacing={2}>
                      {availableSecondaryOptions.map(option => {
                        const pos = option.value as VolleyballPosition
                        return (
                          <Checkbox
                            key={pos}
                            isChecked={editSecondaryPositions.includes(pos)}
                            onChange={() => toggleEditSecondary(pos)}
                            colorScheme="blue"
                            borderColor="whiteAlpha.300"
                            size="sm"
                          >
                            <Text fontSize="sm" color="whiteAlpha.700">
                              {option.label}
                            </Text>
                          </Checkbox>
                        )
                      })}
                    </Stack>
                  </Box>
                </Flex>

                {/* Save / Cancel */}
                <Flex gap={3} mt={5}>
                  <Button
                    size="sm"
                    bg="blue.500"
                    color="white"
                    borderRadius="lg"
                    fontWeight="700"
                    fontSize="xs"
                    px={6}
                    isLoading={isSaving}
                    loadingText="Salvando..."
                    _hover={{ bg: 'blue.400', boxShadow: '0 4px 20px rgba(66,153,225,0.3)' }}
                    onClick={handleSaveEdit}
                  >
                    Salvar alterações
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    color="whiteAlpha.500"
                    borderRadius="lg"
                    fontWeight="600"
                    fontSize="xs"
                    _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                    onClick={cancelEditing}
                  >
                    Cancelar
                  </Button>
                </Flex>
              </Box>
            )}

            {/* ═══════════ DISTRIBUTION STRIP (inside hero, setters only) ═══════════ */}
            {distributionData && (() => {
              const dominant = distributionData.items.find(i => i.name === distributionData.dominantName)!
              return (
                <Box
                  position="relative"
                  px={{ base: 4, md: 6 }}
                  pb={5}
                  pt={1}
                >
                  {/* Divider accent */}
                  <Box
                    h="1px"
                    bgGradient="linear(to-r, transparent, orange.400, yellow.300, orange.400, transparent)"
                    opacity={0.3}
                    mb={4}
                  />

                  {/* Header row */}
                  <Flex align="center" justify="space-between" mb={3}>
                    <HStack spacing={2}>
                      <Box
                        w="3px"
                        h="14px"
                        borderRadius="full"
                        bgGradient="linear(to-b, yellow.300, orange.500)"
                      />
                      <Text
                        fontSize="10px"
                        fontWeight="extrabold"
                        textTransform="uppercase"
                        letterSpacing="widest"
                        color="orange.200"
                      >
                        Distribuição
                      </Text>
                      <Text fontSize="10px" color="whiteAlpha.300">
                        {distributionData.total} levantamentos
                      </Text>
                    </HStack>

                    <HStack spacing={2}>
                      <Text fontSize="9px" color="whiteAlpha.400" fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
                        Alvo preferencial
                      </Text>
                      <Badge
                        bg={`${dominant.color}20`}
                        color={dominant.color}
                        fontSize="10px"
                        px={2}
                        py={0.5}
                        borderRadius="md"
                        fontWeight="extrabold"
                        border="1px solid"
                        borderColor={`${dominant.color}40`}
                      >
                        {dominant.name} {dominant.pct}%
                      </Badge>
                    </HStack>
                  </Flex>

                  {/* Segmented bar */}
                  <Flex
                    h="28px"
                    borderRadius="lg"
                    overflow="hidden"
                    bg="whiteAlpha.50"
                    border="1px solid"
                    borderColor="whiteAlpha.50"
                    mb={3}
                  >
                    {distributionData.items.map((item, idx) => (
                      item.value > 0 && (
                        <Flex
                          key={item.name}
                          w={`${item.pct}%`}
                          bg={item.color}
                          align="center"
                          justify="center"
                          transition="all 0.3s ease"
                          _hover={{ filter: 'brightness(1.2)' }}
                          borderRight={idx < distributionData.items.length - 1 ? '1px solid' : 'none'}
                          borderRightColor="rgba(0,0,0,0.2)"
                        >
                          {item.pct >= 15 && (
                            <Text
                              fontSize="10px"
                              fontWeight="extrabold"
                              color="white"
                              textShadow="0 1px 3px rgba(0,0,0,0.5)"
                              letterSpacing="wide"
                            >
                              {item.pct}%
                            </Text>
                          )}
                        </Flex>
                      )
                    ))}
                  </Flex>

                  {/* Compact position stats row */}
                  <SimpleGrid columns={4} spacing={2}>
                    {distributionData.items.map((item) => {
                      const isDominant = item.name === distributionData.dominantName
                      return (
                        <Flex
                          key={item.name}
                          direction="column"
                          align="center"
                          bg={isDominant ? `${item.color}10` : 'whiteAlpha.30'}
                          borderRadius="lg"
                          py={2}
                          px={1}
                          border="1px solid"
                          borderColor={isDominant ? `${item.color}40` : 'whiteAlpha.50'}
                          boxShadow={isDominant ? `0 0 12px ${item.glow}` : 'none'}
                          transition="all 0.2s"
                          _hover={{ borderColor: `${item.color}60` }}
                        >
                          <Text
                            fontSize="xs"
                            fontWeight="extrabold"
                            color={item.color}
                            textTransform="uppercase"
                            letterSpacing="wider"
                            mb={0.5}
                          >
                            {item.shortName}
                          </Text>
                          <HStack spacing={0.5} align="baseline">
                            <Text fontSize="xl" fontWeight="extrabold" color="white" lineHeight="1">
                              {item.pct}
                            </Text>
                            <Text fontSize="xs" fontWeight="bold" color="whiteAlpha.400">%</Text>
                          </HStack>
                          <Text fontSize="9px" color="whiteAlpha.400" mt={0.5}>
                            {item.value} bola{item.value !== 1 ? 's' : ''}
                          </Text>
                        </Flex>
                      )
                    })}
                  </SimpleGrid>
                </Box>
              )
            })()}
          </Box>

          {/* ═══════════ FUNDAMENTALS SECTION ═══════════ */}
          {stats && <Box px={{ base: 4, md: 6 }} py={6} bg="gray.900">
            <HStack spacing={2} mb={5}>
              <Box w="3px" h="16px" borderRadius="full" bg="blue.400" />
              <Text
                fontSize="xs"
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing="widest"
                color="whiteAlpha.500"
              >
                Fundamentos — {stats.matchesPlayed} {stats.matchesPlayed === 1 ? 'partida' : 'partidas'}
              </Text>
            </HStack>

            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={3}>
              {fundamentals.map((fund) => {
                const config = FUNDAMENTAL_CONFIG[fund.name]
                return (
                  <Box
                    key={fund.name}
                    bg={cardBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={cardBorder}
                    overflow="hidden"
                    transition="all 0.2s"
                    _hover={{
                      borderColor: 'whiteAlpha.200',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    {/* Color accent top */}
                    <Box h="2px" bgGradient={config.gradient} />

                    <Box p={4}>
                      {/* Header row */}
                      <Flex justify="space-between" align="center" mb={3}>
                        <HStack spacing={2}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={config.icon} alt="" width={22} height={22} style={{ display: 'block', objectFit: 'contain' }} />
                          <Text fontSize="sm" fontWeight="bold" color={textColor}>
                            {fund.name}
                          </Text>
                        </HStack>
                        <Box
                          bg="whiteAlpha.100"
                          px={2}
                          py={0.5}
                          borderRadius="md"
                        >
                          <Text fontSize="xs" fontWeight="extrabold" color={getRatingColor(fund.rating)}>
                            {fund.rating.toFixed(1)}
                          </Text>
                        </Box>
                      </Flex>

                      {/* Main metric */}
                      <Flex align="baseline" gap={2} mb={3}>
                        <Text fontSize="3xl" fontWeight="extrabold" color="white" lineHeight="1">
                          {fund.mainValue}
                        </Text>
                        <Text fontSize="xs" color="whiteAlpha.400" fontWeight="medium">
                          {fund.mainLabel}
                        </Text>
                      </Flex>

                      {/* Rating bar */}
                      <Box mb={3}>
                        <Box h="4px" bg="whiteAlpha.100" borderRadius="full" overflow="hidden">
                          <Box
                            h="full"
                            w={`${(fund.rating / 10) * 100}%`}
                            bg={getRatingColor(fund.rating)}
                            borderRadius="full"
                            transition="width 0.8s ease-out"
                          />
                        </Box>
                      </Box>

                      {/* Detail chips */}
                      <HStack spacing={2}>
                        {fund.details.map((d) => (
                          <Flex
                            key={d.label}
                            direction="column"
                            align="center"
                            flex={1}
                            bg="whiteAlpha.50"
                            borderRadius="md"
                            py={1.5}
                            px={1}
                          >
                            <Text fontSize="md" fontWeight="extrabold" color={d.color} lineHeight="1">
                              {d.value}
                            </Text>
                            <Text fontSize="8px" color="whiteAlpha.400" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" mt={0.5}>
                              {d.label}
                            </Text>
                          </Flex>
                        ))}
                      </HStack>
                    </Box>
                  </Box>
                )
              })}
            </SimpleGrid>
          </Box>}

        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
