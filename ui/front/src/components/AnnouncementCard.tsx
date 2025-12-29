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
      <Box
        sx={(theme) => ({
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          p: 1,
          outline: 'none',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '6px',
          '&:focus-within, &:hover': {
            backgroundColor: theme.palette.primaryAlpha?.[3] || 'rgba(32,108,255,0.04)',
          },
          cursor: 'pointer',
          tabIndex: 0,
        })}
      >
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
    </Link>
  )
}
