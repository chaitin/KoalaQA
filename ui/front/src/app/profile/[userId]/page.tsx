import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getUserUserId } from '@/api'
import { SvcUserStatisticsRes } from '@/api/types'
import PublicProfileContent from '../ui/PublicProfileContent'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '用户动态',
  description: '查看社区用户的公开动态记录',
}

interface UserProfilePageProps {
  params: Promise<{ userId: string }>
}

export default async function UserProfilePage(props: UserProfilePageProps) {
  const { userId } = await props.params
  if (!Number.isFinite(Number(userId))) {
    notFound()
  }

  let statistics: SvcUserStatisticsRes | null = null

  try {
    const response = await getUserUserId({ userId: Number(userId) })
    statistics = response
  } catch (error) {
    console.error('获取用户统计信息失败', error)
    statistics = null
  }

  return <PublicProfileContent userId={Number(userId)} statistics={statistics} />
}
