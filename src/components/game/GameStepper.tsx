import { Box, Flex, Text } from '@chakra-ui/react'

interface GameStepperProps {
  currentStep: 1 | 2 | 3
}

const steps = [
  { number: 1, label: 'Partida' },
  { number: 2, label: 'Atletas' },
  { number: 3, label: 'Scout' },
]

export default function GameStepper({ currentStep }: GameStepperProps) {
  return (
    <Flex align="flex-start" justify="center" gap={0} mb={6}>
      {steps.map((step, i) => {
        const isCompleted = step.number < currentStep
        const isActive = step.number === currentStep

        return (
          <Flex key={step.number} align="flex-start">
            <Flex direction="column" align="center" gap={1.5}>
              <Box
                w="32px"
                h="32px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={isCompleted ? 'blue.500' : isActive ? 'blue.700' : 'gray.800'}
                borderWidth="2px"
                borderColor={isActive ? 'blue.400' : isCompleted ? 'blue.500' : 'gray.600'}
                transition="all 0.25s"
              >
                {isCompleted ? (
                  <Text color="white" fontSize="xs" fontWeight="bold" lineHeight="1">
                    ✓
                  </Text>
                ) : (
                  <Text
                    color={isActive ? 'blue.200' : 'gray.500'}
                    fontSize="sm"
                    fontWeight="bold"
                    lineHeight="1"
                  >
                    {step.number}
                  </Text>
                )}
              </Box>
              <Text
                fontSize="xs"
                fontWeight={isActive ? 'bold' : 'normal'}
                color={isActive ? 'blue.300' : isCompleted ? 'blue.500' : 'gray.600'}
                whiteSpace="nowrap"
              >
                {step.label}
              </Text>
            </Flex>

            {i < steps.length - 1 && (
              <Box
                h="2px"
                w={{ base: '48px', md: '72px' }}
                bg={isCompleted ? 'blue.500' : 'gray.700'}
                mt="15px"
                mx={2}
                transition="all 0.25s"
                flexShrink={0}
              />
            )}
          </Flex>
        )
      })}
    </Flex>
  )
}
