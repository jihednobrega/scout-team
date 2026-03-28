import { Box, Flex, Text, IconButton, Icon } from '@chakra-ui/react'

interface ScoreboardProps {
  homeTeamName: string
  opponentName: string
  score: { home: number; away: number }
  currentSet: number
  totalSets: number | null
  isLive?: boolean
  servingTeam?: 'home' | 'away'
  onViewHistory?: () => void
}

export default function Scoreboard({
  homeTeamName,
  opponentName,
  score,
  currentSet,
  totalSets,
  isLive = false,
  servingTeam,
  onViewHistory,
}: ScoreboardProps) {
  return (
    <Box
      bg="blue.900"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="blue.800"
      shadow="xl"
      px={{ base: 4, md: 5 }}
      py={{ base: 3, md: 4 }}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      minW={{ base: '100%', md: '320px' }}
      maxW={{ base: '100%', md: '340px' }}
      h={{ base: 'auto', md: '120px' }}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Flex align="center" gap={2}>
          {isLive && (
            <Box
              w="7px"
              h="7px"
              borderRadius="full"
              bg="green.400"
              flexShrink={0}
              className="pulse-live"
            />
          )}
          <Text
            color={isLive ? 'green.300' : 'blue.200'}
            fontSize="xs"
            letterSpacing="0.08em"
            textTransform="uppercase"
            fontWeight={isLive ? 'bold' : 'normal'}
          >
            {isLive ? 'Ao vivo' : 'Placar do set'}
          </Text>
        </Flex>
        <IconButton
          aria-label="Ver histórico de sets"
          variant="solid"
          size="sm"
          colorScheme="blue"
          bg="blue.600"
          disabled={currentSet <= 1}
          onClick={onViewHistory}
          _hover={{ bg: 'blue.500' }}
          _active={{ bg: 'blue.700' }}
          _disabled={{
            bg: 'gray.700',
            color: 'gray.300',
            cursor: 'not-allowed',
            opacity: 0.9,
          }}
        >
          <Icon viewBox="0 0 24 24" boxSize={4} aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8.009 8.009 0 0 1-8 8Zm1-12h-2v5h5v-2h-3Z"
            />
          </Icon>
        </IconButton>
      </Flex>

      <Flex align="center" justify="space-between" gap={4}>
        <Flex align="center" gap={4} flex="1" minW={0}>
          <Box textAlign="center" flex="1" minW="72px">
            <Text color="blue.300" fontSize="xs" fontWeight="semibold">
              {homeTeamName}
            </Text>
            <Text
              color="blue.100"
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="bold"
              data-testid="score-home"
            >
              {score.home}
            </Text>
            {servingTeam === 'home' && (
              <Text color="green.400" fontSize="2xs" fontWeight="bold" letterSpacing="0.05em">
                ● SACANDO
              </Text>
            )}
          </Box>
          <Text
            color="gray.500"
            fontSize={{ base: 'xl', md: '2xl' }}
            fontWeight="bold"
          >
            ×
          </Text>
          <Box textAlign="center" flex="1" minW="72px">
            <Text color="orange.300" fontSize="xs" fontWeight="semibold">
              {opponentName}
            </Text>
            <Text
              color="orange.200"
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="bold"
              data-testid="score-away"
            >
              {score.away}
            </Text>
            {servingTeam === 'away' && (
              <Text color="orange.400" fontSize="2xs" fontWeight="bold" letterSpacing="0.05em">
                ● SACANDO
              </Text>
            )}
          </Box>
        </Flex>

        <Text
          color="blue.400"
          fontSize="xs"
          fontWeight="semibold"
          whiteSpace="nowrap"
        >
          {totalSets ? `Set ${currentSet} de ${totalSets}` : `Set ${currentSet}`}
        </Text>
      </Flex>
    </Box>
  )
}
