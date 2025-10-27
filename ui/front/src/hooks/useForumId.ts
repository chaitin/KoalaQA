import { useParams } from 'next/navigation'
import { useForum } from '@/contexts/ForumContext'

/**
 * 获取当前选中的板块ID
 * 从路径参数中读取route_name，然后通过论坛上下文查找对应的forum_id
 * 如果还没有选中板块，返回null
 */
export const useForumId = () => {
  const params = useParams()
  const { forums } = useForum()
  const routeName = params?.route_name as string
  
  if (!routeName || forums.length === 0) {
    return null
  }
  
  const forum = forums.find(f => f.route_name === routeName)
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
