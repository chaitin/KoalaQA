'use client'
import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingSpinnerProps {
  size?: number
  message?: string
  color?: 'primary' | 'secondary' | 'inherit'
}

const LoadingSpinner = ({ 
  size = 40, 
  message = '加载中...', 
  color = 'primary' 
}: LoadingSpinnerProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        gap: 2,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          '& .MuiCircularProgress-root': {
            animation: 'spin 1s linear infinite',
          },
          '@keyframes spin': {
            '0%': {
              transform: 'rotate(0deg)',
            },
            '100%': {
              transform: 'rotate(360deg)',
            },
          },
        }}
      >
        <CircularProgress
          size={size}
          color={color}
          thickness={4}
          sx={{
            '& .MuiCircularProgress-circle': {
              strokeLinecap: 'round',
            },
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: size * 0.4,
              height: size * 0.4,
              borderRadius: '50%',
              backgroundColor: color === 'primary' ? '#206CFF' : 'currentColor',
              opacity: 0.3,
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': {
                  transform: 'scale(1)',
                  opacity: 0.3,
                },
                '50%': {
                  transform: 'scale(1.2)',
                  opacity: 0.6,
                },
              },
            }}
          />
        </Box>
      </Box>
      {message && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            animation: 'fadeInOut 2s ease-in-out infinite',
            '@keyframes fadeInOut': {
              '0%, 100%': {
                opacity: 0.6,
              },
              '50%': {
                opacity: 1,
              },
            },
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  )
}

export default LoadingSpinner
