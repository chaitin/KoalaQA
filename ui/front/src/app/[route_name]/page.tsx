import {
  getDiscussion,
  GetDiscussionParams,
  getForum,
  getGroup,
  getRankContribute,
  getForumForumIdTags,
  ModelDiscussionListItem,
  ModelGroupWithItem,
  ModelGroupItemInfo,
  ModelDiscussionTag,
} from '@/api'
import { SvcRankContributeItem } from '@/api/types'
import { safeApiCall, safeLogError } from '@/lib/error-utils'
import { findForumIdByRouteName, findForumInfoByRouteName } from '@/lib/forum-server-utils'
import { Metadata } from 'next'
import ForumPageContent from './ui/ForumPageContent'
import { getSortedGroupsInDiscussionList } from '@/constant'
import FilterPanel from '@/components/FilterPanel'
import { headers } from 'next/headers'

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
        contributors: {
          lastWeek: [] as SvcRankContributeItem[],
          total: [] as SvcRankContributeItem[],
        },
      }
    }

    // 获取讨论和分组数据
    const { search, sort, tps, page = '1', type, only_mine, resolved, tags } = searchParams
    const topics = tps ? tps.split(',').map(Number) : []
    const tagIds = tags ? tags.split(',').map(Number) : []

    // type=all / 未传 type 都表示“全部”，查询时映射为不传 type
    const normalizedType = !type || type === 'all' ? undefined : type

    const discussionParams: any = {
      page: Number.parseInt(page, 10),
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
      discussionParams.resolved = 1
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
    const [discussions, groups, announcements, contributorsLastWeek, contributorsTotal] = await Promise.all([
      safeApiCall(() => getSortedGroupsInDiscussionList(discussionParams), { items: [], total: 0 }),
      safeApiCall(() => getGroup(groupParams), { items: [] }),
      safeApiCall(
        () => (forumInfo?.blog_ids == null ? Promise.resolve([]) : getDiscussion(params).then((r) => r.items)),
        [],
      ),
      // 获取贡献达人数据：上周
      safeApiCall(async () => {
        const response = await getRankContribute({ type: 1 })
        // httpClient 已经返回了 res.data，所以直接访问 items
        return (response as { items?: SvcRankContributeItem[] })?.items || []
      }, [] as SvcRankContributeItem[]),
      // 获取贡献达人数据：总榜
      safeApiCall(async () => {
        const response = await getRankContribute({ type: 3 })
        // httpClient 已经返回了 res.data，所以直接访问 items
        return (response as { items?: SvcRankContributeItem[] })?.items || []
      }, [] as SvcRankContributeItem[]),
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
      contributors: {
        lastWeek: contributorsLastWeek || [],
        total: contributorsTotal || [],
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
      contributors: {
        lastWeek: [] as SvcRankContributeItem[],
        total: [] as SvcRankContributeItem[],
      },
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
    tags?: string
  }>
}) => {
  const { route_name } = await props.params
  const searchParams = await props.searchParams
  const headersList = await headers()
  const searchParamsStr = headersList.get('x-search-params') || ''
  const pathname = headersList.get('x-pathname') || ''
  
  // 在服务端获取所有数据
  const forumData = await fetchForumData(route_name, searchParams)
  const { forumId, forumInfo, groups } = forumData

  // 解析 searchParams
  let initialSearchParams: { type?: string | null; tps?: string | null; tags?: string | null } = {}
  let initialPathname: string | undefined = undefined

  try {
    if (searchParamsStr) {
      const searchParamsObj = new URLSearchParams(searchParamsStr)
      initialSearchParams = {
        type: searchParamsObj.get('type'),
        tps: searchParamsObj.get('tps'),
        tags: searchParamsObj.get('tags'),
      }
    }
    if (pathname) {
      initialPathname = pathname
    }
  } catch (e) {
    // 如果解析失败，使用空值
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to parse searchParams in page:', e)
    }
  }

  // 获取标签数据
  const tagsResponse = forumId
    ? await safeApiCall(() => getForumForumIdTags({ forumId }), [], 'Failed to fetch tags in page')
    : []

  // 处理 groups 数据格式
  const processedGroups = {
    origin: (groups?.items || []) as (ModelGroupWithItem & { items?: ModelGroupItemInfo[] })[],
    flat: ((groups?.items || []).filter((i) => !!i.items) || []).reduce((acc, item) => {
      acc.push(...(item.items || []))
      return acc
    }, [] as ModelGroupItemInfo[]),
  }

  // 处理 tags 数据格式
  const tags = (() => {
    const items = (Array.isArray(tagsResponse) ? tagsResponse?.[0]?.items : (tagsResponse as any)?.items) as
      | ModelDiscussionTag[]
      | undefined
    return (items ?? []).filter((tag) => typeof tag?.id === 'number')
  })()

  return (
    <>
      {/* 左侧过滤面板 */}
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
      <ForumPageContent route_name={route_name} searchParams={searchParams} initialData={forumData} />
    </>
  )
}

export default Page
