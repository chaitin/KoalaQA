'use client'
import { Box, BoxProps } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

interface ScrollAnimationProps extends BoxProps {
  children: React.ReactNode
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight' | 'scaleIn' | 'slideInUp'
  delay?: number
  duration?: number
  threshold?: number
}

const ScrollAnimation = ({
  children,
  animation = 'fadeInUp',
  delay = 0,
  duration = 0.6,
  threshold = 0.1,
  ...props
}: ScrollAnimationProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true)
          }, delay)
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -50px 0px',
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [delay, threshold])

  const getAnimationStyles = () => {
    const baseStyles = {
      transition: `all ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
      opacity: isVisible ? 1 : 0,
    }

    switch (animation) {
      case 'fadeInUp':
        return {
          ...baseStyles,
          transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        }
      case 'fadeInDown':
        return {
          ...baseStyles,
          transform: isVisible ? 'translateY(0)' : 'translateY(-30px)',
        }
      case 'fadeInLeft':
        return {
          ...baseStyles,
          transform: isVisible ? 'translateX(0)' : 'translateX(-30px)',
        }
      case 'fadeInRight':
        return {
          ...baseStyles,
          transform: isVisible ? 'translateX(0)' : 'translateX(30px)',
        }
      case 'scaleIn':
        return {
          ...baseStyles,
          transform: isVisible ? 'scale(1)' : 'scale(0.9)',
        }
      case 'slideInUp':
        return {
          ...baseStyles,
          transform: isVisible ? 'translateY(0)' : 'translateY(50px)',
        }
      default:
        return baseStyles
    }
  }

  return (
    <Box ref={ref} sx={getAnimationStyles()} {...props}>
      {children}
    </Box>
  )
}

export default ScrollAnimation
