'use client'

import { Box, Container, useTheme, useMediaQuery, IconButton } from '@mui/material'
import { useState } from 'react'
import FilterPanel from '@/components/filter-panel'
import FilterListIcon from '@mui/icons-material/FilterList'

export default function RouteLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [showFilters, setShowFilters] = useState(!isMobile)

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 2, md: 3 },
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        {/* 左侧过滤面板 - 靠左对齐 */}
        {showFilters && (
          <Box
            sx={{
              width: isMobile ? '100%' : 280,
              flexShrink: 0,
              display: isMobile && !showFilters ? 'none' : 'block',
              pl: { xs: 2, lg: 3 },
              pt: 2,
            }}
          >
            <FilterPanel />
          </Box>
        )}

        {/* 主内容区域 */}
        <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* 移动端过滤按钮 */}
            {isMobile && (
              <IconButton
                disableRipple
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  bgcolor: '#f3f4f6',
                  borderRadius: 2,
                  mb: 2,
                  '&:hover': {
                    bgcolor: '#e5e7eb',
                  },
                }}
              >
                <FilterListIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {children}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

