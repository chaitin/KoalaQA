'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Box, Card, CircularProgress, Stack, Typography } from '@mui/material'
import { getDiscussionFollow } from '@/api'
import { ModelDiscussion, ModelDiscussionState, ModelDiscussionType, ModelListRes } from '@/api/types'
import { DiscussionTypeChip, StatusChip } from '@/components'
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

const shouldShowStatus = (data: ModelDiscussion) => {
  return true
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
      暂无关注或收藏的内容
    </Typography>
    <Typography variant='body2' sx={{ color: '#6b7280' }}>
      您还没有关注任何内容
    </Typography>
  </Box>
)

export default function FollowingIssuesList() {
  const { groups } = useContext(CommonContext)
  const params = useParams()

  // // 使用 useMemo 优化分组名称计算
  // const getGroupNames = useCallback(
  //   (groupIds?: number[]) => {
  //     if (!groupIds || !groups.flat.length) return []
  //     const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))
  //     return groupIds.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
  //   },
  //   [groups.flat],
  // )

  // 获取父级分类名称 (Category)
  const getCategoryNames = useCallback(
    (groupIds?: number[]) => {
      if (!groupIds || !groups.origin.length) return []
      const names = new Set<string>()
      groups.origin.forEach((parent) => {
        if (parent.items?.some((item) => item.id && groupIds?.includes(item.id || 0))) {
          if (parent.name) names.add(parent.name)
        }
      })
      return Array.from(names)
    },
    [groups.origin],
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
        // const groupNames = getGroupNames(issue.group_ids)
        const categoryNames = getCategoryNames(issue.group_ids)
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
                  bgcolor: (theme) => theme.palette.primaryAlpha?.[3],
                },
                p: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                }}
              >
                <Ellipsis
                  sx={{
                    fontWeight: 600,
                    color: '#111827',
                    letterSpacing: '-0.01em',
                    fontSize: '15px',
                    lineHeight: '1.4',
                    '&:hover': { color: 'primary.main' },
                    flex: 1,
                    // 强制单行，保证高度整齐
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {issue.title}
                </Ellipsis>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    overflow: 'hidden',
                    flex: 1,
                  }}
                >
                  <Stack direction='row' alignItems='center' spacing={1} sx={{ overflow: 'hidden', flex: 1 }}>
                    {/* 状态和类型 */}
                    <StatusChip item={issue} size='small' sx={{ flexShrink: 0 }} />
                    <DiscussionTypeChip size='small' type={issue.type} variant='default' sx={{ height: 20 }} />

                    {categoryNames.map((name) => (
                      <Chip
                        key={`cat-${name}`}
                        label={name}
                        size='small'
                        sx={{
                          bgcolor: 'rgba(233, 236, 239, 1)',
                          color: 'rgba(33, 34, 45, 1)',
                          height: 22,
                          lineHeight: '22px',
                          fontWeight: 400,
                          fontSize: '12px',
                          borderRadius: '3px',
                          cursor: 'default',
                          pointerEvents: 'none',
                        }}
                      />
                    ))}

                  </Stack>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexShrink: 0 }}>
                  {(issue.type === ModelDiscussionType.DiscussionTypeBlog ||
                    issue.type === ModelDiscussionType.DiscussionTypeIssue ||
                    issue.type === ModelDiscussionType.DiscussionTypeQA) && (
                      <Box
                        sx={(theme) => ({
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: 'text.secondary',
                        })}
                      >
                        <Icon type='icon-dianzan1' sx={{ fontSize: 13 }} />
                        <Typography variant='caption' sx={{ fontWeight: 500 }}>
                          {issue.like || 0}
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
