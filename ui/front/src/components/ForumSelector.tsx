'use client'

import { ModelForum } from '@/api/types'
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { getForum } from '@/api/Forum'
import LoadingSpinner from './LoadingSpinner'
import { useRouter, useSearchParams } from 'next/navigation'

interface ForumSelectorProps {
  selectedForumId?: number
}

const ForumSelector = ({ selectedForumId }: ForumSelectorProps) => {
  const [forums, setForums] = useState<ModelForum[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleForumChange = (forumId: number) => {
    router.push(`/${forumId}`)
  }

  useEffect(() => {
    const fetchForums = async () => {
      try {
        setLoading(true)
        const response = await getForum()
        if (response && response.length > 0) {
          setForums(response)
          // 如果没有选中板块，默认选中第一个并跳转到对应路径
          if (!selectedForumId) {
            router.replace(`/${response[0].id}`)
          }
        }
      } catch (error) {
        console.error('获取板块列表失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchForums()
  }, [selectedForumId, searchParams, router])

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
          }}
        >
          {forum.name}
        </Button>
      ))}
    </Stack>
  )
}

export default ForumSelector
