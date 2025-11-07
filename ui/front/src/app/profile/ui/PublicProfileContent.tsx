'use client'

import { useMemo } from 'react'
import { Box, Container, Stack } from '@mui/material'
import CommonAvatar from '@/components/CommonAvatar'
import UserTrendList from './UserTrendList'
import { SvcUserStatisticsRes } from '@/api/types'
import ProfileHeroCard from './ProfileHeroCard'

interface PublicProfileContentProps {
  userId: number
  statistics?: SvcUserStatisticsRes | null
}

const metricItems = (
  stats?: SvcUserStatisticsRes | null,
): Array<{ label: string; value: number }> => [
  { label: '问答', value: stats?.qa_count ?? 0 },
  { label: '文章', value: stats?.blog_count ?? 0 },
  { label: '回答', value: stats?.answer_count ?? 0 },
]

export default function PublicProfileContent({ userId, statistics }: PublicProfileContentProps) {
  const metrics = useMemo(() => metricItems(statistics), [statistics])
  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#F1F2F8',
        pt: 11,
        pb: 6,
      }}
    >
      <Container maxWidth='lg'>
        <Stack spacing={3}>
          <ProfileHeroCard
            avatar={
              <CommonAvatar
                src={statistics?.avatar}
                name={statistics?.name}
                sx={{ width: 96, height: 96, fontSize: 32, bgcolor: '#4b5563' }}
              />
            }
            title={statistics?.name || '匿名用户'}
            subtitle='社区公开动态'
            metrics={metrics}
          />

          <UserTrendList userId={userId} ownerName={statistics?.name} />
        </Stack>
      </Container>
    </Box>
  )
}


