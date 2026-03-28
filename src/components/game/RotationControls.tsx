import { Box, Text, Flex, IconButton, Icon } from '@chakra-ui/react'

interface RotationControlsProps {
  rotation: number
  onNext?: () => void
  onPrevious?: () => void
  canEdit?: boolean
}

export default function RotationControls({
  rotation,
  onNext,
  onPrevious,
  canEdit = false,
}: RotationControlsProps) {
  return (
    <Box>
      <Text
        color="blue.300"
        fontSize="xs"
        textTransform="uppercase"
        letterSpacing="0.08em"
        mb={1}
      >
        Rotação
      </Text>
      <Flex align="center" gap={2}>
        {canEdit && onPrevious && (
          <IconButton
            aria-label="Rotação anterior"
            icon={<Icon viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></Icon>}
            size="xs"
            variant="ghost"
            color="blue.300"
            onClick={onPrevious}
          />
        )}
        <Text color="white" fontSize="lg" fontWeight="bold">
          P{rotation}
        </Text>
        {canEdit && onNext && (
          <IconButton
            aria-label="Próxima rotação"
            icon={<Icon viewBox="0 0 24 24"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></Icon>}
            size="xs"
            variant="ghost"
            color="blue.300"
            onClick={onNext}
          />
        )}
      </Flex>
    </Box>
  )
}
