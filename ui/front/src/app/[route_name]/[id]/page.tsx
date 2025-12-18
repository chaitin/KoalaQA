import { getDiscussionDiscId } from '@/api'
import { Alert, Box, Stack, Typography } from '@mui/material'
import { Metadata } from 'next'
import { cache, Suspense } from 'react'
import Content from './ui/content'
import TitleCard from './ui/titleCard'
import DetailSidebarWrapper from './ui/DetailSidebarWrapper'
import LoadingSpinner from '@/components/LoadingSpinner'
import ScrollReset from '@/components/ScrollReset'
import DiscussionAlert from './ui/DiscussionAlert'

// 动态生成 metadata
export async function generateMetadata(props: {
  params: Promise<{ route_name: string; id: string }>
}): Promise<Metadata> {
  const { id } = await props.params
  try {
    const result = await fetchDiscussionDetailCached(id)
    if (result.success && result.data?.title) {
      return {
        title: result.data.title,
        description: result.data.summary || result.data.content?.substring(0, 150) || '查看和参与技术讨论',
      }
    }
  } catch (error) {
    console.error('Failed to fetch discussion for metadata:', error)
  }
  return {
    title: '讨论详情',
    description: '查看和参与技术讨论',
  }
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

// 避免同一请求周期内重复拉取
const fetchDiscussionDetailCached = cache(fetchDiscussionDetail)

const DiscussDetailPage = async (props: { params: Promise<{ route_name: string; id: string }> }) => {
  const { id } = await props.params

  // 获取讨论详情
  const result = await fetchDiscussionDetailCached(id)
  // 处理错误情况
  if (!result.success) {
    return (
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
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
  const shouldShowAlert = Boolean(discussion?.alert ?? (discussion as any)?.alter)

  if (!discussion) {
    return (
      <Box
        sx={{
          minHeight: 'calc(100vh - 64px)',
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
    <>
      <ScrollReset />
      <Box
        sx={{
          display: 'flex',
          gap: { xs: 0, lg: 3 },
          justifyContent: { lg: 'center' },
          alignItems: { lg: 'flex-start' },
          minHeight: '100vh',
        }}
      >
        {/* 主内容区域 */}
        <Stack
          sx={{
            flex: 1,
            minWidth: 0,
            alignSelf: 'stretch',
            width: { xs: '100%', lg: '750px' },
            position: 'relative',
          }}
        >
          {shouldShowAlert && <DiscussionAlert defaultOpen />}
          <h1 style={{ display: 'none' }}>讨论详情</h1>
          <Suspense fallback={<LoadingSpinner />}>
            <TitleCard data={discussion} />
            <Content data={discussion} />
          </Suspense>
        </Stack>

        {/* 右侧边栏 - 仅在桌面端显示 */}
        <DetailSidebarWrapper type={discussion.type} discussion={discussion} discId={discussion.uuid || id} />
      </Box>
    </>
  )
}

export default DiscussDetailPage
