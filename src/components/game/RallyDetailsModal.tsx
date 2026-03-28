import { useState } from 'react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  Text,
  Flex,
  Badge,
  VStack,
  Divider,
  Button,
  IconButton,
  Wrap,
  WrapItem,
} from '@chakra-ui/react'
import { PointRecord } from '@/types/scout'
import { getActionName, getActionLabel, getActionChakraColor, getSubActionsForUI } from '@/lib/actionLabels'

interface RallyDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  pointRecord: PointRecord | null
  homeTeamName: string
  opponentName: string
  onDeletePoint?: (pointId: string) => void
  onEditAction?: (pointId: string, actionIndex: number, newSubAction: string) => void
}

export default function RallyDetailsModal({
  isOpen,
  onClose,
  pointRecord,
  homeTeamName,
  opponentName,
  onDeletePoint,
  onEditAction,
}: RallyDetailsModalProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!pointRecord) return null

  const handleClose = () => {
    setEditingIndex(null)
    setConfirmDelete(false)
    onClose()
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDeletePoint?.(pointRecord.id)
    handleClose()
  }

  const handleEditSubAction = (actionIndex: number, newSubAction: string) => {
    onEditAction?.(pointRecord.id, actionIndex, newSubAction)
    setEditingIndex(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size="lg">
      <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
      <ModalContent bg="gray.900" borderColor="gray.700" borderWidth="1px">
        <ModalHeader color="white">
          Detalhes do Rally - {pointRecord.score.home} x {pointRecord.score.away}
        </ModalHeader>
        <ModalCloseButton color="white" />
        <ModalBody pb={4}>
          <Box mb={4} p={3} bg="gray.800" borderRadius="md">
            <Flex justify="space-between" align="center" mb={2}>
              <Text color="gray.400" fontSize="sm">Vencedor do ponto:</Text>
              <Badge colorScheme={pointRecord.winner === 'home' ? 'green' : 'red'}>
                {pointRecord.winner === 'home' ? homeTeamName : opponentName}
              </Badge>
            </Flex>
            <Flex justify="space-between" align="center">
              <Text color="gray.400" fontSize="sm">Duração do rally:</Text>
              <Text color="white" fontWeight="bold">{pointRecord.actions.length} ações</Text>
            </Flex>
          </Box>

          <Text color="blue.300" fontSize="sm" fontWeight="bold" mb={3} textTransform="uppercase">
            Sequência de Ações
          </Text>

          <VStack align="stretch" spacing={0} divider={<Divider borderColor="gray.800" />}>
            {pointRecord.actions.map((action, index) => {
              const chakraColor = getActionChakraColor(action.action, action.subAction)
              const colorScheme = chakraColor.split('.')[0]
              const isEditing = editingIndex === index
              const isSubstitution = action.action === 'substitution'

              return (
                <Box key={index}>
                  <Flex py={2} align="center" justify="space-between">
                    <Flex align="center" gap={3}>
                      <Badge
                        variant="outline"
                        colorScheme="gray"
                        fontSize="xs"
                        w="24px"
                        textAlign="center"
                      >
                        {index + 1}
                      </Badge>
                      <Box>
                        <Text color="white" fontWeight="semibold">
                          {getActionName(action.action)}
                        </Text>
                        <Text color="gray.500" fontSize="xs">
                          {action.player ? `Jogador #${action.player}` : 'Time'}
                        </Text>
                      </Box>
                    </Flex>
                    <Flex align="center" gap={2}>
                      <Badge colorScheme={colorScheme}>
                        {getActionLabel(action.action, action.subAction)}
                      </Badge>
                      {onEditAction && !isSubstitution && (
                        <IconButton
                          aria-label="Editar ação"
                          icon={<Text fontSize="xs">✏️</Text>}
                          size="xs"
                          variant="ghost"
                          color="gray.400"
                          _hover={{ color: 'blue.300', bg: 'gray.700' }}
                          onClick={() => setEditingIndex(isEditing ? null : index)}
                        />
                      )}
                    </Flex>
                  </Flex>

                  {/* Seletor de sub-ações inline */}
                  {isEditing && (
                    <Box py={2} px={2} mb={2} bg="gray.800" borderRadius="md" borderWidth="1px" borderColor="blue.500/30">
                      <Text color="gray.400" fontSize="xs" mb={2}>Alterar resultado:</Text>
                      <Wrap spacing={1}>
                        {getSubActionsForUI(action.action).map((sub) => (
                          <WrapItem key={sub.id}>
                            <Button
                              size="xs"
                              bg={sub.id === action.subAction ? sub.color : 'gray.700'}
                              color="white"
                              _hover={{ bg: sub.hoverColor }}
                              opacity={sub.id === action.subAction ? 1 : 0.7}
                              fontWeight={sub.id === action.subAction ? 'bold' : 'normal'}
                              onClick={() => {
                                if (sub.id !== action.subAction) {
                                  handleEditSubAction(index, sub.id)
                                } else {
                                  setEditingIndex(null)
                                }
                              }}
                            >
                              {sub.label}
                            </Button>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  )}
                </Box>
              )
            })}
          </VStack>
        </ModalBody>

        {onDeletePoint && (
          <ModalFooter borderTopWidth="1px" borderColor="gray.800">
            <Button
              size="sm"
              colorScheme={confirmDelete ? 'red' : 'gray'}
              variant={confirmDelete ? 'solid' : 'outline'}
              onClick={handleDelete}
              onMouseLeave={() => setConfirmDelete(false)}
            >
              {confirmDelete ? 'Confirmar exclusão?' : 'Excluir ponto'}
            </Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  )
}
