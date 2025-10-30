'use client'
import { ModelDiscussionDetail } from '@/api/types'
import { Box, Stack, Typography } from '@mui/material'
import React, { useState } from 'react'
import TitleCard from './titleCard'
import Content from './content'

const DetailLayout = ({ discussion }: { discussion: ModelDiscussionDetail }) => {
  const [headings, setHeadings] = useState<any[]>([])

  return (
    <Stack direction='row' alignItems='flex-start' sx={{ mt: { xs: 0, sm: 3 }, width: '100%' }} gap={3}>
      <Box sx={{ flex: 1, width: '100%' }}>
        <TitleCard data={discussion} onTocUpdate={(toc: any) => setHeadings(Array.isArray(toc) ? toc : [])} />
        <Box sx={{ my: '20px', display: { xs: 'block', sm: 'none' } }} />
        <Content data={discussion} />
      </Box>
      <Box
        sx={{
          width: 240,
          display: { xs: 'none', sm: 'block' },
          position: 'sticky',
          top: 90,
          maxHeight: '70vh',
          overflowY: 'auto',
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>文章大纲</Typography>
        <Stack component='nav' gap={0.5} sx={{ pr: 1 }}>
          {headings?.map((h: any, idx: number) => {
            const text = h?.text || h?.title || ''
            const id = h?.id || h?.href?.replace('#', '') || ''
            const level = h?.level ?? h?.depth ?? 1
            return (
              <a
                key={id || idx}
                href={id ? `#${id}` : undefined}
                style={{
                  display: 'block',
                  textDecoration: 'none',
                  color: 'rgba(0,0,0,0.75)',
                  fontSize: 13,
                  padding: '4px 6px',
                  borderRadius: 6,
                  marginLeft: Math.min(Math.max((Number(level) - 1) * 12, 0), 36),
                }}
              >
                {text}
              </a>
            )
          })}
          {!headings?.length && (
            <Typography sx={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>暂无大纲</Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  )
}

export default DetailLayout


