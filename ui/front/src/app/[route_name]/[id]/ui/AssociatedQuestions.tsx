'use client'
import { getDiscussionDiscIdAssociate, ModelDiscussionListItem } from '@/api'
import { StatusChip } from '@/components'
import { Box, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import AssociatedItemCard from './AssociatedItemCard'

interface AssociatedQuestionsProps {
  discId: string
}

const AssociatedQuestions = ({ discId }: AssociatedQuestionsProps) => {
  const [questions, setQuestions] = useState<ModelDiscussionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const params = useParams()
  const routeName = params?.route_name as string
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true)
        const response = await getDiscussionDiscIdAssociate({
          discId: discId,
        })
        const items = response?.items || []
        setQuestions(items)
      } catch (error) {
        console.error('Failed to fetch associated questions:', error)
        setQuestions([])
      } finally {
        setLoading(false)
      }
    }

    if (discId) {
      fetchQuestions()
    }
  }, [discId])

  if (loading) {
    return (
      <Paper sx={{ p: 2 }}>
        <Skeleton variant='text' width='60%' />
        <Skeleton variant='text' width='80%' />
      </Paper>
    )
  }

  if (questions.length === 0) {
    return null
  }

  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'border' }}>
      <Typography variant='subtitle2' sx={{ mb: 1.5, fontWeight: 600 }}>
        关联问题
      </Typography>
      <Divider sx={{ mb: 0 }} />
      <Stack
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          '& > div': {
            border: 'none',
          },
        }}
      >
        {questions.map((question) => (
          <Fragment key={question.id}>
            <AssociatedItemCard
              key={question.id}
              item={question}
              routeName={routeName}
              statusChip={<StatusChip item={question} size='small' />}
            />
            <Divider />
          </Fragment>
        ))}
      </Stack>
    </Paper>
  )
}

export default AssociatedQuestions
