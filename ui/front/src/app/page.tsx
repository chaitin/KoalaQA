import { getForum } from '@/api'
import { safeApiCall } from '@/lib/error-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import RootPageFallback from '@/components/RootPageFallback'

// 根路径重定向到第一个板块 - 服务端重定向
export default async function RootPage() {
  // 检查用户是否已登录
  const cookieStore = await cookies()
  const authToken = cookieStore.get('auth_token')?.value
  console.log('-----')
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
  } else if (authToken) {
    // 用户已登录但没有论坛数据，使用客户端fallback组件
    return <RootPageFallback />
  } else {
    // 用户未登录，重定向到登录页面
    redirect('/login')
  }
}
