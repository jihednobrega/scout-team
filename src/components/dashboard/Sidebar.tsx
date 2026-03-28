// app/components/dashboard/Sidebar.tsx
'use client'

import { Box, Flex, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTeamContext } from '@/contexts/TeamContext'

const mainItems = [
  { icon: '/icons/dashboard.svg',   label: 'Dashboard',    href: '/',            requiresTeam: false },
  { icon: '/icons/new-game.svg',    label: 'Novo Jogo',    href: '/game',        requiresTeam: true  },
  { icon: '/icons/squad.svg',       label: 'Minha Equipe', href: '/squad',       requiresTeam: true  },
  { icon: '/icons/history.svg',     label: 'Jogos',        href: '/history',     requiresTeam: true  },
  { icon: '/icons/statistics.svg',  label: 'Estatísticas', href: '/statistics',  requiresTeam: true  },
  { icon: '/icons/reports.svg',     label: 'Relatórios',   href: '/reports',     requiresTeam: true  },
  { icon: '/icons/ai-insights.svg', label: 'IA',           href: '/ai-insights', requiresTeam: true  },
]

const bottomItems = [
  { icon: '/icons/settings.svg', label: 'Configurações', href: '/settings', requiresTeam: false },
]

function NavItem({
  item,
  isActive,
  isDisabled,
}: {
  item: { icon: string; label: string; href: string }
  isActive: boolean
  isDisabled: boolean
}) {
  if (isDisabled) {
    return (
      <Flex
        align="center"
        gap={3}
        p={3}
        borderRadius="lg"
        cursor="not-allowed"
        opacity={0.4}
        color="gray.500"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.icon} alt="" width={20} height={20} style={{ display: 'block', objectFit: 'contain' }} />
        <Text fontWeight="medium" fontSize="sm">
          {item.label}
        </Text>
      </Flex>
    )
  }

  return (
    <Link href={item.href}>
      <Flex
        align="center"
        gap={3}
        p={3}
        borderRadius="lg"
        cursor="pointer"
        transition="all 0.15s"
        bg={isActive ? 'blue.500/15' : 'transparent'}
        color={isActive ? 'blue.300' : 'gray.400'}
        fontWeight={isActive ? 'bold' : 'medium'}
        _hover={{
          bg: isActive ? 'blue.500/15' : 'gray.800/60',
          color: isActive ? 'blue.300' : 'white',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.icon} alt="" width={20} height={20} style={{ display: 'block', objectFit: 'contain' }} />
        <Text fontSize="sm" fontWeight="inherit">
          {item.label}
        </Text>
      </Flex>
    </Link>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const { selectedTeam } = useTeamContext()

  return (
    <Box
      as="aside"
      position="fixed"
      left="0"
      top="0"
      bottom="0"
      w="240px"
      bg="gray.900"
      borderRight="1px"
      borderColor="gray.800"
      display={{ base: 'none', lg: 'block' }}
      overflowY="auto"
      zIndex={50}
    >
      {/* Logo/Header */}
      <Flex
        align="center"
        gap={2}
        p={5}
        h="90px"
        borderBottom="1px"
        borderColor="gray.800"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/logo.svg" alt="Scout Team" width={28} height={28} style={{ display: 'block', objectFit: 'contain' }} />
        <Text fontSize="lg" fontWeight="bold" color="white">
          Scout Team
        </Text>
      </Flex>

      {/* Main navigation */}
      <Flex direction="column" gap={1} p={3}>
        {mainItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            isDisabled={item.requiresTeam && !selectedTeam}
          />
        ))}
      </Flex>

      {/* Separator */}
      <Box mx={5} h="1px" bg="gray.800" />

      {/* Bottom navigation */}
      <Flex direction="column" gap={1} p={3}>
        {bottomItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={pathname === item.href}
            isDisabled={item.requiresTeam && !selectedTeam}
          />
        ))}
      </Flex>

      {/* Footer */}
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        p={4}
        borderTop="1px"
        borderColor="gray.800"
      >
        <Text fontSize="xs" color="gray.600" textAlign="center">
          Scout Team v1.0
        </Text>
      </Box>
    </Box>
  )
}
