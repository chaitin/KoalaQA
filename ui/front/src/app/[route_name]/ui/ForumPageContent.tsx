'use client'

import GroupsInitializer from '@/components/groupsInitializer'
import { useForum } from '@/contexts/ForumContext'
import { ModelDiscussionListItem, ModelGroupWithItem, ModelGroupItemInfo, ModelForumInfo } from '@/api/types'
import { Button, Stack } from '@mui/material'
import { Suspense } from 'react'
import ArticleCard from './article'
import Link from 'next/link'

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

  // 将 url 中的 tps 参数（逗号分隔的字符串）转换为数字数组
  const topics = tps ? tps.split(',').map(Number) : []

  // 如果找不到对应的论坛，返回 404
  if (!forumId) {
    return (
      <Stack gap={3} sx={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
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
      <Stack gap={3} sx={{ minHeight: '100vh' }}>
        <h1 style={{ display: 'none' }}>问答</h1>
        <Suspense fallback={<div>加载中...</div>}>
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
