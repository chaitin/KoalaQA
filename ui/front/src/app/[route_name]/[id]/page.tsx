import { getDiscussionDiscId, ModelDiscussionType } from '@/api'
import { Metadata } from 'next'
import { Suspense } from 'react'
import { Box, Stack, Alert, Typography } from '@mui/material'
import TitleCard from './ui/titleCard'
import Content from './ui/content'
import OutlineSidebar from './ui/OutlineSidebar'

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
      error: error instanceof Error ? error.message : '获取讨论详情失败',
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
            <Typography variant='h6' gutterBottom>
              获取讨论详情失败
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {result.error}
            </Typography>
          </Alert>
          <Typography variant='body2' color='text.disabled' textAlign='center'>
            请检查网络连接或稍后重试
          </Typography>
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
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(circle at 20% 80%, rgba(32, 108, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(32, 108, 255, 0.05) 0%, transparent 50%)',
          zIndex: -1,
          pointerEvents: 'none',
        },
      }}
    >
      <Box
        sx={{
          mt: '64px',
          width: '100%',
          height: 200,
          backgroundImage: 'url(/banner.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      />
      <Stack
        sx={{
          position: 'relative',
          top: '-100px',
          px: 3,
        }}
        direction={'row'}
        justifyContent='center'
        alignItems='flex-start'
        gap={3}
      >
        {isArticle && <Box sx={{ width: '290px', display: { md: 'none', lg: 'block' } }} />}
        <Box sx={{ width: { xs: '100%', sm: 800 } }}>
          <h1 style={{ display: 'none' }}>讨论详情</h1>
          <Suspense fallback={<LoadingSpinner />}>
            <TitleCard data={discussion} />
            <Box
              sx={{
                my: '20px',
                display: { xs: 'block', sm: 'none' },
              }}
            />
            <Stack direction='row' alignItems='flex-start' sx={{ mt: { xs: 0, sm: 3 }, width: '100%' }} gap={3}>
              <Box sx={{ flex: 1, width: '100%' }}>
                <Content data={discussion} />
              </Box>
            </Stack>
          </Suspense>
        </Box>
        {isArticle && <OutlineSidebar discussion={discussion} />}
      </Stack>
    </Box>
  )
}

export default DiscussDetailPage
