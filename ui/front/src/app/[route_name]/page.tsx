import { getDiscussion, getGroup, getForum } from '@/api'
import GroupsInitializer from '@/components/groupsInitializer'
import { ApiParamsBuilder, batchApiCalls } from '@/lib/api-helpers'
import { findForumIdByRouteName, findForumInfoByRouteName } from '@/lib/forum-server-utils'
import { Stack } from '@mui/material'
import { Metadata } from 'next'
import { Suspense } from 'react'
import ArticleCard from './ui/article'

// 强制动态渲染，因为 API 调用可能使用 cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '技术讨论',
  description: '浏览和参与技术讨论，分享知识和经验',
}

// 数据获取函数
async function fetchDiscussions(
  forumId: string,
  searchParams: {
    search?: string
    sort?: string
    tps?: string
    page?: string
    type?: string
  },
) {
  const { search, sort, tps, page = '1', type } = searchParams
  const topics = tps ? tps.split(',').map(Number) : []
  // 使用 ApiParamsBuilder 构建参数
  const params = {
    page: parseInt(page, 10),
    size: 10,
    filter: sort as 'hot' | 'new' | 'mine' | undefined,
    keyword: search,
    type: type as 'qa' | 'feedback' | 'blog' | undefined,
    forum_id: parseInt(forumId, 10),
    group_ids: topics
  }
  try {
    return await getDiscussion(params)
  } catch (error) {
    console.error('Failed to fetch discussions:', error)
    return { items: [], total: 0 }
  }
}

async function fetchGroups(forumId: string) {
  try {
    return await getGroup({ forum_id: parseInt(forumId, 10) })
  } catch (error) {
    console.error('Failed to fetch groups:', error)
    return { items: [] }
  }
}

const Page = async (props: {
  params: Promise<{ route_name: string }>
  searchParams: Promise<{ search?: string; sort?: string; tps?: string; page?: string; type?: string }>
}) => {
  const { route_name } = await props.params
  const searchParams = await props.searchParams
  const { tps, type } = searchParams

  // 将 url 中的 tps 参数（逗号分隔的字符串）转换为数字数组
  const topics = tps ? tps.split(',').map(Number) : []

  // 获取论坛数据（只获取一次）
  const forums = await getForum()

  // 根据 route_name 查找 forum_id 和论坛信息
  const forumId = findForumIdByRouteName(route_name, forums || [])
  const forumInfo = findForumInfoByRouteName(route_name, forums || [])

  // 如果找不到对应的论坛，返回 404
  if (!forumId) {
    return (
      <Stack gap={3} sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <h1>论坛不存在</h1>
        <p>请检查 URL 是否正确</p>
      </Stack>
    )
  }

  // 使用批量 API 调用工具
  const results = await batchApiCalls({
    discussions: () => fetchDiscussions(forumId.toString(), searchParams),
    groups: () => fetchGroups(forumId.toString()),
  })

  const data = results.discussions || { items: [], total: 0 }
  const groupsData = results.groups || { items: [] }

  return (
    <GroupsInitializer groupsData={groupsData}>
      <Stack gap={3} sx={{ minHeight: '100vh' }}>
        <h1 style={{ display: 'none' }}>问答</h1>
        <Suspense fallback={<div>加载中...</div>}>
          <ArticleCard
            data={data}
            topics={topics}
            groups={groupsData}
            type={type}
            forumId={forumId.toString()}
            forumInfo={forumInfo}
          />
        </Suspense>
      </Stack>
    </GroupsInitializer>
  )
}

export default Page
