import { Box, Flex, Text } from '@chakra-ui/react'
import { PointRecord } from '@/types/scout'
import { useRef, useEffect } from 'react'

interface PointHistoryListProps {
  history: PointRecord[]
  currentSet: number
  onPointClick: (point: PointRecord) => void
}

export default function PointHistoryList({
  history,
  currentSet,
  onPointClick
}: PointHistoryListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // Filtrar pontos do set atual
  const currentSetPoints = history.filter(p => p.set === currentSet)

  // Auto-scroll para o final quando novos pontos são adicionados
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth
    }
  }, [currentSetPoints.length])

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
