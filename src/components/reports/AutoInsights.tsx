'use client'

import { Box, Grid, Text, Flex } from '@chakra-ui/react'

export default function AutoInsights() {
  const insights = [
    {
      type: 'warning',
      icon: '⚠️',
      title: 'Impacto da Recepção',
      text: 'O time perdeu 60% dos pontos quando a recepção foi C. Melhorar a qualidade da recepção pode aumentar significativamente as chances de vitória.',
      color: 'yellow',
      bg: 'yellow.900/20',
      border: 'yellow.500/30',
    },
    {
      type: 'success',
      icon: '🎯',
      title: 'Rotação Dominante',
      text: 'A rotação 2 teve o maior saldo de pontos (+12). Esta configuração apresentou 82% de eficiência ofensiva.',
      color: 'green',
      bg: 'green.900/20',
      border: 'green.500/30',
    },
    {
      type: 'info',
      icon: '📊',
      title: 'Eficiência de Ataques',
      text: 'Ataques da entrada foram 20% mais eficientes que os da saída. Considere aumentar a frequência de ataques pela entrada.',
      color: 'blue',
      bg: 'blue.900/20',
      border: 'blue.500/30',
    },
    {
      type: 'success',
      icon: '🔥',
      title: 'Destaque do Jogo',
      text: 'João Silva teve 82.3% de eficiência geral, sendo determinante nos momentos decisivos do 4º set.',
      color: 'purple',
      bg: 'purple.900/20',
      border: 'purple.500/30',
    },
    {
      type: 'warning',
      icon: '⚡',
      title: 'Ponto de Atenção',
      text: 'O bloqueio apresentou apenas 45% de eficiência nas rotações 5 e 6. Trabalhar posicionamento nessas rotações específicas.',
      color: 'red',
      bg: 'red.900/20',
      border: 'red.500/30',
    },
    {
      type: 'info',
      icon: '💡',
      title: 'Oportunidade Tática',
      text: 'Saques para a zona 5 resultaram em 70% de pontos diretos ou recepções ruins. Explorar mais essa zona.',
      color: 'cyan',
      bg: 'cyan.900/20',
      border: 'cyan.500/30',
    },
  ]

  return (
    <Box mb={6}>
      <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
        💡 Insights Automáticos
      </Text>

      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
        {insights.map((insight, idx) => (
          <Box
            key={idx}
            bg="gray.800"
            borderRadius="xl"
            p={5}
            borderWidth="1px"
            borderColor="gray.700"
            transition="all 0.3s"
            _hover={{
              transform: 'translateY(-2px)',
              shadow: 'lg',
              borderColor: `${insight.color}.500`,
            }}
          >
            <Flex align="start" gap={3}>
              <Box
                fontSize="2xl"
                flexShrink={0}
                w="40px"
                h="40px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                bg={insight.bg}
                borderRadius="lg"
                borderWidth="1px"
                borderColor={insight.border}
              >
                {insight.icon}
              </Box>

              <Box flex="1">
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color={`${insight.color}.300`}
                  mb={2}
                >
                  {insight.title}
                </Text>
                <Text fontSize="sm" color="gray.300" lineHeight="1.6">
                  {insight.text}
                </Text>
              </Box>
            </Flex>
          </Box>
        ))}
      </Grid>

      {/* Resumo de Insights */}
      <Box
        mt={4}
        bg="gray.800"
        borderRadius="xl"
        p={5}
        borderWidth="1px"
        borderColor="blue.500/30"
      >
        <Flex align="center" gap={2} mb={3}>
          <Text fontSize="lg">🤖</Text>
          <Text fontSize="sm" fontWeight="bold" color="blue.300">
            Resumo da Análise Automática
          </Text>
        </Flex>

        <Text fontSize="sm" color="gray.300" lineHeight="1.7">
          Com base nos dados coletados, o sistema identificou <strong style={{ color: 'var(--chakra-colors-green-400)' }}>3 pontos fortes</strong> que devem ser mantidos e{' '}
          <strong style={{ color: 'var(--chakra-colors-yellow-400)' }}>3 áreas de melhoria</strong> que podem aumentar significativamente o desempenho da equipe.
          A rotação 2 se destacou como a mais eficiente, enquanto as rotações 5 e 6 requerem atenção especial no treino.
        </Text>
      </Box>
    </Box>
  )
}
