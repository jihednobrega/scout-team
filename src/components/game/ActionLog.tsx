import { Box, Text, Flex, Badge } from '@chakra-ui/react'
import { ScoutAction } from '@/types/scout'
import { getActionName, getActionLabel, getActionChakraColor } from '@/lib/actionLabels'

interface ActionLogProps {
  actions: ScoutAction[]
  countOnly?: boolean
}

export default function ActionLog({ actions, countOnly = false }: ActionLogProps) {
  if (countOnly) {
    return (
      <Box>
        <Text
          color="blue.300"
          fontSize="xs"
          textTransform="uppercase"
          letterSpacing="0.08em"
          mb={1}
        >
          Ações
        </Text>
        <Text color="white" fontSize="lg" fontWeight="bold">
          {actions.length}
        </Text>
      </Box>
    )
  }

  // Versão completa (lista) pode ser implementada depois
  return (
    <Box maxH="200px" overflowY="auto">
      {actions.slice().reverse().map((action) => {
        const chakraColor = getActionChakraColor(action.action, action.subAction)
        const colorScheme = chakraColor.split('.')[0] // 'green', 'blue', etc.
        return (
          <Flex key={action.id} justify="space-between" p={2} borderBottomWidth="1px" borderColor="gray.700">
            <Text color="white" fontSize="sm">{getActionName(action.action)}</Text>
            <Badge colorScheme={colorScheme}>
              {getActionLabel(action.action, action.subAction)}
            </Badge>
          </Flex>
        )
      })}
    </Box>
  )
}
