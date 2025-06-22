// Advanced Animation System for ChainBridge DEX
import { keyframes } from '@chakra-ui/react'

// Keyframe Animations
export const animations = {
  // Loading animations
  spin: keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  `,
  
  pulse: keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  `,
  
  bounce: keyframes`
    0%, 20%, 53%, 80%, 100% { transform: translate3d(0,0,0); }
    40%, 43% { transform: translate3d(0, -30px, 0); }
    70% { transform: translate3d(0, -15px, 0); }
    90% { transform: translate3d(0, -4px, 0); }
  `,
  
  // Slide animations
  slideInUp: keyframes`
    from {
      transform: translate3d(0, 100%, 0);
      visibility: visible;
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  `,
  
  slideInDown: keyframes`
    from {
      transform: translate3d(0, -100%, 0);
      visibility: visible;
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  `,
  
  slideInLeft: keyframes`
    from {
      transform: translate3d(-100%, 0, 0);
      visibility: visible;
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  `,
  
  slideInRight: keyframes`
    from {
      transform: translate3d(100%, 0, 0);
      visibility: visible;
    }
    to {
      transform: translate3d(0, 0, 0);
    }
  `,
  
  // Fade animations
  fadeIn: keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
  `,
  
  fadeInUp: keyframes`
    from {
      opacity: 0;
      transform: translate3d(0, 100%, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  `,
  
  fadeInDown: keyframes`
    from {
      opacity: 0;
      transform: translate3d(0, -100%, 0);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  `,
  
  // Scale animations
  zoomIn: keyframes`
    from {
      opacity: 0;
      transform: scale3d(0.3, 0.3, 0.3);
    }
    50% {
      opacity: 1;
    }
  `,
  
  zoomOut: keyframes`
    from {
      opacity: 1;
    }
    50% {
      opacity: 0;
      transform: scale3d(0.3, 0.3, 0.3);
    }
    to {
      opacity: 0;
    }
  `,
  
  // DeFi specific animations
  priceUp: keyframes`
    0% { transform: translateY(0); color: inherit; }
    50% { transform: translateY(-5px); color: var(--chakra-colors-success-500); }
    100% { transform: translateY(0); color: var(--chakra-colors-success-500); }
  `,
  
  priceDown: keyframes`
    0% { transform: translateY(0); color: inherit; }
    50% { transform: translateY(5px); color: var(--chakra-colors-error-500); }
    100% { transform: translateY(0); color: var(--chakra-colors-error-500); }
  `,
  
  glow: keyframes`
    0%, 100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.5); }
    50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.6); }
  `,
  
  shimmer: keyframes`
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  `,
  
  // Transaction status animations
  success: keyframes`
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  `,
  
  error: keyframes`
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
    20%, 40%, 60%, 80% { transform: translateX(10px); }
  `,
  
  // Loading states
  skeletonWave: keyframes`
    0% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
    100% { transform: translateX(100%); }
  `,
  
  // Micro-interactions
  heartbeat: keyframes`
    0% { transform: scale(1); }
    14% { transform: scale(1.3); }
    28% { transform: scale(1); }
    42% { transform: scale(1.3); }
    70% { transform: scale(1); }
  `,
  
  wobble: keyframes`
    from { transform: translate3d(0, 0, 0); }
    15% { transform: translate3d(-25%, 0, 0) rotate3d(0, 0, 1, -5deg); }
    30% { transform: translate3d(20%, 0, 0) rotate3d(0, 0, 1, 3deg); }
    45% { transform: translate3d(-15%, 0, 0) rotate3d(0, 0, 1, -3deg); }
    60% { transform: translate3d(10%, 0, 0) rotate3d(0, 0, 1, 2deg); }
    75% { transform: translate3d(-5%, 0, 0) rotate3d(0, 0, 1, -1deg); }
    to { transform: translate3d(0, 0, 0); }
  `,
}

// Animation Utilities
export const animationUtils = {
  // Duration presets
  duration: {
    fastest: '0.1s',
    faster: '0.15s',
    fast: '0.2s',
    normal: '0.3s',
    slow: '0.5s',
    slower: '0.75s',
    slowest: '1s',
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
    easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
    easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
    easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
    easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    // Custom DeFi easing
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  
  // Common animation combinations
  fadeInUp: {
    animation: `fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
  },
  
  slideInFromLeft: {
    animation: `slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
  },
  
  bounceIn: {
    animation: `bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards`,
  },
  
  pulseGlow: {
    animation: `glow 2s ease-in-out infinite`,
  },
  
  shimmerLoading: {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200px 100%',
    animation: `shimmer 1.5s infinite`,
  },
}

// Stagger animation helper
export const staggerChildren = (delay = 0.1) => ({
  '& > *': {
    opacity: 0,
    transform: 'translateY(20px)',
    animation: `fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
  },
  '& > *:nth-of-type(1)': { animationDelay: `${delay * 1}s` },
  '& > *:nth-of-type(2)': { animationDelay: `${delay * 2}s` },
  '& > *:nth-of-type(3)': { animationDelay: `${delay * 3}s` },
  '& > *:nth-of-type(4)': { animationDelay: `${delay * 4}s` },
  '& > *:nth-of-type(5)': { animationDelay: `${delay * 5}s` },
  '& > *:nth-of-type(6)': { animationDelay: `${delay * 6}s` },
})

// Hover effects
export const hoverEffects = {
  lift: {
    transition: 'transform 0.2s ease-out',
    _hover: {
      transform: 'translateY(-4px)',
    },
  },
  
  scale: {
    transition: 'transform 0.2s ease-out',
    _hover: {
      transform: 'scale(1.05)',
    },
  },
  
  glow: {
    transition: 'box-shadow 0.3s ease-out',
    _hover: {
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)',
    },
  },
  
  rotate: {
    transition: 'transform 0.3s ease-out',
    _hover: {
      transform: 'rotate(5deg)',
    },
  },
}
