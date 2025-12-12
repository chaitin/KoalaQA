'use client'

import { Icon } from '@ctzhian/ui'
import { Chip, Stack } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

export interface TagFilterChipProps {
  id: number
  name?: string
  selected: boolean
  onClick?: () => void
  sx?: SxProps<Theme>
}

export default function TagFilterChip({ id, name, selected, onClick, sx }: TagFilterChipProps) {
  return (
    <Chip
      key={id}
      label={
        <Stack direction='row' alignItems='center' gap={0.5}>
          <Icon type='icon-biaoqian1' sx={{ color: selected ? '#fff' : 'rgba(0, 99, 151, 0.30)' }} />
          {name ?? ''}
        </Stack>
      }
      size='small'
      onClick={onClick}
      sx={{
        bgcolor: selected ? 'primary.main' : 'rgba(0,99,151,0.06)',
        color: selected ? '#ffffff' : '#6b7280',
        fontSize: '0.75rem',
        fontWeight: 600,
        height: 26,
        borderRadius: '8px',
        border: selected ? 'none' : '1px solid rgba(0,99,151,0.1)',
        transition: 'all 0.15s ease-in-out',
        '&:active': { transform: 'scale(0.95)' },
        '&:hover': {
          bgcolor: selected ? 'primary.main' : 'rgba(0,99,151,0.06)',
          color: selected ? '#ffffff' : '#6b7280',
        },
        ...sx,
      }}
    />
  )
}


