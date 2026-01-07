'use client'
import { ModelDiscussionListItem, ModelDiscussionState, ModelDiscussionType } from '@/api/types'
import { CheckCircleOutline as CheckCircleOutlineIcon } from '@mui/icons-material'
import { alpha, Chip } from '@mui/material'
import IssueStatusChip from './IssueStatusChip'
import QaUnresolvedChip from './QaUnresolvedChip'

// 状态相关辅助函数
const getStatusColor = (status: string) => {
  if (status === 'answered' || status === 'closed') return '#1AA086'
  if (status === 'in-progress') return '#3b82f6'
  if (status === 'planned') return '#f59e0b'
  return '#6b7280'
}

const getStatusLabel = (status: string) => {
  if (status === 'answered') return '已解决'
  if (status === 'in-progress') return '进行中'
  if (status === 'planned') return '已计划'
  if (status === 'open') return '待解决'
  if (status === 'closed') return '已关闭'
  if (status === 'published') return '已发布'
  return ''
}

// 获取帖子状态
const getPostStatus = (data: ModelDiscussionListItem): string => {
  if (data.resolved === ModelDiscussionState.DiscussionStateClosed) {
    return 'closed'
  }
  if (data.resolved === ModelDiscussionState.DiscussionStateResolved) {
    return 'answered'
  }
  return 'open'
}

interface DiscussionStatusChipProps {
  item: ModelDiscussionListItem
  size?: 'small' | 'medium'
}

/**
 * 通用讨论状态标签组件
 * 根据讨论类型和状态自动显示相应的状态标签
 */
const DiscussionStatusChip = ({ item, size = 'small' }: DiscussionStatusChipProps) => {
  const isIssuePost = item.type === ModelDiscussionType.DiscussionTypeIssue
  const isArticlePost = item.type === ModelDiscussionType.DiscussionTypeBlog
  const status = getPostStatus(item)

  return (
    <>
      {/* Issue 类型使用 IssueStatusChip 显示所有状态 */}
      {isIssuePost && <IssueStatusChip resolved={item.resolved} size={size} />}

      {/* 非 Issue 类型且非文章类型，显示已解决/已关闭状态 */}
      {!isIssuePost && (status === 'answered' || status === 'closed') && !isArticlePost && (
        <Chip
          icon={
            <CheckCircleOutlineIcon
              sx={{
                width: 16,
                height: 16,
                color: `${getStatusColor(status)}!important`,
                ml: '8px!important',
              }}
            />
          }
          label={getStatusLabel(status)}
          size='small'
          sx={{
            bgcolor: alpha(getStatusColor(status), 0.1),
            color: getStatusColor(status),
            height: 22,
            lineHeight: '22px',
            fontWeight: 600,
            fontSize: '12px',
            borderRadius: 0.5,
            border: (theme) => `1px solid ${alpha(getStatusColor(status), 0.03)}`,
            fontFamily: 'Glibory, "PingFang SC", "Hiragino Sans GB", "STHeiti", "Microsoft YaHei", sans-serif',
            minWidth: 70,
          }}
        />
      )}

      {/* QA 类型显示未解决状态 */}
      <QaUnresolvedChip type={item.type} resolved={item.resolved} size={size} />
    </>
  )
}

export default DiscussionStatusChip
