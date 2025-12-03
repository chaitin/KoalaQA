'use client'
import { ModelDiscussionListItem, ModelDiscussionType } from '@/api/types'
import { IssueStatusChip } from '@/components'
import { useParams } from 'next/navigation'
import AssociatedItemCard from './AssociatedItemCard'

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
    <AssociatedItemCard
      item={associate}
      routeName={routeName}
      statusChip={<IssueStatusChip resolved={associate.resolved} size='small' />}
    />
  )
}

export default AssociatedIssue
