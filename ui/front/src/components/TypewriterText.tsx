'use client'
import { Typography, TypographyProps, Box } from '@mui/material'
import { useState, useEffect } from 'react'

interface TypewriterTextProps extends TypographyProps {
  text: string
  speed?: number
  delay?: number
  onComplete?: () => void
}

const TypewriterText = ({
  text,
  speed = 100,
  delay = 0,
  onComplete,
  ...props
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, currentIndex === 0 ? delay : speed)

      return () => clearTimeout(timeout)
    } else if (!isComplete) {
      setIsComplete(true)
      onComplete?.()
    }
    
    // 确保所有代码路径都有返回值
    return undefined
  }, [currentIndex, text, speed, delay, isComplete, onComplete])

  return (
    <Typography {...props}>
      {displayedText}
      {!isComplete && (
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            width: '2px',
            height: '1em',
            backgroundColor: 'currentColor',
            marginLeft: '2px',
            animation: 'blink 1s infinite',
            '@keyframes blink': {
              '0%, 50%': {
                opacity: 1,
              },
              '51%, 100%': {
                opacity: 0,
              },
            },
          }}
        />
      )}
    </Typography>
  )
}

export default TypewriterText
