'use client'

import { ModelDiscussionListItem, ModelDiscussionType } from '@/api/types'
import { DiscussionStatusChip, DiscussionTypeChip, MarkDown } from '@/components'
import { CommonContext } from '@/components/commonProvider'
import { TimeDisplay } from '@/components/TimeDisplay'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Chip, SxProps } from '@mui/material'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { memo, useContext, useMemo } from 'react'

const isCategoryTag = (tag: string, groups: Array<{ name?: string }>) => {
  return groups.some((group) => group.name === tag)
}

const SearchDiscussCard = ({
  data,
  keywords: _keywords,
  onNavigate,
  sx,
  size = 'medium',
  filter,
}: {
  data: ModelDiscussionListItem
  keywords?: string
  showType?: boolean
  sx?: SxProps
  size?: 'small' | 'medium'
  onNavigate: () => void
  filter?: 'hot' | 'new' | 'publish'
}) => {
  const it = data
  const { groups } = useContext(CommonContext)
  const params = useParams()
  const profileHref = it.user_id ? `/profile/${it.user_id}` : undefined

  // 使用 useMemo 优化分组名称计算，避免重复查找
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return []

    // 创建group映射表，避免重复查找
    const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))

    return it.group_ids.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
  }, [it.group_ids, groups.flat])

  // 准备数据
  const allTags = groupNames

  return (
    <Box
      sx={{
        borderBottom: '1px solid #f3f4f6',
        transition: 'all 0.2s',
        cursor: 'pointer',
        '&:hover': {
          bgcolor: theme => theme.palette.primaryAlpha?.[3],
        },
        p: 2,
        ...sx,
      }}
    >
      <Link href={`/${params?.route_name as string}/${it.uuid}`} key={it.id} onClick={onNavigate}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mb: 2,
            gap: 1,
          }}
        >
          <DiscussionTypeChip size={size} type={it.type} variant='default' />
          <Ellipsis
            sx={{
              fontWeight: 700,
              color: '#111827',
              letterSpacing: '-0.01em',
              fontSize: size === 'small' ? '16px' : '18px',
              lineHeight: size === 'small' ? '24px' : 'normal',
              '&:hover': { color: '#000000' },
              flex: 1,
            }}
          >
            {it.title}
          </Ellipsis>
        </Box>
        <MarkDown
          content={(it.type === ModelDiscussionType.DiscussionTypeBlog ? it.summary : it.content) || ''}
          truncateLength={100}
          sx={{
            mb: 2,
            lineHeight: 1.5,
            fontSize: '0.8125rem',
            color: 'rgba(33, 34, 45, 0.50) !important',
            bgcolor: 'transparent !important',
            '&.markdown-body': {
              backgroundColor: 'transparent !important',
              color: 'rgba(33, 34, 45, 0.50) !important',
            },
            '& *': {
              fontSize: '0.8125rem !important',
              color: 'rgba(33, 34, 45, 0.50) !important',
            },
          }}
        />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              flexWrap: 'nowrap',
              overflow: 'hidden',
              maxWidth: '100%',
              minWidth: 0,
              flex: 1,
            }}
          >
            {/* 使用通用状态标签组件 */}
            <DiscussionStatusChip item={it} size={size} />
            {allTags.map((tag, index) => {
              const isCategory = isCategoryTag(tag, groups.flat)
              return (
                <Chip
                  key={`${tag}-${isCategory ? 'category' : 'tag'}-${index}`}
                  label={tag}
                  size='small'
                  sx={{
                    bgcolor: 'rgba(233, 236, 239, 1)',
                    color: 'rgba(33, 34, 45, 1)',
                    height: size === 'small' ? 20 : 22,
                    fontSize: size === 'small' ? '12px' : '12px',
                    lineHeight: '22px',
                    borderRadius: '3px',
                    cursor: 'default',
                    pointerEvents: 'none',
                    maxWidth: 120,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    '& .MuiChip-label': {
                      maxWidth: 120,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      px: 0.5,
                    },
                  }}
                />
              )
            })}
          </Box>

          <Box
            sx={{
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: 'rgba(33,34,45,0.5)',
              textWrap: 'no-wrap',
              flexShrink: 0,
            }}
          >
            <Box sx={{}}>{filter === 'publish' ? '发布于' : '更新于'}</Box>
            <TimeDisplay timestamp={filter === 'publish' ? it.created_at || it.updated_at! : it.updated_at!} />
          </Box>
        </Box>
      </Link>
    </Box>
  )
}

// 使用 React.memo 优化组件，避免不必要的重新渲染
export default memo(SearchDiscussCard, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时才重新渲染
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.updated_at === nextProps.data.updated_at &&
    prevProps.data.created_at === nextProps.data.created_at &&
    prevProps.data.like === nextProps.data.like &&
    prevProps.data.dislike === nextProps.data.dislike &&
    prevProps.data.comment === nextProps.data.comment &&
    prevProps.data.resolved === nextProps.data.resolved &&
    prevProps.data.group_ids === nextProps.data.group_ids &&
    prevProps.data.tags === nextProps.data.tags &&
    prevProps.showType === nextProps.showType &&
    prevProps.keywords === nextProps.keywords &&
    prevProps.filter === nextProps.filter
  )
})
