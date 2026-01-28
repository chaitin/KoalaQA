'use client'

import { ModelUserRole, SvcUserStatisticsRes } from '@/api/types'
import CommonAvatar from '@/components/CommonAvatar'
import { Box, Divider } from '@mui/material'
import { useMemo, useCallback, useContext } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import ProfileHeroCard from './ProfileHeroCard'
import UserTrendList from './UserTrendList'
import UserPortraitPanel from './UserPortraitPanel'
import { AuthContext } from '@/components/authProvider'
import { isAdminRole } from '@/lib/utils'

interface PublicProfileContentProps {
  userId: number
  statistics?: SvcUserStatisticsRes | null
}

export default function PublicProfileContent({ userId, statistics }: PublicProfileContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useContext(AuthContext)

  const canManagePortrait = useMemo(() => {
    const role = user?.role ?? ModelUserRole.UserRoleUnknown
    return isAdminRole(role)
  }, [user?.role])

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
        maxWidth: 1120,
        mx: 'auto',
        mt: { xs: 0, lg: 3 },
        px: { xs: 1, lg: 0 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'stretch',
          gap: { xs: 2, lg: 3 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            maxWidth: { xs: '100%', lg: 780 },
            mx: { xs: 0, lg: 'auto' },
            bgcolor: 'background.paper',
            borderRadius: { xs: 0, lg: 1 },
            border: { xs: 0, lg: '1px solid' },
            borderColor: { xs: 'transparent', lg: 'border' },
            px: 1,
            pb: 2,
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

        {canManagePortrait ? (
          <Box sx={{ width: { xs: '100%', lg: 320 }, flexShrink: 0 }}>
            <UserPortraitPanel userId={userId} targetUserName={statistics?.name} />
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
