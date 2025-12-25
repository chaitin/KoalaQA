'use client'
import { ModelDiscussionListItem, ModelDiscussionType } from '@/api/types'
import { IssueStatusChip } from '@/components'
import { useParams } from 'next/navigation'
import AssociatedItemCard from './AssociatedItemCard'
import { Divider, Stack, Typography } from '@mui/material'

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

  return (
    <Stack
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'border',
        borderRadius: 1,
        bgcolor: 'background.paper',
        '& > div': { border: 'none', px: 1, borderBottom: '1px solid', borderColor: 'border', borderRadius: 0 },
      }}
    >
      <Typography variant='subtitle2' sx={{ mb: 1.5, fontWeight: 600 }}>
        关联问题
      </Typography>
      <Divider sx={{ mb: 0 }} />
      <AssociatedItemCard
        item={associate}
        routeName={routeName}
        statusChip={<IssueStatusChip resolved={associate.resolved} size='small' />}
      />
    </Stack>
  )
}

export default AssociatedIssue
