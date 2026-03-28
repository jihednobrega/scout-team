// app/components/court/RallyFlow.tsx
'use client'

import { useState } from 'react'
import { Box, Flex, Text, Button } from '@chakra-ui/react'
import { RallyState } from '@/types/scout'
import { ACTION_NAMES, getActionLabel, getActionChakraColor } from '@/lib/actionLabels'

interface RallyFlowProps {
  rallyState: RallyState
  onRemoveAction?: (actionIndex: number) => void
  onEditAction?: (actionIndex: number) => void
}

const actionCircles: Record<string, { bg: string; label: string }> = {
  serve:          { bg: 'red.600',    label: 'SA' },
  reception:      { bg: 'gray.500',   label: 'RC' },
  set:            { bg: 'blue.500',   label: 'LV' },
  attack:         { bg: 'orange.500', label: 'AT' },
  block:          { bg: 'purple.500', label: 'BL' },
  dig:            { bg: 'green.600',  label: 'DF' },
  opponent_error: { bg: 'red.900',    label: 'OE' },
  substitution:   { bg: 'gray.600',   label: 'SB' },
}

export default function RallyFlow({ rallyState, onRemoveAction, onEditAction }: RallyFlowProps) {
  const { servingTeam, currentStep, rallyActions } = rallyState
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const handleActionClick = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      p={3}
      borderWidth="1px"
      borderColor="blue.500/30"
      shadow="xl"
      h="fit-content"
    >
      {/* Header */}
      <Flex mb={2} alignItems="center" justifyContent="space-between">
        <Text color="white" fontSize="xs" fontWeight="bold">
          Rally Atual
        </Text>
        <Text color="gray.400" fontSize="2xs">
          {servingTeam === 'home' ? '🏠 Sacando' : '🔴 Recebendo'}
        </Text>
      </Flex>

      {/* Ações registradas no rally */}
      {rallyActions.length === 0 ? (
        <Box
          textAlign="center"
          py={3}
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="gray.600"
          borderRadius="md"
        >
          <Text color="gray.500" fontSize="xs">
            Nenhuma ação no rally
          </Text>
          <Text color="gray.600" fontSize="2xs" mt={1}>
            {currentStep === 'serve'
              ? servingTeam === 'home'
                ? 'Selecione o sacador'
                : 'Aguardando recepção'
              : `Próximo: ${ACTION_NAMES[currentStep] || currentStep}`}
          </Text>
        </Box>
      ) : (
        <Flex direction="column" gap={1}>
          {rallyActions.map((action, index) => {
            const isExpanded = expandedIndex === index
            const isSubstitution = action.action === 'substitution'

            return (
              <Box key={action.id || index}>
                <Box
                  bg={isExpanded ? 'gray.600' : 'gray.700'}
                  borderRadius="md"
                  px={2}
                  py={1.5}
                  cursor={isSubstitution ? 'default' : 'pointer'}
                  onClick={() => !isSubstitution && handleActionClick(index)}
                  _hover={isSubstitution ? {} : { bg: 'gray.600' }}
                  transition="all 0.15s"
                  borderLeftWidth="3px"
                  borderLeftColor={getActionChakraColor(action.action, action.subAction)}
                >
                  <Flex alignItems="center" gap={1.5}>
                    <Box
                      w="22px"
                      h="22px"
                      borderRadius="full"
                      bg={actionCircles[action.action]?.bg ?? 'gray.600'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Text color="white" fontSize="2xs" fontWeight="bold" lineHeight="1">
                        {actionCircles[action.action]?.label ?? '?'}
                      </Text>
                    </Box>
                    <Box flex="1" minW={0}>
                      <Text color="white" fontSize="2xs" fontWeight="bold" lineHeight="1.2">
                        #{action.player} {ACTION_NAMES[action.action] || action.action}
                      </Text>
                      <Text color={getActionChakraColor(action.action, action.subAction)} fontSize="2xs" lineHeight="1.2">
                        {getActionLabel(action.action, action.subAction)}
                      </Text>
                    </Box>
                    {!isSubstitution && (
                      <Text color="gray.500" fontSize="2xs">
                        {isExpanded ? '▲' : '•••'}
                      </Text>
                    )}
                  </Flex>
                </Box>

                {/* Mini-menu expandido */}
                {isExpanded && !isSubstitution && (
                  <Flex gap={1} mt={1} ml={2}>
                    {onEditAction && (
                      <Button
                        size="xs"
                        variant="ghost"
                        color="blue.300"
                        fontSize="2xs"
                        h="auto"
                        py={1}
                        px={2}
                        _hover={{ bg: 'blue.500/20' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditAction(index)
                          setExpandedIndex(null)
                        }}
                      >
                        Editar
                      </Button>
                    )}
                    {onRemoveAction && (
                      <Button
                        size="xs"
                        variant="ghost"
                        color="red.300"
                        fontSize="2xs"
                        h="auto"
                        py={1}
                        px={2}
                        _hover={{ bg: 'red.500/20' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveAction(index)
                          setExpandedIndex(null)
                        }}
                      >
                        Remover
                      </Button>
                    )}
                  </Flex>
                )}
              </Box>
            )
          })}
        </Flex>
      )}

      {/* Indicador do próximo passo */}
      {rallyActions.length > 0 && (
        <Box mt={2} pt={2} borderTopWidth="1px" borderTopColor="gray.700">
          <Text color="blue.300" fontSize="2xs" textAlign="center" fontWeight="medium">
            Próximo: {ACTION_NAMES[currentStep] || currentStep}
          </Text>
        </Box>
      )}
    </Box>
  )
}
