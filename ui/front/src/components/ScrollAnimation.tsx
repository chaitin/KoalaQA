'use client'
import { Box, BoxProps } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

interface ScrollAnimationProps extends BoxProps {
  animation?: 'fadeInUp' | 'fadeInDown' | 'fadeInLeft' | 'fadeInRight'
  delay?: number
  duration?: number
  immediate?: boolean
  children: React.ReactNode
}

const ScrollAnimation = ({
  animation = 'fadeInUp',
  delay = 0,
  duration = 0.6,
  immediate = false,
  children,
  ...props
}: ScrollAnimationProps) => {
  const [isVisible, setIsVisible] = useState(immediate)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (immediate) return

    const currentElement = elementRef.current
    if (!currentElement) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true)
          }, delay)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    )

    observer.observe(currentElement)

    return () => {
      observer.unobserve(currentElement)
    }
  }, [delay, immediate])

  const getAnimationStyles = () => {
    const baseStyles = {
      opacity: isVisible ? 1 : 0,
      transition: `all ${duration}s cubic-bezier(0.4, 0, 0.2, 1)`,
      transitionDelay: `${delay}ms`,
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
      default:
        return baseStyles
    }
  }

  return (
    <Box ref={elementRef} style={getAnimationStyles()} {...props}>
      {children}
    </Box>
  )
}

export default ScrollAnimation