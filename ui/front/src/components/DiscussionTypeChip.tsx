import { Chip, ChipProps, SxProps, Theme } from '@mui/material'
import { ModelDiscussionType } from '@/api/types'

interface DiscussionTypeChipProps extends Omit<ChipProps, 'label' | 'variant'> {
  type?: ModelDiscussionType
  variant?: 'default' | 'compact'
  size?: 'small' | 'medium'
}

const DiscussionTypeChip: React.FC<DiscussionTypeChipProps> = ({
  type,
  variant = 'default',
  sx,
  size = 'medium',
  ...restProps
}) => {
  // 获取类型标签文本
  const getTypeLabel = (): string => {
    switch (type) {
      case ModelDiscussionType.DiscussionTypeBlog:
        return '文章'
      case ModelDiscussionType.DiscussionTypeIssue:
        return 'Issue'
      case ModelDiscussionType.DiscussionTypeQA:
        return '问题'
      default:
        return ''
    }
  }

  // 获取类型样式
  const getTypeStyle = (): SxProps<Theme> => {
    // 根据 variant 设置不同的样式
    if (variant === 'compact') {
      return {
        bgcolor: 'rgba(233, 236, 239, 1)',
        color: 'rgba(33, 34, 45, 1)',
        flexShrink: 0,
        height: size === 'small' ? 20 : 24,
        fontSize: size === 'small' ? '12px' : '14px',
        fontWeight: 400,
        borderRadius: '3px',
        lineHeight: size === 'small' ? '20px' : '24px',
      }
    }

    // default variant
    return {
      bgcolor: 'rgba(233, 236, 239, 1)',
      color: 'rgba(33, 34, 45, 1)',
      flexShrink: 0,
      height: size === 'small' ? 20 : 22,
      fontWeight: 400,
      fontSize: '12px',
      borderRadius: '3px',
      lineHeight: size === 'small' ? '20px' : '22px',
    }
  }

  const label = getTypeLabel()
  if (!label) {
    return null
  }

  return <Chip label={label} size='small' {...restProps} sx={[getTypeStyle(), ...(Array.isArray(sx) ? sx : [sx])]} />
}

export default DiscussionTypeChip
