'use client'

import { ModelDiscussionListItem, ModelForumInfo, ModelGroupItemInfo, ModelGroupWithItem } from '@/api/types'
import GroupsInitializer from '@/components/groupsInitializer'
import { Button, Stack } from '@mui/material'
import Link from 'next/link'
import { Suspense } from 'react'
import ArticleCard from './article'
import { useEffect } from 'react'
import { useForumStore } from '@/store'

interface ForumPageContentProps {
  route_name: string
  searchParams: {
    search?: string
    sort?: string
    tps?: string
    page?: string
    type?: string
  }
  initialData: {
    forumId: number | null
    forumInfo: ModelForumInfo | null
    discussions: { items: ModelDiscussionListItem[]; total: number }
    groups: { items: (ModelGroupWithItem & { items?: ModelGroupItemInfo[] })[] }
  }
}

const ForumPageContent = ({ route_name, searchParams, initialData }: ForumPageContentProps) => {
  const { tps, type } = searchParams
  const { forumId, forumInfo, discussions, groups } = initialData
  const setRouteName = useForumStore((s) => s.setRouteName)

  // 确保 store 中记录 route_name，以便 selectedForumId 能尽快被设置
  useEffect(() => {
    if (route_name) {
      setRouteName(route_name)
    }
  }, [route_name, setRouteName])

  // 将 url 中的 tps 参数（逗号分隔的字符串）转换为数字数组
  const topics = tps ? tps.split(',').map(Number) : []

  // 如果找不到对应的论坛，返回 404
  if (!forumId) {
    return (
      <Stack gap={3} sx={{ minHeight: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <h1>论坛不存在</h1>
        <p>请检查 URL 是否正确</p>
        <Link href='/' style={{ textDecoration: 'none' }}>
          <Button size='large' variant='contained'>返回首页</Button>
        </Link>
      </Stack>
    )
  }

  return (
    <GroupsInitializer groupsData={groups}>
      <Stack gap={3} sx={{ minHeight: '100%' }}>
        <Suspense>
          <ArticleCard
            data={discussions}
            topics={topics}
            groups={groups}
            type={type}
            forumId={forumId.toString()}
            forumInfo={forumInfo}
          />
        </Suspense>
      </Stack>
    </GroupsInitializer>
  )
}

export default ForumPageContent
