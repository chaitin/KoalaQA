import { ModelForumInfo } from '@/api/types'

/**
 * 根据 route_name 从论坛列表中查找 forum_id
 * 这个函数使用已经获取的论坛数据，避免重复 API 调用
 */
export function findForumIdByRouteName(routeName: string, forums: ModelForumInfo[]): number | null {
  const forum = forums.find((f) => f.route_name === routeName)
  return forum?.id || null
}

/**
 * 根据 route_name 从论坛列表中查找论坛信息
 * 这个函数使用已经获取的论坛数据，避免重复 API 调用
 */
export function findForumInfoByRouteName(routeName: string, forums: ModelForumInfo[]): ModelForumInfo | null {
  const forum = forums.find((f) => f.route_name === routeName)
  return forum || null
}
