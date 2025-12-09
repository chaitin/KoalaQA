'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Box, Card, CircularProgress, Stack, Typography } from '@mui/material'
import { getUserPoint } from '@/api'
import { ModelListRes, ModelUserPointRecord, ModelUserPointType } from '@/api/types'
import { TimeDisplay } from '@/components/TimeDisplay'

interface UserPointListProps {
  userId: number
}

const PAGE_SIZE = 10

const getPointTypeName = (type?: ModelUserPointType): string => {
  switch (type) {
    case ModelUserPointType.UserPointTypeCreateBlog:
      return '发表文章'
    case ModelUserPointType.UserPointTypeAnswerAccepted:
      return '回答被采纳'
    case ModelUserPointType.UserPointTypeLikeBlog:
      return '文章收获点赞'
    case ModelUserPointType.UserPointTypeAnswerLiked:
      return '回答收获点赞'
    case ModelUserPointType.UserPointTypeAssociateIssue:
      return '问题被转 issue'
    case ModelUserPointType.UserPointTypeAcceptAnswer:
      return '提问并采纳回答'
    case ModelUserPointType.UserPointTypeAnswerQA:
      return '回答问题'
    case ModelUserPointType.UserPointTypeDislikeAnswer:
      return '点踩他人回答'
    case ModelUserPointType.UserPointTypeAnswerDisliked:
      return '回答被点踩'
    case ModelUserPointType.UserPointTypeUserRole:
    case ModelUserPointType.UserPointTypeUserAvatar:
    case ModelUserPointType.UserPointTypeUserIntro:
      return '完善个人信息'
    default:
      return '其他'
  }
}

const EmptyState = () => (
  <Box
    sx={{
      p: 6,
      textAlign: 'center',
    }}
  >
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
      <Image src='/empty.png' alt='暂无积分明细' width={250} height={137} style={{ maxWidth: '100%', height: 'auto' }} />
    </Box>
    <Typography variant='h6' sx={{ mb: 1, fontWeight: 600 }}>
      暂无积分明细
    </Typography>
    <Typography variant='body2' sx={{ color: '#6b7280' }}>
      还没有积分记录
    </Typography>
  </Box>
)

export default function UserPointList({ userId }: UserPointListProps) {
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [points, setPoints] = useState<ModelUserPointRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const observerTarget = useRef<HTMLDivElement>(null)

  const fetchPoints = useCallback(
    async (pageToFetch: number) => {
      if (!userId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await getUserPoint({ page: pageToFetch, size: PAGE_SIZE })
        const listRes = (response as { data?: ModelListRes & { items?: ModelUserPointRecord[]; total?: number } })?.data
        const items = listRes?.items || (response as { items?: ModelUserPointRecord[] })?.items || []

        setTotal((listRes?.total as number) || (response as { total?: number })?.total || 0)
        setPoints((prev) => (pageToFetch === 1 ? items : [...prev, ...items]))
        setPage(pageToFetch)
      } catch (e) {
        console.error('获取积分明细失败', e)
        setError('获取积分明细失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    fetchPoints(1)
  }, [fetchPoints])

  // 更新hasMore状态
  useEffect(() => {
    setHasMore(points.length < total)
  }, [points.length, total])

  const handleLoadMore = () => {
    if (loading || isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    fetchPoints(page + 1).finally(() => {
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

  if (!loading && points.length === 0) {
    return <EmptyState />
  }

  return (
    <Box
      sx={{
        borderRadius: 2,
        pt: 3,
        pb: 3,
      }}
    >
      <Stack spacing={2}>
        {error && (
          <Card variant='outlined' sx={{ borderRadius: 2, p: 3, borderColor: 'error.light' }}>
            <Typography variant='body2' color='error'>
              {error}
            </Typography>
          </Card>
        )}

        {points.map((point) => {
          const pointTypeName = getPointTypeName(point.type)
          const pointValue = point.point || 0

          return (
            <Card
              key={point.id}
              variant='outlined'
              sx={{
                borderRadius: 1,
                p: 2,
                bgcolor: 'rgba(0,99,151,0.03)',
                border: '1px solid #D9DEE2',
                fontSize: 14,
                transition: 'all 0.2s ease',
              }}
            >
              <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box component='span' sx={{ color: '#21222D', fontWeight: 700 }}>
                    {pointTypeName}
                  </Box>
                </Box>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ flexShrink: 0 }}>
                  <Typography
                    variant='body2'
                    sx={{
                      color: pointValue > 0 ? '#10b981' : '#ef4444',
                      fontWeight: 600,
                      fontSize: '14px',
                    }}
                  >
                    {pointValue > 0 ? `+${pointValue}` : `${pointValue}`}
                  </Typography>
                  {point.created_at && (
                    <Box>
                      <TimeDisplay timestamp={point.created_at} style={{ color: '#9ca3af', fontSize: '0.875rem' }} />
                    </Box>
                  )}
                </Stack>
              </Stack>
            </Card>
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
          {((hasMore && isLoadingMore) || (loading && points.length > 0)) && (
            <Stack direction='row' alignItems='center' spacing={1}>
              <CircularProgress size={20} thickness={4} />
              <Typography variant='body2' sx={{ color: '#6b7280' }}>
                加载更多...
              </Typography>
            </Stack>
          )}
        </Box>

        {/* 初始加载状态 */}
        {loading && !hasMore && points.length === 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        )}
      </Stack>
    </Box>
  )
}

