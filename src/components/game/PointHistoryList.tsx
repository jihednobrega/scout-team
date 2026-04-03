import { Box, Flex, Text } from '@chakra-ui/react'
import { PointRecord } from '@/types/scout'
import { useRef, useEffect } from 'react'

interface PointHistoryListProps {
  history: PointRecord[]
  currentSet: number
  onPointClick: (point: PointRecord) => void
  direction?: 'horizontal' | 'vertical'
  maxH?: string
}

export default function PointHistoryList({
  history,
  currentSet,
  onPointClick,
  direction = 'horizontal',
  maxH = '320px',
}: PointHistoryListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const currentSetPoints = history.filter(p => p.set === currentSet)

  useEffect(() => {
    if (scrollRef.current) {
      if (direction === 'vertical') {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      } else {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
      }
    }
  }, [currentSetPoints.length, direction])

  if (direction === 'vertical') {
    return (
      <Box>
        <Text
          fontSize="xs"
          color="gray.400"
          mb={2}
          textTransform="uppercase"
          letterSpacing="wider"
          fontWeight="bold"
        >
          Histórico — Set {currentSet}
        </Text>
        {currentSetPoints.length === 0 ? (
          <Text fontSize="xs" color="gray.600" fontStyle="italic">
            Nenhum ponto ainda.
          </Text>
        ) : (
          <Flex
            ref={scrollRef}
            direction="column"
            gap={1}
            overflowY="auto"
            maxH={maxH}
            css={{
              '&::-webkit-scrollbar': { width: '3px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.15)', borderRadius: '2px' },
            }}
          >
            {currentSetPoints.map((point) => (
              <Flex
                key={point.id}
                align="center"
                gap={2}
                px={2}
                py={1.5}
                borderRadius="md"
                borderLeftWidth="3px"
                borderLeftColor={point.winner === 'home' ? 'green.500' : 'red.500'}
                bg={point.winner === 'home' ? 'green.900/30' : 'red.900/30'}
                cursor="pointer"
                _hover={{ bg: point.winner === 'home' ? 'green.900/50' : 'red.900/50' }}
                transition="background 0.15s"
                onClick={() => onPointClick(point)}
              >
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="white"
                  fontFamily="mono"
                  flexShrink={0}
                  w="8"
                >
                  {point.score.home}-{point.score.away}
                </Text>
                <Text
                  fontSize="2xs"
                  color={point.winner === 'home' ? 'green.300' : 'red.300'}
                  noOfLines={1}
                >
                  {point.winner === 'home' ? '● Meu time' : '○ Adversário'}
                </Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Box>
    )
  }

  return (
    <Box
      mt={2}
      bg="gray.800"
      borderRadius="lg"
      p={4}
      borderWidth="1px"
      borderColor="gray.700"
      shadow="lg"
    >
      <Text
        fontSize="xs"
        color="gray.400"
        mb={3}
        textTransform="uppercase"
        letterSpacing="wider"
        fontWeight="bold"
      >
        Histórico do Set {currentSet}
      </Text>
      {currentSetPoints.length === 0 ? (
        <Text fontSize="xs" color="gray.600" fontStyle="italic">
          Nenhum ponto registrado ainda.
        </Text>
      ) : (
        <Flex
          ref={scrollRef}
          gap={2}
          overflowX="auto"
          pb={2}
          css={{
            '&::-webkit-scrollbar': { height: '4px' },
            '&::-webkit-scrollbar-track': { background: 'rgba(0,0,0,0.1)' },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.2)', borderRadius: '2px' },
          }}
        >
          {currentSetPoints.map((point) => (
            <Flex
              key={point.id}
              direction="column"
              align="center"
              justify="center"
              minW="40px"
              h="40px"
              bg={point.winner === 'home' ? 'green.900' : 'red.900'}
              borderWidth="1px"
              borderColor={point.winner === 'home' ? 'green.700' : 'red.700'}
              borderRadius="md"
              cursor="pointer"
              _hover={{ transform: 'scale(1.05)', borderColor: 'whiteAlpha.500' }}
              transition="all 0.2s"
              onClick={() => onPointClick(point)}
            >
              <Text fontSize="xs" fontWeight="bold" color="white">
                {point.score.home}-{point.score.away}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </Box>
  )
}
