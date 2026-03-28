// components/game/AdvancedSettings.tsx
'use client'

import { Box, Flex, Text, Checkbox } from '@chakra-ui/react'
import { AdvancedTracking } from '@/types/scout'

interface AdvancedSettingsProps {
  advanced: AdvancedTracking
  setAdvanced: (advanced: AdvancedTracking) => void
  hasHistoryWarning: boolean
}

export default function AdvancedSettings({
  advanced,
  setAdvanced,
  hasHistoryWarning,
}: AdvancedSettingsProps) {
  const settings = [
    {
      key: 'useEPV',
      label: 'Expected Point Value (EPV)',
      description: 'Calcula o valor esperado de pontos por ação baseado em histórico',
      icon: '📈',
      requiresHistory: true,
    },
    {
      key: 'trackReceptionGradeAgainst',
      label: 'Recepção Adversária vs Saque',
      description: 'Vincula a qualidade da recepção adversária ao saque do seu time',
      icon: '🎯',
      requiresHistory: false,
    },
    {
      key: 'enableContextHashing',
      label: 'Context ID (Hashing)',
      description: 'Cria ID único por contexto (rotação × fase × qualidade passe × diferença placar)',
      icon: '🔑',
      requiresHistory: false,
    },
    {
      key: 'collectBlockersCount',
      label: 'Número de Bloqueadores',
      description: 'Registra quantos bloqueadores havia em cada ataque',
      icon: '🙌',
      requiresHistory: false,
    },
    {
      key: 'collectChainId',
      label: 'Encadeamento de Toques (Chain ID)',
      description: 'Vincula ações em sequência (bloqueio → defesa → transição)',
      icon: '🔗',
      requiresHistory: false,
    },
    {
      key: 'enableXSR',
      label: 'Side-Out Real e xSR',
      description: 'Rastreia taxa de side-out real e expected side-out rate',
      icon: '↩️',
      requiresHistory: true,
    },
    {
      key: 'enableEntropy',
      label: 'Entropia de Distribuição',
      description: 'Calcula entropia de Shannon para imprevisibilidade do levantador',
      icon: '🎲',
      requiresHistory: false,
    },
  ]

  const handleToggle = (key: keyof AdvancedTracking) => {
    setAdvanced({
      ...advanced,
      [key]: !advanced[key],
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
      <Text fontSize="lg" fontWeight="bold" color="white" mb={2}>
        🔬 Campos Avançados
      </Text>
      <Text fontSize="sm" color="gray.400" mb={4}>
        Habilite métricas avançadas para análises mais profundas. Alguns campos requerem histórico de jogos.
      </Text>

      {/* Aviso de Histórico */}
      {hasHistoryWarning && (advanced.useEPV || advanced.enableXSR) && (
        <Box
          bg="orange.500/10"
          borderRadius="md"
          p={3}
          borderWidth="1px"
          borderColor="orange.500"
          mb={4}
        >
          <Flex alignItems="center" gap={2}>
            <Text fontSize="lg">⚠️</Text>
            <Text fontSize="xs" color="orange.300">
              <strong>Aviso:</strong> Algumas métricas selecionadas (EPV, xSR) requerem histórico de jogos.
              Como seu time tem poucos jogos registrados, os resultados podem não ser precisos inicialmente.
            </Text>
          </Flex>
        </Box>
      )}

      {/* Lista de Configurações */}
      <Box display="grid" gap={3}>
        {settings.map((setting) => (
          <Box
            key={setting.key}
            bg="gray.900"
            borderRadius="md"
            p={4}
            borderWidth="1px"
            borderColor={advanced[setting.key as keyof AdvancedTracking] ? 'blue.500/50' : 'gray.700'}
            transition="all 0.2s"
          >
            <Flex alignItems="flex-start" justifyContent="space-between" gap={3}>
              <Flex alignItems="flex-start" gap={3} flex="1">
                <Text fontSize="2xl">{setting.icon}</Text>
                <Box flex="1">
                  <Flex alignItems="center" gap={2} mb={1}>
                    <Text
                      color="white"
                      fontWeight="semibold"
                      fontSize="sm"
                    >
                      {setting.label}
                    </Text>
                    {setting.requiresHistory && (
                      <Box
                        px={2}
                        py={0.5}
                        bg="orange.500/20"
                        borderRadius="sm"
                        borderWidth="1px"
                        borderColor="orange.500"
                      >
                        <Text fontSize="xs" color="orange.300" fontWeight="semibold">
                          Requer histórico
                        </Text>
                      </Box>
                    )}
                  </Flex>
                  <Text color="gray.400" fontSize="xs">
                    {setting.description}
                  </Text>
                </Box>
              </Flex>

              <Checkbox
                isChecked={advanced[setting.key as keyof AdvancedTracking]}
                onChange={() => handleToggle(setting.key as keyof AdvancedTracking)}
                colorScheme="blue"
                size="lg"
              />
            </Flex>
          </Box>
        ))}
      </Box>

      {/* Resumo */}
      <Box
        mt={4}
        bg="blue.500/10"
        borderRadius="md"
        p={3}
        borderWidth="1px"
        borderColor="blue.500"
      >
        <Text fontSize="xs" color="blue.300">
          💡 <strong>Resumo:</strong> {Object.values(advanced).filter(Boolean).length} de {settings.length} métricas avançadas habilitadas.
          Quanto mais métricas, mais completas serão suas análises, mas o processo de scout pode se tornar mais lento.
        </Text>
      </Box>
    </Box>
  )
}
