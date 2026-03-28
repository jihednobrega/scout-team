// components/statistics/CourtHeatmap.tsx
'use client'

import { Box, Text, Flex, Tooltip } from '@chakra-ui/react'
import { HeatmapData } from '@/types/statistics'

interface CourtHeatmapProps {
  data: HeatmapData[]
  title?: string
}

export default function CourtHeatmap({ data, title = 'Mapa de Calor da Quadra' }: CourtHeatmapProps) {
  // Função para obter cor baseada na intensidade
  const getHeatColor = (intensity: number): string => {
    if (intensity >= 80) return 'rgba(220, 38, 38, 0.8)' // red
    if (intensity >= 60) return 'rgba(234, 88, 12, 0.7)' // orange
    if (intensity >= 40) return 'rgba(234, 179, 8, 0.6)' // yellow
    if (intensity >= 20) return 'rgba(34, 197, 94, 0.5)' // green
    return 'rgba(59, 130, 246, 0.4)' // blue
  }

  // Posições fixas das zonas na quadra (porcentagem)
  const zonePositions: Record<number, { top: string; left: string }> = {
    1: { top: '75%', left: '75%' }, // Fundo Direita
    2: { top: '50%', left: '75%' }, // Meio Direita
    3: { top: '25%', left: '75%' }, // Frente Direita
    4: { top: '25%', left: '25%' }, // Frente Esquerda
    5: { top: '50%', left: '25%' }, // Meio Esquerda
    6: { top: '75%', left: '25%' }, // Fundo Esquerda
  }

  return (
    <Box
      bg="gray.800"
      borderRadius="lg"
      p={5}
      borderWidth="1px"
      borderColor="gray.700"
    >
      <Text fontSize="md" fontWeight="bold" color="white" mb={4}>
        {title}
      </Text>

      {/* Quadra de Vôlei */}
      <Box
        position="relative"
        w="full"
        h="400px"
        bg="gray.900"
        borderRadius="md"
        borderWidth="2px"
        borderColor="white"
        overflow="hidden"
      >
        {/* Linha do meio */}
        <Box
          position="absolute"
          top="0"
          left="50%"
          w="2px"
          h="full"
          bg="white"
          transform="translateX(-50%)"
        />

        {/* Linha dos 3 metros */}
        <Box
          position="absolute"
          top="33.33%"
          left="0"
          w="full"
          h="1px"
          bg="whiteAlpha.500"
        />
        <Box
          position="absolute"
          top="66.66%"
          left="0"
          w="full"
          h="1px"
          bg="whiteAlpha.500"
        />

        {/* Zonas com heatmap */}
        {data.map((zone) => {
          const pos = zonePositions[zone.zone]
          if (!pos) return null

          return (
            <Tooltip
              key={zone.zone}
              label={
                <Box>
                  <Text fontSize="xs" fontWeight="bold">
                    Zona {zone.zone}
                  </Text>
                  <Text fontSize="xs">Ações: {zone.actions}</Text>
                  <Text fontSize="xs">Taxa de sucesso: {zone.successRate.toFixed(1)}%</Text>
                </Box>
              }
              placement="top"
              hasArrow
            >
              <Box
                position="absolute"
                top={pos.top}
                left={pos.left}
                transform="translate(-50%, -50%)"
                w="100px"
                h="100px"
                borderRadius="full"
                bg={getHeatColor(zone.intensity)}
                border="2px solid"
                borderColor="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                cursor="pointer"
                transition="all 0.3s"
                _hover={{
                  transform: 'translate(-50%, -50%) scale(1.1)',
                  zIndex: 10,
                }}
              >
                <Flex direction="column" align="center">
                  <Text fontSize="xl" fontWeight="bold" color="white">
                    {zone.zone}
                  </Text>
                  <Text fontSize="xs" color="white">
                    {zone.actions}
                  </Text>
                </Flex>
              </Box>
            </Tooltip>
          )
        })}

        {/* Labels */}
        <Box position="absolute" top="10px" left="10px">
          <Text fontSize="xs" color="whiteAlpha.700" fontWeight="bold">
            REDE
          </Text>
        </Box>
        <Box position="absolute" bottom="10px" right="10px">
          <Text fontSize="xs" color="whiteAlpha.700" fontWeight="bold">
            FUNDO
          </Text>
        </Box>
      </Box>

      {/* Legenda */}
      <Flex mt={4} gap={2} flexWrap="wrap" justify="center">
        <Flex align="center" gap={1}>
          <Box w="12px" h="12px" bg="rgba(59, 130, 246, 0.4)" borderRadius="sm" />
          <Text fontSize="xs" color="gray.400">Baixa</Text>
        </Flex>
        <Flex align="center" gap={1}>
          <Box w="12px" h="12px" bg="rgba(34, 197, 94, 0.5)" borderRadius="sm" />
          <Text fontSize="xs" color="gray.400">Média</Text>
        </Flex>
        <Flex align="center" gap={1}>
          <Box w="12px" h="12px" bg="rgba(234, 179, 8, 0.6)" borderRadius="sm" />
          <Text fontSize="xs" color="gray.400">Alta</Text>
        </Flex>
        <Flex align="center" gap={1}>
          <Box w="12px" h="12px" bg="rgba(234, 88, 12, 0.7)" borderRadius="sm" />
          <Text fontSize="xs" color="gray.400">Muito Alta</Text>
        </Flex>
        <Flex align="center" gap={1}>
          <Box w="12px" h="12px" bg="rgba(220, 38, 38, 0.8)" borderRadius="sm" />
          <Text fontSize="xs" color="gray.400">Intensíssima</Text>
        </Flex>
      </Flex>
    </Box>
  )
}
