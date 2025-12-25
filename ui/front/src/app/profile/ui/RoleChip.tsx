import { ModelUserRole } from '@/api'
import { Chip, SxProps, Theme } from '@mui/material'
import { roleConfig } from '@/constant'
import { isAdminRole } from '@/lib/utils'

interface RoleChipProps {
  role: ModelUserRole | undefined
  sx?: SxProps<Theme>
}

export default function RoleChip({ role, sx }: RoleChipProps) {
  if (role === undefined || !isAdminRole(role)) return null

  return (
    <Chip
      label={roleConfig[role].name}
      sx={[
        (theme) => ({
          height: 24,
          px: 1,
          background: theme.palette.primaryAlpha?.[6],
          color: 'primary.main',
          borderRadius: '4px',
          border: `1px solid ${theme.palette.primaryAlpha?.[10]}`,
          fontSize: '0.75rem',
          fontWeight: 500,
          '& .MuiChip-label': {
            px: 0.5,
          },
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  )
}