'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Flex,
  VStack,
  Text,
  Input,
  Button,
  Icon,
  InputGroup,
  InputRightElement,
  IconButton,
} from '@chakra-ui/react'
import { IoEyeOutline, IoEyeOffOutline, IoShieldCheckmarkOutline } from 'react-icons/io5'

export default function PortalLoginPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Código inválido')
        setIsLoading(false)
        return
      }

      // Redireciona conforme a role
      if (data.role === 'coach') {
        router.push('/portal/treinador')
      } else {
        router.push('/portal/atleta')
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setIsLoading(false)
    }
  }

  return (
    <Flex
      minH="100dvh"
      align="center"
      justify="center"
      px={4}
      bg="#0a0a0f"
    >
      <Box w="full" maxW="360px">

        {/* Logo / título */}
        <VStack spacing={2} mb={10} align="center">
          <Flex
            w="56px"
            h="56px"
            borderRadius="16px"
            bg="whiteAlpha.100"
            border="1px solid"
            borderColor="whiteAlpha.200"
            align="center"
            justify="center"
            mb={1}
          >
            <Icon as={IoShieldCheckmarkOutline} color="white" boxSize={7} />
          </Flex>
          <Text color="white" fontSize="xl" fontWeight="800" letterSpacing="-0.02em">
            Portal
          </Text>
          <Text color="gray.500" fontSize="sm" textAlign="center">
            Digite seu código de acesso
          </Text>
        </VStack>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <Box w="full">
              <InputGroup>
                <Input
                  ref={inputRef}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value)
                    setError('')
                  }}
                  type={showCode ? 'text' : 'password'}
                  placeholder="Código de acesso"
                  bg="whiteAlpha.50"
                  border="1px solid"
                  borderColor={error ? 'red.500' : 'whiteAlpha.200'}
                  borderRadius="xl"
                  color="white"
                  fontSize="md"
                  h="52px"
                  letterSpacing={showCode ? 'normal' : '0.2em'}
                  _placeholder={{ color: 'whiteAlpha.300', letterSpacing: 'normal' }}
                  _hover={{ borderColor: 'whiteAlpha.300' }}
                  _focus={{
                    borderColor: error ? 'red.400' : 'whiteAlpha.400',
                    boxShadow: 'none',
                  }}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <InputRightElement h="52px" pr={1}>
                  <IconButton
                    aria-label={showCode ? 'Ocultar código' : 'Mostrar código'}
                    icon={<Icon as={showCode ? IoEyeOffOutline : IoEyeOutline} boxSize={4} />}
                    size="sm"
                    variant="ghost"
                    color="gray.500"
                    _hover={{ color: 'white', bg: 'transparent' }}
                    onClick={() => setShowCode((v) => !v)}
                    tabIndex={-1}
                  />
                </InputRightElement>
              </InputGroup>

              {error && (
                <Text color="red.400" fontSize="xs" mt={2} pl={1}>
                  {error}
                </Text>
              )}
            </Box>

            <Button
              type="submit"
              w="full"
              h="52px"
              bg="white"
              color="black"
              fontWeight="700"
              fontSize="sm"
              borderRadius="xl"
              isLoading={isLoading}
              loadingText="Verificando..."
              _hover={{ bg: 'gray.100' }}
              _active={{ bg: 'gray.200' }}
            >
              Entrar
            </Button>
          </VStack>
        </form>

      </Box>
    </Flex>
  )
}
