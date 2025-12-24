/**
 * 服务端 Group 数据缓存工具
 * 使用 Next.js 内置的 unstable_cache 进行缓存
 */

import { unstable_cache } from 'next/cache'
import { ModelGroupWithItem, ModelGroupItemInfo, ModelListRes } from '@/api/types'

type GroupCacheData = ModelListRes & {
  items?: (ModelGroupWithItem & {
    items?: ModelGroupItemInfo[]
  })[]
}

/**
 * 获取 Group 数据的内部函数
 */
async function fetchGroupData(forumId?: number): Promise<GroupCacheData | null> {
  try {
    const { getGroup } = await import('@/api/GroupFrontend')
    const groupData = await getGroup({ forum_id: forumId })

    // 处理返回数据格式
    const items = (groupData as any).items || (groupData as any).data?.items || []

    return {
      items,
    }
  } catch (error) {
    console.error('Failed to fetch group data in server:', error)
    return null
  }
}

/**
 * 在服务端获取 Group 数据（使用 Next.js 缓存）
 * @param forumId 论坛 ID，如果为 0 或不传则获取所有 groups
 * @returns Promise<GroupCacheData | null> Group 数据
 */
export async function getServerGroup(forumId?: number): Promise<GroupCacheData | null> {
  const cacheKey = `group:forum:${forumId || 0}`
  
  // 使用 Next.js 的 unstable_cache，缓存 5 分钟（300秒）
  // unstable_cache 会根据 cacheKey 自动去重和缓存
  return unstable_cache(
    async () => fetchGroupData(forumId),
    [cacheKey], // 缓存键数组
    {
      revalidate: 300, // 5分钟，单位是秒
      tags: ['groups', cacheKey], // 用于 revalidateTag 清除缓存
    }
  )()
}

/**
 * 重新导出 revalidateTag，方便清除缓存
 * @example
 * import { revalidateTag } from '@/utils/serverGroupCache'
 * revalidateTag('group:forum:1') // 清除特定 forum 的缓存
 * revalidateTag('groups') // 清除所有 groups 缓存
 */
export { revalidateTag } from 'next/cache'

