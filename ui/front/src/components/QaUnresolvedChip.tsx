import { alpha, Chip, ChipProps } from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { ModelDiscussionType, ModelDiscussionState } from '@/api/types'

interface QaUnresolvedChipProps extends Omit<ChipProps, 'label'> {
  type?: ModelDiscussionType
  resolved?: ModelDiscussionState
}

const QaUnresolvedChip: React.FC<QaUnresolvedChipProps> = ({ type, resolved, sx, size = 'medium', ...restProps }) => {
  if (type !== ModelDiscussionType.DiscussionTypeQA || resolved !== ModelDiscussionState.DiscussionStateNone) {
    return null
  }

  return (
    <Chip
      label='未解决'
      size='small'
      icon={
        <HelpOutlineIcon
          sx={{
            width: 16,
            ml: '0!important',
            height: 16,
            color: 'rgba(255, 119, 68, 1) !important',
          }}
        />
      }
      sx={[
        {
          bgcolor: alpha('rgba(255, 119, 68, 1)', 0.1),
          color: 'rgba(255, 119, 68, 1)',
          height: size === 'small' ? 20 : 22,
          fontWeight: 600,
          fontSize: '12px',
          borderRadius: '12px',
          pl: 1,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...restProps}
    />
  )
}

export default QaUnresolvedChip
