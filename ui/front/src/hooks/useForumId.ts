import { useParams, useSelectedLayoutSegments } from 'next/navigation'
import { useForumStore } from '@/store'
import { useEffect, useMemo } from 'react'

/**
 * 获取当前选中的板块ID
 * 从路径参数中读取route_name，然后通过论坛 store 查找对应的forum_id
 * 如果还没有选中板块，返回null
 */
export const useForumId = () => {
  const params = useParams()
  const segments = useSelectedLayoutSegments()
  const forums = useForumStore((s) => s.forums)
  const setRouteName = useForumStore((s) => s.setRouteName)

  // 优先级：params.route_name (页面级) > segments[0] (布局级)
  const routeName = useMemo(() => {
    if (params?.route_name) return params.route_name as string
    // 如果在根布局中使用，useParams 拿不到子路由参数，需要从 segments 中取
    // 假设第一段就是 route_name (例如 /general/xxx)
    if (segments && segments.length > 0) {
      const firstSegment = segments[0]
      // 检查该 segment 是否确实是一个有效的论坛 route_name
      if (forums.some(f => f.route_name === firstSegment)) {
        return firstSegment
      }
    }
    return undefined
  }, [params?.route_name, segments, forums])

  // 把对 store 的写操作放到副作用中，避免在渲染阶段触发状态更新导致无限重渲染
  useEffect(() => {
    if (routeName && forums.length > 0) {
      setRouteName(routeName)
    }
  }, [routeName, forums, setRouteName])

  if (!routeName || forums.length === 0) {
    return null
  }

  const forum = forums.find((f) => f.route_name === routeName)
  return forum?.id || null
}

/**
 * 获取当前选中的板块ID，如果为null则抛出错误
 * 用于必须要有板块ID的场景
 */
export const useRequiredForumId = () => {
  const forumId = useForumId()

  if (forumId === null) {
    throw new Error('No forum selected. Please select a forum first.')
  }

  return forumId
}
