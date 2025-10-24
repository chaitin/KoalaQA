import { getDiscussionDiscId } from '@/api'
import { Metadata } from 'next'
import { Suspense } from 'react'
import { Box, Stack } from '@mui/material'
import TitleCard from './ui/titleCard'
import Content from './ui/content'
import ScrollAnimation from '@/components/ScrollAnimation'

export const metadata: Metadata = {
  title: '讨论详情',
  description: '查看和参与技术讨论',
}

// 数据获取函数
async function fetchDiscussionDetail(discId: string) {
  try {
    const discussion = await getDiscussionDiscId({ discId })
    return discussion
  } catch (error) {
    console.error('Failed to fetch discussion detail:', error)
    return null
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

const DiscussDetailPage = async (props: { params: Promise<{ forum_id: string; id: string }> }) => {
  const { id } = await props.params

  // 获取讨论详情
  const discussion = await fetchDiscussionDetail(id)

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
      <ScrollAnimation animation='fadeInDown' duration={0.8}>
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
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(32, 108, 255, 0.1) 0%, rgba(0, 0, 0, 0.1) 100%)',
              zIndex: 1,
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 50% 50%, rgba(32, 108, 255, 0.05) 0%, transparent 70%)',
              zIndex: 2,
            },
          }}
        />
      </ScrollAnimation>
      <Box
        sx={{
          zIndex: 1,
          width: { xs: '100%', sm: 800 },
          mx: 'auto',
          mt: '-180px',
          pt: 11,
          pb: '100px',
          px: { xs: 2, sm: 0 },
          minHeight: '100vh',
        }}
      >
        <h1 style={{ display: 'none' }}>讨论详情</h1>
        <Suspense fallback={<LoadingSpinner />}>
          <ScrollAnimation animation='fadeInUp' delay={100} duration={0.6}>
            <TitleCard data={discussion} />
          </ScrollAnimation>
          <Box
            sx={{
              my: '20px',
              display: { xs: 'block', sm: 'none' },
            }}
          />
          <ScrollAnimation animation='fadeInUp' delay={200} duration={0.6} immediate={true}>
            <Stack direction='row' alignItems='flex-start' sx={{ mt: { xs: 0, sm: 3 }, width: '100%' }} gap={3}>
              <Box sx={{ flex: 1, width: '100%' }}>
                <Content data={discussion} />
              </Box>
            </Stack>
          </ScrollAnimation>
        </Suspense>
      </Box>
    </Box>
  )
}

export default DiscussDetailPage
