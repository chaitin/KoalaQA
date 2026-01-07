import { alpha, Chip, SxProps, Theme } from '@mui/material'
import { ModelDiscussionState } from '@/api/types'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'

interface IssueStatusChipProps {
  resolved?: ModelDiscussionState
  size?: 'small' | 'medium'
  sx?: SxProps<Theme>
}

const IssueStatusChip: React.FC<IssueStatusChipProps> = ({ resolved, size = 'medium', sx }) => {
  const getStatusLabel = (): string => {
    if (resolved === ModelDiscussionState.DiscussionStateNone) return '待处理'
    if (resolved === ModelDiscussionState.DiscussionStateInProgress) return '进行中'
    if (resolved === ModelDiscussionState.DiscussionStateResolved) return '已完成'
    return '待处理'
  }

  const getStatusColor = (): string => {
    if (resolved === ModelDiscussionState.DiscussionStateNone) return '#f97316' // 橙色 - 待处理
    if (resolved === ModelDiscussionState.DiscussionStateInProgress) return '#006397' // 深蓝色 - 进行中
    if (resolved === ModelDiscussionState.DiscussionStateResolved) return '#1AA086' // 绿色 - 已完成
    return '#f97316'
  }

  const getStatusIcon = () => {
    const iconStyle = {
      width: 16,
      height: 16,
      color: `${getStatusColor()} !important`,
    }

    if (resolved === ModelDiscussionState.DiscussionStateResolved) {
      return <CheckCircleOutlineIcon sx={iconStyle} />
    }
    if (resolved === ModelDiscussionState.DiscussionStateInProgress) {
      return <AutorenewIcon sx={iconStyle} />
    }
    return <HelpOutlineIcon sx={iconStyle} />
  }

  const getSizeStyles = (): SxProps<Theme> => {
    return {
      fontSize: '12px',
      height: 22,
      fontWeight: 600,
      border: `1px solid ${alpha(getStatusColor(), 0.03)}`,
      fontFamily: 'Glibory, "PingFang SC", "Hiragino Sans GB", "STHeiti", "Microsoft YaHei", sans-serif',
      minWidth: 70,
    }
  }

  return (
    <Chip
      icon={getStatusIcon()}
      label={getStatusLabel()}
      size={size}
      sx={[
        {
          pl: 0.5,
          color: getStatusColor(),
          borderRadius: 0.5,
          bgcolor: alpha(getStatusColor(), 0.1),
          border: `1px solid ${alpha(getStatusColor(), 0.03)}`,
          ...getSizeStyles(),
        },
        {
          '& .MuiChip-label': {
            px: 1,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}

export default IssueStatusChip
