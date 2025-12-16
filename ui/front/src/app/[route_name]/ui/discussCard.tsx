'use client'

import { ModelDiscussionListItem, ModelDiscussionTag, ModelDiscussionType } from '@/api/types'
import { DiscussionStatusChip, DiscussionTypeChip, MarkDown } from '@/components'
import CommonAvatar from '@/components/CommonAvatar'
import { CommonContext } from '@/components/commonProvider'
import { TimeDisplay } from '@/components/TimeDisplay'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { Ellipsis, Icon } from '@ctzhian/ui'
import { Box, Chip, Stack, SxProps, Typography } from '@mui/material'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { memo, useContext, useMemo } from 'react'

const isCategoryTag = (tag: string, groups: Array<{ name?: string }>) => {
  return groups.some((group) => group.name === tag)
}

const DiscussCard = ({
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
  const { groups, tags } = useContext(CommonContext)
  const params = useParams()
  const router = useRouterWithRouteName()
  const profileHref = it.user_id ? `/profile/${it.user_id}` : undefined

  // 使用 useMemo 优化分组名称计算，避免重复查找
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return []

    // 创建group映射表，避免重复查找
    const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))

    return it.group_ids.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
  }, [it.group_ids, groups.flat])

  const isQAPost = it.type === ModelDiscussionType.DiscussionTypeQA
  const isArticlePost = it.type === ModelDiscussionType.DiscussionTypeBlog
  const isIssuePost = it.type === ModelDiscussionType.DiscussionTypeIssue
  return (
    <Box
      sx={{
        borderBottom: '1px solid #f3f4f6',
        transition: 'all 0.2s',
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'rgba(0,99,151,0.03)',
        },
        p: 2,
        ...sx,
      }}
    >
      <Stack
        direction='row'
        alignItems='center'
        spacing={1}
        sx={{ ...(size === 'small' ? { lineHeight: '22px' } : {}), mb: 2 }}
      >
        <Link
          href={profileHref || '/'}
          key={it.id}
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={onNavigate}
        >
          <Box
            tabIndex={0}
            sx={{
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              borderRadius: 1,
              transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
              color: 'text.primary',
              '&:focus-within, &:hover ': {
                color: 'primary.main',
              },
              my: '-2px',
              ml: '-4px',
            }}
          >
            <Box
              sx={{
                display: 'inline-flex',
                cursor: profileHref ? 'pointer' : 'default',
              }}
              tabIndex={-1}
            >
              <CommonAvatar
                src={it.user_avatar}
                name={it.user_name}
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  ...(size === 'small' && {
                    width: 22,
                    height: 22,
                  }),
                }}
              />
            </Box>
            <Box
              sx={{
                fontSize: size === 'small' ? '14px' : '14px',
                lineHeight: size === 'small' ? '22px' : 'normal',
                textDecoration: 'none',
                outline: 'none',
                color: 'inherit',
                fontWeight: 600,
                cursor: 'pointer',
                ml: 1,
              }}
              tabIndex={-1}
            >
              {it.user_name || ''}
            </Box>
          </Box>
        </Link>
        <Box sx={{ fontWeight: 400, whiteSpace: 'nowrap', fontSize: '14px' }}>
          ·{' '}
          <TimeDisplay
            style={{ color: 'rgba(33, 34, 45, 0.30)' }}
            timestamp={filter === 'publish' ? it.created_at || it.updated_at! : it.updated_at!}
          />
        </Box>
      </Stack>
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
          content={it.type === ModelDiscussionType.DiscussionTypeBlog ? it.summary : it.content}
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

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {/* 使用通用状态标签组件 */}
            <DiscussionStatusChip item={it} size={size} />
            {groupNames.map((tag, index) => {
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
                  }}
                />
              )
            })}
          </Box>

          <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'center' }}>
            {isQAPost && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  background: 'rgba(0,99,151,0.06)',
                  color: 'primary.main',
                  px: 1,
                  borderRadius: 0.5,
                }}
              >
                <Icon type='icon-wendapinglun' sx={{ fontSize: 12 }} />
                <Typography variant='caption' sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  {it.comment || 0}
                </Typography>
              </Box>
            )}
            {(isArticlePost || isIssuePost) && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  background: 'rgba(0,99,151,0.06)',
                  color: 'primary.main',
                  px: 1,
                  borderRadius: 0.5,
                }}
              >
                <Icon type='icon-dianzan1' sx={{ fontSize: 12 }} />
                <Typography variant='caption' sx={{ fontWeight: 600, fontSize: '0.7rem' }}>
                  {(it.like || 0) - (it.dislike || 0)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Link>
    </Box>
  )
}

// 使用 React.memo 优化组件，避免不必要的重新渲染
export default memo(DiscussCard)
