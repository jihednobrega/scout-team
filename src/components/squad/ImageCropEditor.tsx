'use client'

import { useState, useCallback, useRef } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import {
  Box,
  Flex,
  Button,
  Text,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Icon,
  VStack,
} from '@chakra-ui/react'
import { IoCloudUploadOutline, IoRemoveOutline, IoAddOutline } from 'react-icons/io5'

interface ImageCropEditorProps {
  /** When crop is confirmed, returns the cropped image as a data URL */
  onCropComplete: (croppedImage: string) => void
  /** Aspect ratio for the crop area (default: 1 for square) */
  aspect?: number
}

/** Generates a cropped image from a source image and crop area */
async function getCroppedImg(imageSrc: string, crop: Area): Promise<string> {
  const image = new window.Image()
  image.crossOrigin = 'anonymous'

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = reject
    image.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const outputSize = 400 // output 400x400 (or aspect-adjusted)
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas context not available')

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize,
  )

  return canvas.toDataURL('image/jpeg', 0.85)
}

export function ImageCropEditor({ onCropComplete, aspect = 1 }: ImageCropEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((z: number) => {
    setZoom(z)
  }, [])

  const onCropAreaComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      setImageSrc(reader.result as string)
      setCroppedPreview(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.readAsDataURL(file)
  }

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels)
      setCroppedPreview(cropped)
      onCropComplete(cropped)
    } catch (err) {
      console.error('Erro ao recortar imagem:', err)
    }
  }

  const handleChangePicture = () => {
    setImageSrc(null)
    setCroppedPreview(null)
    setCroppedAreaPixels(null)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── State: Cropped preview confirmed ──
  if (croppedPreview) {
    return (
      <Box>
        <Flex
          direction="column"
          align="center"
          gap={3}
        >
          <Box
            w="140px"
            h="140px"
            borderRadius="16px"
            overflow="hidden"
            border="2px solid"
            borderColor="blue.400"
            boxShadow="0 0 20px rgba(66,153,225,0.15)"
          >
            <img
              src={croppedPreview}
              alt="Foto recortada"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </Box>
          <Button
            size="xs"
            variant="ghost"
            color="whiteAlpha.500"
            fontSize="xs"
            _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
            onClick={handleChangePicture}
          >
            Trocar foto
          </Button>
        </Flex>
      </Box>
    )
  }

  // ── State: Image loaded, show cropper ──
  if (imageSrc) {
    return (
      <Box>
        {/* Crop area */}
        <Box
          position="relative"
          h="280px"
          borderRadius="xl"
          overflow="hidden"
          bg="black"
          border="1px solid"
          borderColor="whiteAlpha.100"
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape="rect"
            showGrid={false}
            maxZoom={7}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
            style={{
              containerStyle: { borderRadius: '12px' },
              cropAreaStyle: {
                border: '2px solid rgba(66,153,225,0.8)',
                borderRadius: '12px',
              },
            }}
          />
        </Box>

        {/* Zoom slider */}
        <Flex align="center" gap={3} mt={3} px={1}>
          <Icon as={IoRemoveOutline} color="whiteAlpha.400" boxSize={4} />
          <Slider
            aria-label="Zoom"
            min={1}
            max={7}
            step={0.05}
            value={zoom}
            onChange={onZoomChange}
            flex={1}
          >
            <SliderTrack bg="whiteAlpha.100" h="4px" borderRadius="full">
              <SliderFilledTrack bg="blue.400" />
            </SliderTrack>
            <SliderThumb
              boxSize={4}
              bg="white"
              boxShadow="0 0 4px rgba(0,0,0,0.4)"
            />
          </Slider>
          <Icon as={IoAddOutline} color="whiteAlpha.400" boxSize={4} />
        </Flex>

        {/* Actions */}
        <Flex gap={2} mt={3}>
          <Button
            size="sm"
            flex={1}
            bg="blue.500"
            color="white"
            borderRadius="lg"
            fontWeight="700"
            fontSize="xs"
            _hover={{ bg: 'blue.400' }}
            onClick={handleConfirmCrop}
          >
            Confirmar recorte
          </Button>
          <Button
            size="sm"
            variant="ghost"
            color="whiteAlpha.500"
            borderRadius="lg"
            fontWeight="600"
            fontSize="xs"
            _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
            onClick={handleChangePicture}
          >
            Outra foto
          </Button>
        </Flex>

        <Text color="whiteAlpha.300" fontSize="10px" mt={2} textAlign="center">
          Arraste e use o zoom para enquadrar o atleta
        </Text>
      </Box>
    )
  }

  // ── State: No image, show upload area ──
  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <Box
        onClick={() => fileInputRef.current?.click()}
        cursor="pointer"
        border="2px dashed"
        borderColor="whiteAlpha.200"
        borderRadius="xl"
        h="160px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="whiteAlpha.50"
        transition="all 0.2s"
        _hover={{
          borderColor: 'whiteAlpha.400',
          bg: 'whiteAlpha.100',
        }}
      >
        <VStack spacing={2}>
          <Icon as={IoCloudUploadOutline} color="whiteAlpha.400" boxSize={8} />
          <Text color="whiteAlpha.400" fontSize="xs" fontWeight="600">
            Enviar foto do time ou do atleta
          </Text>
          <Text color="whiteAlpha.300" fontSize="10px">
            JPG, PNG ou WebP
          </Text>
        </VStack>
      </Box>
    </Box>
  )
}
