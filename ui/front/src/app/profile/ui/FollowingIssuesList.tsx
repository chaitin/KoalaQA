'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Box, Card, CircularProgress, Stack, Typography } from '@mui/material'
import { getDiscussionFollow } from '@/api'
import { ModelDiscussion, ModelDiscussionState, ModelDiscussionType, ModelListRes } from '@/api/types'
import { DiscussionTypeChip, IssueStatusChip } from '@/components'
import { CommonContext } from '@/components/commonProvider'
import { TimeDisplay } from '@/components/TimeDisplay'
import { Ellipsis, Icon } from '@ctzhian/ui'
import { CheckCircleOutline as CheckCircleOutlineIcon } from '@mui/icons-material'
import { Chip } from '@mui/material'
import { useParams } from 'next/navigation'
import { useContext } from 'react'

const PAGE_SIZE = 10

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

const shouldShowStatus = (data: ModelDiscussion) => {
  // Issue 类型显示所有状态
  if (data.type === ModelDiscussionType.DiscussionTypeIssue) {
    return true
  }
  return (
    data.resolved === ModelDiscussionState.DiscussionStateResolved ||
    data.resolved === ModelDiscussionState.DiscussionStateClosed
  )
}

const isCategoryTag = (tag: string, groups: Array<{ name?: string }>) => {
  return groups.some((group) => group.name === tag)
}

// 获取帖子状态
const getPostStatus = (data: ModelDiscussion): string => {
  if (data.resolved === ModelDiscussionState.DiscussionStateClosed) {
    return 'closed'
  }
  if (data.resolved === ModelDiscussionState.DiscussionStateResolved) {
    return 'answered'
  }
  return 'open'
}

const EmptyState = () => (
  <Box
    sx={{
      p: 6,
      textAlign: 'center',
    }}
  >
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
      <Image src='/empty.png' alt='暂无关注' width={250} height={137} style={{ maxWidth: '100%', height: 'auto' }} />
    </Box>
    <Typography variant='h6' sx={{ mb: 1, fontWeight: 600 }}>
      暂无关注的 Issue
    </Typography>
    <Typography variant='body2' sx={{ color: '#6b7280' }}>
      您还没有关注任何 Issue
    </Typography>
  </Box>
)

export default function FollowingIssuesList() {
  const { groups } = useContext(CommonContext)
  const params = useParams()

  // 使用 useMemo 优化分组名称计算
  const getGroupNames = useCallback(
    (groupIds?: number[]) => {
      if (!groupIds || !groups.flat.length) return []
      const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))
      return groupIds.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
    },
    [groups.flat],
  )

  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [issues, setIssues] = useState<ModelDiscussion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchIssues = useCallback(async (pageToFetch: number) => {
    setLoading(true)
    setError(null)

    try {
      const response = await getDiscussionFollow({ page: pageToFetch, size: PAGE_SIZE })
      const items = response.items || []
      setIssues((prev) => (pageToFetch === 1 ? items : [...prev, ...items]))
      setPage(pageToFetch)
      setHasMore(items.length === PAGE_SIZE && pageToFetch * PAGE_SIZE < (response?.total as number))
    } catch (e) {
      console.error('获取关注的 Issue 失败', e)
      setError('获取关注的 Issue 失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIssues(1)
  }, [fetchIssues])

  const handleLoadMore = () => {
    if (loading || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    fetchIssues(page + 1).finally(() => {
      setIsLoadingMore(false)
    })
  }

  // Intersection Observer 用于监听滚动到底部
  useEffect(() => {
    if (!hasMore || loading || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting) {
          handleLoadMore()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
      },
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loading, isLoadingMore, page])

  if (!loading && issues.length === 0) {
    return <EmptyState />
  }

  return (
    <Stack spacing={0} sx={{ pt: 2 }}>
      {error && (
        <Card variant='outlined' sx={{ borderRadius: 2, p: 3, borderColor: 'error.light', mb: 2 }}>
          <Typography variant='body2' color='error'>
            {error}
          </Typography>
        </Card>
      )}

      {issues.map((issue) => {
        const groupNames = getGroupNames(issue.group_ids)
        const allTags = groupNames
        const isIssuePost = issue.type === ModelDiscussionType.DiscussionTypeIssue
        const postStatus = getPostStatus(issue)

        return (
          <Link
            key={issue.id}
            href={`/${params?.route_name as string}/${issue.uuid}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <Box
              sx={{
                borderBottom: '1px solid #f3f4f6',
                transition: 'all 0.2s',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: theme=>theme.palette.primaryAlpha?.[3],
                },
                p: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 2,
                  gap: 1,
                }}
              >
                <DiscussionTypeChip size='small' type={issue.type} variant='default' />
                <Ellipsis
                  sx={{
                    fontWeight: 700,
                    color: '#111827',
                    letterSpacing: '-0.01em',
                    fontSize: '16px',
                    lineHeight: '24px',
                    '&:hover': { color: '#000000' },
                    flex: 1,
                  }}
                >
                  {issue.title}
                </Ellipsis>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {/* Issue 类型使用 IssueStatusChip 显示所有状态 */}
                  {isIssuePost && shouldShowStatus(issue) && <IssueStatusChip resolved={issue.resolved} size='small' />}
                  {/* 非 Issue 类型显示已解决/已关闭状态 */}
                  {!isIssuePost && shouldShowStatus(issue) && (
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
                        bgcolor: getStatusColor(postStatus),
                        color: '#fff !important',
                        height: 20,
                        fontWeight: 600,
                        fontSize: '12px',
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
                          height: 20,
                          fontSize: '12px',
                          lineHeight: '22px',
                          borderRadius: '3px',
                          cursor: 'default',
                          pointerEvents: 'none',
                        }}
                      />
                    )
                  })}
                </Box>

                <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
                  {(issue.type === ModelDiscussionType.DiscussionTypeBlog ||
                    issue.type === ModelDiscussionType.DiscussionTypeIssue) && (
                    <Box
                      sx={(theme) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        background: theme.palette.primaryAlpha?.[6],
                        color: 'primary.main',
                        px: 1,
                        borderRadius: 0.5,
                      })}
                    >
                      <Icon type='icon-dianzan1' sx={{ fontSize: 12 }} />
                      <Typography variant='caption' sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                        {(issue.like || 0) - (issue.dislike || 0)}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Link>
        )
      })}

      {/* 滚动加载指示器 */}
      <Box
        ref={observerTarget}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          py: 2,
          minHeight: '60px',
          alignItems: 'center',
        }}
      >
        {((hasMore && isLoadingMore) || (loading && issues.length > 0)) && (
          <Stack direction='row' alignItems='center' spacing={1}>
            <CircularProgress size={20} thickness={4} />
            <Typography variant='body2' sx={{ color: '#6b7280' }}>
              加载更多...
            </Typography>
          </Stack>
        )}
      </Box>

      {/* 初始加载状态 */}
      {loading && issues.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}
    </Stack>
  )
}
