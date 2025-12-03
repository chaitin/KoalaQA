'use client'
import { getDiscussionDiscIdSimilarity, ModelDiscussionListItem } from '@/api'
import { DiscussionStatusChip, DiscussionTypeChip } from '@/components'
import { CommonContext } from '@/components/commonProvider'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Chip, Stack, Typography } from '@mui/material'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useContext, useEffect, useRef, useState } from 'react'

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

  const handlePostClick = (post: ModelDiscussionListItem) => {
    if (typeof window !== 'undefined' && routeName && post.uuid) {
      window.open(`/${routeName}/${post.uuid}`, '_blank')
    }
  }

  // 根据 group_ids 获取组名
  const getGroupNames = (groupIds?: number[]) => {
    if (!groupIds || !groups.flat.length) return []
    const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))
    return groupIds.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
  }

  // 处理 Chip 溢出显示的组件
  const GroupChips = ({ groupNames, postId }: { groupNames: string[]; postId: number }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const [visibleCount, setVisibleCount] = useState(groupNames.length)

    useEffect(() => {
      const updateVisibleCount = () => {
        if (!containerRef.current || groupNames.length === 0) {
          setVisibleCount(0)
          return
        }

        const container = containerRef.current
        const containerWidth = container.offsetWidth
        if (containerWidth === 0) return // 容器还未渲染完成

        // 创建一个临时元素来测量 Chip 宽度
        const tempEl = document.createElement('div')
        tempEl.style.position = 'absolute'
        tempEl.style.visibility = 'hidden'
        tempEl.style.whiteSpace = 'nowrap'
        tempEl.style.fontSize = '12px'
        tempEl.style.fontWeight = '400'
        tempEl.style.padding = '0 8px'
        tempEl.style.height = '20px'
        tempEl.style.lineHeight = '20px'
        document.body.appendChild(tempEl)

        let totalWidth = 0
        let count = 0
        const gap = 8 // spacing={1} 对应的 gap 值，MUI 的 spacing={1} 是 8px

        // 先计算所有标签的宽度
        const chipWidths: number[] = []
        for (let i = 0; i < groupNames.length; i++) {
          tempEl.textContent = groupNames[i]
          chipWidths.push(tempEl.offsetWidth)
        }

        // 计算 "+N" 标签的宽度（用于预留空间）
        // 需要计算不同剩余数量时的宽度，取最大值
        let maxMoreChipWidth = 0
        for (let i = 1; i <= groupNames.length; i++) {
          tempEl.textContent = `+${i}`
          maxMoreChipWidth = Math.max(maxMoreChipWidth, tempEl.offsetWidth)
        }

        // 计算可以显示多少个标签
        for (let i = 0; i < groupNames.length; i++) {
          const chipWidth = chipWidths[i]
          const currentTotalWidth = totalWidth + chipWidth + (i > 0 ? gap : 0)

          // 如果显示当前标签后，还需要显示 "+N" 标签，检查总宽度
          const remainingCount = groupNames.length - i - 1
          if (remainingCount > 0) {
            // 需要预留 "+N" 标签的空间
            if (currentTotalWidth + gap + maxMoreChipWidth > containerWidth) {
              break
            }
          } else {
            // 最后一个标签，不需要 "+N"，直接检查是否超出
            if (currentTotalWidth > containerWidth) {
              break
            }
          }

          totalWidth = currentTotalWidth
          count++
        }

        // 确保至少显示一个标签（如果容器宽度足够）
        if (count === 0 && groupNames.length > 0 && chipWidths[0] <= containerWidth) {
          count = 1
        }

        document.body.removeChild(tempEl)
        setVisibleCount(count)
      }

      // 使用 requestAnimationFrame 确保 DOM 已更新
      const timeoutId = setTimeout(() => {
        updateVisibleCount()
      }, 0)

      window.addEventListener('resize', updateVisibleCount)
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', updateVisibleCount)
      }
    }, [groupNames])

    if (groupNames.length === 0) return null

    const visibleGroups = groupNames.slice(0, visibleCount)
    const remainingCount = groupNames.length - visibleCount

    return (
      <Box
        ref={containerRef}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'nowrap',
          overflow: 'hidden',
          flex: 1,
        }}
      >
        {visibleGroups.map((groupName, index) => (
          <Chip
            key={`${postId}-${index}`}
            label={groupName}
            size='small'
            sx={{
              bgcolor: 'rgba(233, 236, 239, 1)',
              color: 'rgba(33, 34, 45, 1)',
              height: 20,
              lineHeight: '20px',
              fontWeight: 400,
              fontSize: '12px',
              borderRadius: '3px',
              cursor: 'default',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          />
        ))}
        {remainingCount > 0 && (
          <Chip
            label={`+${remainingCount}`}
            size='small'
            sx={{
              bgcolor: 'rgba(233, 236, 239, 1)',
              color: 'rgba(33, 34, 45, 1)',
              height: 20,
              lineHeight: '20px',
              fontWeight: 400,
              fontSize: '12px',
              borderRadius: '3px',
              cursor: 'default',
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          />
        )}
      </Box>
    )
  }

  return (
    <Stack gap={3}>
      <Box
        sx={{
          fontWeight: 600,
          fontSize: 14,
          color: '#21222D',
          lineHeight: '22px',
        }}
      >
        相似内容
      </Box>
      <Stack
        gap={{
          xs: 1.5,
          sm: 2,
          md: 3,
        }}
      >
        {relatedPosts.length ? (
          relatedPosts.map((relatedPost) => (
            <Box
              key={relatedPost.id}
              onClick={() => handlePostClick(relatedPost)}
              sx={{
                pl: 2,
                borderLeft: '1px solid #e5e7eb',
                cursor: 'pointer',
                overflow: 'hidden',
                maxWidth: '100%',
                '&:hover': {
                  borderColor: 'rgba(0, 99, 151, 1)',
                  '& .title': {
                    color: 'rgba(0, 99, 151, 1)',
                  },
                },
              }}
            >
              {relatedPost.uuid && routeName && (
                <Link
                  href={`/${routeName}/${relatedPost.uuid}`}
                  target='_blank'
                  style={{
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <Stack spacing={2}>
                    {/* 标题和类型标签 */}
                    <Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 0.5 }}>
                      <DiscussionTypeChip size='small' type={relatedPost.type} variant='default' />
                      <Ellipsis
                        sx={{
                          fontWeight: 600,
                          fontSize: '12px',
                          color: '#21222D',
                          lineHeight: '20px',
                          flex: 1,
                        }}
                        className='title'
                      >
                        {relatedPost.title}
                      </Ellipsis>
                    </Stack>

                    {/* 状态标签和作者信息 */}
                    <Stack direction='row' alignItems='center' spacing={1} justifyContent='space-between'>
                      <DiscussionStatusChip item={relatedPost} size='small' />
                      <GroupChips groupNames={getGroupNames(relatedPost.group_ids)} postId={relatedPost.id ?? 0} />
                    </Stack>
                  </Stack>
                </Link>
              )}
            </Box>
          ))
        ) : (
          <Typography sx={{ borderLeft: '1px solid #e5e7eb', p: 2 }} variant='body2' color='text.secondary'>
            暂无推荐
          </Typography>
        )}
      </Stack>
    </Stack>
  )
}

export default RelatedContent
