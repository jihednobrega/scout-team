'use client'

import { useState } from 'react'
import { Box, Button, Flex, Input, Text } from '@chakra-ui/react'
import { useTeams } from '@/hooks/useTeams'

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onTeamCreated: (teamId: string) => void
}

export function CreateTeamModal({ isOpen, onClose, onTeamCreated }: CreateTeamModalProps) {
  const { createTeam } = useTeams()
  const [formData, setFormData] = useState({
    name: '',
    logo: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert('Digite o nome da equipe')
      return
    }

    setIsSubmitting(true)
    try {
      const newTeam = await createTeam({
        name: formData.name.trim(),
        logo: formData.logo.trim() || undefined
      })

      if (newTeam) {
        setFormData({ name: '', logo: '' })
        onTeamCreated(newTeam.id)
        onClose()
      }
    } catch (error) {
      console.error('Erro ao criar equipe:', error)
      alert('Erro ao criar equipe. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ name: '', logo: '' })
      onClose()
    }
  }

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="blackAlpha.700"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
      onClick={handleClose}
    >
      <Box
        bg="gray.800"
        borderRadius="lg"
        p={6}
        maxW="500px"
        w="90%"
        onClick={(e) => e.stopPropagation()}
      >
        <Text fontSize="2xl" fontWeight="bold" mb={6}>
          Nova Equipe
        </Text>

        <form onSubmit={handleSubmit}>
          <Box mb={4}>
            <Text fontSize="sm" color="gray.400" mb={2}>
              Nome da Equipe *
            </Text>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Seleção Brasileira"
              disabled={isSubmitting}
              required
            />
          </Box>

          <Box mb={6}>
            <Text fontSize="sm" color="gray.400" mb={2}>
              Logo (URL da imagem)
            </Text>
            <Input
              value={formData.logo}
              onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              placeholder="https://exemplo.com/logo.png"
              disabled={isSubmitting}
            />
            {formData.logo && (
              <Box mt={2} p={2} bg="gray.700" borderRadius="md">
                <Text fontSize="xs" color="gray.400" mb={2}>
                  Preview:
                </Text>
                <Box
                  w="60px"
                  h="60px"
                  borderRadius="md"
                  overflow="hidden"
                  bg="gray.600"
                >
                  <img
                    src={formData.logo}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>

          <Flex gap={3} justifyContent="flex-end">
            <Button
              onClick={handleClose}
              variant="ghost"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Criando...' : 'Criar Equipe'}
            </Button>
          </Flex>
        </form>
      </Box>
    </Box>
  )
}
