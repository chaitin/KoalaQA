'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { getUserTrend } from '@/api'
import { ModelDiscussionType, ModelListRes, ModelTrend } from '@/api/types'
import { useForum } from '@/contexts/ForumContext'
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

const getDiscussionTypeTag = (discussionType?: ModelDiscussionType) => {
  switch (discussionType) {
    case ModelDiscussionType.DiscussionTypeBlog:
      return { label: '文章', color: '#FF7744' }
    case ModelDiscussionType.DiscussionTypeFeedback:
      return { label: '反馈', color: '#f59e0b' }
    case ModelDiscussionType.DiscussionTypeQA:
      return { label: '问答', color: '#1AA086' }
    default:
      return { label: '动态', color: '#3b82f6' }
  }
}

const formatRoute = (trend: ModelTrend, forums: ReturnType<typeof useForum>['forums']) => {
  if (!trend.discuss_uuid) {
    return '#'
  }

  if (trend.forum_id) {
    const forum = forums.find((item) => item.id === trend.forum_id)
    if (forum) {
      return buildRouteWithRouteName(`${trend.discuss_uuid}`, { id: forum.id!, route_name: forum.route_name })
    }
    return `/${trend.forum_id}/${trend.discuss_uuid}`
  }

  return `/${trend.discuss_uuid}`
}

const EmptyState = ({ ownerName }: { ownerName?: string }) => (
  <Card
    variant='outlined'
    sx={{
      borderRadius: 2,
      p: 6,
      bgcolor: '#fafafa',
      textAlign: 'center',
    }}
  >
    <Typography variant='h6' sx={{ mb: 1, fontWeight: 600 }}>
      暂无动态
    </Typography>
    <Typography variant='body2' sx={{ color: '#6b7280' }}>
      {ownerName ? `${ownerName} 最近还没有新的社区活动。` : '该用户最近还没有新的社区活动。'}
    </Typography>
  </Card>
)

export default function UserTrendList({ userId, ownerName }: UserTrendListProps) {
  const { forums } = useForum()
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

  const fetchTrend = useCallback(
    async (pageToFetch: number) => {
      if (!userId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await getUserTrend({ user_id: userId, page: pageToFetch, size: PAGE_SIZE })
        const listRes = (response as { data?: ModelListRes & { items?: ModelTrend[]; total?: number } })?.data
        const items = listRes?.items || (response as { items?: ModelTrend[] })?.items || []

        setTotal((listRes?.total as number) || (response as { total?: number })?.total || 0)
        setTrends((prev) => (pageToFetch === 1 ? items : [...prev, ...items]))
        setPage(pageToFetch)
      } catch (e) {
        console.error('获取用户动态失败', e)
        setError('获取动态失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [userId],
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

  const hiddenCount = useMemo(() => Math.max(trends.length - filteredTrends.length, 0), [filteredTrends.length, trends.length])

  const hasMore = useMemo(() => filteredTrends.length < total, [filteredTrends.length, total])

  const handleLoadMore = () => {
    if (loading) return
    fetchTrend(page + 1)
  }

  if (!loading && filteredTrends.length === 0) {
    return <EmptyState ownerName={ownerName} />
  }

  return (
    <Stack spacing={2}>
      {error && (
        <Card variant='outlined' sx={{ borderRadius: 2, p: 3, borderColor: 'error.light' }}>
          <Typography variant='body2' color='error'>
            {error}
          </Typography>
        </Card>
      )}

      {filteredTrends.map((trend) => {
        const trendDescription = getTrendDescription(trend)
        const tag = getDiscussionTypeTag(trend.discussion_type)
        const href = formatRoute(trend, forums)
        
        return (
          <Card
            key={trend.id}
            variant='outlined'
            sx={{
              borderRadius: 2,
              p: 3,
              borderColor: '#e5e7eb',
              boxShadow: 'none',
              '&:hover': {
                borderColor: '#d1d5db',
                boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Chip
                  label={tag.label}
                  size='small'
                  sx={{
                    bgcolor: `${tag.color}15`,
                    color: tag.color,
                    height: 22,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                />
                <Typography variant='subtitle2' sx={{ fontWeight: 600 }}>
                  {trendDescription}
                </Typography>
                {trend.updated_at && (
                  <TimeDisplay timestamp={trend.updated_at} style={{ color: '#6b7280', fontSize: '0.8rem' }} />
                )}
              </Stack>

              {trend.discuss_title && href !== '#' ? (
                <Link href={href} style={{ textDecoration: 'none' }}>
                  <Typography
                    variant='subtitle1'
                    sx={{
                      color: '#111827',
                      fontWeight: 600,
                      '&:hover': { color: '#000' },
                    }}
                  >
                    {trend.discuss_title}
                  </Typography>
                </Link>
              ) : (
                <Typography variant='subtitle1' sx={{ color: '#111827', fontWeight: 600 }}>
                  {trend.discuss_title || '相关内容已不可见'}
                </Typography>
              )}
            </Stack>
          </Card>
        )
      })}

      {hiddenCount > 0 && (
        <Typography variant='caption' sx={{ color: '#9ca3af', textAlign: 'center' }}>
          有 {hiddenCount} 条动态因缺少板块权限未展示
        </Typography>
      )}

      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button onClick={handleLoadMore} disabled={loading} variant='outlined' sx={{ minWidth: 160 }}>
            {loading ? (
              <Stack direction='row' alignItems='center' spacing={1}>
                <CircularProgress size={16} thickness={5} />
                <Typography variant='body2'>加载中...</Typography>
              </Stack>
            ) : (
              '加载更多'
            )}
          </Button>
        </Box>
      )}

      {loading && !hasMore && filteredTrends.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} />
        </Box>
      )}
    </Stack>
  )
}


