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
          <Icon
            type='icon-biaoqian1'
            sx={(theme) => ({ color: selected ? '#fff' : theme.palette.primaryAlpha?.[30] })}
          />
          {name ?? ''}
        </Stack>
      }
      size='small'
      onClick={onClick}
      sx={
        [
          (theme) => ({
            bgcolor: selected ? 'primary.main' : theme.palette.primaryAlpha?.[6] || 'rgba(0,99,151,0.06)',
            color: selected ? '#ffffff' : 'text.primary',
            fontSize: '0.75rem',
            fontWeight: 400,
            height: 26,
            borderRadius: '8px',
            border: selected ? 'none' : `1px solid ${theme.palette.primaryAlpha?.[10] || 'rgba(0,99,151,0.1)'}`,
            transition: 'all 0.15s ease-in-out',
            '&:hover': {
              bgcolor: selected ? 'primary.dark' : theme.palette.primaryAlpha?.[6] || '',
              color: selected ? '#ffffff' : '',
              boxShadow: 'none',
            },
          }),
          ...(sx ? [sx] : []),
        ] as SxProps<Theme>
      }
    />
  )
}
