import { ModelUserRole } from '@/api'
import { Chip, SxProps } from '@mui/material'
import { roleConfig } from '@/constant'
import { isAdminRole } from '@/lib/utils'

interface RoleChipProps {
  role: ModelUserRole | undefined
  sx?: SxProps
}

export default function RoleChip({ role, sx }: RoleChipProps) {
  if (role === undefined || !isAdminRole(role)) return null

  return (
    <Chip
      label={roleConfig[role].name}
      sx={{
        height: 24,
        px: 1,
        background: 'rgba(0,99,151,0.06)',
        color: 'primary.main',
        borderRadius: '4px',
        border: '1px solid rgba(0,99,151,0.1)',
        fontSize: '0.75rem',
        fontWeight: 500,
        '& .MuiChip-label': {
          px: 0.5,
        },
        ...sx,
      }}
    />
  )
}