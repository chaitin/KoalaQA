'use client'
import { getDiscussionDiscIdAssociate, ModelDiscussionListItem } from '@/api'
import { SimilarContentItem } from '@/components'
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

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

  const handleQuestionClick = (question: ModelDiscussionListItem) => {
    if (typeof window !== 'undefined' && routeName && question.uuid) {
      window.open(`/${routeName}/${question.uuid}`, '_blank')
    }
  }

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
    <Box>
      <Typography variant='subtitle2' sx={{ mb: 1.5, fontWeight: 600 }}>
        关联问题
      </Typography>
      <Stack spacing={1}>
        {questions.map((question) => (
          <Box
            key={question.id}
            onClick={() => handleQuestionClick(question)}
            sx={{
              cursor: 'pointer',
              overflow: 'hidden',
              '&:hover .similar-item': {
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
            <SimilarContentItem data={question} />
          </Box>
        ))}
      </Stack>
    </Box>
  )
}

export default AssociatedQuestions
