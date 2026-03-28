import React from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';

interface MatchSummaryProps {
  homeTeam: string;
  awayTeam: string;
  score: {
    home: number;
    away: number;
    sets: Array<{ home: number; away: number }>;
  };
  date: string;
  duration: string;
}

export function MatchSummary({ homeTeam, awayTeam, score, date, duration }: MatchSummaryProps) {
  return (
    <Box 
      w="full" 
      mb={6} 
      bg="gray.800" 
      borderRadius="xl" 
      borderWidth="1px" 
      borderColor="gray.700" 
      overflow="hidden"
    >
      <Box p={4} borderBottomWidth="1px" borderColor="gray.700" bg="gray.900">
        <Flex justify="space-between" align="center">
          <Text color="gray.400" fontSize="sm">{date}</Text>
          <Text color="gray.400" fontSize="sm">{duration}</Text>
        </Flex>
      </Box>

      <Box p={6}>
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          align="center" 
          justify="space-between" 
          maxW="4xl" 
          mx="auto"
          gap={8}
        >
          <Text fontSize="2xl" fontWeight="bold" color="white" flex={1} textAlign={{ base: 'center', md: 'right' }}>
            {homeTeam}
          </Text>
          
          <Flex align="center" justify="center" gap={6}>
            <Text fontSize="6xl" fontWeight="black" color="white" lineHeight="1">
              {score.home}
            </Text>
            <Text fontSize="4xl" color="gray.500">x</Text>
            <Text fontSize="6xl" fontWeight="black" color="white" lineHeight="1">
              {score.away}
            </Text>
          </Flex>

          <Text fontSize="2xl" fontWeight="bold" color="white" flex={1} textAlign={{ base: 'center', md: 'left' }}>
            {awayTeam}
          </Text>
        </Flex>

        <Flex justify="center" gap={4} mt={8} wrap="wrap">
          {score.sets.map((set, index) => (
            <Flex 
              key={index} 
              direction="column" 
              align="center" 
              bg="gray.700" 
              p={3} 
              borderRadius="md" 
              minW="80px"
            >
              <Text fontSize="xs" fontWeight="bold" color="gray.400" mb={1} textTransform="uppercase">
                Set {index + 1}
              </Text>
              <Text fontSize="xl" fontFamily="mono" color="white" fontWeight="bold">
                {set.home}-{set.away}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}
