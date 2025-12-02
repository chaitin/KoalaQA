'use client'
import { ModelDiscussionListItem, ModelDiscussionType } from '@/api/types'
import { DiscussionTypeChip, IssueStatusChip } from '@/components'
import CommonAvatar from '@/components/CommonAvatar'
import { TimeDisplay } from '@/components/TimeDisplay'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Ellipsis } from '@ctzhian/ui'

interface AssociatedIssueProps {
  associate?: ModelDiscussionListItem
}

const AssociatedIssue = ({ associate }: AssociatedIssueProps) => {
  const params = useParams()
  const routeName = params?.route_name as string

  if (!associate) {
    return null
  }

  // 确保是 Issue 类型
  if (associate.type !== ModelDiscussionType.DiscussionTypeIssue) {
    return null
  }

  const profileHref = associate.user_id ? `/profile/${associate.user_id}` : undefined

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
          bgcolor: '#f3f4f6',
        },
        bgcolor: 'rgba(0,99,151,0.03)',
        '& .similar-item': {
          border: '1px solid #d1d5db',
          py: 2,
          borderRadius: 1,
        },
      }}
    >
      {associate.uuid && routeName && (
        <Link
          href={`/${routeName}/${associate.uuid}`}
          target='_blank'
          style={{
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <Stack spacing={1.5}>
            {/* 标题和类型标签 */}
            <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 0.5 }}>
              <DiscussionTypeChip size='small' type={associate.type} variant='default' />
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
                {associate.title}
              </Ellipsis>
            </Stack>

            {/* 状态标签和作者信息 */}
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <IssueStatusChip resolved={associate.resolved} size='small' />
              <Stack direction='row' alignItems='center' spacing={0.5}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: 'rgba(33, 34, 45, 0.60)',
                    fontSize: '13px',
                  }}
                >
                  {/* <CommonAvatar
                        src={associate.user_avatar}
                        name={associate.user_name}
                        sx={{
                          width: 18,
                          height: 18,
                          fontSize: '0.6rem',
                        }}
                      /> */}
                  <Typography
                    variant='caption'
                    sx={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(33, 34, 45, 1)',
                    }}
                  >
                    {associate.user_name || ''}
                  </Typography>
                </Box>
                <Typography
                  variant='caption'
                  sx={{
                    fontSize: '12px',
                    color: 'rgba(33, 34, 45, 0.50)',
                    fontWeight: 400,
                  }}
                >
                  · 发布于
                </Typography>
                <TimeDisplay
                  timestamp={associate.created_at || associate.updated_at || 0}
                  style={{ color: 'rgba(33, 34, 45, 0.50)', fontSize: '12px' }}
                />
              </Stack>
            </Stack>
          </Stack>
        </Link>
      )}
    </Paper>
  )
}

export default AssociatedIssue
