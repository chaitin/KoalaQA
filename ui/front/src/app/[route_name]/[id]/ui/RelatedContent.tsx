'use client'
import { getDiscussionDiscIdSimilarity, ModelDiscussionListItem, ModelDiscussionType } from '@/api'
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer'
import { Box, Paper, Skeleton, Typography } from '@mui/material'
import { Icon } from '@ctzhian/ui'
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
    <Paper
      elevation={0}
      sx={{
        bgcolor: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        p: 2,
        mb: 2,
      }}
    >
      <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#111827', fontSize: '14px', mb: 2 }}>
        相关内容
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                p: 1.5,
                borderRadius: '6px',
                bgcolor: '#f9fafb',
                border: '1px solid #e5e7eb',
              }}
            >
              <Skeleton variant='text' width='100%' height={20} sx={{ mb: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton variant='text' width={40} height={14} />
                <Skeleton variant='text' width={30} height={14} />
              </Box>
            </Box>
          ))}
        </Box>
      ) : relatedPosts.length === 0 ? (
        <Typography
          variant='body2'
          sx={{
            color: '#9ca3af',
            fontSize: '0.8125rem',
            textAlign: 'center',
            py: 2,
          }}
        >
          暂无推荐
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {relatedPosts.map((relatedPost) => (
          <Box
            key={relatedPost.id}
            onClick={() => handlePostClick(relatedPost)}
            sx={{
              p: 1.5,
              borderRadius: '6px',
              bgcolor: '#f9fafb',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: '#f3f4f6',
                borderColor: '#d1d5db',
                transform: 'translateX(2px)',
              },
            }}
          >
            <Typography
              variant='body2'
              sx={{
                fontWeight: 600,
                color: '#111827',
                fontSize: '0.8125rem',
                mb: 1,
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {relatedPost.title}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography
                variant='caption'
                sx={{
                  color: '#9ca3af',
                  fontSize: '0.65rem',
                  fontWeight: 500,
                }}
              >
                {relatedPost.type === ModelDiscussionType.DiscussionTypeQA
                  ? '问题'
                  : relatedPost.type === ModelDiscussionType.DiscussionTypeFeedback
                    ? '反馈'
                    : '文章'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {relatedPost.type === ModelDiscussionType.DiscussionTypeQA ? (
                  <>
                    <QuestionAnswerIcon sx={{ fontSize: 12, color: '#9ca3af' }} />
                    <Typography variant='caption' sx={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.7rem' }}>
                      {relatedPost.comment || 0}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Icon type='icon-dianzan1' sx={{ fontSize: 12, color: '#9ca3af' }} />
                    <Typography variant='caption' sx={{ color: '#9ca3af', fontWeight: 600, fontSize: '0.7rem' }}>
                      {relatedPost.like || 0}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>
        ))}
        </Box>
      )}
    </Paper>
  )
}

export default RelatedContent

