'use client'

import { ModelDiscussionListItem } from '@/api/types'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Paper } from '@mui/material'
import Link from 'next/link'

interface AnnouncementCardProps {
  announcement: ModelDiscussionListItem
  routeName: string
}


export default function AnnouncementCard({ announcement, routeName }: AnnouncementCardProps) {
  return (
    <Link href={`/${routeName}/${announcement.uuid}`} style={{ textDecoration: 'none' }}>
      <Paper
        elevation={0}
        sx={{
          bgcolor: 'rgba(0,99,151,0.03)',
          borderRadius: 1,
          border: '1px solid #D9DEE2',
          p: 2,
          mb: 2,
          transition: 'box-shadow 0.2s, border-color 0.2s, background-color 0.2s',
          outline: 'none',
          '&:focus-within, &:hover': {
            boxShadow: 'inset 0 0 3px 1px rgba(32,108,255,0.1)',
            backgroundColor: 'rgba(32,108,255,0.04)',
          },
          cursor: 'pointer',
          tabIndex: 0,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Ellipsis
            sx={{
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#111827',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {announcement.title}
          </Ellipsis>
          {announcement.summary && (
            <Box
              sx={{
                fontSize: '12px!important',
                color: 'rgba(33, 34, 45, 0.50)',
                bgcolor: 'transparent',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {announcement.summary}
            </Box>
          )}
        </Box>
      </Paper>
    </Link>
  )
}

