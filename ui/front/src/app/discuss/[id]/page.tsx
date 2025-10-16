import { getDiscussionDiscId } from '@/api'
import { formatMeta } from '@/lib/utils'
import { Box, Stack, CircularProgress } from '@mui/material'
import { ResolvingMetadata } from 'next'
import Content from './ui/content'
import TitleCard from './ui/titleCard'
import ScrollAnimation from '@/components/ScrollAnimation'
import { Suspense } from 'react'

// 添加CSS动画样式
const animationStyles = `
  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
    100% {
      opacity: 1;
    }
  }
  
  @keyframes fadeInOut {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.4;
    }
  }
`

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = animationStyles
  document.head.appendChild(styleSheet)
}

export async function generateMetadata(
  props: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ [key: string]: string }>
  },
  parent: ResolvingMetadata,
) {
  const params = await props.params
  const { id } = params
  const data = await getDiscussionDiscId({ discId: id })
  return await formatMeta(
    {
      title: data.title,
      keywords: (data.group_ids || []).join(',') + (data.tags || []).join(','),
    },
    parent,
  )
}

// 加载组件
const LoadingSpinner = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '50vh',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    <CircularProgress 
      size={40} 
      sx={{ 
        color: 'primary.main',
        animation: 'pulse 2s infinite',
      }} 
    />
    <Box
      sx={{
        fontSize: 14,
        color: 'text.secondary',
        animation: 'fadeInOut 1.5s infinite',
      }}
    >
      加载中...
    </Box>
  </Box>
)

const Page = async (props: { params: Promise<{ id: string }> }) => {
  const params = await props.params
  const { id } = params
  const data = await getDiscussionDiscId({ discId: id })
  data.comments?.sort((item) => {
    if (item.accepted) return -1
    return 1
  })
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
          background: 'radial-gradient(circle at 20% 80%, rgba(32, 108, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(32, 108, 255, 0.05) 0%, transparent 50%)',
          zIndex: -1,
          pointerEvents: 'none',
        },
      }}
    >
      <ScrollAnimation animation="fadeInDown" duration={0.8}>
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
          mt:  '-180px',
          pt: 11,
          pb: '100px',
          px: { xs: 2, sm: 0 },
          minHeight: '100vh',
        }}
      >
        <ScrollAnimation animation="fadeInUp" delay={100} duration={0.6}>
          <TitleCard data={data}></TitleCard>
        </ScrollAnimation>
        <Box
          sx={{
            my: '20px',
            display: { xs: 'block', sm: 'none' },
          }}
        />
        <ScrollAnimation animation="fadeInUp" delay={200} duration={0.6} immediate={true}>
          <Stack direction='row' alignItems='flex-start' sx={{ mt: { xs: 0, sm: 3 } }} gap={3}>
            <Content data={data}></Content>
          </Stack>
        </ScrollAnimation>
      </Box>
    </Box>
  )
}

export default Page
