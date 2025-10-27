'use client'

import { ModelForumInfo } from '@/api/types'
import { Button, Stack } from '@mui/material'
import Link from 'next/link'

interface ForumSelectorProps {
  selectedForumId?: number
  autoRedirect?: boolean // 新增属性，控制是否自动重定向
  forums?: ModelForumInfo[] // 新增属性，接收传入的forum数据
}

const ForumSelector = ({ selectedForumId, forums = [] }: ForumSelectorProps) => {
  return (
    <Stack direction='row' spacing={1} alignItems='center'>
      {forums.map((forum) => {
        // 优先使用 route_name，如果没有则回退到 forum.id
        const routePath = `/${forum.route_name}`
        
        return (
          <Link key={forum.id} href={routePath} style={{ textDecoration: 'none' }}>
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
        )
      })}
    </Stack>
  )
}

export default ForumSelector
