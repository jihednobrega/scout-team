'use client'

import { useState, useRef, useEffect } from 'react'
import { Box, Flex, Text, IconButton, Tooltip } from '@chakra-ui/react'
import { IoPhonePortraitOutline, IoTabletPortraitOutline, IoDesktopOutline, IoRefreshOutline } from 'react-icons/io5'

const DEVICES = [
  { key: 'mobile',   label: 'Mobile',      icon: IoPhonePortraitOutline,  w: 390,  h: 844  },
  { key: 'tablet',   label: 'Tablet',      icon: IoTabletPortraitOutline, w: 768,  h: 1024 },
  { key: 'desktop',  label: 'Desktop',     icon: IoDesktopOutline,        w: 1280, h: 900  },
  { key: 'fullhd',   label: 'Full HD',     icon: IoDesktopOutline,        w: 1920, h: 1080 },
] as const

type DeviceKey = typeof DEVICES[number]['key']

export default function PreviewPage() {
  const [device, setDevice] = useState<DeviceKey>('mobile')
  const [scale, setScale]   = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef    = useRef<HTMLIFrameElement>(null)

  const currentDevice = DEVICES.find((d) => d.key === device)!

  // Calcula escala para caber no container
  useEffect(() => {
    function calcScale() {
      if (!containerRef.current) return
      const availW = containerRef.current.clientWidth  - 48
      const availH = containerRef.current.clientHeight - 48
      const scaleW = availW  / currentDevice.w
      const scaleH = availH  / currentDevice.h
      setScale(Math.min(1, scaleW, scaleH))
    }
    calcScale()
    window.addEventListener('resize', calcScale)
    return () => window.removeEventListener('resize', calcScale)
  }, [currentDevice])

  function reload() {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }

  return (
    <Box h="calc(100vh - 80px)" display="flex" flexDirection="column" overflow="hidden">

      {/* ── Toolbar ── */}
      <Flex
        align="center" justify="space-between" px={4} py={3} flexShrink={0}
        borderBottom="1px solid" borderColor="gray.800"
      >
        {/* Seletor de dispositivo */}
        <Flex align="center" gap={1}
          bg="gray.800" borderRadius="xl" p={1}>
          {DEVICES.map((d) => {
            const isActive = device === d.key
            return (
              <Tooltip key={d.key} label={`${d.label} — ${d.w}×${d.h}`} hasArrow placement="bottom">
                <Flex
                  align="center" gap={1.5} px={3} py={1.5} borderRadius="lg"
                  cursor="pointer" transition="all 0.15s"
                  bg={isActive ? 'gray.700' : 'transparent'}
                  color={isActive ? 'white' : 'gray.500'}
                  onClick={() => setDevice(d.key)}
                  _hover={{ color: 'white' }}
                >
                  <d.icon size={16} />
                  <Text fontSize="xs" fontWeight={isActive ? '600' : '400'}>{d.label}</Text>
                  <Text fontSize="10px" color="gray.500">{d.w}px</Text>
                </Flex>
              </Tooltip>
            )
          })}
        </Flex>

        {/* Reload */}
        <Tooltip label="Recarregar" hasArrow>
          <IconButton
            aria-label="Recarregar portal"
            icon={<IoRefreshOutline size={16} />}
            size="sm" variant="ghost" colorScheme="gray"
            onClick={reload}
          />
        </Tooltip>
      </Flex>

      {/* ── Preview ── */}
      <Box ref={containerRef} flex={1} overflow="hidden" bg="gray.950"
        display="flex" alignItems="center" justifyContent="center">

        {/* Device frame */}
        <Box
          position="relative"
          style={{
            width:  currentDevice.w * scale,
            height: currentDevice.h * scale,
            transition: 'width 0.3s ease, height 0.3s ease',
          }}
        >
          {/* Sombra / borda simulando device */}
          <Box
            position="absolute" inset="-2px" borderRadius={device === 'mobile' ? '28px' : device === 'tablet' ? '20px' : '8px'}
            style={{
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.6)',
              background: 'rgba(255,255,255,0.04)',
            }}
          />

          {/* Iframe escalado */}
          <Box
            overflow="hidden" position="relative"
            borderRadius={device === 'mobile' ? '26px' : device === 'tablet' ? '18px' : '6px'}
            style={{ width: currentDevice.w * scale, height: currentDevice.h * scale }}
          >
            <iframe
              ref={iframeRef}
              src="/portal/login"
              title="Portal preview"
              style={{
                width:  currentDevice.w,
                height: currentDevice.h,
                border: 'none',
                display: 'block',
                transformOrigin: 'top left',
                transform: `scale(${scale})`,
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* ── Status bar ── */}
      <Flex
        align="center" justify="center" gap={3} py={2} flexShrink={0}
        borderTop="1px solid" borderColor="gray.800"
      >
        <Text fontSize="11px" color="gray.600">
          {currentDevice.w} × {currentDevice.h}
          {scale < 1 && ` · ${Math.round(scale * 100)}% zoom`}
        </Text>
        <Box w="1px" h="10px" bg="gray.700" />
        <Text fontSize="11px" color="gray.600">/portal/login</Text>
      </Flex>

    </Box>
  )
}
