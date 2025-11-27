import { Chip, ChipProps, SxProps, Theme } from '@mui/material'
import { ModelDiscussionType } from '@/api/types'

interface DiscussionTypeChipProps extends Omit<ChipProps, 'label' | 'variant'> {
  type?: ModelDiscussionType
  variant?: 'default' | 'compact'
}

const DiscussionTypeChip: React.FC<DiscussionTypeChipProps> = ({ type, variant = 'default', sx, ...restProps }) => {
  // 获取类型标签文本
  const getTypeLabel = (): string => {
    switch (type) {
      case ModelDiscussionType.DiscussionTypeBlog:
        return '文章'
      case ModelDiscussionType.DiscussionTypeFeedback:
        return '反馈'
      case ModelDiscussionType.DiscussionTypeQA:
        return '问题'
      default:
        return ''
    }
  }

  // 获取类型样式
  const getTypeStyle = (): SxProps<Theme> => {
    const isArticlePost = type === ModelDiscussionType.DiscussionTypeBlog
    const isFeedbackPost = type === ModelDiscussionType.DiscussionTypeFeedback

    const baseStyle: SxProps<Theme> = {
      bgcolor: isArticlePost ? 'rgba(255,119,68,0.1)' : isFeedbackPost ? '#eff6ff' : 'rgba(26,160,134,0.1)',
      color: isArticlePost ? '#FF7744' : isFeedbackPost ? '#3b82f6' : '#1AA086',
      border: `1px solid ${
        isArticlePost ? 'rgba(255,119,68,0.1)' : isFeedbackPost ? '#bfdbfe' : 'rgba(26, 160, 134, 0.10)'
      }`,
      flexShrink: 0,
    }

    // 根据 variant 设置不同的样式
    if (variant === 'compact') {
      return {
        ...baseStyle,
        height: 20,
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '3px',
      }
    }

    // default variant
    return {
      ...baseStyle,
      height: 20,
      fontWeight: 400,
      fontSize: '12px',
      borderRadius: '4px',
    }
  }

  const label = getTypeLabel()
  if (!label) {
    return null
  }

  return (
    <Chip
      label={label}
      size='small'
      {...restProps}
      sx={[
        getTypeStyle(),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  )
}

export default DiscussionTypeChip

