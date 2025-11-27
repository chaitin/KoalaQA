'use client'

import { ModelDiscussionListItem, ModelDiscussionState, ModelDiscussionType } from '@/api/types'
import { DiscussionTypeChip, MarkDown, QaUnresolvedChip } from '@/components'
import CommonAvatar from '@/components/CommonAvatar'
import { CommonContext } from '@/components/commonProvider'
import { TimeDisplay } from '@/components/TimeDisplay'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { Ellipsis, Icon } from '@ctzhian/ui'
import { CheckCircleOutline as CheckCircleOutlineIcon } from '@mui/icons-material'
import { Box, Chip, Stack, SxProps, Typography } from '@mui/material'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { memo, useContext, useMemo } from 'react'

// 状态相关辅助函数
const getStatusColor = (status: string) => {
  if (status === 'answered' || status === 'closed') return 'rgba(25, 135, 84, 1)'
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

const shouldShowStatus = (data: ModelDiscussionListItem) => {
  // 只显示已解决/已关闭的状态，不显示"待解决"
  return (
    data.resolved === ModelDiscussionState.DiscussionStateResolved ||
    data.resolved === ModelDiscussionState.DiscussionStateClosed
  )
}

const isCategoryTag = (tag: string, groups: Array<{ name?: string }>) => {
  return groups.some((group) => group.name === tag)
}

// 获取帖子状态
const getPostStatus = (data: ModelDiscussionListItem): string => {
  if (data.resolved === ModelDiscussionState.DiscussionStateClosed) {
    return 'closed'
  }
  if (data.resolved === ModelDiscussionState.DiscussionStateResolved) {
    return data.type === ModelDiscussionType.DiscussionTypeFeedback ? 'closed' : 'answered'
  }
  return 'open'
}

// 获取帖子类型
const getPostType = (type?: ModelDiscussionType): 'question' | 'feedback' | 'article' => {
  if (type === ModelDiscussionType.DiscussionTypeQA) return 'question'
  if (type === ModelDiscussionType.DiscussionTypeFeedback) return 'feedback'
  if (type === ModelDiscussionType.DiscussionTypeBlog) return 'article'
  return 'question'
}

const DiscussCard = ({
  data,
  keywords: _keywords,
  onNavigate,
  sx,
}: {
  data: ModelDiscussionListItem
  keywords?: string
  showType?: boolean
  sx?: SxProps
  onNavigate: () => void
}) => {
  const it = data
  const { groups } = useContext(CommonContext)
  const params = useParams()
  const router = useRouterWithRouteName()
  const profileHref = it.user_id ? `/profile/${it.user_id}` : undefined

  // 使用 useMemo 优化分组名称计算，避免重复查找
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return []

    // 创建group映射表，避免重复查找
    const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))

    return it.group_ids.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
  }, [it.group_ids, groups.flat])

  // 准备数据
  const postStatus = getPostStatus(it)
  const postType = getPostType(it.type)
  const allTags = groupNames

  return (
    <Box
      sx={{
        borderBottom: '1px solid #f3f4f6',
        transition: 'all 0.2s',
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'rgba(0,99,151,0.03)',
        },
        p: 2,
        ...sx,
      }}
    >
      <Stack direction='row' alignItems='center' spacing={1}>
        <Link
          href={profileHref || '/'}
          key={it.id}
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={onNavigate}
        >
          <Box
            tabIndex={0}
            sx={{
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 1,
              transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
              color: 'text.primary',
              '&:focus-within, &:hover ': {
                color: 'primary.main',
              },
              my: '-2px',
              ml: '-4px',
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                cursor: profileHref ? 'pointer' : 'default',
              }}
              tabIndex={-1}
            >
              <CommonAvatar
                src={it.user_avatar}
                name={it.user_name}
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                }}
              />
            </Box>
            <Box
              sx={{
                fontSize: '14px',
                textDecoration: 'none',
                outline: 'none',
                color: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
                ml: 1,
              }}
              tabIndex={-1}
            >
              {it.user_name || ''}
            </Box>
          </Box>
        </Link>
        <Box sx={{ fontWeight: 400, whiteSpace: 'nowrap' }}>
          · <TimeDisplay style={{ color: 'rgba(33,34,45, 0.7)' }} timestamp={it.updated_at!} />
        </Box>
      </Stack>
      <Link href={`/${params?.route_name as string}/${it.uuid}`} key={it.id} onClick={onNavigate}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            my: 2,
            gap: 1,
          }}
        >
          <DiscussionTypeChip type={it.type} variant='default' />
          <Ellipsis
            sx={{
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.01em',
              fontSize: '18px',
              '&:hover': { color: '#000000' },
              flex: 1,
            }}
          >
            {it.title}
          </Ellipsis>
        </Box>
        <MarkDown
          content={(it.type === ModelDiscussionType.DiscussionTypeBlog ? it.summary : it.content) || ''}
          truncateLength={100}
          sx={{
            mb: 2,
            lineHeight: 1.5,
            fontSize: '0.8125rem',
            color: 'rgba(33, 34, 45, 0.50) !important',
            bgcolor: 'transparent !important',
            '&.markdown-body': {
              backgroundColor: 'transparent !important',
              color: 'rgba(33, 34, 45, 0.50) !important',
            },
            '& *': {
              fontSize: '0.8125rem !important',
              color: 'rgba(33, 34, 45, 0.50) !important',
            },
          }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {data.resolved === ModelDiscussionState.DiscussionStateNone &&
              data.type === ModelDiscussionType.DiscussionTypeQA && (
                <QaUnresolvedChip type={data.type} resolved={data.resolved} />
              )}
            {shouldShowStatus(it) && (
              <Chip
                icon={
                  postStatus === 'answered' || postStatus === 'closed' ? (
                    <CheckCircleOutlineIcon
                      sx={{
                        width: 15,
                        height: 15,
                        color: '#fff !important',
                      }}
                    />
                  ) : undefined
                }
                label={getStatusLabel(postStatus)}
                size='small'
                sx={{
                  // bgcolor: `${getStatusColor(postStatus)}15`,
                  bgcolor: getStatusColor(postStatus),
                  color: '#fff !important',
                  height: 22,
                  fontWeight: 600,
                  fontSize: '12px',
                  // borderRadius: '3px',
                  border: `1px solid ${getStatusColor(postStatus)}30`,
                }}
              />
            )}
            {allTags.map((tag, index) => {
              const isCategory = isCategoryTag(tag, groups.flat)
              return (
                <Chip
                  key={`${tag}-${isCategory ? 'category' : 'tag'}-${index}`}
                  label={tag}
                  size='small'
                  sx={{
                    bgcolor: 'rgba(233, 236, 239, 1)',
                    color: 'rgba(33, 34, 45, 1)',
                    height: 22,
                    fontSize: '12px',
                    borderRadius: '3px',
                    cursor: 'default',
                    pointerEvents: 'none',
                  }}
                />
              )
            })}
          </Box>

          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
            {postType === 'question' && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  background: 'rgba(0,99,151,0.06)',
                  color: 'primary.main',
                  px: 1,
                  borderRadius: 0.5,
                }}
              >
                <Icon type='icon-wendapinglun' sx={{ fontSize: 12 }} />
                <Typography variant='caption' sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  {it.comment || 0}
                </Typography>
              </Box>
            )}
            {postType === 'feedback' && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  background: 'rgba(0,99,151,0.06)',
                  color: 'primary.main',
                }}
              >
                <Icon type='icon-wendapinglun' sx={{ fontSize: 12 }} />
                <Typography variant='caption' sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  {(it.like || 0) - (it.dislike || 0)}
                </Typography>
              </Box>
            )}
            {postType === 'article' && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  background: 'rgba(0,99,151,0.06)',
                  color: 'primary.main',
                  px: 1,
                  borderRadius: 0.5,
                }}
              >
                <Icon type='icon-dianzan1' sx={{ fontSize: 12 }} />
                <Typography variant='caption' sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  {(it.like || 0) - (it.dislike || 0)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Link>
    </Box>
  )
}

// 使用 React.memo 优化组件，避免不必要的重新渲染
export default memo(DiscussCard, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时才重新渲染
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.updated_at === nextProps.data.updated_at &&
    prevProps.data.like === nextProps.data.like &&
    prevProps.data.dislike === nextProps.data.dislike &&
    prevProps.data.comment === nextProps.data.comment &&
    prevProps.data.resolved === nextProps.data.resolved &&
    prevProps.data.group_ids === nextProps.data.group_ids &&
    prevProps.data.tags === nextProps.data.tags &&
    prevProps.showType === nextProps.showType &&
    prevProps.keywords === nextProps.keywords
  )
})
