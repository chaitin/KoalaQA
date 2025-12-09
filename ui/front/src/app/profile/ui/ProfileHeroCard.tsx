'use client'

import { ModelUserRole } from '@/api'
import { Box, Card, Divider, Stack, SxProps, Typography } from '@mui/material'
import { ReactNode } from 'react'
import RoleChip from './RoleChip'
import { Ellipsis } from '@ctzhian/ui'

interface MetricItem {
  label: string
  value: number | string
  onClick?: () => void
}

interface ProfileHeroCardProps {
  avatar: ReactNode
  title?: string
  subtitle?: string
  role: ModelUserRole
  metrics?: MetricItem[]
  rightSlot?: ReactNode
  sx?: SxProps
}

export default function ProfileHeroCard({
  avatar,
  title,
  subtitle,
  metrics,
  rightSlot,
  sx,
  role,
}: ProfileHeroCardProps) {
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

        <Stack sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Stack direction='row' alignItems='center' spacing={1} sx={{ textAlign: { xs: 'center', md: 'left' }, minWidth: 0 }}>
            {title && (
              <Typography 
                variant='h6' 
                sx={{ 
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0
                }}
              >
                {title}
              </Typography>
            )}
            <RoleChip role={role} sx={{ flexShrink: 0 }} />
          </Stack>
          <Ellipsis sx={{ fontSize: '13px', color: 'rgba(31,35,41,0.5)' }}>{subtitle}</Ellipsis>
        </Stack>

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
              <Box
                key={item.label}
                sx={{
                  textAlign: 'center',
                  cursor: item.onClick ? 'pointer' : 'default',
                  '&:hover': item.onClick
                    ? {
                        opacity: 0.8,
                      }
                    : {},
                }}
                onClick={item.onClick}
              >
                <Typography variant='h6' sx={{ fontWeight: 700 }}>
                  {item.value}
                </Typography>
                <Typography variant='body2' sx={{ fontSize: '16px', color: 'rgba(31,35,41,0.5)', whiteSpace: 'nowrap' }}>
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
