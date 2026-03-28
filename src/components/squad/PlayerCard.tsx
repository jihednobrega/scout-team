import {
  Box,
  Image,
  Text,
  Flex,
  HStack,
  Badge,
} from '@chakra-ui/react'
import { Player, POSITION_LABELS, VolleyballPosition } from '@/types/player'
import { getRatingColor } from '@/utils/stats'

// Stats to display per position
const POSITION_STATS: Record<VolleyballPosition, { key: keyof CardStats; label: string }[]> = {
  ponteiro:     [{ key: 'atk', label: 'ATK' }, { key: 'rec', label: 'REC' }, { key: 'srv', label: 'SAQ' }],
  oposto:       [{ key: 'atk', label: 'ATK' }, { key: 'srv', label: 'SAQ' }, { key: 'def', label: 'DEF' }],
  central:      [{ key: 'atk', label: 'ATK' }, { key: 'blk', label: 'BLK' }, { key: 'srv', label: 'SAQ' }],
  levantador:   [{ key: 'lev', label: 'LEV' }, { key: 'def', label: 'DEF' }, { key: 'srv', label: 'SAQ' }],
  libero:       [{ key: 'rec', label: 'REC' }, { key: 'def', label: 'DEF' }, { key: 'lev', label: 'LEV' }],
}

interface CardStats {
  atk: number
  rec: number
  blk: number
  def: number
  srv: number
  lev: number
}

interface PlayerCardProps {
  player: Player
  stats?: CardStats | null
  rating?: number | null
}

// Compact stat pill
function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <Flex direction="column" align="center" flex={1}>
      <Text
        fontSize="13px"
        fontWeight="800"
        color={getRatingColor(value)}
        lineHeight="1"
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
      >
        {value.toFixed(1)}
      </Text>
      <Text
        fontSize="8px"
        fontWeight="700"
        color="whiteAlpha.400"
        textTransform="uppercase"
        letterSpacing="0.08em"
        mt="2px"
      >
        {label}
      </Text>
    </Flex>
  )
}

export function PlayerCard({
  player,
  stats = null,
  rating = null,
}: PlayerCardProps) {
  const hasData = stats !== null && rating !== null
  const ratingColor = hasData ? getRatingColor(rating) : '#4A5568'

  return (
    <Box
      position="relative"
      w={{ base: '155px', sm: '180px', md: '210px' }}
      h={{ base: '215px', sm: '250px', md: '290px' }}
      mx="auto"
      role="group"
      cursor="pointer"
      borderRadius="16px"
      overflow="hidden"
      bg="gray.900"
      border="1px solid"
      borderColor="whiteAlpha.100"
      boxShadow="0 4px 24px rgba(0,0,0,0.4)"
      transition="all 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        transform: 'translateY(-6px)',
        boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${ratingColor}30`,
        borderColor: `${ratingColor}40`,
      }}
    >
      {/* ── Photo area (top 60%) ── */}
      <Box position="relative" h="60%" overflow="hidden">
        {/* Subtle accent line at top */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          h="2px"
          bg={ratingColor}
          opacity={hasData ? 0.7 : 0.2}
          zIndex={3}
        />

        {/* Photo */}
        <Image
          src={player.photo}
          alt={player.name}
          w="full"
          h="full"
          objectFit="cover"
          objectPosition="top center"
          transition="transform 0.4s ease"
          _groupHover={{ transform: 'scale(1.05)' }}
        />

        {/* Dark vignette overlay */}
        <Box
          position="absolute"
          inset={0}
          bgGradient="linear(to-b, blackAlpha.200 0%, transparent 30%, transparent 50%, blackAlpha.800 100%)"
          zIndex={1}
        />

        {/* Jersey number — top left */}
        <Flex
          position="absolute"
          top={3}
          left={3}
          zIndex={2}
          align="center"
          justify="center"
          minW="32px"
          h="32px"
          px={1}
          borderRadius="10px"
          bg="blackAlpha.600"
          backdropFilter="blur(8px)"
          border="1px solid"
          borderColor="whiteAlpha.100"
        >
          <Text
            fontSize="md"
            fontWeight="900"
            color="white"
            fontFamily="'JetBrains Mono', 'Fira Code', monospace"
            lineHeight="1"
          >
            {player.jerseyNumber}
          </Text>
        </Flex>

        {/* Rating badge — top right */}
        {hasData && (
          <Flex
            position="absolute"
            top={3}
            right={3}
            zIndex={2}
            align="center"
            justify="center"
            w={{ base: '32px', md: '40px' }}
            h={{ base: '32px', md: '40px' }}
            borderRadius="12px"
            bg="blackAlpha.600"
            backdropFilter="blur(8px)"
            border="1px solid"
            borderColor={`${ratingColor}50`}
            boxShadow={`0 0 12px ${ratingColor}20`}
          >
            <Text
              fontSize={{ base: 'sm', md: 'lg' }}
              fontWeight="900"
              color={ratingColor}
              fontFamily="'JetBrains Mono', 'Fira Code', monospace"
              lineHeight="1"
            >
              {rating.toFixed(1)}
            </Text>
          </Flex>
        )}

        {/* Player name — overlaid at bottom of photo */}
        <Box position="absolute" bottom={0} left={0} right={0} zIndex={2} px={3} pb={2}>
          <Text
            color="white"
            fontSize="md"
            fontWeight="800"
            noOfLines={1}
            textTransform="uppercase"
            letterSpacing="0.04em"
            textShadow="0 2px 8px rgba(0,0,0,0.8)"
            lineHeight="1.2"
          >
            {player.name}
          </Text>
        </Box>
      </Box>

      {/* ── Info area (bottom 40%) ── */}
      <Flex
        direction="column"
        h="40%"
        px={3}
        pt={2.5}
        pb={3}
        justify="space-between"
        bg="linear-gradient(180deg, rgba(17,19,25,1) 0%, rgba(13,15,20,1) 100%)"
      >
        {/* Position badge */}
        <Badge
          alignSelf="flex-start"
          bg={`${ratingColor}15`}
          color={hasData ? ratingColor : 'gray.400'}
          fontSize="9px"
          fontWeight="800"
          px={2}
          py={0.5}
          borderRadius="6px"
          textTransform="uppercase"
          letterSpacing="0.1em"
          border="1px solid"
          borderColor={hasData ? `${ratingColor}25` : 'whiteAlpha.100'}
        >
          {POSITION_LABELS[player.position]}
        </Badge>

        {/* Stats grid or empty state */}
        {hasData ? (
          <Flex
            w="full"
            bg="whiteAlpha.30"
            borderRadius="10px"
            border="1px solid"
            borderColor="whiteAlpha.50"
            py={2}
            px={1}
          >
            <HStack spacing={0} w="full" justify="space-evenly">
              {(POSITION_STATS[player.position] || POSITION_STATS.ponteiro).map((s, i) => (
                <Box key={s.key} display="contents">
                  {i > 0 && <Box w="1px" h="24px" bg="whiteAlpha.100" />}
                  <StatPill label={s.label} value={stats[s.key]} />
                </Box>
              ))}
            </HStack>
          </Flex>
        ) : (
          <Flex
            w="full"
            bg="whiteAlpha.30"
            borderRadius="10px"
            border="1px dashed"
            borderColor="whiteAlpha.100"
            py={3}
            align="center"
            justify="center"
          >
            <Text
              color="whiteAlpha.300"
              fontSize="10px"
              fontWeight="600"
              letterSpacing="0.05em"
            >
              Sem dados de scout
            </Text>
          </Flex>
        )}
      </Flex>
    </Box>
  )
}
