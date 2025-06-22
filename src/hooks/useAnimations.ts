import { useAnimation, useInView } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

// Hook for scroll-triggered animations
export const useScrollAnimation = (threshold = 0.1) => {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    amount: threshold,
    once: true // Only trigger once
  })
  const controls = useAnimation()

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    }
  }, [isInView, controls])

  const variants = {
    hidden: {
      opacity: 0,
      y: 50,
      transition: { duration: 0.3 }
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  return { ref, controls, variants, isInView }
}

// Hook for staggered children animations
export const useStaggerAnimation = (delay = 0.1) => {
  const controls = useAnimation()

  const staggerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: delay,
        delayChildren: 0.2
      }
    }
  }

  const childVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  }

  return { controls, staggerVariants, childVariants }
}

// Hook for hover animations
export const useHoverAnimation = () => {
  const [isHovered, setIsHovered] = useState(false)

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  }

  const variants = {
    rest: {
      scale: 1,
      y: 0,
      transition: { duration: 0.2 }
    },
    hover: {
      scale: 1.05,
      y: -4,
      transition: { duration: 0.2 }
    }
  }

  return { isHovered, hoverProps, variants }
}

// Hook for price change animations
export const usePriceAnimation = () => {
  const [previousPrice, setPreviousPrice] = useState<number | null>(null)
  const [animationState, setAnimationState] = useState<'up' | 'down' | 'neutral'>('neutral')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const updatePrice = useCallback((newPrice: number) => {
    if (previousPrice !== null) {
      if (newPrice > previousPrice) {
        setAnimationState('up')
      } else if (newPrice < previousPrice) {
        setAnimationState('down')
      }

      // Reset animation state after 2 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setAnimationState('neutral')
      }, 2000)
    }

    setPreviousPrice(newPrice)
  }, [previousPrice])

  const variants = {
    up: {
      color: '#10b981',
      scale: [1, 1.1, 1],
      transition: { duration: 0.5 }
    },
    down: {
      color: '#ef4444',
      scale: [1, 1.1, 1],
      transition: { duration: 0.5 }
    },
    neutral: {
      scale: 1,
      transition: { duration: 0.3 }
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { updatePrice, animationState, variants }
}

// Hook for loading states with skeleton animations
export const useLoadingAnimation = (isLoading: boolean) => {
  const variants = {
    loading: {
      opacity: [0.5, 1, 0.5],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    },
    loaded: {
      opacity: 1,
      transition: { duration: 0.3 }
    }
  }

  return {
    variants,
    animate: isLoading ? 'loading' : 'loaded'
  }
}

// Hook for success/error feedback animations
export const useFeedbackAnimation = () => {
  const [feedbackState, setFeedbackState] = useState<'idle' | 'success' | 'error'>('idle')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const triggerSuccess = useCallback(() => {
    setFeedbackState('success')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setFeedbackState('idle'), 3000)
  }, [])

  const triggerError = useCallback(() => {
    setFeedbackState('error')
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setFeedbackState('idle'), 3000)
  }, [])

  const variants = {
    idle: {
      scale: 1,
      transition: { duration: 0.2 }
    },
    success: {
      scale: [1, 1.2, 1],
      backgroundColor: '#10b981',
      transition: { duration: 0.6 }
    },
    error: {
      x: [-10, 10, -10, 10, 0],
      backgroundColor: '#ef4444',
      transition: { duration: 0.6 }
    }
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { feedbackState, triggerSuccess, triggerError, variants }
}

// Hook for card flip animations
export const useCardFlip = () => {
  const [isFlipped, setIsFlipped] = useState(false)

  const flipCard = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  const variants = {
    front: {
      rotateY: 0,
      transition: { duration: 0.6 }
    },
    back: {
      rotateY: 180,
      transition: { duration: 0.6 }
    }
  }

  return { isFlipped, flipCard, variants }
}

// Hook for number counting animation
export const useCountAnimation = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const startAnimation = useCallback(() => {
    setIsAnimating(true)
    const startTime = Date.now()
    const startValue = count

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.floor(startValue + (end - startValue) * easeOut)

      setCount(currentValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    requestAnimationFrame(animate)
  }, [count, end, duration])

  return { count, startAnimation, isAnimating }
}

// Hook for parallax scrolling effect
export const useParallax = (speed = 0.5) => {
  const [offset, setOffset] = useState(0)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        const scrolled = window.pageYOffset
        const rate = scrolled * speed
        setOffset(rate)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed])

  return { ref, offset }
}

// Hook for typewriter effect
export const useTypewriter = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const startTyping = useCallback(() => {
    setIsTyping(true)
    setDisplayText('')

    let index = 0
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(prev => prev + text.charAt(index))
        index++
      } else {
        clearInterval(timer)
        setIsTyping(false)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [text, speed])

  return { displayText, isTyping, startTyping }
}

// Hook for advanced scroll animations with multiple variants
export const useAdvancedScrollAnimation = (animationType = 'fadeUp', threshold = 0.1) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { amount: threshold, once: true })
  const controls = useAnimation()

  const animationVariants = {
    fadeUp: {
      hidden: { opacity: 0, y: 50 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
    },
    fadeDown: {
      hidden: { opacity: 0, y: -50 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
    },
    fadeLeft: {
      hidden: { opacity: 0, x: -50 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
    },
    fadeRight: {
      hidden: { opacity: 0, x: 50 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
    },
    scale: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut' } }
    },
    rotate: {
      hidden: { opacity: 0, rotate: -10 },
      visible: { opacity: 1, rotate: 0, transition: { duration: 0.8, ease: 'easeOut' } }
    },
    bounce: {
      hidden: { opacity: 0, y: 50 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, type: 'spring', bounce: 0.4 }
      }
    },
    elastic: {
      hidden: { opacity: 0, scale: 0 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 1, type: 'spring', stiffness: 300, damping: 20 }
      }
    }
  }

  const variants = animationVariants[animationType] || animationVariants.fadeUp

  useEffect(() => {
    if (isInView) {
      controls.start('visible')
    }
  }, [isInView, controls])

  return { ref, controls, variants, isInView }
}

// Hook for morphing animations
export const useMorphAnimation = () => {
  const [morphState, setMorphState] = useState(0)

  const morphVariants = {
    0: { borderRadius: '0%', rotate: 0 },
    1: { borderRadius: '50%', rotate: 180 },
    2: { borderRadius: '25%', rotate: 360 },
  }

  const nextMorph = useCallback(() => {
    setMorphState(prev => (prev + 1) % 3)
  }, [])

  return { morphState, morphVariants, nextMorph }
}

// Hook for liquid animations
export const useLiquidAnimation = () => {
  const variants = {
    liquid: {
      borderRadius: ['20%', '60%', '40%', '80%', '20%'],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  }

  return { variants }
}
