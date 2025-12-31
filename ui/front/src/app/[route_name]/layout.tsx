import { getForum, getGroup, getForumForumIdTags, ModelGroupItemInfo, ModelGroupWithItem, ModelDiscussionTag } from '@/api'
import { findForumIdByRouteName, findForumInfoByRouteName } from '@/lib/forum-server-utils'
import { safeApiCall } from '@/lib/error-utils'
import { Box, Container } from '@mui/material'
import FilterPanel from '@/components/FilterPanel'
import { headers } from 'next/headers'

export default async function RouteLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ route_name: string }>
}) {
  const { route_name } = await params
  
  // 在服务端读取 URL 参数（通过 middleware 设置的 header）
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''
  const searchParamsStr = headersList.get('x-search-params') || ''
  
  // 解析 searchParams
  let initialSearchParams: { type?: string | null; tps?: string | null; tags?: string | null } = {}
  let initialPathname: string | undefined = undefined
  
  try {
    if (searchParamsStr) {
      const searchParams = new URLSearchParams(searchParamsStr)
      initialSearchParams = {
        type: searchParams.get('type'),
        tps: searchParams.get('tps'),
        tags: searchParams.get('tags'),
      }
    }
    if (pathname) {
      initialPathname = pathname
    }
  } catch (e) {
    // 如果解析失败，使用空值
    // 在服务端静默失败，不影响渲染
    // eslint-disable-next-line no-console
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to parse searchParams in layout:', e)
    }
  }

  // 在服务端获取论坛和分组数据
  const forums = await safeApiCall(() => getForum(), [], 'Failed to fetch forums in layout')
  const forumId = findForumIdByRouteName(route_name, forums || [])
  const forumInfo = findForumInfoByRouteName(route_name, forums || [])

  // 并行获取分组和标签数据
  const [groups, tagsResponse] = await Promise.all([
    forumId
      ? safeApiCall(
          () => getGroup({ forum_id: forumId }),
          { items: [] },
          'Failed to fetch groups in layout'
        )
      : Promise.resolve({ items: [] }),
    forumId
      ? safeApiCall(
          () => getForumForumIdTags({ forumId }),
          [],
          'Failed to fetch tags in layout'
        )
      : Promise.resolve([]),
  ])

  // 处理 groups 数据格式
  const processedGroups = {
    origin: (groups?.items || []) as (ModelGroupWithItem & { items?: ModelGroupItemInfo[] })[],
    flat: ((groups?.items || []).filter((i) => !!i.items) || []).reduce(
      (acc, item) => {
        acc.push(...(item.items || []))
        return acc
      },
      [] as ModelGroupItemInfo[]
    ),
  }

  // 处理 tags 数据格式
  const tags = (() => {
    const items = (Array.isArray(tagsResponse) ? tagsResponse?.[0]?.items : (tagsResponse as any)?.items) as
      | ModelDiscussionTag[]
      | undefined
    return (items ?? []).filter((tag) => typeof tag?.id === 'number')
  })()

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 2, md: 3 },
        flexDirection: { xs: 'column', md: 'row' },
        flex: 1,
        height: '100%',
        alignSelf: 'stretch',
      }}
    >
      {/* 左侧过滤面板 - 靠左对齐 */}
      <Box
        sx={{
          width: { xs: '100%', md: 240 },
          flexShrink: 0,
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <FilterPanel
          key={`${route_name}-${searchParamsStr}`}
          groups={processedGroups}
          forumId={forumId}
          forumInfo={forumInfo}
          tags={tags}
          initialRouteName={route_name}
          initialPathname={initialPathname || `/${route_name}`}
          initialSearchParams={initialSearchParams}
        />
      </Box>

      {/* 主内容区域 */}
      <Container
        className='forum_main'
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 0, sm: 3 },
          alignSelf: 'stretch',
          display: { xs: 'block', lg: 'flex' },
          gap: { xs: 0, lg: 3 },
          justifyContent: { lg: 'center' },
          alignItems: { lg: 'flex-start' },
        }}
      >
        {children}
      </Container>
    </Box>
  )
}
