// app/components/dashboard/BottomNav.tsx
'use client'

import { Box, Flex, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { icon: '/icons/dashboard.svg',   label: 'Dashboard',    href: '/'            },
  { icon: '/icons/new-game.svg',    label: 'Novo Jogo',    href: '/game'        },
  { icon: '/icons/statistics.svg',  label: 'Estatísticas', href: '/statistics'  },
  { icon: '/icons/ai-insights.svg', label: 'IA',           href: '/ai-insights' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <Box
      position="fixed"
      bottom="0"
      left="0"
      right="0"
      bg="gray.900"
      borderTop="1px"
      borderColor="gray.800"
      shadow="2xl"
      zIndex={100}
      display={{ base: 'block', md: 'none' }}
    >
      <Flex
        justify="space-around"
        align="center"
        px={2}
        py={2}
        maxW="600px"
        mx="auto"
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link key={item.href} href={item.href}>
              <Flex
                direction="column"
                align="center"
                justify="center"
                gap={1}
                px={3}
                py={2}
                borderRadius="lg"
                transition="all 0.2s"
                bg={isActive ? 'gray.800' : 'transparent'}
                _active={{
                  transform: 'scale(0.95)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.icon} alt=""
                  width={24} height={24}
                  style={{
                    display: 'block',
                    objectFit: 'contain',
                    opacity: isActive ? 1 : 0.5,
                    transition: 'opacity 0.2s',
                  }}
                />
                <Text
                  fontSize="2xs"
                  fontWeight={isActive ? 'bold' : 'medium'}
                  color={isActive ? 'blue.400' : 'gray.400'}
                  transition="all 0.2s"
                >
                  {item.label}
                </Text>
                {isActive && (
                  <Box
                    w="4"
                    h="1"
                    bg="blue.400"
                    borderRadius="full"
                    mt={1}
                  />
                )}
              </Flex>
            </Link>
          )
        })}
      </Flex>
    </Box>
  )
}
