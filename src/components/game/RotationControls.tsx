import { Text, Flex, IconButton, Icon } from '@chakra-ui/react'

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
    <Flex
      align="center"
      gap={1}
      px={2.5}
      h="8"
      borderRadius="md"
      bg="gray.800"
      borderWidth="1px"
      borderColor="gray.700"
      flexShrink={0}
    >
      {canEdit && onPrevious && (
        <IconButton
          aria-label="Rotação anterior"
          icon={<Icon viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></Icon>}
          size="xs"
          variant="ghost"
          color="gray.500"
          minW="auto"
          h="auto"
          _hover={{ color: 'white' }}
          onClick={onPrevious}
        />
      )}
      <Flex align="baseline" gap="2px">
        <Text
          fontSize="md"
          color="white"
          fontWeight="bold"
          letterSpacing="0.1em"
          lineHeight="1"
        >
          P
        </Text>
        <Text
          color="white"
          fontSize="md"
          fontWeight="black"
          lineHeight="1"
        >
          {rotation}
        </Text>
      </Flex>
      {canEdit && onNext && (
        <IconButton
          aria-label="Próxima rotação"
          icon={<Icon viewBox="0 0 24 24"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></Icon>}
          size="xs"
          variant="ghost"
          color="gray.500"
          minW="auto"
          h="auto"
          _hover={{ color: 'white' }}
          onClick={onNext}
        />
      )}
    </Flex>
  )
}
