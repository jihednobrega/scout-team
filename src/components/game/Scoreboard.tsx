import { Box, Flex, Text, IconButton, Icon } from '@chakra-ui/react'

interface SetRecord {
  number: number
  homeScore: number
  awayScore: number
}

interface ScoreboardProps {
  homeTeamName: string
  opponentName: string
  score: { home: number; away: number }
  currentSet: number
  totalSets: number | null
  isLive?: boolean
  servingTeam?: 'home' | 'away'
  onViewHistory?: () => void
  variant?: 'card' | 'inline'
  setsHistory?: SetRecord[]
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
  variant = 'card',
  setsHistory = [],
}: ScoreboardProps) {
  if (variant === 'inline') {
    return (
      <Flex align="center" gap={3} flexShrink={0}>

        {/* Sets anteriores — à esquerda do placar, Set1 mais à esquerda */}
        {setsHistory.length > 0 && (
          <Flex align="center" gap={1} flexShrink={0}>
            {setsHistory.map((s) => {
              const homeWon = s.homeScore > s.awayScore
              return (
                <Box
                  key={s.number}
                  px={1.5}
                  pt={1}
                  pb={0.5}
                  borderRadius="sm"
                  borderTopWidth="2px"
                  borderTopColor={homeWon ? 'green.500' : 'orange.500'}
                  borderLeftWidth="1px"
                  borderRightWidth="1px"
                  borderBottomWidth="1px"
                  borderLeftColor={homeWon ? 'green.900' : 'gray.800'}
                  borderRightColor={homeWon ? 'green.900' : 'gray.800'}
                  borderBottomColor={homeWon ? 'green.900' : 'gray.800'}
                  bg={homeWon ? 'green.950' : 'gray.900'}
                  flexShrink={0}
                >
                  <Flex align="baseline" gap={0.5}>
                    <Text
                      fontSize="2xs"
                      color={homeWon ? 'green.300' : 'gray.500'}
                      fontWeight="bold"
                      lineHeight="1"
                    >
                      {s.homeScore}
                    </Text>
                    <Text fontSize="2xs" color="gray.700" lineHeight="1">·</Text>
                    <Text
                      fontSize="2xs"
                      color={homeWon ? 'gray.500' : 'orange.300'}
                      fontWeight="bold"
                      lineHeight="1"
                    >
                      {s.awayScore}
                    </Text>
                  </Flex>
                </Box>
              )
            })}
            <Box w="1px" h="20px" bg="whiteAlpha.150" mx={0.5} flexShrink={0} />
          </Flex>
        )}

        {/* Placar do set atual */}
        <Flex align="center" gap={2}>
          <Text
            color={servingTeam === 'home' ? 'green.200' : 'blue.200'}
            fontSize="sm"
            fontWeight="semibold"
            whiteSpace="nowrap"
            maxW="140px"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {homeTeamName}
          </Text>
          <Text color="white" fontSize="2xl" fontWeight="black" lineHeight="1" data-testid="score-home">
            {score.home}
          </Text>
          <Text color="gray.500" fontSize="lg" fontWeight="bold" mx={0.5}>×</Text>
          <Text color="white" fontSize="2xl" fontWeight="black" lineHeight="1" data-testid="score-away">
            {score.away}
          </Text>
          <Text
            color={servingTeam === 'away' ? 'orange.200' : 'orange.300'}
            fontSize="sm"
            fontWeight="semibold"
            whiteSpace="nowrap"
            maxW="140px"
            overflow="hidden"
            textOverflow="ellipsis"
          >
            {opponentName}
          </Text>
        </Flex>

        {/* Indicador do set atual — à direita do placar */}
        <Flex
          align="center"
          gap={1}
          pl={2.5}
          borderLeftWidth="2px"
          borderLeftColor="blue.500"
          flexShrink={0}
        >
          <Box>
            <Text
              fontSize="8px"
              color="blue.500"
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="0.15em"
              lineHeight="1"
              mb="2px"
            >
              Set
            </Text>
            <Flex align="baseline" gap={0.5}>
              <Text color="white" fontSize="md" fontWeight="black" lineHeight="1">
                {currentSet}
              </Text>
              {totalSets && (
                <Text color="gray.600" fontSize="2xs" lineHeight="1" fontWeight="medium">
                  /{totalSets}
                </Text>
              )}
            </Flex>
          </Box>
        </Flex>

      </Flex>
    )
  }

  return (
    <Box
      bg="blue.900"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="blue.800"
      shadow="xl"
      px={5}
      py={4}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      minW="320px"
      maxW="340px"
      h="120px"
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
