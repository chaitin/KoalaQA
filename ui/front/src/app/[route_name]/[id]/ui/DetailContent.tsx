'use client'
import { Box, Paper, Stack } from '@mui/material'
import { useState } from 'react'
import ActionButtons from './ActionButtons'
import TitleCard from './titleCard'
import Content from './content'
import { ModelDiscussionDetail } from '@/api/types'

interface DetailContentProps {
  discussion: ModelDiscussionDetail
}

const DetailContent = ({ discussion }: DetailContentProps) => {
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchorEl(null)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        alignItems: 'flex-start',
      }}
    >
      {/* 左侧操作按钮 - 固定在卡片外部 */}
      <ActionButtons data={discussion} menuAnchorEl={menuAnchorEl} onMenuClick={handleMenuClick} />

      {/* 右侧内容区域 */}
      <Stack
        sx={{
          flex: 1,
          minWidth: 0,
          gap: 3,
        }}
      >
        {/* 标题卡片 */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid`,
            borderColor: { xs: 'transparent', lg: 'border' },
            boxShadow: 'none',
            borderRadius: { xs: 0, lg: 1 },
            pt: { xs: 1, lg: 3 },
            px: { xs: 1, lg: 2 },
            pb: { xs: 2, lg: 3 },
          }}
        >
          <TitleCard data={discussion} menuAnchorEl={menuAnchorEl} onMenuClose={handleMenuClose} />
        </Paper>

        {/* 帖子内容卡片 */}
        {/* {discussion.content && String(discussion.content).trim() && (
          <Paper
            elevation={0}
            sx={{
              border: `1px solid`,
              borderColor: { xs: 'transparent', lg: 'border' },
              boxShadow: 'none',
              borderRadius: { xs: 0, lg: 1 },
              p: { xs: 2, lg: 3 },
            }}
          >
            
          </Paper>
        )} */}

        {/* 回答/评论卡片 */}
        <Paper
          elevation={0}
          sx={{
            border: `1px solid`,
            borderColor: { xs: 'transparent', lg: 'border' },
            boxShadow: 'none',
            borderRadius: { xs: 0, lg: 1 },
            pt: { xs: 1, lg: 3 },
            px: { xs: 1, lg: 2 },
            pb: 0,
          }}
        >
          <Content data={discussion} />
        </Paper>
      </Stack>
    </Box>
  )
}

export default DetailContent

