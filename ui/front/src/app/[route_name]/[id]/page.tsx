import { getDiscussionDiscId } from '@/api'
import { Alert, Box, Typography } from '@mui/material'
import { Metadata } from 'next'
import { cache, Suspense } from 'react'
import DetailSidebarWrapper from './ui/DetailSidebarWrapper'
import LoadingSpinner from '@/components/LoadingSpinner'
import ScrollReset from '@/components/ScrollReset'
import DiscussionAlert from './ui/DiscussionAlert'
import AddRefreshParam from './ui/AddRefreshParam'
import DetailContent from './ui/DetailContent'

// 动态生成 metadata
export async function generateMetadata(props: {
  params: Promise<{ route_name: string; id: string }>
}): Promise<Metadata> {
  const { id } = await props.params
  try {
    // metadata 生成时不增加浏览量
    const result = await fetchDiscussionDetailCached(id, true)
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
async function fetchDiscussionDetail(discId: string, noView?: boolean) {
  try {
    const discussion = await getDiscussionDiscId({ discId, no_view: noView })
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

const DiscussDetailPage = async (props: {
  params: Promise<{ route_name: string; id: string }>
  searchParams: Promise<{ refresh?: string }>
}) => {
  const { id } = await props.params
  const searchParams = await props.searchParams
  // 如果是刷新操作（通过 searchParams.refresh 标记），则不增加浏览次数
  const isRefresh = searchParams.refresh === 'true'
  const result = await fetchDiscussionDetailCached(id, isRefresh)

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
  // const groups =
  //   (await getServerGroup(result.data?.forum_id))?.items?.flatMap(
  //     (group) => group?.items?.map((item) => item.id) ?? [],
  //   ) || []
  // discussion.groups = discussion.groups?.filter(({ id }) => groups?.includes(id))
  return (
    <>
      <ScrollReset />
      <AddRefreshParam />
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          pb: 2,
          minHeight: 'calc(100vh - 90px)',
          position: 'relative',
          gap: 3,
        }}
      >
        {/* 主内容区域 - 居中 */}
        <Box
          sx={{
            width: { xs: '100%', lg: '1044px' },
            flexShrink: 0,
          }}
        >
          {shouldShowAlert && <DiscussionAlert defaultOpen />}
          <h1 style={{ display: 'none' }}>讨论详情</h1>
          <Suspense fallback={<LoadingSpinner />}>
            <DetailContent discussion={discussion} />
          </Suspense>
        </Box>

        {/* 右侧边栏 - 独立定位，不参与居中计算 */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'block' },
            width: '300px',
          }}
        >
          <DetailSidebarWrapper type={discussion.type} discussion={discussion} discId={discussion.uuid || id} />
        </Box>
      </Box>
    </>
  )
}

export default DiscussDetailPage
