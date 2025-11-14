'use client'
import { ModelDiscussionListItem, ModelDiscussionType } from '@/api'
import { DiscussionTypeChip, MarkDown } from '@/components'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Stack } from '@mui/material'

interface SimilarContentItemProps {
  data: ModelDiscussionListItem
}

// 相似内容项组件（与问题详情页的相关内容UI保持一致）
const SimilarContentItem = ({ data }: SimilarContentItemProps) => {
  return (
    <Box
      sx={{
        py: 1,
        pl: 2,
        transition: 'all 0.2s',
        borderBottom: '1px solid #D9DEE2',
      }}
      className='similar-item'
    >
      <Stack direction='row' alignItems='center' spacing={1}>
        <DiscussionTypeChip type={data.type} variant='default' sx={{ fontSize: '12px' }} />
        <Ellipsis
          sx={{
            fontWeight: 600,
            color: '#111827',
            mb: 1,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {data.title}
        </Ellipsis>
      </Stack>

      <Box
        sx={{
          mt: 1,
          color: 'rgba(33,34,45,0.5)',
          fontSize: '12px',
          lineHeight: '20px',
          height: '20px',
        }}
      >
        {data.type === ModelDiscussionType.DiscussionTypeBlog ? (
          <Ellipsis>{data.summary}</Ellipsis>
        ) : (
          <MarkDown truncateLength={16} content={data.content} sx={{
            fontSize: '12px',
            bgcolor: 'transparent',
            color: 'rgba(33,34,45,0.5)',
          }} />
        )}
      </Box>
    </Box>
  )
}

export default SimilarContentItem

