'use client'

import { getDiscussion } from '@/api/Discussion'
import { ModelDiscussionListItem } from '@/api/types'
import { useForumStore } from '@/store'
import { Box, Divider, Paper, Stack, Typography } from '@mui/material'
import Image from 'next/image'
import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { CommonContext } from './commonProvider'
import RelatedContentItem from '@/app/[route_name]/[id]/ui/RelatedContentItem'

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
    const selectedForumId = useForumStore((state) => state.selectedForumId)
    const forums = useForumStore((state) => state.forums)
    const setRouteName = useForumStore((state) => state.setRouteName)
    const refreshForums = useForumStore((state) => state.refreshForums)
    const params = useParams()
    const routeName = params?.route_name as string
    const { groups } = useContext(CommonContext)
    const [similarDiscussions, setSimilarDiscussions] = useState<ModelDiscussionListItem[]>([])
    const [similarLoading, setSimilarLoading] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const effectiveForumId = useMemo(() => {
      if (selectedForumId) return selectedForumId
      if (routeName && Array.isArray(forums)) {
        const matched = forums.find((forum) => forum.route_name === routeName)
        if (matched?.id) return matched.id
      }
      return undefined
    }, [selectedForumId, forums, routeName])

    const clearTimer = useCallback(() => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
        searchTimeoutRef.current = null
      }
    }, [])

    useEffect(() => {
      if (routeName) {
        setRouteName(routeName)
      }
    }, [routeName, setRouteName])

    useEffect(() => {
      if (!effectiveForumId && routeName) {
        void refreshForums().catch(() => {})
      }
    }, [effectiveForumId, routeName, refreshForums])

    const clear = useCallback(() => {
      clearTimer()
      setSimilarDiscussions([])
    }, [clearTimer])

    const searchSimilarDiscussions = useCallback(
      async (searchText: string, categoryIds?: number[]) => {
        if (!searchText?.trim() || !effectiveForumId) {
          setSimilarDiscussions([])
          return
        }

        setSimilarLoading(true)
        try {
          const params: any = {
            forum_id: effectiveForumId,
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
      [effectiveForumId, size],
    )

    const requestNow = useCallback(() => {
      const t = (title || '').trim()
      if (!t) {
        setSimilarDiscussions([])
        return
      }
      if (!effectiveForumId) {
        return
      }
      clearTimer()
      void searchSimilarDiscussions(t, Array.isArray(groupIds) && groupIds.length > 0 ? groupIds : undefined)
    }, [title, groupIds, clearTimer, searchSimilarDiscussions, effectiveForumId])

    useImperativeHandle(
      ref,
      () => ({
        requestNow,
        clear,
      }),
      [requestNow, clear],
    )

    // 监听标题和内容变化，触发查询（防抖 800ms）
    useEffect(() => {
      const t = (title || '').trim()
      if (!t || !effectiveForumId) {
        setSimilarDiscussions([])
        return
      }

      const gids = Array.isArray(groupIds) ? groupIds : []
      const hasContent = (editorContent || '').trim() || (content || '').trim()

      clearTimer()
      searchTimeoutRef.current = setTimeout(() => {
        const keyword = hasContent && gids.length > 0 ? `${t} ${editorContent || content || ''}` : t
        void searchSimilarDiscussions(keyword, gids.length > 0 ? gids : undefined)
      }, 800)

      return () => {
        clearTimer()
      }
    }, [title, groupIds, content, editorContent, clearTimer, searchSimilarDiscussions, effectiveForumId])

    // 关闭弹窗时清空相似内容
    useEffect(() => {
      return () => {
        clear()
      }
    }, [])

    // 根据 group_ids 获取组名
    const getGroupNames = useCallback((groupIds?: number[]) => {
      if (!groupIds || !groups.flat.length) return []
      const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))
      return groupIds.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
    }, [groups])

    return (
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 200,
          flexShrink: 0,
          p: 2,
          display: { xs: 'none', sm: 'flex' },
          flexDirection: 'column',
          height: '60vh',
          overflow: 'hidden',
          borderRadius: 1,
          border: (theme) => `1px solid ${theme.palette.mode === 'light' ? '#EAECF0' : '#393939'}`,
        }}
      >
        <Stack
          direction='row'
          alignItems='center'
          gap={1}
          sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary' }}
        >
          {/* <Icon type='icon-xingxingzuhe' sx={{ fontSize: 14, color: 'primary.main' }} /> */}
          <Box>相似内容</Box>
        </Stack>
        <Divider sx={{ mt: 2 }} />
        {similarDiscussions.length > 0 ? (
          <Box
            sx={{
              height: 'calc(60vh - 60px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              flex: 1,
            }}
          >
            <Stack divider={<Divider />}>
              {similarDiscussions.map((item, index) => (
                <Box
                  key={item.id || index}
                  sx={{
                    overflow: 'hidden',
                    py: 2,
                    px: 1,
                    '&:hover': {
                      bgcolor: (theme) => theme.palette.primaryAlpha?.[3],
                      '& .title': {
                        color: 'primary.main',
                      },
                    },
                  }}
                >
                  {item.uuid && routeName && (
                    <RelatedContentItem
                      routeName={routeName}
                      relatedPost={item}
                      groupNames={getGroupNames(item.group_ids)}
                    />
                  )}
                </Box>
              ))}
            </Stack>
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
      </Paper>
    )
  },
)

SimilarDiscussionsPanel.displayName = 'SimilarDiscussionsPanel'

export default SimilarDiscussionsPanel
