// app/components/court/ActionPanel.tsx
'use client'

import { useState } from 'react'
import { Box, Flex, Text, Button, Grid, Tooltip, Popover, PopoverTrigger, PopoverContent, PopoverBody, PopoverArrow } from '@chakra-ui/react'
import { RallyState, ServeType } from '@/types/scout'
import { subActionTooltips, fundamentoGuides } from '@/lib/scoutGuide'
import { getSubActionsForUI, ACTION_NAMES } from '@/lib/actionLabels'

export interface ActionPanelProps {
  selectedPlayer: string
  playerName?: string
  onActionComplete: (action: string, subAction: string, zone?: number, serveType?: ServeType) => void
  onClose: () => void
  rallyState: RallyState
  // Controlled fundamento selection (driven by keyboard hook)
  selectedAction: string
  onSelectedActionChange: (action: string) => void
  // Visual feedback for keyboard shortcuts
  highlightedKey: string | null
  // Dicas de scout para iniciantes
  showTips?: boolean
  // Fundamentos habilitados (filtra chips e inferência)
  enabledFundamentos?: string[]
  // Tipo de saque selecionado (persiste entre ações)
  serveType: ServeType
  onServeTypeChange: (type: ServeType) => void
  // Estado idle — nenhum jogador selecionado
  isIdle?: boolean
  // Estado zone-pending — aguardando clique de zona na quadra
  isPendingZone?: boolean
  pendingZoneAction?: string
  // Ações rápidas no footer
  onUndo?: () => void
  canUndo?: boolean
}

/** Tipos de saque disponíveis */
const SERVE_TYPES: { id: ServeType; label: string; shortLabel: string }[] = [
  { id: 'jump', label: 'Viagem', shortLabel: 'Viagem' },
  { id: 'float', label: 'Flutuante', shortLabel: 'Flutuante' },
  { id: 'directed', label: 'Direcionado', shortLabel: 'Direcionado' },
]

/** Destinos do levantamento — mapeiam diretamente para zonas da quadra */
const SET_DESTINATIONS = [
  { id: 'outside', label: 'Ponta', zone: 4, color: 'orange.500', hoverColor: 'orange.600' },
  { id: 'opposite', label: 'Saída', zone: 2, color: 'purple.500', hoverColor: 'purple.600' },
  { id: 'pipe', label: 'Pipe', zone: 6, color: 'teal.500', hoverColor: 'teal.600' },
  { id: 'middle_quick', label: 'Cabeça', zone: 3, color: 'green.500', hoverColor: 'green.600' },
  { id: 'middle_behind', label: 'Cabeça atrás', zone: 3, color: 'green.600', hoverColor: 'green.700' },
  { id: 'middle_china', label: 'China', zone: 3, color: 'green.700', hoverColor: 'green.800' },
] as const

interface SubAction {
  id: string
  label: string
  color: string
  hoverColor: string
}

/** Sub-ações geradas a partir do mapeamento centralizado */
export const subActions: Record<string, SubAction[]> = {
  serve: getSubActionsForUI('serve'),
  attack: getSubActionsForUI('attack'),
  block: getSubActionsForUI('block'),
  dig: getSubActionsForUI('dig'),
  set: getSubActionsForUI('set'),
  reception: getSubActionsForUI('reception'),
}

const allFundamentos = [
  { key: 'serve', shortcut: 'S' },
  { key: 'reception', shortcut: 'R' },
  { key: 'attack', shortcut: 'A' },
  { key: 'block', shortcut: 'B' },
  { key: 'dig', shortcut: 'D' },
  { key: 'set', shortcut: 'L' },
] as const

export const actionNames = ACTION_NAMES

const ALL_FUNDAMENTOS_KEYS = ['serve', 'reception', 'attack', 'block', 'dig', 'set']

export function inferFundamento(rallyState: RallyState, enabled?: string[]): string {
  const { servingTeam, currentStep } = rallyState
  const isEnabled = (f: string) => !enabled || enabled.includes(f)

  let inferred = currentStep as string
  if (currentStep === 'serve' && servingTeam === 'home') inferred = 'serve'
  else if (currentStep === 'serve' && servingTeam === 'away') inferred = 'reception'

  if (isEnabled(inferred)) return inferred

  const rallySequence = ['serve', 'reception', 'set', 'attack', 'block', 'dig']
  const currentIdx = rallySequence.indexOf(inferred)
  if (currentIdx >= 0) {
    for (let i = currentIdx + 1; i < rallySequence.length; i++) {
      if (isEnabled(rallySequence[i])) return rallySequence[i]
    }
  }

  return (enabled || ALL_FUNDAMENTOS_KEYS).find((f) => ALL_FUNDAMENTOS_KEYS.includes(f)) || 'attack'
}

/** Footer sempre visível com ações rápidas */
function ActionPanelFooter({
  onUndo,
  canUndo,
}: {
  onUndo?: () => void
  canUndo?: boolean
}) {
  return (
    <Box p={3} borderTopWidth="1px" borderTopColor="gray.700" flexShrink={0}>
      <Button
        w="full"
        size="sm"
        variant="outline"
        color="yellow.400"
        borderColor="yellow.800"
        bg="yellow.900/20"
        _hover={{ bg: 'yellow.900/40', borderColor: 'yellow.600' }}
        onClick={onUndo}
        isDisabled={!canUndo || !onUndo}
        fontSize="xs"
        fontWeight="semibold"
        mb={2}
      >
        Desfazer última ação
      </Button>
      <Text color="gray.600" fontSize="2xs" textAlign="center">
        U = desfazer · Espaço = erro adv (quadra) · Esc = fechar
      </Text>
    </Box>
  )
}

export default function ActionPanel({
  selectedPlayer,
  playerName,
  onActionComplete,
  onClose,
  rallyState,
  selectedAction,
  onSelectedActionChange,
  highlightedKey,
  showTips = true,
  enabledFundamentos,
  serveType,
  onServeTypeChange,
  isIdle = false,
  isPendingZone = false,
  pendingZoneAction,
  onUndo,
  canUndo,
}: ActionPanelProps) {
  const [setQuality, setSetQuality] = useState<string | null>(null)

  const handleSubActionSelect = (subAction: string) => {
    if (selectedAction === 'set' && subAction !== 'error') {
      setSetQuality(subAction)
      return
    }
    if (selectedAction === 'serve') {
      onActionComplete(selectedAction, subAction, undefined, serveType)
      return
    }
    onActionComplete(selectedAction, subAction)
  }

  const handleSetDestinationSelect = (zone: number) => {
    if (setQuality) {
      onActionComplete('set', setQuality, zone)
      setSetQuality(null)
    }
  }

  const handleBackToQuality = () => {
    setSetQuality(null)
  }

  const handleFundamentoChange = (key: string) => {
    setSetQuality(null)
    onSelectedActionChange(key)
  }

  const currentSubActions = subActions[selectedAction] || []
  const isSetDestinationStep = selectedAction === 'set' && setQuality !== null

  // Estado idle: nenhum jogador selecionado
  if (isIdle) {
    return (
      <Box display="flex" flexDirection="column" h="100%" data-testid="action-panel">
        <Flex flex="1" direction="column" align="center" justify="center" p={5} gap={3}>
          <Flex gap={2} mb={1}>
            <Box w={3} h={3} borderRadius="full" bg="blue.700" />
            <Box w={3} h={3} borderRadius="full" bg="blue.600" />
            <Box w={3} h={3} borderRadius="full" bg="blue.700" />
          </Flex>
          <Text color="gray.300" fontWeight="semibold" textAlign="center" fontSize="sm">
            Selecione um jogador
          </Text>
          <Text color="gray.600" fontSize="xs" textAlign="center" lineHeight="1.6">
            Clique num jogador na quadra
            <br />
            ou use as teclas{' '}
            <Text as="span" fontFamily="mono" color="gray.500">1–6</Text>
            {' '}por zona
          </Text>
        </Flex>
        <ActionPanelFooter onUndo={onUndo} canUndo={canUndo} />
      </Box>
    )
  }

  // Estado zone-pending: aguardando clique de zona na quadra
  if (isPendingZone) {
    return (
      <Box display="flex" flexDirection="column" h="100%" data-testid="action-panel">
        <Flex flex="1" direction="column" align="center" justify="center" p={5} gap={3}>
          <Text fontSize="2xl" userSelect="none">→</Text>
          <Text color="orange.200" fontWeight="bold" textAlign="center" fontSize="sm">
            {pendingZoneAction || 'Ação'}
          </Text>
          <Text color="gray.400" fontSize="xs" textAlign="center" lineHeight="1.6">
            Clique na zona da quadra
            <br />onde a bola foi direcionada
          </Text>
          <Button
            size="xs"
            variant="ghost"
            color="gray.500"
            _hover={{ color: 'gray.300' }}
            onClick={onClose}
            mt={2}
          >
            Cancelar (Esc)
          </Button>
        </Flex>
        <ActionPanelFooter onUndo={onUndo} canUndo={canUndo} />
      </Box>
    )
  }

  // Estado ativo: jogador selecionado
  return (
    <Box display="flex" flexDirection="column" h="100%" data-testid="action-panel">
      {/* Header — info do jogador */}
      <Flex
        justifyContent="space-between"
        alignItems="center"
        px={4}
        py={3}
        borderBottomWidth="1px"
        borderBottomColor="gray.700"
        flexShrink={0}
      >
        <Flex alignItems="center" gap={3}>
          <Box
            w={10}
            h={10}
            bg="blue.500/20"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="blue.300"
            fontWeight="black"
            fontSize="lg"
            flexShrink={0}
          >
            #{selectedPlayer}
          </Box>
          <Box minW={0}>
            <Text color="white" fontWeight="bold" fontSize="md" noOfLines={1}>
              {playerName || `Jogador #${selectedPlayer}`}
            </Text>
            <Text color="gray.500" fontSize="xs">
              {rallyState.servingTeam === 'home' ? 'Sacando' : 'Recebendo'}
            </Text>
          </Box>
        </Flex>
        <Button
          onClick={onClose}
          bg="gray.700"
          _hover={{ bg: 'gray.600' }}
          color="gray.400"
          w={8}
          h={8}
          minW="auto"
          borderRadius="md"
          display="flex"
          alignItems="center"
          justifyContent="center"
          transition="all 0.15s"
          fontSize="sm"
          p={0}
          flexShrink={0}
        >
          ✕
        </Button>
      </Flex>

      {/* Body — scrollável */}
      <Box flex="1" overflowY="auto" p={4}>
        {/* Chips de fundamento */}
        <Flex gap={1} mb={5} flexWrap="wrap" alignItems="center">
          {allFundamentos.filter((fund) => !enabledFundamentos || enabledFundamentos.includes(fund.key)).map((fund) => {
            const isSelected = selectedAction === fund.key
            const isHighlighted = highlightedKey === fund.shortcut.toLowerCase()
            return (
              <Button
                key={fund.key}
                data-testid={`fund-chip-${fund.key}`}
                onClick={() => handleFundamentoChange(fund.key)}
                size="sm"
                px={3}
                py={1.5}
                h="auto"
                borderRadius="full"
                bg={isSelected ? 'blue.600' : isHighlighted ? 'blue.500' : 'gray.700'}
                color={isSelected || isHighlighted ? 'white' : 'gray.300'}
                borderWidth="1px"
                borderColor={isSelected ? 'blue.400' : 'gray.600'}
                _hover={{ bg: isSelected ? 'blue.700' : 'gray.600' }}
                fontWeight={isSelected ? 'bold' : 'normal'}
                fontSize="sm"
                transition="all 0.15s"
                transform={isHighlighted ? 'scale(1.1)' : undefined}
              >
                <Text as="span" color={isSelected ? 'blue.200' : 'gray.500'} fontSize="xs" mr={1} fontFamily="mono">
                  {fund.shortcut}
                </Text>
                {actionNames[fund.key]}
              </Button>
            )
          })}
          {/* Ajuda por fundamento */}
          {showTips && fundamentoGuides[selectedAction] && (
            <Popover trigger="click" placement="top">
              <PopoverTrigger>
                <Button
                  size="xs"
                  w={6}
                  h={6}
                  minW="auto"
                  p={0}
                  borderRadius="full"
                  bg="gray.600"
                  color="gray.300"
                  _hover={{ bg: 'blue.600', color: 'white' }}
                  fontSize="xs"
                  fontWeight="bold"
                  ml={1}
                >
                  ?
                </Button>
              </PopoverTrigger>
              <PopoverContent bg="gray.900" borderColor="blue.500" maxW="320px">
                <PopoverArrow bg="gray.900" />
                <PopoverBody p={4}>
                  <Text color="blue.300" fontWeight="bold" fontSize="sm" mb={1}>
                    {fundamentoGuides[selectedAction].title}
                  </Text>
                  <Text color="gray.300" fontSize="xs" mb={2}>
                    {fundamentoGuides[selectedAction].description}
                  </Text>
                  <Text color="gray.400" fontSize="xs" fontStyle="italic">
                    {fundamentoGuides[selectedAction].criteria}
                  </Text>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          )}
        </Flex>

        {/* Botões de resultado / destino do set */}
        <Box>
          {isSetDestinationStep ? (
            <>
              <Flex alignItems="center" gap={2} mb={3}>
                <Button
                  onClick={handleBackToQuality}
                  size="xs"
                  bg="gray.700"
                  color="gray.300"
                  _hover={{ bg: 'gray.600' }}
                  borderRadius="md"
                  px={2}
                  minW="auto"
                >
                  ←
                </Button>
                <Text color="gray.400" fontSize="xs" fontWeight="medium">
                  Destino do levantamento:
                </Text>
              </Flex>
              <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                {SET_DESTINATIONS.map((dest, index) => {
                  const keyNum = (index + 1).toString()
                  const isHighlighted = highlightedKey === keyNum
                  return (
                    <Button
                      key={dest.id}
                      data-testid={`set-dest-${dest.id}`}
                      onClick={() => handleSetDestinationSelect(dest.zone)}
                      bg={dest.color}
                      color="white"
                      _hover={{ bg: dest.hoverColor, transform: 'scale(1.03)' }}
                      _active={{ transform: 'scale(0.97)' }}
                      py={6}
                      px={3}
                      h="auto"
                      borderRadius="xl"
                      fontWeight="bold"
                      fontSize="md"
                      transition="all 0.15s"
                      shadow={isHighlighted ? 'lg' : 'md'}
                      transform={isHighlighted ? 'scale(1.08)' : undefined}
                      position="relative"
                    >
                      <Box
                        position="absolute"
                        top={1}
                        right={1.5}
                        bg="blackAlpha.400"
                        color="whiteAlpha.800"
                        fontSize="xs"
                        fontFamily="mono"
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                        lineHeight="1"
                      >
                        {index + 1}
                      </Box>
                      {dest.label}
                    </Button>
                  )
                })}
              </Grid>
            </>
          ) : (
            <>
              {/* Seletor de tipo de saque */}
              {selectedAction === 'serve' && (
                <Box mb={4}>
                  <Text color="gray.400" fontSize="xs" mb={2} fontWeight="medium">
                    Tipo de saque:
                  </Text>
                  <Flex gap={2}>
                    {SERVE_TYPES.map((st) => {
                      const isActive = serveType === st.id
                      return (
                        <Button
                          key={st.id}
                          size="sm"
                          px={3}
                          py={1.5}
                          h="auto"
                          borderRadius="full"
                          bg={isActive ? 'blue.600' : 'gray.700'}
                          color={isActive ? 'white' : 'gray.300'}
                          borderWidth="1px"
                          borderColor={isActive ? 'blue.400' : 'gray.600'}
                          _hover={{ bg: isActive ? 'blue.700' : 'gray.600' }}
                          fontWeight={isActive ? 'bold' : 'normal'}
                          fontSize="sm"
                          transition="all 0.15s"
                          onClick={() => onServeTypeChange(st.id)}
                        >
                          {st.label}
                        </Button>
                      )
                    })}
                  </Flex>
                </Box>
              )}
              {/* Botões de resultado */}
              <Text color="gray.400" fontSize="xs" mb={3} fontWeight="medium">
                Resultado do {actionNames[selectedAction]}:
              </Text>
              <Grid
                templateColumns={
                  currentSubActions.length <= 3
                    ? 'repeat(3, 1fr)'
                    : currentSubActions.length <= 4
                    ? 'repeat(2, 1fr)'
                    : 'repeat(3, 1fr)'
                }
                gap={3}
              >
                {currentSubActions.map((sub, index) => {
                  const keyNum = (index + 1).toString()
                  const isHighlighted = highlightedKey === keyNum
                  const tooltipText = showTips ? subActionTooltips[selectedAction]?.[sub.id] : undefined
                  const btn = (
                    <Button
                      key={sub.id}
                      data-testid={`result-btn-${sub.id}`}
                      onClick={() => handleSubActionSelect(sub.id)}
                      bg={sub.color}
                      color="white"
                      _hover={{ bg: sub.hoverColor, transform: 'scale(1.03)' }}
                      _active={{ transform: 'scale(0.97)' }}
                      py={6}
                      px={3}
                      h="auto"
                      borderRadius="xl"
                      fontWeight="bold"
                      fontSize="md"
                      transition="all 0.15s"
                      shadow={isHighlighted ? 'lg' : 'md'}
                      whiteSpace="normal"
                      lineHeight="1.2"
                      transform={isHighlighted ? 'scale(1.08)' : undefined}
                      opacity={isHighlighted ? 0.9 : 1}
                      position="relative"
                    >
                      <Box
                        position="absolute"
                        top={1}
                        right={1.5}
                        bg="blackAlpha.400"
                        color="whiteAlpha.800"
                        fontSize="xs"
                        fontFamily="mono"
                        px={1.5}
                        py={0.5}
                        borderRadius="md"
                        lineHeight="1"
                      >
                        {index + 1}
                      </Box>
                      {sub.label}
                    </Button>
                  )
                  if (tooltipText) {
                    return (
                      <Tooltip
                        key={sub.id}
                        label={tooltipText}
                        placement="top"
                        bg="gray.900"
                        color="gray.200"
                        fontSize="xs"
                        px={3}
                        py={2}
                        borderRadius="lg"
                        maxW="240px"
                        openDelay={500}
                        hasArrow
                      >
                        {btn}
                      </Tooltip>
                    )
                  }
                  return btn
                })}
              </Grid>
            </>
          )}
        </Box>
      </Box>

      {/* Footer */}
      <ActionPanelFooter onUndo={onUndo} canUndo={canUndo} />
    </Box>
  )
}
