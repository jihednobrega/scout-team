'use client'

import { Box, Flex, Button, Text } from '@chakra-ui/react'
import { useState } from 'react'

export default function ExportActions() {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPDF = () => {
    setIsExporting(true)
    // Simula exportação
    setTimeout(() => {
      setIsExporting(false)
      alert('PDF gerado com sucesso! (funcionalidade em desenvolvimento)')
    }, 1500)
  }

  const handleExportCSV = () => {
    setIsExporting(true)
    // Simula exportação
    setTimeout(() => {
      setIsExporting(false)
      alert('CSV exportado com sucesso! (funcionalidade em desenvolvimento)')
    }, 1000)
  }

  const handleShareWhatsApp = () => {
    alert('Compartilhar via WhatsApp (funcionalidade em desenvolvimento)')
  }

  const handleShareEmail = () => {
    alert('Enviar por email (funcionalidade em desenvolvimento)')
  }

  return (
    <Box mb={6}>
      <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
        📤 Exportação e Compartilhamento
      </Text>

      <Box
        bg="gray.800"
        borderRadius="xl"
        p={6}
        borderWidth="1px"
        borderColor="gray.700"
      >
        <Text fontSize="sm" color="gray.400" mb={4}>
          Exporte ou compartilhe este relatório completo
        </Text>

        <Flex
          direction={{ base: 'column', md: 'row' }}
          gap={3}
          flexWrap="wrap"
        >
          {/* Exportar PDF */}
          <Button
            colorScheme="red"
            size="md"
            onClick={handleExportPDF}
            isLoading={isExporting}
            flex={{ base: '1', md: '0 1 auto' }}
            minW={{ md: '180px' }}
          >
            <Flex align="center" gap={2}>
              <Text fontSize="lg">📄</Text>
              <Text>Exportar PDF</Text>
            </Flex>
          </Button>

          {/* Exportar CSV */}
          <Button
            colorScheme="green"
            size="md"
            onClick={handleExportCSV}
            isLoading={isExporting}
            flex={{ base: '1', md: '0 1 auto' }}
            minW={{ md: '180px' }}
          >
            <Flex align="center" gap={2}>
              <Text fontSize="lg">📊</Text>
              <Text>Exportar CSV</Text>
            </Flex>
          </Button>

          {/* Compartilhar WhatsApp */}
          <Button
            colorScheme="whatsapp"
            variant="outline"
            size="md"
            onClick={handleShareWhatsApp}
            flex={{ base: '1', md: '0 1 auto' }}
            minW={{ md: '180px' }}
          >
            <Flex align="center" gap={2}>
              <Text fontSize="lg">💬</Text>
              <Text>WhatsApp</Text>
            </Flex>
          </Button>

          {/* Compartilhar Email */}
          <Button
            colorScheme="blue"
            variant="outline"
            size="md"
            onClick={handleShareEmail}
            flex={{ base: '1', md: '0 1 auto' }}
            minW={{ md: '180px' }}
          >
            <Flex align="center" gap={2}>
              <Text fontSize="lg">📧</Text>
              <Text>Email</Text>
            </Flex>
          </Button>
        </Flex>

        {/* Informações adicionais */}
        <Box
          mt={4}
          p={3}
          bg="gray.900"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="gray.700"
        >
          <Flex align="start" gap={2}>
            <Text fontSize="sm" color="gray.500">
              ℹ️
            </Text>
            <Box>
              <Text fontSize="xs" color="gray.400" lineHeight="1.6">
                <strong style={{ color: 'var(--chakra-colors-white)' }}>PDF:</strong> Relatório completo com gráficos e análises visuais
                <br />
                <strong style={{ color: 'var(--chakra-colors-white)' }}>CSV:</strong> Dados brutos para análise em planilhas
                <br />
                <strong style={{ color: 'var(--chakra-colors-white)' }}>Compartilhar:</strong> Envie o resumo diretamente para a comissão técnica
              </Text>
            </Box>
          </Flex>
        </Box>
      </Box>
    </Box>
  )
}
