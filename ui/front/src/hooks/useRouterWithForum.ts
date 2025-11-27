import { useRouter } from 'next/navigation'
import { useForumId } from './useForumId'
import { useForumStore } from '@/store'
import { buildRouteWithRouteName } from '@/lib/utils'


/**
 * 带 route_name 自动补全的路由 hook
 * 当路由跳转时，如果路径不包含 forum 信息，会自动从当前路径或 store 获取并补上
 */
export const useRouterWithRouteName = () => {
  const router = useRouter()
  const { forums } = useForumStore()
  const forumId = useForumId()

  // 获取当前论坛信息
  const currentForum = forums.find(forum => forum.id === forumId)

  const push = (path: string) => {
    const routeWithForum = buildRouteWithRouteName(path, currentForum ? { id: currentForum.id!, route_name: currentForum.route_name } : null)
    router.push(routeWithForum)
  }

  const replace = (path: string) => {
    const routeWithForum = buildRouteWithRouteName(path, currentForum ? { id: currentForum.id!, route_name: currentForum.route_name } : null)
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
