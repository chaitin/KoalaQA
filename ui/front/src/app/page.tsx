import { getForum } from '@/api'
import { redirect } from 'next/navigation'

// 根路径重定向到第一个板块 - 服务端重定向
export default async function RootPage() {
  const forums = await getForum()
  
  if (forums && forums.length > 0) {
    redirect(`/forum/${forums[0].id}`)
  } else {
    redirect('/not-found')
  }
}
