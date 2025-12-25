'use client'

import { ModelUserRole, SvcUserStatisticsRes } from '@/api/types'
import CommonAvatar from '@/components/CommonAvatar'
import { Box, Card, Divider } from '@mui/material'
import { useMemo } from 'react'
import ProfileHeroCard from './ProfileHeroCard'
import UserTrendList from './UserTrendList'

interface PublicProfileContentProps {
  userId: number
  statistics?: SvcUserStatisticsRes | null
}

const metricItems = (stats?: SvcUserStatisticsRes | null): Array<{ label: string; value: number }> => [
  { label: '问答', value: stats?.qa_count ?? 0 },
  { label: '文章', value: stats?.blog_count ?? 0 },
  { label: '回答', value: stats?.answer_count ?? 0 },
  { label: '积分', value: stats?.point ?? 0 },
]

const toggleButtonSx = {
  height: 30,
  fontWeight: 500,
  fontSize: '14px',
  color: '#21222D',
  border: '1px solid transparent',
  '&.Mui-selected': {
    bgcolor: 'rgba(0,99,151,0.06)',
    border: '1px solid rgba(0,99,151,0.1)',
    color: 'primary.main',
    '&.Mui-focusVisible': {
      bgcolor: '#000000',
      color: '#ffffff',
      outline: '2px solid #000000',
      outlineOffset: '2px',
    },
  },
  '&:hover': { bgcolor: '#f3f4f6', color: '#000000' },
}

export default function PublicProfileContent({ userId, statistics }: PublicProfileContentProps) {
  const metrics = useMemo(() => metricItems(statistics), [statistics])

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
