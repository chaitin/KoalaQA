import { getDiscussionDiscId, ModelDiscussionType } from '@/api'
import { Alert, Box, Typography } from '@mui/material'
import { Metadata } from 'next'
import { Suspense } from 'react'
import Content from './ui/content'
import TitleCard from './ui/titleCard'
import DetailSidebarWrapper from './ui/DetailSidebarWrapper'

export const metadata: Metadata = {
  title: '讨论详情',
  description: '查看和参与技术讨论',
}

// 数据获取函数
async function fetchDiscussionDetail(discId: string) {
  try {
    const discussion = await getDiscussionDiscId({ discId })
    return { success: true, data: discussion, error: null }
  } catch (error) {
    console.error('Failed to fetch discussion detail:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error || '获取讨论详情失败'),
    }
  }
}

const LoadingSpinner = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '200px',
      fontSize: 16,
      color: 'rgba(0,0,0,0.6)',
    }}
  >
    加载中...
  </Box>
)

const DiscussDetailPage = async (props: { params: Promise<{ route_name: string; id: string }> }) => {
  const { id } = await props.params

  // 获取讨论详情
  const result = await fetchDiscussionDetail(id)
  const isArticle = result.data?.type === ModelDiscussionType.DiscussionTypeBlog
  // 处理错误情况
  if (!result.success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Box sx={{ maxWidth: 600, width: '100%' }}>
          <Alert severity='error' sx={{ mb: 2 }}>
            <Typography variant='body2' gutterBottom>
              {result?.error === 'record not found' ? '未找到帖子，帖子或已被删除' : result?.error || '未知错误'}
            </Typography>
          </Alert>
        </Box>
      </Box>
    )
  }

  const discussion = result.data

  if (!discussion) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: 'rgba(0,0,0,0.6)',
        }}
      >
        讨论不存在或已被删除
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', gap: { xs: 0, lg: 3 }, justifyContent: { lg: 'center' }, alignItems: { lg: 'flex-start' } }}>
      {/* 主内容区域 */}
      <Box sx={{ flex: 1, minWidth: 0, maxWidth: { lg: 720 }, width: { xs: '100%', lg: 'auto' },px: { xs: 0, md: 3 } }}>
        <h1 style={{ display: 'none' }}>讨论详情</h1>
        <Suspense fallback={<LoadingSpinner />}>
          <TitleCard data={discussion} />
          <Box sx={{ my: 2, display: { xs: 'block', sm: 'none' } }} />
          <Content data={discussion} />
        </Suspense>
      </Box>

      {/* 右侧边栏 - 仅在桌面端显示 */}
      <DetailSidebarWrapper
        isArticle={isArticle}
        discussion={discussion}
        discId={discussion.uuid || id}
      />
      
    </Box>
  )
}

export default DiscussDetailPage
