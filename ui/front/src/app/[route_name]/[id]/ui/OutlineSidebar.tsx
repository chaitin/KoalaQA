'use client'
import { ModelDiscussionDetail } from '@/api'
import { Card } from '@/components'
import EditorContent from '@/components/EditorContent'
import Toc from '@/components/Toc'
import { Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'

const OutlineSidebar = ({ discussion }: { discussion: ModelDiscussionDetail }) => {
  const [headings, setHeadings] = useState<any[]>([])

  useEffect(() => {
    const handler = (e: any) => {
      const toc = e?.detail
      if (Array.isArray(toc)) {
        setHeadings(toc)
        try {
          ;(window as any).__lastToc = toc
        } catch {}
      } else {
        setHeadings([])
        try {
          ;(window as any).__lastToc = []
        } catch {}
      }
    }
    try {
      if (typeof window !== 'undefined') {
        window.addEventListener('toc-update', handler as any)
        const cache = (window as any).__lastToc
        if (Array.isArray(cache)) {
          setHeadings(cache)
        } else {
          setHeadings([])
        }
      }
    } catch {}
    return () => {
      try {
        if (typeof window !== 'undefined') {
          window.removeEventListener('toc-update', handler as any)
        }
      } catch {}
    }
  }, [])

  return (
    <Stack spacing={3} sx={{ display: { xs: 'none', sm: 'none', md: 'none', lg: 'block' } }}>
      <Card
        sx={{
          overflowY: 'auto',
          border: '1px solid #D9DEE2',
          flexShrink: 0,
          '& .editor-container p': {
            fontSize: '13px',
          },
        }}
      >
        <Typography variant='subtitle2' sx={{ mb: 2,fontSize: '14px' }}>
          文章概览
        </Typography>
        {discussion.summary ? (
          // <Box sx={{ bgcolor: 'background.default', py: 2, px: 1 }}>
          <EditorContent content={discussion.summary} />
        ) : (
          // </Box>
          <Typography
            variant='body2'
            sx={{
              fontSize: '12px',
              color: 'text.secondary',
              textAlign: 'center',
            }}
          >
            {'暂无概览'}
          </Typography>
        )}
      </Card>
      <Card
        sx={{
          flexShrink: 0,
          border: '1px solid #D9DEE2',
        }}
      >
        <Toc headings={headings} />
      </Card>
    </Stack>
  )
}

export default OutlineSidebar
