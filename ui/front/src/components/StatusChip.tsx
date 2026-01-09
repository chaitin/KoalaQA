'use client'
import { Box, Chip, ChipProps, Stack, SxProps, Theme, alpha } from '@mui/material'
import { ModelDiscussionType, ModelDiscussionState, ModelDiscussionListItem } from '@/api/types'
import StatusDotIcon from './StatusDotIcon'

interface StatusChipProps extends Omit<ChipProps, 'label' | 'icon'> {
  /** 讨论项对象，如果提供则从 item 中提取 type 和 resolved */
  item?: ModelDiscussionListItem
  /** 讨论类型，如果提供了 item 则忽略此参数 */
  type?: ModelDiscussionType
  /** 解决状态，如果提供了 item 则忽略此参数 */
  resolved?: ModelDiscussionState
  /** 是否已采纳（用于答案的采纳状态） */
  accepted?: boolean
  size?: 'small' | 'medium'
}

/**
 * 统一的状态标签组件
 * 根据讨论类型和状态自动显示相应的状态标签，统一使用 StatusDotIcon
 *
 * 使用方式：
 * 1. 传入 item 对象：<StatusChip item={discussionItem} />
 * 2. 分别传入 type 和 resolved：<StatusChip type={type} resolved={resolved} />
 * 3. 显示已采纳状态：<StatusChip accepted={true} />
 */
const StatusChip: React.FC<StatusChipProps> = ({ item, type, resolved, accepted, size = 'medium', sx, ...restProps }) => {
  // 从 item 或直接参数中获取 type 和 resolved
  const discussionType = item?.type ?? type
  const discussionResolved = item?.resolved ?? resolved
  const isArticlePost = discussionType === ModelDiscussionType.DiscussionTypeBlog

  // 获取状态配置
  const getStatusConfig = () => {
    // 已采纳状态（优先级最高）
    if (accepted) {
      return { label: '已采纳', color: '#1AA086' }
    }
    // Issue 类型的状态
    if (discussionType === ModelDiscussionType.DiscussionTypeIssue) {
      if (discussionResolved === ModelDiscussionState.DiscussionStateNone) {
        return { label: '待处理', color: '#f97316' }
      }
      if (discussionResolved === ModelDiscussionState.DiscussionStateInProgress) {
        return { label: '进行中', color: '#006397' }
      }
      if (discussionResolved === ModelDiscussionState.DiscussionStateResolved) {
        return { label: '已完成', color: '#1AA086' }
      }
      return { label: '待处理', color: '#f97316' }
    }

    // QA 类型未解决状态
    if (
      discussionType === ModelDiscussionType.DiscussionTypeQA &&
      discussionResolved === ModelDiscussionState.DiscussionStateNone
    ) {
      return { label: '未解决', color: 'rgba(255, 119, 68, 1)' }
    }

    // 非文章类型的已解决/已关闭状态
    if (!isArticlePost) {
      if (discussionResolved === ModelDiscussionState.DiscussionStateClosed) {
        return { label: '已关闭', color: '#1AA086' }
      }
      if (discussionResolved === ModelDiscussionState.DiscussionStateResolved) {
        return { label: '已解决', color: '#1AA086' }
      }
    }

    return null
  }

  const statusConfig = getStatusConfig()

  // 如果没有状态配置，不显示标签
  if (!statusConfig) {
    return null
  }

  // 统一的基础样式
  const baseStyles: SxProps<Theme> = {
    bgcolor: statusConfig.color,
    color: '#fff',
    height: size === 'small' ? 20 : 22,
    lineHeight: '22px',
    fontWeight: 600,
    fontSize: '12px',
    borderRadius: 0.5,
    border: 'none',
    fontFamily: 'Glibory, "PingFang SC", "Hiragino Sans GB", "STHeiti", "Microsoft YaHei", sans-serif',
    px: 1,
  }

  // Issue 类型添加边框样式（已采纳状态不应用此样式）
  const issueStyles: SxProps<Theme> =
    !accepted && discussionType === ModelDiscussionType.DiscussionTypeIssue
      ? {
          border: `1px solid ${alpha(statusConfig.color, 0.03)}`,
        }
      : {}

  return (
    <Stack
      direction='row'
      alignItems='center'
      spacing={0.5}
      sx={[baseStyles, issueStyles, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
      {...restProps}
    >
      <StatusDotIcon />
      <Box>{statusConfig.label}</Box>
    </Stack>
  )
}

export default StatusChip
