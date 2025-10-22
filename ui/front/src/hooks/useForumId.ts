import { useParams } from 'next/navigation'

/**
 * 获取当前选中的板块ID
 * 从路径参数中读取forum_id
 * 如果还没有选中板块，返回null
 */
export const useForumId = () => {
  const params = useParams()
  const forumIdParam = params?.forum_id as string
  return forumIdParam ? parseInt(forumIdParam, 10) : null
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
