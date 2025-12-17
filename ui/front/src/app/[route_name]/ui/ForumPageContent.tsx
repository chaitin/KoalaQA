'use client'

import {
  ModelDiscussionListItem,
  ModelDiscussionType,
  ModelForumInfo,
  ModelGroupItemInfo,
  ModelGroupWithItem,
} from '@/api/types'
import GroupsInitializer from '@/components/groupsInitializer'
import { Button, Stack } from '@mui/material'
import Link from 'next/link'
import { Suspense, useMemo } from 'react'
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
    tags?: string
  }
  initialData: {
    forumId: number | null
    forumInfo: ModelForumInfo | null
    announcements: ModelDiscussionListItem[]
    discussions: { items: ModelDiscussionListItem[]; total: number }
    groups: { items: (ModelGroupWithItem & { items?: ModelGroupItemInfo[] })[] }
  }
}

const ForumPageContent = ({ route_name, searchParams, initialData }: ForumPageContentProps) => {
  const { tps, type, tags } = searchParams
  const { forumId, forumInfo, discussions, groups, announcements } = initialData
  const setRouteName = useForumStore((s) => s.setRouteName)

  // type=all / 未传 type 都表示“全部”（不传给后端）
  const normalizedType = useMemo(() => {
    if (!type || type === 'all') return undefined
    return type as ModelDiscussionType
  }, [type])

  // 确保 store 中记录 route_name，以便 selectedForumId 能尽快被设置
  useEffect(() => {
    if (route_name) {
      setRouteName(route_name)
    }
  }, [route_name, setRouteName])

  // 如果找不到对应的论坛，返回 404
  if (!forumId) {
    return (
      <Stack gap={3} sx={{ minHeight: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <h1>论坛不存在</h1>
        <p>请检查 URL 是否正确</p>
        <Link href='/' style={{ textDecoration: 'none' }}>
          <Button size='large' variant='contained'>
            返回首页
          </Button>
        </Link>
      </Stack>
    )
  }

  return (
      <ArticleCard
        data={discussions}
        announcements={announcements}
        tps={tps || ''}
        tags={tags || ''}
        type={normalizedType}
        forumInfo={forumInfo}
      />
  )
}

export default ForumPageContent
