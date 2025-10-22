import { getDiscussion, getGroup, getForum } from '@/api'
import GroupsInitializer from '@/components/groupsInitializer'
import { ApiParamsBuilder, batchApiCalls } from '@/lib/api-helpers'
import { Stack } from '@mui/material'
import { Metadata } from 'next'
import { Suspense } from 'react'
import ArticleCard from './ui/article'

export const metadata: Metadata = {
  title: '技术讨论',
  description: '浏览和参与技术讨论，分享知识和经验',
}

// 数据获取函数 - 使用新的工具
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
  const params = new ApiParamsBuilder()
    .add('page', page)
    .add('size', '10')
    .add('filter', sort)
    .add('keyword', search)
    .add('type', type || 'qa')
    .add('forum_id', forumId)
    .build()

  // 添加多个 group_ids
  if (topics.length) {
    topics.forEach((id) => params.append('group_ids', String(id)))
  }
  try {
    const a = await getDiscussion(params)
    console.log(a)
    return a
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

async function fetchForumInfo(forumId: string) {
  try {
    const forums = await getForum()
    return forums?.find(forum => forum.id === parseInt(forumId, 10)) || null
  } catch (error) {
    console.error('Failed to fetch forum info:', error)
    return null
  }
}

const Page = async (props: {
  params: Promise<{ forum_id: string }>
  searchParams: Promise<{ search?: string; sort?: string; tps?: string; page?: string; type?: string }>
}) => {
  const { forum_id } = await props.params
  const searchParams = await props.searchParams
  const { tps, type } = searchParams
  // 将 url 中的 tps 参数（逗号分隔的字符串）转换为数字数组
  const topics = tps ? tps.split(',').map(Number) : []

  // 使用批量 API 调用工具
  const results = await batchApiCalls({
    discussions: () => fetchDiscussions(forum_id, searchParams),
    groups: () => fetchGroups(forum_id),
    forumInfo: () => fetchForumInfo(forum_id),
  })

  const data = results.discussions || { items: [], total: 0 }
  const groupsData = results.groups || { items: [] }
  const forumInfo = results.forumInfo
  
  return (
    <GroupsInitializer groupsData={groupsData}>
      <Stack gap={3} sx={{ minHeight: '100vh' }}>
        <h1 style={{ display: 'none' }}>问答</h1>
        <Suspense fallback={<div>加载中...</div>}>
          <ArticleCard data={data} topics={topics} groups={groupsData} type={type} forumId={forum_id} forumInfo={forumInfo} />
        </Suspense>
      </Stack>
    </GroupsInitializer>
  )
}

export default Page
