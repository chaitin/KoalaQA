import { getDiscussion, GetDiscussionParams, getForum, getGroup, ModelDiscussionListItem } from '@/api'
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
        announcements: [] as ModelDiscussionListItem[],
        discussions: { items: [], total: 0 },
        groups: { items: [] },
      }
    }

    // 获取讨论和分组数据
    const { search, sort, tps, page = '1', type, only_mine, resolved, tags } = searchParams
    const topics = tps ? tps.split(',').map(Number) : []
    const tagIds = tags ? tags.split(',').map(Number) : []

    // type=all / 未传 type 都表示“全部”，查询时映射为不传 type
    const normalizedType = !type || type === 'all' ? undefined : type

    const discussionParams: any = {
      page: parseInt(page, 10),
      size: 10,
      keyword: search,
      forum_id: forumId,
      group_ids: topics,
      tag_ids: tagIds,
    }
    if (normalizedType) {
      discussionParams.type = normalizedType as any
    }

    // 设置 filter，默认使用 'publish'（最新发布）
    discussionParams.filter = (sort || 'publish') as 'hot' | 'new' | 'publish'

    // 添加筛选参数
    if (only_mine === 'true') {
      discussionParams.only_mine = true
    }
    if (resolved !== undefined && resolved !== null) {
      discussionParams.resolved = 0
    }

    const groupParams = {
      forum_id: forumId,
    }

    const params: GetDiscussionParams = {
      discussion_ids: forumInfo?.blog_ids,
      page: 1,
      size: 10,
      type: 'blog',
      forum_id: forumInfo?.id,
    }

    // 并行获取数据
    const [discussions, groups, announcements] = await Promise.all([
      safeApiCall(() => getDiscussion(discussionParams), { items: [], total: 0 }),
      safeApiCall(() => getGroup(groupParams), { items: [] }),
      safeApiCall(() => getDiscussion(params).then(r=>r.items),[]),
    ])
    
    return {
      forumId,
      forumInfo,
      discussions: {
        items: discussions?.items || [],
        total: discussions?.total || 0,
      },
      announcements: announcements || [],
      groups: {
        items: groups?.items || [],
      },
    }
  } catch (error) {
    safeLogError('Failed to fetch forum data in server', error)
    return {
      forumId: null,
      forumInfo: null,
      announcements: [] as ModelDiscussionListItem[],
      discussions: { items: [], total: 0 },
      groups: { items: [] },
    }
  }
}

const Page = async (props: {
  params: Promise<{ route_name: string }>
  searchParams: Promise<{
    search?: string
    sort?: string
    tps?: string
    page?: string
    type?: string
    only_mine?: string
    resolved?: string
  }>
}) => {
  const { route_name } = await props.params
  const searchParams = await props.searchParams
  // 在服务端获取所有数据
  const forumData = await fetchForumData(route_name, searchParams)

  return <ForumPageContent route_name={route_name} searchParams={searchParams} initialData={forumData} />
}

export default Page
