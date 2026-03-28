import { Box, Flex, Text, Grid, useColorModeValue } from '@chakra-ui/react'
import { Player, VolleyballPosition } from '@/types/player'
import { PlayerCard } from './PlayerCard'

interface FormationViewProps {
  players: Player[]
}

const POSITIONS_ON_COURT: {
  id: string
  label: string
  position: VolleyballPosition
  row: number
  col: number
}[] = [
  { id: 'p1', label: 'Ponteiro 1', position: 'ponteiro', row: 1, col: 1 },
  { id: 'c1', label: 'Central 1', position: 'central', row: 1, col: 2 },
  { id: 'o1', label: 'Oposto', position: 'oposto', row: 1, col: 3 },
  { id: 'p2', label: 'Ponteiro 2', position: 'ponteiro', row: 2, col: 3 },
  { id: 'c2', label: 'Central 2', position: 'central', row: 2, col: 2 },
  { id: 'l1', label: 'Levantador', position: 'levantador', row: 2, col: 1 },
]

export function FormationView({ players }: FormationViewProps) {
  const courtColor = useColorModeValue('orange.100', 'orange.300')
  const lineColor = useColorModeValue('white', 'white')

  // Helper to find best player for a slot (simplified logic: just take first available of that position)
  const getPlayerForSlot = (pos: VolleyballPosition, index: number) => {
    const available = players.filter((p) => p.position === pos)
    return available[index % available.length] // Cycle through if not enough
  }

  return (
    <Box
      w="full"
      maxW="1000px"
      mx="auto"
      bg="blue.500"
      p={8}
      borderRadius="xl"
      position="relative"
      overflow="hidden"
    >
      {/* Court Lines */}
      <Box
        position="absolute"
        inset={4}
        border="4px solid"
        borderColor={lineColor}
        bg={courtColor}
        opacity={0.9}
      >
        {/* Center Line */}
        <Box
          position="absolute"
          top="50%"
          left={0}
          right={0}
          h="4px"
          bg={lineColor}
          transform="translateY(-50%)"
        />
        {/* Attack Lines */}
        <Box
          position="absolute"
          top="33%"
          left={0}
          right={0}
          h="2px"
          bg={lineColor}
        />
        <Box
          position="absolute"
          bottom="33%"
          left={0}
          right={0}
          h="2px"
          bg={lineColor}
        />
      </Box>

      {/* Players Grid */}
      <Grid
        templateColumns="repeat(3, 1fr)"
        templateRows="repeat(2, 1fr)"
        gap={8}
        position="relative"
        zIndex={1}
        h="800px"
        alignItems="center"
        justifyItems="center"
      >
        {POSITIONS_ON_COURT.map((slot, index) => {
            // Logic to distribute players:
            // P1 -> 1st ponteiro
            // P2 -> 2nd ponteiro
            // etc.
            let playerIndex = 0;
            if (slot.id === 'p2') playerIndex = 1;
            if (slot.id === 'c2') playerIndex = 1;

            const player = getPlayerForSlot(slot.position, playerIndex);

            return (
                <Flex
                    key={slot.id}
                    direction="column"
                    align="center"
                    gridRow={slot.row}
                    gridColumn={slot.col}
                    transform="scale(0.85)" // Scale down slightly to fit
                >
                    <Box mb={2} bg="blackAlpha.600" px={3} py={1} borderRadius="full">
                        <Text color="white" fontWeight="bold" fontSize="sm">
                            {slot.label}
                        </Text>
                    </Box>
                    {player ? (
                         <PlayerCard player={player} />
                    ) : (
                        <Flex
                            w="220px"
                            h="320px"
                            border="2px dashed"
                            borderColor="whiteAlpha.500"
                            borderRadius="lg"
                            align="center"
                            justify="center"
                            bg="blackAlpha.200"
                        >
                            <Text color="whiteAlpha.700">Vazio</Text>
                        </Flex>
                    )}
                </Flex>
            )
        })}
      </Grid>
    </Box>
  )
}
