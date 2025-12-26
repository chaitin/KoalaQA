'use client'
import { getDiscussionDiscIdSimilarity, ModelDiscussionListItem } from '@/api'
import { CommonContext } from '@/components/commonProvider'
import { Box, Divider, Paper, Stack, Typography } from '@mui/material'
import { useParams } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'
import RelatedContentItem from './RelatedContentItem'

const RelatedContent = ({ discId }: { discId: string }) => {
  const [relatedPosts, setRelatedPosts] = useState<ModelDiscussionListItem[]>([])
  const params = useParams()
  const routeName = params?.route_name as string
  const { groups } = useContext(CommonContext)

  useEffect(() => {
    const fetchRelatedPosts = async () => {
      try {
        const response = await getDiscussionDiscIdSimilarity({ discId })
        if (response?.items) {
          setRelatedPosts(response.items)
        }
      } catch (error) {
        console.error('Failed to fetch related posts:', error)
      }
    }

    if (discId) {
      fetchRelatedPosts()
    }
  }, [discId])

  // 根据 group_ids 获取组名
  const getGroupNames = (groupIds?: number[]) => {
    if (!groupIds || !groups.flat.length) return []
    const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))
    return groupIds.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
  }

  return (
    <Stack
      component={Paper}
      elevation={0}
      sx={{ p: 2, border: (theme) => `1px solid ${theme.palette.mode === 'light' ? '#EAECF0' : '#393939'}` }}
    >
      <Box>
        <Typography variant='subtitle2' sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
          相似内容
        </Typography>
        <Divider sx={{ mt: 2 }} />
      </Box>
      <Stack>
        {relatedPosts.length ? (
          relatedPosts.map((relatedPost) => (
            <Box
              key={relatedPost.id}
              sx={{
                py: 2,
                px: 1,
                overflow: 'hidden',
                maxWidth: '100%',
                borderBottom: `1px solid`,
                borderBottomColor: 'divider',
                '&:hover': {
                  bgcolor: (theme) => theme.palette.primaryAlpha?.[3],
                  '& .title': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              {relatedPost.uuid && routeName && (
                <RelatedContentItem
                  routeName={routeName}
                  relatedPost={relatedPost}
                  groupNames={getGroupNames(relatedPost.group_ids)}
                />
              )}
            </Box>
          ))
        ) : (
          <Typography sx={{ p: 2 }} variant='body2' color='text.secondary'>
            暂无推荐
          </Typography>
        )}
      </Stack>
    </Stack>
  )
}

export default RelatedContent
