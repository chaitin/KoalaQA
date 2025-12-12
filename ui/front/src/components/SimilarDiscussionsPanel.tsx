'use client'

import { getDiscussion } from '@/api/Discussion'
import { ModelDiscussionListItem } from '@/api/types'
import { useForumStore } from '@/store'
import { Icon } from '@ctzhian/ui'
import { Box, Stack, Typography } from '@mui/material'
import Image from 'next/image'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import SimilarContentItem from './SimilarContentItem'

export interface SimilarDiscussionsPanelRef {
  requestNow: () => void
  clear: () => void
}

interface SimilarDiscussionsPanelProps {
  title?: string
  groupIds?: number[]
  content?: string
  editorContent?: string
  size?: number
}

const SimilarDiscussionsPanel = forwardRef<SimilarDiscussionsPanelRef, SimilarDiscussionsPanelProps>(
  ({ title, groupIds, content, editorContent, size = 5 }, ref) => {
    const { selectedForumId } = useForumStore()
    const [similarDiscussions, setSimilarDiscussions] = useState<ModelDiscussionListItem[]>([])
    const [similarLoading, setSimilarLoading] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const clearTimer = useCallback(() => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }, [])

    const clear = useCallback(() => {
      clearTimer()
      setSimilarDiscussions([])
    }, [clearTimer])

    const searchSimilarDiscussions = useCallback(
      async (searchText: string, categoryIds?: number[]) => {
        if (!searchText?.trim() || !selectedForumId) {
          setSimilarDiscussions([])
          return
        }

        setSimilarLoading(true)
        try {
          const params: any = {
            forum_id: selectedForumId,
            keyword: searchText.trim(),
            size,
            type: 'qa', // 只查询问答类型
          }

          if (categoryIds && categoryIds.length > 0) {
            params.group_ids = categoryIds
          }

          const result = await getDiscussion(params)
          // @ts-ignore - API 返回结构可能与类型定义不完全一致
          const items = result.items || result.data?.items || []
          setSimilarDiscussions(items)
        } catch (error) {
          console.error('查询相似内容失败:', error)
          setSimilarDiscussions([])
        } finally {
          setSimilarLoading(false)
        }
      },
      [selectedForumId, size],
    )

    const requestNow = useCallback(() => {
      const t = (title || '').trim()
      if (!t) {
        setSimilarDiscussions([])
        return
      }
      clearTimer()
      void searchSimilarDiscussions(t, groupIds)
    }, [title, groupIds, clearTimer, searchSimilarDiscussions])

    useImperativeHandle(
      ref,
      () => ({
        requestNow,
        clear,
      }),
      [requestNow, clear],
    )

    // 监听分类变化，当分类改变且标题已填写时，触发查询（防抖 300ms）
    useEffect(() => {
      const t = (title || '').trim()
      const gids = Array.isArray(groupIds) ? groupIds : []
      if (!t || gids.length === 0) return

      clearTimer()
      searchTimeoutRef.current = setTimeout(() => {
        void searchSimilarDiscussions(t, gids)
      }, 300)

      return () => {
        clearTimer()
      }
    }, [groupIds, title, clearTimer, searchSimilarDiscussions])

    // 当标题、分类、内容都填写后，再次查询（更精准，防抖 800ms）
    useEffect(() => {
      clearTimer()

      const hasTitle = (title || '').trim()
      const gids = Array.isArray(groupIds) ? groupIds : []
      const hasGroups = gids.length > 0
      const hasContent = (editorContent || '').trim() || (content || '').trim()

      if (hasTitle && hasGroups && hasContent) {
        const combinedText = `${hasTitle} ${editorContent || content || ''}`
        searchTimeoutRef.current = setTimeout(() => {
          void searchSimilarDiscussions(combinedText, gids)
        }, 800)
      }

      return () => {
        clearTimer()
      }
    }, [title, groupIds, content, editorContent, clearTimer, searchSimilarDiscussions])

    // 关闭弹窗时清空相似内容
    useEffect(() => {
      return () => {
        clear()
      }
    }, [])

    const handleSimilarItemClick = useCallback(
      (item: ModelDiscussionListItem) => {
        if (item.uuid) {
          const url = `/${selectedForumId}/${item.uuid}`
          window.open(url, '_blank')
        }
      },
      [selectedForumId],
    )

    return (
      <Box
        sx={{
          flex: 1,
          minHeight: 200,
          flexShrink: 0,
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          height: '60vh',
          overflow: 'hidden',
          background: 'rgba(0,99,151,0.03)',
          borderRadius: 1,
          border: '1px solid #D9DEE2',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            p: 2,
            flexShrink: 0,
          }}
        >
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{ fontSize: '12px', fontWeight: 400, color: 'primary.main' }}
          >
            {similarLoading ? (
              <>
                <img src='/search_loading.gif' alt='loading' style={{ width: 18, height: 18 }} />
                <Box>相似帖子搜集中...</Box>
              </>
            ) : (
              <>
                <Icon type='icon-xingxingzuhe' sx={{ fontSize: 14, color: 'primary.main' }} />
                <Box>相似帖子推荐</Box>
              </>
            )}
          </Stack>
        </Box>

        {similarDiscussions.length > 0 ? (
          <Box
            sx={{
              height: 'calc(60vh - 60px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              flex: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                overflowX: 'hidden',
                p: 2,
                pt: 0,
                '& > *:last-child .similar-item > *': {
                  borderBottom: 'none',
                },
              }}
            >
              {similarDiscussions.map((item, index) => (
                <Box
                  key={item.id || index}
                  onClick={() => handleSimilarItemClick(item)}
                  sx={{
                    cursor: 'pointer',
                    overflow: 'hidden',
                    '&:hover .similar-item': {
                      bgcolor: '#f3f4f6',
                      borderColor: '#d1d5db',
                    },
                  }}
                >
                  <Box className='similar-item'>
                    <SimilarContentItem data={item} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          !similarLoading && (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
              }}
            >
              <Image
                src='/empty.png'
                alt='暂无相似帖子'
                width={250}
                height={137}
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <Typography
                variant='body2'
                sx={{
                  mt: 2,
                  color: 'rgba(0,0,0,0.6)',
                  fontSize: 12,
                }}
              >
                暂无相似内容
              </Typography>
            </Box>
          )
        )}
      </Box>
    )
  },
)

SimilarDiscussionsPanel.displayName = 'SimilarDiscussionsPanel'

export default SimilarDiscussionsPanel
