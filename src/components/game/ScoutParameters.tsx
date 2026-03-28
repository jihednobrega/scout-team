// components/game/ScoutParameters.tsx
'use client'

import { Box, Flex, Text, Checkbox } from '@chakra-ui/react'
import { ScoutModel } from '@/types/scout'

interface ScoutParametersProps {
  selectedModel: string
  setSelectedModel: (id: string) => void
  models: ScoutModel[]
  enabledFundamentos?: string[]
  onEnabledFundamentosChange?: (fundamentos: string[]) => void
}

// Mapeamento ScoutModel.fundamentals keys → ActionPanel keys
const MODEL_TO_ACTION_KEY: Record<string, string> = {
  serve: 'serve',
  pass: 'reception',
  attack: 'attack',
  block: 'block',
  dig: 'dig',
  set: 'set',
}

const FUNDAMENTO_LABELS: Record<string, string> = {
  serve: 'Saque',
  reception: 'Recepção',
  attack: 'Ataque',
  block: 'Bloqueio',
  dig: 'Defesa',
  set: 'Levantamento',
}

// Fundamentos obrigatórios (não podem ser desativados)
const REQUIRED_FUNDAMENTOS = ['serve', 'reception', 'attack']

const ALL_FUNDAMENTOS = ['serve', 'reception', 'attack', 'block', 'dig', 'set']

export default function ScoutParameters({
  selectedModel,
  setSelectedModel,
  models,
  enabledFundamentos,
  onEnabledFundamentosChange,
}: ScoutParametersProps) {
  const currentModel = models.find((m) => m.id === selectedModel)

  // Derivar fundamentos habilitados do modelo quando não controlado externamente
  const currentEnabled = enabledFundamentos || ALL_FUNDAMENTOS

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId)
    // Ao trocar de modelo, atualizar fundamentos habilitados
    const model = models.find((m) => m.id === modelId)
    if (model && onEnabledFundamentosChange) {
      const enabled = Object.entries(model.fundamentals)
        .filter(([, v]) => v)
        .map(([k]) => MODEL_TO_ACTION_KEY[k] || k)
      // Garantir que os obrigatórios estejam sempre incluídos
      const withRequired = [...new Set([...REQUIRED_FUNDAMENTOS, ...enabled])]
      onEnabledFundamentosChange(withRequired)
    }
  }

  const handleToggleFundamento = (fund: string) => {
    if (REQUIRED_FUNDAMENTOS.includes(fund)) return
    if (!onEnabledFundamentosChange) return

    const isEnabled = currentEnabled.includes(fund)
    if (isEnabled) {
      onEnabledFundamentosChange(currentEnabled.filter((f) => f !== fund))
    } else {
      onEnabledFundamentosChange([...currentEnabled, fund])
    }
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
        Parametros de Scout
      </Text>

      {/* Seleção de Modelo */}
      <Box mb={4}>
        <Text fontSize="sm" color="gray.400" mb={2}>
          Modelo de Scout *
        </Text>
        <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
          {models.map((model) => (
            <Box
              key={model.id}
              as="button"
              bg={selectedModel === model.id ? 'blue.600' : 'gray.900'}
              borderRadius="md"
              p={4}
              borderWidth="2px"
              borderColor={selectedModel === model.id ? 'blue.500' : 'gray.700'}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{
                borderColor: 'blue.500',
                bg: selectedModel === model.id ? 'blue.700' : 'gray.800',
              }}
              onClick={() => handleModelSelect(model.id)}
            >
              <Text
                color="white"
                fontWeight={selectedModel === model.id ? 'bold' : 'semibold'}
                fontSize="sm"
                mb={1}
              >
                {model.name}
              </Text>
              <Text color="gray.400" fontSize="xs">
                {model.description}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Checkboxes de Fundamentos */}
      {currentModel && (
        <Box
          bg="gray.900"
          borderRadius="md"
          p={4}
          borderWidth="1px"
          borderColor="gray.700"
        >
          <Text fontSize="sm" color="gray.300" fontWeight="semibold" mb={3}>
            Fundamentos ativos
          </Text>
          <Flex flexWrap="wrap" gap={3}>
            {ALL_FUNDAMENTOS.map((fund) => {
              const isRequired = REQUIRED_FUNDAMENTOS.includes(fund)
              const isEnabled = currentEnabled.includes(fund)
              return (
                <Box
                  key={fund}
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg={isEnabled ? 'green.600/20' : 'gray.800'}
                  borderWidth="1px"
                  borderColor={isEnabled ? 'green.500' : 'gray.600'}
                  cursor={isRequired ? 'default' : 'pointer'}
                  onClick={() => handleToggleFundamento(fund)}
                  transition="all 0.15s"
                  _hover={isRequired ? {} : { borderColor: isEnabled ? 'red.400' : 'green.400' }}
                >
                  <Flex alignItems="center" gap={2}>
                    <Checkbox
                      isChecked={isEnabled}
                      isDisabled={isRequired}
                      onChange={() => handleToggleFundamento(fund)}
                      colorScheme="green"
                      size="sm"
                      pointerEvents="none"
                    />
                    <Text
                      fontSize="xs"
                      color={isEnabled ? 'green.300' : 'gray.500'}
                      fontWeight={isEnabled ? 'semibold' : 'normal'}
                    >
                      {FUNDAMENTO_LABELS[fund]}
                    </Text>
                    {isRequired && (
                      <Text fontSize="2xs" color="gray.500">
                        (obrig.)
                      </Text>
                    )}
                  </Flex>
                </Box>
              )
            })}
          </Flex>

          <Box mt={3} pt={3} borderTopWidth="1px" borderTopColor="gray.700">
            <Text fontSize="xs" color="gray.500">
              Se esta comecando, recomendamos manter pelo menos Saque, Recepcao e Ataque.
              Voce pode ativar os demais fundamentos quando se sentir mais confiante.
            </Text>
          </Box>
        </Box>
      )}

      {/* Pesos Customizados (Opcional) */}
      <Box mt={4}>
        <Flex alignItems="center" gap={2} mb={2}>
          <Text fontSize="sm" color="gray.400">
            Pesos Customizados (Opcional)
          </Text>
          <Box
            as="span"
            px={2}
            py={0.5}
            bg="gray.700"
            borderRadius="sm"
            fontSize="xs"
            color="gray.400"
          >
            Em breve
          </Box>
        </Flex>
        <Box
          bg="gray.900"
          borderRadius="md"
          p={4}
          borderWidth="1px"
          borderColor="gray.700"
          opacity={0.5}
        >
          <Text fontSize="xs" color="gray.500">
            Aqui voce podera definir valores de eficiencia customizados por fundamento (-1 a +1).
            Por exemplo, aumentar o peso de aces ou diminuir penalidade de erros forcados.
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
