'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Icon } from '@chakra-ui/react'
import { IoLogOutOutline } from 'react-icons/io5'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await fetch('/api/portal/logout', { method: 'POST' })
    router.push('/portal/login')
  }

  return (
    <Button
      size="xs"
      variant="ghost"
      color="gray.500"
      leftIcon={<Icon as={IoLogOutOutline} boxSize={3.5} />}
      onClick={handleLogout}
      isLoading={loading}
      _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
      borderRadius="lg"
      fontSize="xs"
    >
      Sair
    </Button>
  )
}
