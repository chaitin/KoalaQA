'use client'

import { useMemo } from 'react'
import { Box, Card, ToggleButton, ToggleButtonGroup } from '@mui/material'
import CommonAvatar from '@/components/CommonAvatar'
import UserTrendList from './UserTrendList'
import { SvcUserStatisticsRes } from '@/api/types'
import ProfileHeroCard from './ProfileHeroCard'

interface PublicProfileContentProps {
  userId: number
  statistics?: SvcUserStatisticsRes | null
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ px: 3, pb: 0 }}>{children}</Box>}
    </div>
  )
}

const metricItems = (stats?: SvcUserStatisticsRes | null): Array<{ label: string; value: number }> => [
  { label: '问答', value: stats?.qa_count ?? 0 },
  { label: '文章', value: stats?.blog_count ?? 0 },
  { label: '回答', value: stats?.answer_count ?? 0 },
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
  const tabValue = 0 // 只显示动态标签页

  return (
    <Box sx={{ maxWidth: 748, margin: '0 auto' }}>
      {/* 头部背景区域 */}
      <ProfileHeroCard
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
              sx={{ width: 96, height: 96, fontSize: 32, bgcolor: '#4b5563' }}
            />
          </Box>
        }
        title={statistics?.name || '匿名用户'}
        metrics={metrics}
      />

      {/* 标签页 */}
      <Card sx={{ borderRadius: 2, boxShadow: 'none' }}>
        <Box sx={{ p: 3}}>
          <ToggleButtonGroup
            value={tabValue.toString()}
            exclusive
            aria-label='个人中心标签页'
            sx={{
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: '6px !important',
                mr: 1,
              },
            }}
          >
            <ToggleButton value='0' sx={toggleButtonSx}>
              动态
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {/* 子元素 role=tabpanel 的加个 border */}
        <Box
          sx={{
            '& > [role=tabpanel]': {
              border: '1px solid #eee',
              borderRadius: 1,
              mb: 2,
              mt: 0,
              p: 0,
            },
          }}
        >
          <TabPanel value={tabValue} index={0}>
            <UserTrendList userId={userId} ownerName={statistics?.name} />
          </TabPanel>
        </Box>
      </Card>
    </Box>
  )
}
