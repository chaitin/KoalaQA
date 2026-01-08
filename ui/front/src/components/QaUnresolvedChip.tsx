import { Box, Chip, ChipProps } from '@mui/material'
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
      icon={
        <Box
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: '#fff',
          }}
        />
      }
      label='未解决'
      size='small'
      sx={{
        bgcolor: 'rgba(255, 119, 68, 1)',
        color: '#fff',
        height: 22,
        lineHeight: '22px',
        fontWeight: 600,
        fontSize: '12px',
        borderRadius: 0.5,
        border: 'none',
        fontFamily: 'Glibory, "PingFang SC", "Hiragino Sans GB", "STHeiti", "Microsoft YaHei", sans-serif',
        minWidth: 70,
      }}
    />
  )
}

export default QaUnresolvedChip
