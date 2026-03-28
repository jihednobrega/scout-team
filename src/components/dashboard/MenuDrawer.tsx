// app/components/dashboard/MenuDrawer.tsx
'use client'

import { Box, Flex, Text, IconButton } from '@chakra-ui/react'
import Link from 'next/link'
import { useTeamContext } from '@/contexts/TeamContext'

interface MenuDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  { icon: '/icons/dashboard.svg',  label: 'Dashboard',    href: '/',          requiresTeam: false },
  { icon: '/icons/new-game.svg',   label: 'Novo Jogo',    href: '/game',      requiresTeam: true  },
  { icon: '/icons/squad.svg',      label: 'Minha Equipe', href: '/squad',     requiresTeam: true  },
  { icon: '/icons/history.svg',    label: 'Jogos',        href: '/history',   requiresTeam: true  },
  { icon: '/icons/statistics.svg', label: 'Estatísticas', href: '/statistics',requiresTeam: true  },
  { icon: '/icons/reports.svg',    label: 'Relatórios',   href: '/reports',   requiresTeam: true  },
  { icon: '/icons/settings.svg',   label: 'Configurações',href: '/settings',  requiresTeam: false },
]

export default function MenuDrawer({ isOpen, onClose }: MenuDrawerProps) {
  const { selectedTeam } = useTeamContext()
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0, 0, 0, 0.6)"
          zIndex={998}
          onClick={onClose}
          css={{
            animation: 'fadeIn 0.2s ease-in-out',
            '@keyframes fadeIn': {
              from: { opacity: 0 },
              to: { opacity: 1 },
            },
          }}
        />
      )}

      {/* Drawer */}
      <Box
        position="fixed"
        top="0"
        left={isOpen ? '0' : '-280px'}
        bottom="0"
        w="280px"
        bg="gray.900"
        borderRight="1px"
        borderColor="gray.800"
        shadow="2xl"
        zIndex={999}
        transition="left 0.3s ease-in-out"
        overflowY="auto"
      >
        {/* Header do Drawer */}
        <Flex
          align="center"
          justify="space-between"
          p={4}
          borderBottom="1px"
          borderColor="gray.800"
        >
          <Flex align="center" gap={2}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.svg" alt="Scout Team" width={28} height={28} style={{ display: 'block', objectFit: 'contain' }} />
            <Text fontSize="lg" fontWeight="bold" color="white">
              Scout Team
            </Text>
          </Flex>
          <IconButton
            aria-label="Fechar menu"
            onClick={onClose}
            variant="ghost"
            colorScheme="gray"
            _hover={{ bg: 'gray.800' }}
            size="sm"
          >
            <Text fontSize="xl">✕</Text>
          </IconButton>
        </Flex>

        {/* Menu Items */}
        <Flex direction="column" gap={1} p={3}>
          {menuItems.map((item) => {
            const isDisabled = item.requiresTeam && !selectedTeam

            if (isDisabled) {
              return (
                <Flex
                  key={item.href}
                  align="center"
                  gap={3}
                  p={3}
                  borderRadius="lg"
                  cursor="not-allowed"
                  opacity={0.4}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.icon} alt="" width={20} height={20} style={{ display: 'block', objectFit: 'contain' }} />
                  <Text color="gray.500" fontWeight="medium">
                    {item.label}
                  </Text>
                </Flex>
              )
            }

            return (
              <Link key={item.href} href={item.href} onClick={onClose}>
                <Flex
                  align="center"
                  gap={3}
                  p={3}
                  borderRadius="lg"
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{
                    bg: 'gray.800',
                    transform: 'translateX(4px)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.icon} alt="" width={20} height={20} style={{ display: 'block', objectFit: 'contain' }} />
                  <Text color="gray.200" fontWeight="medium">
                    {item.label}
                  </Text>
                </Flex>
              </Link>
            )
          })}
        </Flex>

        {/* Footer do Drawer */}
        <Box
          position="absolute"
          bottom="0"
          left="0"
          right="0"
          p={4}
          borderTop="1px"
          borderColor="gray.800"
        >
          <Text fontSize="xs" color="gray.500" textAlign="center">
            Scout Team v1.0
          </Text>
        </Box>
      </Box>
    </>
  )
}
