// components/game/GamePreview.tsx
'use client'

import { Box, Flex, Text, Button } from '@chakra-ui/react'
import { GameConfig, LineupPlayer } from '@/types/scout'

interface GamePreviewProps {
  config: Partial<GameConfig>
  onStartScout: () => void
  isValid: boolean
  errors: string[]
}

export default function GamePreview({
  config,
  onStartScout,
  isValid,
  errors,
}: GamePreviewProps) {
  const starters = config.lineup?.filter((p) => p.isStarter) || []
  const libero = config.lineup?.find((p) => p.playerId === config.liberoId)

  // Organizar titulares por ordem de rotação
  const sortedStarters = [...starters].sort(
    (a, b) => (a.rotationOrder || 0) - (b.rotationOrder || 0)
  )

  // Criar visualização da quadra
  const getPlayerByRotation = (rotation: number): LineupPlayer | null => {
    return sortedStarters.find((p) => p.rotationOrder === rotation) || null
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return (
    <Box
      bg="gray.800"
      borderRadius="lg"
      p={6}
      borderWidth="1px"
      borderColor="gray.700"
      mb={4}
    >
      <Text fontSize="lg" fontWeight="bold" color="white" mb={4}>
        👁️ Pré-visualização
      </Text>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
        {/* Resumo do Jogo */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" color="blue.400" mb={3}>
            📋 Resumo do Setup
          </Text>

          <Box
            bg="gray.900"
            borderRadius="md"
            p={4}
            borderWidth="1px"
            borderColor="gray.700"
          >
            <Box mb={3}>
              <Text fontSize="xs" color="gray.500">Data e Hora</Text>
              <Text fontSize="sm" color="white" fontWeight="semibold">
                {formatDate(config.date)} às {config.time || '-'}
              </Text>
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" color="gray.500">Adversário</Text>
              <Text fontSize="sm" color="white" fontWeight="semibold">
                {config.opponentName || '-'}
              </Text>
            </Box>

            {config.tournament && (
              <Box mb={3}>
                <Text fontSize="xs" color="gray.500">Campeonato</Text>
                <Text fontSize="sm" color="white" fontWeight="semibold">
                  {config.tournament}
                </Text>
              </Box>
            )}

            {config.location && (
              <Box mb={3}>
                <Text fontSize="xs" color="gray.500">Local</Text>
                <Text fontSize="sm" color="white" fontWeight="semibold">
                  {config.location}
                </Text>
              </Box>
            )}

            <Box mb={3}>
              <Text fontSize="xs" color="gray.500">Tipo de Partida</Text>
              <Box
                display="inline-block"
                px={2}
                py={1}
                bg="blue.600/20"
                borderRadius="md"
                borderWidth="1px"
                borderColor="blue.500"
              >
                <Text fontSize="xs" color="blue.300" fontWeight="semibold">
                  {config.matchType === 'championship' && 'Campeonato'}
                  {config.matchType === 'friendly' && 'Amistoso'}
                  {config.matchType === 'training' && 'Treino'}
                </Text>
              </Box>
            </Box>

            <Box mb={3}>
              <Text fontSize="xs" color="gray.500">Modelo de Scout</Text>
              <Text fontSize="sm" color="white" fontWeight="semibold">
                {config.modelName || '-'}
              </Text>
            </Box>

            <Box>
              <Text fontSize="xs" color="gray.500">Métricas Avançadas</Text>
              <Text fontSize="sm" color="white" fontWeight="semibold">
                {config.advanced
                  ? `${Object.values(config.advanced).filter(Boolean).length} habilitadas`
                  : '0 habilitadas'}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Rotação Inicial */}
        <Box>
          <Text fontSize="md" fontWeight="semibold" color="blue.400" mb={3}>
            🔄 Rotação Inicial
          </Text>

          {/* Quadra Visual */}
          <Box
            bg="gray.900"
            borderRadius="md"
            p={6}
            borderWidth="1px"
            borderColor="gray.700"
            position="relative"
          >
            {/* Rede */}
            <Box
              position="absolute"
              left="0"
              right="0"
              top="50%"
              h="2px"
              bg="orange.500"
              transform="translateY(-50%)"
            />

            {/* Posições */}
            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3} mb={16}>
              {/* P4, P3, P2 (frente) */}
              {[4, 3, 2].map((pos) => {
                const player = getPlayerByRotation(pos)
                return (
                  <Box
                    key={pos}
                    bg={player ? 'blue.600' : 'gray.800'}
                    borderRadius="md"
                    p={3}
                    borderWidth="2px"
                    borderColor={player ? 'blue.400' : 'gray.600'}
                    textAlign="center"
                  >
                    <Text fontSize="xs" color="gray.400" mb={1}>
                      P{pos}
                    </Text>
                    {player ? (
                      <>
                        <Text fontSize="lg" fontWeight="bold" color="white">
                          {player.jerseyNumber}
                        </Text>
                        <Text fontSize="xs" color="gray.300" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                          {player.playerName}
                        </Text>
                      </>
                    ) : (
                      <Text fontSize="xs" color="gray.600">
                        -
                      </Text>
                    )}
                  </Box>
                )
              })}
            </Box>

            <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={3}>
              {/* P5, P6, P1 (fundo) */}
              {[5, 6, 1].map((pos) => {
                const player = getPlayerByRotation(pos)
                return (
                  <Box
                    key={pos}
                    bg={player ? 'blue.600' : 'gray.800'}
                    borderRadius="md"
                    p={3}
                    borderWidth="2px"
                    borderColor={player ? 'blue.400' : 'gray.600'}
                    textAlign="center"
                  >
                    <Text fontSize="xs" color="gray.400" mb={1}>
                      P{pos}
                    </Text>
                    {player ? (
                      <>
                        <Text fontSize="lg" fontWeight="bold" color="white">
                          {player.jerseyNumber}
                        </Text>
                        <Text fontSize="xs" color="gray.300" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                          {player.playerName}
                        </Text>
                      </>
                    ) : (
                      <Text fontSize="xs" color="gray.600">
                        -
                      </Text>
                    )}
                  </Box>
                )
              })}
            </Box>

            {/* Líbero */}
            {libero && (
              <Box
                mt={4}
                bg="orange.600/20"
                borderRadius="md"
                p={2}
                borderWidth="1px"
                borderColor="orange.500"
                textAlign="center"
              >
                <Text fontSize="xs" color="orange.300" mb={1}>
                  Líbero
                </Text>
                <Text fontSize="sm" color="white" fontWeight="semibold">
                  #{libero.jerseyNumber} {libero.playerName}
                </Text>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Erros de Validação */}
      {!isValid && errors.length > 0 && (
        <Box
          mt={4}
          bg="red.500/10"
          borderRadius="md"
          p={4}
          borderWidth="1px"
          borderColor="red.500"
        >
          <Flex alignItems="center" gap={2} mb={2}>
            <Text fontSize="lg">❌</Text>
            <Text fontSize="sm" color="red.300" fontWeight="semibold">
              Corrija os seguintes erros antes de iniciar o scout:
            </Text>
          </Flex>
          <Box as="ul" pl={6}>
            {errors.map((error, index) => (
              <Box as="li" key={index}>
                <Text fontSize="xs" color="red.200">
                  {error}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Botão Iniciar Scout */}
      <Button
        w="full"
        size="lg"
        bg={isValid ? 'green.600' : 'gray.600'}
        color="white"
        _hover={{ bg: isValid ? 'green.700' : 'gray.700' }}
        _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
        mt={4}
        onClick={onStartScout}
        disabled={!isValid}
      >
        <Flex alignItems="center" gap={2}>
          <Text fontSize="xl">🏐</Text>
          <Text fontWeight="bold">
            {isValid ? 'Iniciar Scout' : 'Configure corretamente para iniciar'}
          </Text>
        </Flex>
      </Button>
    </Box>
  )
}
