'use client'

import { ModelForumInfo } from '@/api/types'
import { Button, Box } from '@mui/material'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'

interface ForumSelectorProps {
  selectedForumId?: number
  autoRedirect?: boolean // 新增属性，控制是否自动重定向
  forums?: ModelForumInfo[] // 新增属性，接收传入的forum数据
}

const ForumSelector = ({ selectedForumId, forums = [] }: ForumSelectorProps) => {
  const router = useRouterWithRouteName()

  const handleForumClick = (forum: ModelForumInfo) => {
    // 优先使用 route_name，如果没有则回退到 forum.id
    const routePath = forum.route_name ? `/${forum.route_name}` : `/${forum.id}`
    router.push(routePath)
  }

  return (
    <Box sx={{ display: 'flex', gap: 0.5, ml: 2, height: '64px' }}>
      {forums.map((forum) => (
        <Button
          key={forum.id}
          onClick={() => handleForumClick(forum)}
          disableRipple
          sx={(theme) => ({
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            px: 2.5,
            py: 1,
            borderRadius: '0',
            height: '100%',
            color: selectedForumId === forum.id ? 'primary.main' : 'text.primary',
            position: 'relative',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            // borderBottom: selectedForumId === forum.id ? '2px solid' : '2px solid transparent',
            opacity: selectedForumId === forum.id ? 1 : 0.8,
            ...(selectedForumId === forum.id && {
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 0,
                width: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                right: 0,
                height: '2px',
                borderRadius: '1px',
                backgroundColor: 'primary.main',
              },
            }),
            '&:hover': {
              bgcolor: selectedForumId === forum.id ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
              color: 'text.primary',
              opacity: 1,
            },
          })}
        >
          {forum.name}
        </Button>
      ))}
    </Box>
  )
}

export default ForumSelector
