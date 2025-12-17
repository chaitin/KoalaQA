'use client'

import { Box, Container, IconButton, useTheme, useMediaQuery } from '@mui/material'
import { useState } from 'react'
import FilterPanel from '@/components/FilterPanel'

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [showFilters, setShowFilters] = useState(!isMobile)

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 2, md: 3 },
        flexDirection: { xs: 'column', md: 'row' },
        flex: 1,
        height: '100%',
        alignSelf: 'stretch',
      }}
    >
      {/* 左侧过滤面板 - 靠左对齐 */}
      {showFilters && (
        <Box
          sx={{
            width: isMobile ? '100%' : 240,
            flexShrink: 0,
            display: { xs: 'none', sm: 'block' },
            pl: { xs: 2, lg: 3 },
            py: { xs: 2, lg: 3 },
          }}
        >
          <FilterPanel />
        </Box>
      )}

      {/* 主内容区域 */}
      <Container
        className='forum_main'
        sx={{
          flex: 1,
          minWidth: 0,
          pt: { xs: 0, sm: 3 },
          alignSelf: 'stretch',
          display: { xs: 'block', lg: 'flex' },
          gap: { xs: 0, lg: 3 },
          justifyContent: { lg: 'center' },
          alignItems: { lg: 'flex-start' },
        }}
      >
        {children}
      </Container>
    </Box>
  )
}
