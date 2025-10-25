import { getForum } from '@/api'
import { safeApiCall } from '@/lib/error-utils'
import { redirect } from 'next/navigation'

// 根路径重定向到第一个板块 - 服务端重定向
export default async function RootPage() {
  const forums = await safeApiCall(
    () => getForum(),
    [],
    'Failed to fetch forums for root page redirect'
  )
  
  if (forums && forums.length > 0) {
    redirect(`/forum/${forums[0].id}`)
  } else {
    redirect('/login')
  }
}
