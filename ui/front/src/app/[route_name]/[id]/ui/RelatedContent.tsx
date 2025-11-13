'use client'
import { getDiscussionDiscIdSimilarity, ModelDiscussionListItem } from '@/api'
import { SimilarContentItem } from '@/components'
import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const RelatedContent = ({ discId }: { discId: string }) => {
  const [relatedPosts, setRelatedPosts] = useState<ModelDiscussionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const params = useParams()
  const routeName = params?.route_name as string

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      try {
        setLoading(true)
        const response = await getDiscussionDiscIdSimilarity({ discId })
        if (response?.items) {
          setRelatedPosts(response.items)
        }
      } catch (error) {
        console.error('Failed to fetch related posts:', error)
      } finally {
        setLoading(false)
      }
    }

    if (discId) {
      fetchRelatedPosts()
    }
  }, [discId])

  const handlePostClick = (post: ModelDiscussionListItem) => {
    if (typeof window !== 'undefined' && routeName && post.uuid) {
      window.open(`/${routeName}/${post.uuid}`, '_blank')
    }
  }

  return (
    <Stack gap={1}>
      {relatedPosts.map((relatedPost) => (
        <Box
          key={relatedPost.id}
          onClick={() => handlePostClick(relatedPost)}
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
          <SimilarContentItem data={relatedPost} />
        </Box>
      ))}
    </Stack>
  )
}

export default RelatedContent
