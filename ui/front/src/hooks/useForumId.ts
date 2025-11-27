import { useParams } from 'next/navigation'
import { useForumStore } from '@/store'
import { useEffect } from 'react'

/**
 * 获取当前选中的板块ID
 * 从路径参数中读取route_name，然后通过论坛 store 查找对应的forum_id
 * 如果还没有选中板块，返回null
 */
export const useForumId = () => {
  const params = useParams()
  const forums = useForumStore((s) => s.forums)
  const setRouteName = useForumStore((s) => s.setRouteName)
  const routeName = params?.route_name as string | undefined

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
