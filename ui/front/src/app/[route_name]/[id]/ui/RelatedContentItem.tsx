'use client'

import { ModelDiscussionListItem } from '@/api'
import { StatusChip, DiscussionTypeChip } from '@/components'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Chip, Stack } from '@mui/material'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface RelatedContentItemProps {
  routeName: string
  relatedPost: ModelDiscussionListItem
  groupNames: string[]
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

      // 使用单个隐藏元素来测量所有文本宽度，避免频繁创建/销毁 DOM
      let tempEl = document.getElementById('chip-width-measure')
      if (!tempEl) {
        tempEl = document.createElement('div')
        tempEl.id = 'chip-width-measure'
        tempEl.style.position = 'absolute'
        tempEl.style.visibility = 'hidden'
        tempEl.style.fontSize = '12px'
        tempEl.style.fontWeight = '400'
        tempEl.style.padding = '2px 8px'
        tempEl.style.height = '20px'
        tempEl.style.lineHeight = '20px'
        tempEl.style.borderRadius = '3px'
        tempEl.style.boxSizing = 'border-box'
        tempEl.style.whiteSpace = 'nowrap'
        tempEl.style.display = 'inline-flex'
        tempEl.style.alignItems = 'center'
        tempEl.style.pointerEvents = 'none'
        document.body.appendChild(tempEl)
      }

      let totalWidth = 0
      let count = 0
      const gap = 8 // spacing={1} 对应的 gap 值，MUI 的 spacing={1} 是 8px

      // 计算 "+N" 标签的最大宽度
      let maxMoreChipWidth = 0
      for (let i = 1; i <= Math.min(groupNames.length, 10); i++) { // 限制最大数字以避免过多计算
        tempEl.textContent = `+${i}`
        maxMoreChipWidth = Math.max(maxMoreChipWidth, tempEl.offsetWidth)
      }

      // 计算可以显示多少个标签
      for (let i = 0; i < groupNames.length; i++) {
        tempEl.textContent = groupNames[i]
        const chipWidth = tempEl.offsetWidth
        const currentTotalWidth = totalWidth + chipWidth + (i > 0 ? gap : 0)

        // 如果显示当前标签后，还需要显示 "+N" 标签，检查总宽度
        const remainingCount = groupNames.length - i - 1
        if (remainingCount > 0) {
          // 需要预留 "+N" 标签的空间，加上它们之间的 gap
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
      if (count === 0 && groupNames.length > 0) {
        tempEl.textContent = groupNames[0]
        if (tempEl.offsetWidth <= containerWidth) {
          count = 1
        }
      }

      setVisibleCount(count)
    }

    // 使用 requestAnimationFrame 确保 DOM 已更新
    const timeoutId = setTimeout(() => {
      updateVisibleCount()
    }, 0)

    // 防抖处理 resize 事件，避免频繁计算
    let resizeTimeout: NodeJS.Timeout
    const debouncedResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updateVisibleCount, 100)
    }

    window.addEventListener('resize', debouncedResize)
    return () => {
      clearTimeout(timeoutId)
      clearTimeout(resizeTimeout)
      window.removeEventListener('resize', debouncedResize)
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

/**
 * 相关内容项组件
 */
const RelatedContentItem = ({ routeName, relatedPost, groupNames }: RelatedContentItemProps) => {
  if (!relatedPost.uuid) return null

  return (
    <Link
      href={`/${routeName}/${relatedPost.uuid}`}
      target='_blank'
      prefetch={false}
      style={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <Stack spacing={2}>
        {/* 标题和类型标签 */}

        <Ellipsis
          sx={{
            fontWeight: 600,
            fontSize: '14px',
            color: '#21222D',
            lineHeight: '20px',
            flex: 1,
          }}
          className='title'
        >
          {relatedPost.title}
        </Ellipsis>

        {/* 状态标签和作者信息 */}
        <Stack direction='row' alignItems='center' spacing={1} justifyContent='space-between'>
          <StatusChip item={relatedPost} size='small' />
          <DiscussionTypeChip size='small' type={relatedPost.type} variant='default' />
          <GroupChips groupNames={groupNames} postId={relatedPost.id ?? 0} />
        </Stack>
      </Stack>
    </Link>
  )
}

export default RelatedContentItem
