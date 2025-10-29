import { getDiscussion, getForum, getGroup } from '@/api'
import { safeApiCall, safeLogError } from '@/lib/error-utils'
import { findForumIdByRouteName, findForumInfoByRouteName } from '@/lib/forum-server-utils'
import { Metadata } from 'next'
import ForumPageContent from './ui/ForumPageContent'

// 强制动态渲染，因为 API 调用可能使用 cookies
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '技术讨论',
  description: '浏览和参与技术讨论，分享知识和经验',
}

// 服务端数据获取函数
async function fetchForumData(route_name: string, searchParams: any) {
  try {
    // 获取论坛数据
    const forums = await getForum()
    const forumId = findForumIdByRouteName(route_name, forums || [])
    const forumInfo = findForumInfoByRouteName(route_name, forums || [])

    if (!forumId) {
      return {
        forumId: null,
        forumInfo: null,
        discussions: { items: [], total: 0 },
        groups: { items: [] }
      }
    }

    // 获取讨论和分组数据
    const { search, sort, tps, page = '1', type } = searchParams
    const topics = tps ? tps.split(',').map(Number) : []
    
    const discussionParams = {
      page: parseInt(page, 10),
      size: 10,
      filter: sort as 'hot' | 'new' | 'mine' | undefined,
      keyword: search,
      type: type as 'qa' | 'feedback' | 'blog' | undefined,
      forum_id: forumId,
      group_ids: topics
    }

    const groupParams = {
      forum_id: forumId
    }

    // 并行获取数据
    const [discussions, groups] = await Promise.all([
      safeApiCall(() => getDiscussion(discussionParams), { items: [], total: 0 }),
      safeApiCall(() => getGroup(groupParams), { items: [] })
    ])

    return {
      forumId,
      forumInfo,
      discussions: {
        items: discussions?.items || [],
        total: discussions?.total || 0
      },
      groups: {
        items: groups?.items || []
      }
    }
  } catch (error) {
    safeLogError('Failed to fetch forum data in server', error)
    return {
      forumId: null,
      forumInfo: null,
      discussions: { items: [], total: 0 },
      groups: { items: [] }
    }
  }
}

const Page = async (props: {
  params: Promise<{ route_name: string }>
  searchParams: Promise<{ search?: string; sort?: string; tps?: string; page?: string; type?: string }>
}) => {
  const { route_name } = await props.params
  const searchParams = await props.searchParams

  // 在服务端获取所有数据
  const forumData = await fetchForumData(route_name, searchParams)

  return (
    <ForumPageContent 
      route_name={route_name}
      searchParams={searchParams}
      initialData={forumData}
    />
  )
}

export default Page
