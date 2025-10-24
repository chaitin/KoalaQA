'use client'

import { ModelForum } from '@/api/types'
import { Button, Stack } from '@mui/material'
import Link from 'next/link'

interface ForumSelectorProps {
  selectedForumId?: number
  autoRedirect?: boolean // 新增属性，控制是否自动重定向
  forums?: ModelForum[] // 新增属性，接收传入的forum数据
}

const ForumSelector = ({ selectedForumId, forums = [] }: ForumSelectorProps) => {
  return (
    <Stack direction='row' spacing={1} alignItems='center'>
      {forums.map((forum) => (
        <Link key={forum.id} href={`/forum/${forum.id}`} style={{ textDecoration: 'none' }}>
          <Button
            variant={'text'}
            color={selectedForumId == forum.id ? 'info' : 'primary'}
            sx={{
              cursor: 'pointer',
              textTransform: 'none',
            }}
          >
            {forum.name}
          </Button>
        </Link>
      ))}
    </Stack>
  )
}

export default ForumSelector
