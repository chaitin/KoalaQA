'use client'
import { Box, Fab, Tooltip } from '@mui/material'
import { KeyboardArrowUp } from '@mui/icons-material'
import { useState, useEffect } from 'react'

interface FloatingActionButtonProps {
  onScrollToTop?: () => void
  onAddClick?: () => void
  showScrollToTop?: boolean
}

const FloatingActionButton = ({
  onScrollToTop,
  onAddClick: _onAddClick,
  showScrollToTop = true,
}: FloatingActionButtonProps) => {
  const [showScrollButton, setShowScrollButton] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setShowScrollButton(scrollTop > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleScrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
    onScrollToTop?.()
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {showScrollToTop && showScrollButton && (
        <Tooltip title="回到顶部" placement="left">
          <Fab
            size="small"
            onClick={handleScrollToTop}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: '#fff',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'slideInUp 0.3s ease-out',
              '@keyframes slideInUp': {
                '0%': {
                  opacity: 0,
                  transform: 'translateY(20px)',
                },
                '100%': {
                  opacity: 1,
                  transform: 'translateY(0)',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              },
              '&:active': {
                transform: 'translateY(0) scale(0.95)',
              },
            }}
          >
            <KeyboardArrowUp />
          </Fab>
        </Tooltip>
      )}
    </Box>
  )
}

export default FloatingActionButton
