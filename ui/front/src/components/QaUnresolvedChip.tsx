import { Chip, ChipProps } from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { ModelDiscussionType, ModelDiscussionState } from '@/api/types'

interface QaUnresolvedChipProps extends Omit<ChipProps, 'label'> {
  type?: ModelDiscussionType
  resolved?: ModelDiscussionState
}

const QaUnresolvedChip: React.FC<QaUnresolvedChipProps> = ({ type, resolved, sx, ...restProps }) => {
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
            height: 16,
            color: '#fff !important',
          }}
        />
      }
      {...restProps}
      sx={[
        {
          bgcolor: 'rgba(255, 119, 68, 1)',
          color: '#fff',
          height: 22,
          fontWeight: 600,
          fontSize: '12px',
          borderRadius: '12px',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}

export default QaUnresolvedChip
