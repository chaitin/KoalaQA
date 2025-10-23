'use client'

import { ModelForum } from '@/api/types'
import { Button, Stack } from '@mui/material'
import { useEffect, useState } from 'react'
import { getForum } from '@/api/Forum'
// import LoadingSpinner from './LoadingSpinner'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface ForumSelectorProps {
  selectedForumId?: number
  autoRedirect?: boolean // 新增属性，控制是否自动重定向
}

const ForumSelector = ({ selectedForumId, autoRedirect = false }: ForumSelectorProps) => {
  const [forums, setForums] = useState<ModelForum[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleForumChange = (forumId: number) => {
    router.push(`/forum/${forumId}`)
  }

  useEffect(() => {
    const fetchForums = async () => {
      try {
        setLoading(true)
        const response = await getForum()
        if (response && response.length > 0) {
          setForums(response)
          // 只有在明确启用自动重定向且没有选中板块时才重定向
          // 并且只在根路径或特定需要重定向的页面执行
          if (autoRedirect && !selectedForumId && (pathname === '/' || pathname === '')) {
            router.replace(`/forum/${response[0].id}`)
          }
        }
      } catch (error) {
        console.error('获取板块列表失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchForums()
  }, [selectedForumId, searchParams, router, autoRedirect, pathname])

  if (loading) {
    return
  }

  if (forums.length === 0) {
    return null
  }

  return (
    <Stack direction='row' spacing={1} alignItems='center'>
      {forums.map((forum) => (
        <Button
          key={forum.id}
          variant={'text'}
          color={selectedForumId == forum.id ? 'info' : 'primary'}
          
          onClick={() => handleForumChange(forum.id!)}
          sx={{
            cursor: 'pointer',
            textTransform: 'none',
          }}
        >
          {forum.name}
        </Button>
      ))}
    </Stack>
  )
}

export default ForumSelector
