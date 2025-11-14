'use client'
import { ModelDiscussionListItem, ModelDiscussionType } from '@/api'
import { DiscussionTypeChip, MarkDown } from '@/components'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Stack } from '@mui/material'

interface SimilarContentItemProps {
  data: ModelDiscussionListItem
}

// 检测内容是否主要是图片
const isImageContent = (content: string): boolean => {
  if (!content) return false
  
  // 先检查是否包含图片标记
  const hasMarkdownImage = /!\[([^\]]*)\]\([^\)]*\)/.test(content)
  const hasHtmlImage = /<img[^>]*>/gi.test(content)
  
  // 如果没有图片标记，直接返回 false
  if (!hasMarkdownImage && !hasHtmlImage) return false
  
  // 移除所有图片标记（Markdown格式：![alt](url) 和 HTML格式：<img>）
  let text = content
    .replace(/!\[([^\]]*)\]\([^\)]*\)/g, '') // 移除Markdown图片
    .replace(/<img[^>]*>/gi, '') // 移除HTML图片标签
    .replace(/<[^>]*>/g, '') // 移除其他HTML标签
    .replace(/\s+/g, ' ')
    .trim()
  
  // 如果移除图片后没有其他文本内容，则认为是图片内容
  return !text || text.length === 0
}

// 相似内容项组件（与问题详情页的相关内容UI保持一致）
const SimilarContentItem = ({ data }: SimilarContentItemProps) => {
  return (
    <Box
      sx={{
        py: 1,
        px: 2,
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
            fontSize: '13px',
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
        ) : isImageContent(data.content || '') ? (
          '[图片]'
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

