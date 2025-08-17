// src/components/animations/bridge-animation/variants.ts
import { Variants } from 'framer-motion'

// Car animation variants
export const carVariants: Variants = {
  entering: { 
    x: -100, 
    rotate: 0,
    scale: 1
  },
  drifting: { 
    x: "35%", 
    rotate: -15,
    scale: 1.1,
    transition: { 
      duration: 1.5, 
      ease: [0.25, 0.8, 0.5, 1],
      rotate: { duration: 0.8 }
    }
  },
  throwing: {
    x: "35%",
    rotate: -25,
    scale: 1.05,
    transition: { duration: 0.3 }
  }
}

// Bike animation variants
export const bikeVariants: Variants = {
  hidden: { x: "150%", rotate: 0, scale: 1 },
  entering: { 
    x: "65%", 
    rotate: 12,
    scale: 1,
    transition: { 
      duration: 1.3, 
      ease: [0.25, 0.8, 0.5, 1]
    }
  },
  collecting: {
    x: "45%",
    rotate: 18,
    scale: 1.1,
    transition: { 
      duration: 0.6,
      ease: "easeInOut"
    }
  },
  leaving: {
    x: -120,
    rotate: 8,
    scale: 0.9,
    transition: { 
      duration: 1.5,
      ease: [0.5, 0, 0.75, 0]
    }
  }
}

// Money bag animation variants
export const bagVariants: Variants = {
  hidden: { 
    x: 0, 
    y: 0, 
    opacity: 0,
    scale: 0.8,
    rotate: 0
  },
  throwing: {
    x: [0, 60, 120, 160],
    y: [0, -30, -20, 0],
    opacity: 1,
    scale: [0.8, 1.2, 1, 1],
    rotate: [0, 180, 360, 540],
    transition: {
      duration: 1.2,
      times: [0, 0.3, 0.7, 1],
      ease: "easeOut"
    }
  },
  collected: {
    opacity: 0,
    scale: 0.5,
    y: -10,
    transition: { duration: 0.3 }
  }
}

// Smoke particle animation variants
export const smokeVariants: Variants = {
  initial: { scale: 0, x: 0, y: 0, opacity: 0.6 },
  animate: {
    scale: [0, 1, 0],
    x: [0, 0], // Will be overridden with random values
    y: [0, -15],
    opacity: [0.6, 0.3, 0]
  }
}

// Road line animation variants
export const roadLineVariants: Variants = {
  animate: { 
    x: ["-100%", "100%"] 
  }
}

// Progress bar variants
export const progressVariants: Variants = {
  initial: { width: "0%" },
  animate: (progress: string) => ({
    width: progress,
    transition: { duration: 0.5, ease: "easeInOut" }
  })
}

// Status text variants
export const statusTextVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
}

// Celebration particle variants
export const celebrationVariants: Variants = {
  initial: { y: -20, opacity: 0, scale: 0 },
  animate: {
    y: [-20, -40, -20],
    opacity: [0, 1, 0],
    scale: [0, 1.5, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      repeatDelay: 1
    }
  }
}

// Wheel rotation variants
export const wheelVariants: Variants = {
  static: { rotate: 0 },
  spinning: { 
    rotate: 360,
    transition: { 
      duration: 0.5, 
      repeat: Infinity, 
      ease: "linear" 
    }
  }
}