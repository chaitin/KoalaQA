'use client'
import { ModelDiscussionListItem } from '@/api/types'
import { DiscussionTypeChip } from '@/components'
import { TimeDisplay } from '@/components/TimeDisplay'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Paper, Stack, Typography } from '@mui/material'
import Link from 'next/link'
import { ReactNode } from 'react'

interface AssociatedItemCardProps {
  item: ModelDiscussionListItem
  routeName: string
  statusChip?: ReactNode
}

const AssociatedItemCard = ({ item, routeName, statusChip }: AssociatedItemCardProps) => {
  if (!item.uuid) {
    return null
  }

  return (
    <Paper
      sx={{
        p: 2,
        border: '1px solid #e5e7eb',
        borderRadius: 1,
        cursor: 'pointer',
        overflow: 'hidden',
        boxShadow: 'none',
        '&:hover': {
          bgcolor: (theme) => theme.palette.primaryAlpha?.[3],
        },
      }}
    >
      <Link
        href={`/${routeName}/${item.uuid}`}
        target='_blank'
        style={{
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <Stack spacing={1.5}>
          {/* 标题和类型标签 */}
          <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 0.5 }}>
            <DiscussionTypeChip size='small' type={item.type} variant='default' />
            <Ellipsis
              sx={{
                fontWeight: 600,
                fontSize: '15px',
                color: '#111827',
                lineHeight: 1.4,
                flex: 1,
                cursor: 'pointer',
              }}
            >
              {item.title}
            </Ellipsis>
          </Stack>

          {/* 状态标签和作者信息 */}
          <Stack direction='row' alignItems='center'>
            {statusChip}
            <Stack direction='row' alignItems='center' sx={{ ml: 'auto' }}>
              <Typography
                variant='caption'
                sx={{
                  fontSize: '12px',
                  color: 'rgba(33, 34, 45, 0.50)',
                  fontWeight: 400,
                }}
              >
                发布于
              </Typography>
              <Box
                component={TimeDisplay}
                timestamp={item.created_at || item.updated_at || 0}
                sx={{ color: 'rgba(33, 34, 45, 0.50)', fontSize: '12px', pl: 0.5 }}
              />
            </Stack>
          </Stack>
        </Stack>
      </Link>
    </Paper>
  )
}

export default AssociatedItemCard
