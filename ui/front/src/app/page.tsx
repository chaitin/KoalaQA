import { getForum } from '@/api'
import { safeApiCall } from '@/lib/error-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import RootPageFallback from '@/components/RootPageFallback'

// 根路径重定向到第一个板块 - 服务端重定向
// 注意：认证逻辑现在由 proxy.ts 中的 middleware 处理
export default async function RootPage() {
  const forums = await safeApiCall(
    () => getForum(),
    [],
    'Failed to fetch forums for root page redirect'
  )
  
  if (forums && forums.length > 0) {
    // 有论坛数据，重定向到第一个论坛
    const firstForum = forums[0]
    const routePath = firstForum.route_name ? `/${firstForum.route_name}` : `/${firstForum.id}`
    redirect(routePath)
  } else {
    // 没有论坛数据，使用客户端fallback组件
    // 认证检查由 middleware 处理，这里不需要重复检查
    return <RootPageFallback />
  }
}
