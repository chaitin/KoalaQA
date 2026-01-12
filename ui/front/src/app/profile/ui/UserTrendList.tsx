'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Box, Button, Card, CircularProgress, Stack, Typography } from '@mui/material'
import { getUserTrend } from '@/api'
import { ModelDiscussionType, ModelListRes, ModelTrend, ModelForumInfo } from '@/api/types'
import { useForumStore } from '@/store'
import { TimeDisplay } from '@/components/TimeDisplay'
import { buildRouteWithRouteName } from '@/lib/utils'

interface UserTrendListProps {
  userId: number
  ownerName?: string
}

const PAGE_SIZE = 10

const getTrendDescription = (trend: ModelTrend) => {
  if (trend.trend_type === 1) {
    if (trend.discussion_type === ModelDiscussionType.DiscussionTypeBlog) {
      return '发表了文章'
    }
    if (trend.discussion_type === ModelDiscussionType.DiscussionTypeIssue) {
      return '创建了 Issue'
    }
    return '提出了问题'
  }

  if (trend.trend_type === 2) {
    return '回答被采纳'
  }

  if (trend.trend_type === 3) {
    return '回答了问题'
  }

  return '有新的动态'
}

const formatRoute = (trend: ModelTrend, forums: ModelForumInfo[] = []) => {
  if (!trend.discuss_uuid) {
    return '#'
  }

  if (trend.forum_id) {
    const forum = forums.find((item: ModelForumInfo) => item.id === trend.forum_id)
    if (forum) {
      return buildRouteWithRouteName(`${trend.discuss_uuid}`, { id: forum.id!, route_name: forum.route_name })
    }
    return `/${trend.forum_id}/${trend.discuss_uuid}`
  }

  return `/${trend.discuss_uuid}`
}

const EmptyState = () => (
  <Box
    sx={{
      p: 6,
      textAlign: 'center',
    }}
  >
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
      <Image src='/empty.png' alt='暂无动态' width={250} height={137} style={{ maxWidth: '100%', height: 'auto' }} />
    </Box>
    <Typography variant='h6' sx={{ mb: 1, fontWeight: 600 }}>
      暂无动态
    </Typography>
    <Typography variant='body2' sx={{ color: '#6b7280' }}>
      最近还没有新的社区活动
    </Typography>
  </Box>
)

export default function UserTrendList({ userId, ownerName }: UserTrendListProps) {
  const searchParams = useSearchParams()
  const forums = useForumStore((s) => s.forums)
  const forumMap = useMemo(() => {
    const map = new Map<number, { name?: string; route_name?: string }>()
    ;(forums || []).forEach((forum) => {
      if (typeof forum.id === 'number') {
        map.set(forum.id, { name: forum.name, route_name: forum.route_name })
      }
    })
    return map
  }, [forums])
  const accessibleForumIds = useMemo(() => new Set(forumMap.keys()), [forumMap])

  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [trends, setTrends] = useState<ModelTrend[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  // 从 URL 参数中读取过滤条件
  const discussionType = searchParams?.get('discussion_type') as "qa" | "feedback" | "blog" | "issue" | null
  const trendType = searchParams?.get('trend_type') ? Number(searchParams.get('trend_type')) as 1 | 2 | 3 | null : null

  const fetchTrend = useCallback(
    async (pageToFetch: number) => {
      if (!userId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params: Parameters<typeof getUserTrend>[0] = {
          user_id: userId,
          page: pageToFetch,
          size: PAGE_SIZE,
        }
        
        if (discussionType) {
          params.discussion_type = discussionType
        }
        
        if (trendType) {
          params.trend_type = trendType
        }

        const response = await getUserTrend(params)
        const listRes = (response as { data?: ModelListRes & { items?: ModelTrend[]; total?: number } })?.data
        const items = listRes?.items || (response as { items?: ModelTrend[] })?.items || []

        setTotal((listRes?.total as number) || (response as { total?: number })?.total || 0)
        setTrends((prev) => (pageToFetch === 1 ? items : [...prev, ...items]))
        setPage(pageToFetch)
      } catch (e) {
        console.error('获取用户动态失败', e)
      } finally {
        setLoading(false)
      }
    },
    [userId, discussionType, trendType],
  )

  useEffect(() => {
    fetchTrend(1)
  }, [fetchTrend])

  const filteredTrends = useMemo(() => {
    if (!accessibleForumIds.size) {
      return trends
    }
    return trends.filter((item) => !item.forum_id || accessibleForumIds.has(item.forum_id))
  }, [accessibleForumIds, trends])

  const hiddenCount = useMemo(
    () => Math.max(trends.length - filteredTrends.length, 0),
    [filteredTrends.length, trends.length],
  )

  // 更新hasMore状态
  useEffect(() => {
    setHasMore(filteredTrends.length < total)
  }, [filteredTrends.length, total])

  const handleLoadMore = () => {
    if (loading || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    fetchTrend(page + 1).finally(() => {
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

  if (!loading && filteredTrends.length === 0) {
    return <EmptyState />
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        pt: 2,
      }}
    >
      <Stack spacing={2}>
        {error && (
          <Card variant='outlined'>
            <Typography variant='body2' color='error'>
              {error}
            </Typography>
          </Card>
        )}

        {filteredTrends.map((trend) => {
          const trendDescription = getTrendDescription(trend)
          const href = formatRoute(trend, forums)

          return (
            <Link key={trend.id} href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
              <Card
                variant='outlined'
                sx={theme=>({
                  borderRadius: 1,
                  p: 2,
                  bgcolor: '#fafbfc',
                  border: '1px solid #D9DEE2',
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  },
                  fontSize: 14,
                  transition: 'all 0.2s ease',
                })}
              >
                <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box component='span' sx={{ color: '#21222D', fontWeight: 700 }}>
                      {trendDescription}
                    </Box>
                    <Box component='span' sx={{ color: 'rgba(33, 34, 45, 0.70)', fontWeight: 400, ml: '4px' }}>
                      "{trend.discuss_title}"
                    </Box>
                  </Box>
                  {trend.updated_at && (
                    <Box sx={{ flexShrink: 0 }}>
                      <TimeDisplay timestamp={trend.updated_at} style={{ color: '#9ca3af', fontSize: '0.875rem' }} />
                    </Box>
                  )}
                </Stack>
              </Card>
            </Link>
          )
        })}

        {hiddenCount > 0 && (
          <Typography variant='caption' sx={{ color: '#9ca3af', textAlign: 'center' }}>
            有 {hiddenCount} 条动态因缺少板块权限未展示
          </Typography>
        )}

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
          {((hasMore && isLoadingMore) || (loading && filteredTrends.length > 0)) && (
            <Stack direction='row' alignItems='center' spacing={1}>
              <CircularProgress size={20} thickness={4} />
              <Typography variant='body2' sx={{ color: '#6b7280' }}>
                加载更多动态...
              </Typography>
            </Stack>
          )}
        </Box>

        {/* 初始加载状态 */}
        {loading && !hasMore && filteredTrends.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </Stack>
    </Box>
  )
}
