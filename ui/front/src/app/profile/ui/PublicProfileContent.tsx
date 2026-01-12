'use client'

import { ModelUserRole, SvcUserStatisticsRes } from '@/api/types'
import CommonAvatar from '@/components/CommonAvatar'
import { Box, Divider } from '@mui/material'
import { useMemo, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import ProfileHeroCard from './ProfileHeroCard'
import UserTrendList from './UserTrendList'

interface PublicProfileContentProps {
  userId: number
  statistics?: SvcUserStatisticsRes | null
}

export default function PublicProfileContent({ userId, statistics }: PublicProfileContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateQueryParams = useCallback(
    (discussionType: string, trendType: string) => {
      const params = new URLSearchParams(searchParams?.toString())
      params.set('discussion_type', discussionType)
      params.set('trend_type', trendType)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const metrics = useMemo(
    () => [
      {
        label: '问题',
        value: statistics?.qa_count ?? 0,
        onClick: () => updateQueryParams('qa', '1'),
      },
      {
        label: '文章',
        value: statistics?.blog_count ?? 0,
        onClick: () => updateQueryParams('blog', '1'),
      },
      {
        label: '回答',
        value: statistics?.answer_count ?? 0,
        onClick: () => updateQueryParams('qa', '3'),
      },
      { label: '积分', value: statistics?.point ?? 0 },
    ],
    [statistics, updateQueryParams],
  )

  return (
    <Box
      sx={{
        maxWidth: 748,
        mx: 'auto',
        mt: {xs: 0, lg: 3},
        bgcolor: 'background.paper',
        px: 1,
        borderRadius: {xs: 0, lg: 1},
        border:  {xs: 0, lg: '1px solid'},
        borderColor: {xs: 'transparent', lg: 'border'},
      }}
    >
      {/* 头部背景区域 */}
      <ProfileHeroCard
        role={statistics?.role || ModelUserRole.UserRoleGuest}
        subtitle={statistics?.intro || '暂无个人介绍'}
        avatar={
          <Box
            sx={{
              borderRadius: '50%',
              width: 88,
              height: 88,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CommonAvatar
              src={statistics?.avatar}
              name={statistics?.name}
              sx={{
                width: '100%',
                height: '100%',
              }}
            />
          </Box>
        }
        title={statistics?.name || '匿名用户'}
        metrics={metrics}
      />
      <Divider sx={{ mb: 2, mx: 3 }} />
      {/* 标签页 */}
      {/* 子元素 role=tabpanel 的加个 border */}
      <Box sx={{ px: 3 }}>
        <UserTrendList userId={userId} ownerName={statistics?.name} />
      </Box>
    </Box>
  )
}
