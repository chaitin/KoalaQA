import { useRouter } from 'next/navigation'
import { useForumId } from './useForumId'
import { buildRouteWithForumId } from '@/lib/utils'

/**
 * 带 forum_id 自动补全的路由 hook
 * 当路由跳转时，如果路径不包含 forum_id，会自动从当前路径或上下文获取并补上
 */
export const useRouterWithForum = () => {
  const router = useRouter()
  const forumId = useForumId()

  const push = (path: string) => {
    const routeWithForum = buildRouteWithForumId(path, forumId)
    router.push(routeWithForum)
  }

  const replace = (path: string) => {
    const routeWithForum = buildRouteWithForumId(path, forumId)
    router.replace(routeWithForum)
  }

  const back = () => {
    router.back()
  }

  const forward = () => {
    router.forward()
  }

  const refresh = () => {
    router.refresh()
  }

  return {
    push,
    replace,
    back,
    forward,
    refresh,
    // 保留原始的 router 对象，以防需要直接访问
    router
  }
}
