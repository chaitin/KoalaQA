'use client'

import { Box, Card, Divider, Stack, SxProps, Typography } from '@mui/material'
import { ReactNode } from 'react'

interface MetricItem {
  label: string
  value: number | string
}

interface ProfileHeroCardProps {
  avatar: ReactNode
  title?: string
  subtitle?: string
  metrics?: MetricItem[]
  rightSlot?: ReactNode
  sx?: SxProps
}

export default function ProfileHeroCard({ avatar, title, subtitle, metrics, rightSlot, sx }: ProfileHeroCardProps) {
  const hasMetrics = Boolean(metrics && metrics.length > 0)

  return (
    <Card
      sx={{
        p: 3,
        background: '#fff',
        color: '#1f2937',
        boxShadow: 'none',
        borderRadius: 'unset',
        borderBottom: '1px solid #D9DEE2',
        ...sx,
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={{ xs: 3, md: 4 }}
        alignItems={{ xs: 'center', md: 'center' }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {avatar}
        </Box>

        <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' } }}>
          {title && (
            <Typography variant='h6' sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant='body2' sx={{ color: 'rgba(0,0,0,0.6)', mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {hasMetrics && (
          <Stack
            direction='row'
            spacing={4}
            divider={
              <Divider
                orientation='vertical'
                flexItem
                sx={{ borderColor: 'rgba(0,0,0,0.12)', height: '24px', alignSelf: 'center' }}
              />
            }
            sx={{
              textAlign: 'center',
              flexShrink: 0,
              width: { xs: '100%', md: 'auto' },
              justifyContent: { xs: 'center', md: 'flex-end' },
            }}
          >
            {metrics!.map((item) => (
              <Box key={item.label} sx={{ textAlign: 'center' }}>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>
                  {item.value}
                </Typography>
                <Typography variant='body2' sx={{ fontSize: '16px', color: 'rgba(31,35,41,0.5)' }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}

        {rightSlot}
      </Stack>
    </Card>
  )
}
