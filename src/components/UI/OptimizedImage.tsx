import React, { useState, useCallback, useRef, useEffect } from 'react'
import Image, { ImageProps } from 'next/image'
import { Box, Skeleton, useColorModeValue } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useIntersectionObserver, useImageOptimization } from '@/hooks/usePerformance'

const MotionBox = motion(Box)

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string
  showSkeleton?: boolean
  skeletonHeight?: string | number
  lazy?: boolean
  preload?: boolean
  blurDataURL?: string
  onLoadComplete?: () => void
  onError?: (error: Error) => void
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc,
  showSkeleton = true,
  skeletonHeight = '200px',
  lazy = true,
  preload = false,
  blurDataURL,
  onLoadComplete,
  onError,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [isVisible, setIsVisible] = useState(!lazy)
  
  const imageRef = useRef<HTMLDivElement>(null)
  const { preloadImage } = useImageOptimization()
  const { observe, unobserve, entries } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px',
  })

  const skeletonBg = useColorModeValue('gray.200', 'gray.700')

  // Handle intersection observer for lazy loading
  useEffect(() => {
    if (lazy && imageRef.current) {
      observe(imageRef.current)
      
      return () => {
        if (imageRef.current) {
          unobserve(imageRef.current)
        }
      }
    }
  }, [lazy, observe, unobserve])

  // Check if image is visible
  useEffect(() => {
    if (lazy && entries.length > 0) {
      const entry = entries.find(e => e.target === imageRef.current)
      if (entry?.isIntersecting) {
        setIsVisible(true)
        if (imageRef.current) {
          unobserve(imageRef.current)
        }
      }
    }
  }, [entries, lazy, unobserve])

  // Preload image if requested
  useEffect(() => {
    if (preload && typeof src === 'string') {
      preloadImage(src).catch(console.error)
    }
  }, [preload, src, preloadImage])

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
    onLoadComplete?.()
  }, [onLoadComplete])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
    
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setHasError(false)
      setIsLoading(true)
    } else {
      onError?.(new Error(`Failed to load image: ${src}`))
    }
  }, [fallbackSrc, currentSrc, src, onError])

  // Generate blur data URL if not provided
  const getBlurDataURL = useCallback(() => {
    if (blurDataURL) return blurDataURL
    
    // Generate a simple blur data URL
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmM2Y0ZjYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNlNWU3ZWIiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNnKSIvPjwvc3ZnPg=='
  }, [blurDataURL])

  return (
    <Box ref={imageRef} position="relative" {...props}>
      <AnimatePresence mode="wait">
        {showSkeleton && isLoading && (
          <MotionBox
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={1}
          >
            <Skeleton
              height={skeletonHeight}
              width="100%"
              borderRadius="md"
              startColor={skeletonBg}
              endColor={useColorModeValue('gray.300', 'gray.600')}
            />
          </MotionBox>
        )}
        
        {isVisible && (
          <MotionBox
            key="image"
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoading ? 0 : 1 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src={currentSrc}
              alt={alt}
              onLoad={handleLoad}
              onError={handleError}
              placeholder="blur"
              blurDataURL={getBlurDataURL()}
              quality={85}
              priority={preload}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              style={{
                objectFit: 'cover',
                borderRadius: '8px',
              }}
              {...props}
            />
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  )
}

// Avatar component with optimized loading
interface OptimizedAvatarProps {
  src?: string
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  fallbackSrc?: string
  showBorder?: boolean
}

export const OptimizedAvatar: React.FC<OptimizedAvatarProps> = ({
  src,
  name,
  size = 'md',
  fallbackSrc,
  showBorder = false,
}) => {
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
    '2xl': 128,
  }

  const pixelSize = sizeMap[size]
  const borderColor = useColorModeValue('white', 'gray.800')

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Generate a deterministic color from name
  const getAvatarColor = (name: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ]
    
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <Box
      position="relative"
      width={`${pixelSize}px`}
      height={`${pixelSize}px`}
      borderRadius="full"
      overflow="hidden"
      border={showBorder ? '2px solid' : 'none'}
      borderColor={borderColor}
      bg={getAvatarColor(name)}
      display="flex"
      alignItems="center"
      justifyContent="center"
      color="white"
      fontWeight="bold"
      fontSize={`${pixelSize / 3}px`}
    >
      {src ? (
        <OptimizedImage
          src={src}
          alt={`${name} avatar`}
          fallbackSrc={fallbackSrc}
          width={pixelSize}
          height={pixelSize}
          showSkeleton={false}
          style={{
            borderRadius: '50%',
          }}
        />
      ) : (
        getInitials(name)
      )}
    </Box>
  )
}

// Logo component with multiple format support
interface OptimizedLogoProps {
  src: string
  alt: string
  width: number
  height: number
  darkModeSrc?: string
  priority?: boolean
}

export const OptimizedLogo: React.FC<OptimizedLogoProps> = ({
  src,
  alt,
  width,
  height,
  darkModeSrc,
  priority = true,
}) => {
  const isDark = useColorModeValue(false, true)
  const logoSrc = isDark && darkModeSrc ? darkModeSrc : src

  return (
    <OptimizedImage
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      preload={priority}
      showSkeleton={false}
      style={{
        objectFit: 'contain',
      }}
    />
  )
}

// Background image component with lazy loading
interface OptimizedBackgroundProps {
  src: string
  children: React.ReactNode
  overlay?: boolean
  overlayOpacity?: number
}

export const OptimizedBackground: React.FC<OptimizedBackgroundProps> = ({
  src,
  children,
  overlay = false,
  overlayOpacity = 0.5,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)

  return (
    <Box position="relative" overflow="hidden">
      <OptimizedImage
        src={src}
        alt="Background"
        fill
        style={{
          objectFit: 'cover',
          zIndex: -1,
        }}
        onLoadComplete={() => setImageLoaded(true)}
        priority={false}
        lazy={true}
      />
      
      {overlay && imageLoaded && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="black"
          opacity={overlayOpacity}
          zIndex={0}
        />
      )}
      
      <Box position="relative" zIndex={1}>
        {children}
      </Box>
    </Box>
  )
}
