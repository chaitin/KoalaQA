'use client'
import { getDiscussion } from '@/api'
import { GetDiscussionParams, ModelDiscussionListItem, ModelDiscussionType, ModelUserRole } from '@/api/types'
import SearchDiscussCard from '@/app/[route_name]/ui/searchDiscussCard'
import { AuthContext } from '@/components/authProvider'
import { isAdminRole } from '@/lib/utils'
import { useForumStore } from '@/store'
import ClearIcon from '@mui/icons-material/Clear'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import Image from 'next/image'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import AISummaryPanel from './AISummaryPanel'

interface SearchResultModalProps {
  open: boolean
  onClose: () => void
  initialQuery?: string
  onPublish: (type: ModelDiscussionType, query: string) => void
}

const PAGE_SIZE = 10

export const SearchResultModal = ({ open, onClose, initialQuery = '', onPublish }: SearchResultModalProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listContainerRef = useRef<HTMLDivElement>(null)
  const latestQueryRef = useRef('')
  const loadingRef = useRef(false)
  const loadingMoreRef = useRef(false)
  const { user } = useContext(AuthContext)

  // 从 store 获取 forumId
  const forumId = useForumStore((s) => s.selectedForumId)

  // 内部状态管理
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [searchResults, setSearchResults] = useState<ModelDiscussionListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const performSearch = useCallback(
    async (query: string, pageToFetch = 1) => {
      const trimmedQuery = query.trim()
      if (!trimmedQuery) return

      const isFirstPage = pageToFetch === 1
      if (isFirstPage) {
        if (loadingRef.current) {
          return
        }
        loadingRef.current = true
        loadingMoreRef.current = false
        setLoading(true)
        setLoadingMore(false)
        setPage(1)
        setTotalCount(0)
        setHasMore(false)
        setSearchResults([])
        latestQueryRef.current = trimmedQuery
      } else {
        if (loadingMoreRef.current || loadingRef.current) {
          return
        }
        loadingMoreRef.current = true
        setLoadingMore(true)
      }

      try {
        const params: GetDiscussionParams = {
          forum_id: forumId as any,
          keyword: trimmedQuery,
          stat: isFirstPage,
          page: pageToFetch,
          size: PAGE_SIZE,
        }

        const result = await getDiscussion(params)
        if (latestQueryRef.current !== trimmedQuery) {
          return
        }

        const items = result.items || []
        const total = result.total ?? items.length ?? 0

        setSearchResults((prev) => {
          if (isFirstPage) {
            listContainerRef.current?.scrollTo({ top: 0 })
            return items
          }
          if (!items.length) {
            return prev
          }
          const next = [...prev]
          const existing = new Set(
            prev.map((item) => {
              if (!item) return ''
              return `${item.id ?? ''}-${item.uuid ?? ''}-${item.rag_id ?? ''}`
            }),
          )
          items.forEach((item) => {
            const key = `${item?.id ?? ''}-${item?.uuid ?? ''}-${item?.rag_id ?? ''}`
            if (!existing.has(key)) {
              existing.add(key)
              next.push(item)
            }
          })
          return next
        })

        setPage(pageToFetch)
        setTotalCount(total)
        setHasMore(pageToFetch * PAGE_SIZE < total)
      } catch (error) {
        console.error('搜索失败:', error)
        if (isFirstPage) {
          setSearchResults([])
          setTotalCount(0)
        }
      } finally {
        if (isFirstPage) {
          loadingRef.current = false
          setLoading(false)
          loadingMoreRef.current = false
          setLoadingMore(false)
        } else {
          loadingMoreRef.current = false
          setLoadingMore(false)
        }
      }
    },
    [forumId],
  )

  // 当弹窗打开时，聚焦到搜索框并初始化查询
  useEffect(() => {
    if (open) {
      setSearchQuery(initialQuery)
      setPage(1)
      setTotalCount(0)
      setHasMore(false)
      setLoadingMore(false)
      if (searchInputRef.current) {
        setTimeout(() => {
          searchInputRef.current?.focus()
        }, 100)
      }
      // 如果有初始查询，自动执行搜索
      if (initialQuery.trim()) {
        performSearch(initialQuery.trim())
      }
    } else {
      // 关闭时清空状态
      setSearchQuery('')
      setSearchResults([])
      setTotalCount(0)
      setHasMore(false)
      setPage(1)
      setLoading(false)
      setLoadingMore(false)
      loadingRef.current = false
      loadingMoreRef.current = false
      latestQueryRef.current = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery])

  // 当搜索内容改变时的处理函数
  useEffect(() => {
    // 只在弹窗打开且搜索内容变化时进行处理
    if (open) {
      const timer = setTimeout(() => {
        // 只有当搜索内容与初始查询不同时才触发自动搜索
        if (searchQuery.trim() && searchQuery !== initialQuery) {
          performSearch(searchQuery.trim())
        }
      }, 500) // 500ms 防抖，给用户更多时间输入

      return () => clearTimeout(timer)
    }
  }, [searchQuery, open, initialQuery])

  useEffect(() => {
    const container = listContainerRef.current
    if (!container) return

    const handleScroll = () => {
      if (!searchQuery.trim()) return
      if (!hasMore || loading || loadingMore) return

      const { scrollTop, clientHeight, scrollHeight } = container
      if (scrollTop + clientHeight >= scrollHeight - 80) {
        performSearch(searchQuery.trim(), page + 1)
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, loadingMore, page, performSearch, searchQuery])

  // 处理搜索输入变化
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
  }, [])

  // 清空搜索
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    setTotalCount(0)
    setHasMore(false)
    setPage(1)
    setLoading(false)
    setLoadingMore(false)
    loadingRef.current = false
    loadingMoreRef.current = false
    searchInputRef.current?.focus()
  }, [])

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent).isComposing) {
      e.preventDefault()
      // Enter 键直接触发搜索，但不关闭弹窗
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim())
      }
    } else if (e.key === 'Escape') {
      // 只有当用户明确想关闭弹窗时才调用 onClose
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='md'
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100vh' : '80vh',
          margin: isMobile ? 0 : '32px',
          pb: 1,
        },
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Stack direction='row' alignItems='center' sx={{ p: 2, pb: 1 }}>
          <OutlinedInput
            ref={searchInputRef}
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyDown={handleKeyDown}
            placeholder='输入任意内容，使用 AI 搜索'
            startAdornment={
              <InputAdornment position='start'>
                <SearchIcon sx={{ color: 'rgba(0,0,0,0.4)', mr: 1 }} />
              </InputAdornment>
            }
            endAdornment={
              <InputAdornment position='end'>
                {searchQuery && (
                  <IconButton
                    onClick={handleClearSearch}
                    size='small'
                    sx={{
                      color: 'rgba(0,0,0,0.4)',
                      mr: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.04)',
                      },
                    }}
                  >
                    <ClearIcon fontSize='small' />
                  </IconButton>
                )}
                <IconButton
                  onClick={onClose}
                  size='small'
                  sx={{
                    color: 'rgba(0,0,0,0.4)',
                    fontSize: '12px',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.04)',
                    },
                  }}
                >
                  Esc
                </IconButton>
              </InputAdornment>
            }
            sx={{
              flex: 1,
              height: 48,
              backgroundColor: '#fff',
              borderRadius: 1,
              // 去掉原生描边，避免与自定义边框叠加
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              fontSize: 16,
              border: '1px solid ',
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused': {
                borderColor: 'primary.main',
              },
              px: 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '& .MuiInputAdornment-root': {
                transition: 'all 0.3s ease',
              },
            }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, pt: 1, height: '60vh' }}>
        {/* 主要内容区域 - 左右两列布局 */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            // maxHeight: isMobile ? 'calc(100vh - 140px)' : '65vh',
            px: 2,
            py: 1,
            height: '100%',
          }}
        >
          {/* 左侧搜索结果区域（包含标题和列表）- 70% */}
          <Box
            sx={{
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0, // 防止 flex 子项溢出
              height: '100%',
            }}
          >
            {/* 搜索结果标题 - 固定在顶部 */}
            <Box sx={{ pb: 2, flexShrink: 0 }}>
              <Typography variant='body2' sx={{ color: 'rgba(0,0,0,0.6)', fontSize: 14 }}>
                共找到 {totalCount} 个结果
              </Typography>
            </Box>
            {/* 搜索结果列表 - 可滚动区域 */}
            <Box
              ref={listContainerRef}
              sx={{
                flex: 1,
                overflow: 'auto',
                scrollbarWidth: 'thin',
                minHeight: 0, // 确保可以收缩
              }}
            >
              {loading ? (
                <Stack alignItems='center' justifyContent='center' sx={{ py: 4 }}>
                  <Typography variant='body2' sx={{ color: 'rgba(0,0,0,0.6)' }}>
                    搜索中...
                  </Typography>
                </Stack>
              ) : searchResults.length === 0 ? (
                <Stack alignItems='center' justifyContent='center' sx={{ py: 6 }}>
                  {/* 空状态图标 */}
                  <Box sx={{ mb: 3 }}>
                    <Image
                      src='/empty.png'
                      alt='空状态'
                      width={250}
                      height={137}
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </Box>

                  {/* 提示文字 */}
                  <Typography
                    variant='body1'
                    sx={{
                      color: 'rgba(0,0,0,0.6)',
                      fontSize: 16,
                      mb: 3,
                      textAlign: 'center',
                    }}
                  >
                    未搜索到相关内容,您可以
                  </Typography>

                  {/* 操作按钮 */}
                  <Stack spacing={2} sx={{ width: '100%', maxWidth: 200 }}>
                    {[
                      {
                        label: '👉发帖提问',
                        onClick: () => onPublish(ModelDiscussionType.DiscussionTypeQA, searchQuery.trim()),
                      },
                      ...(isAdminRole(user.role || ModelUserRole.UserRoleUnknown)
                        ? [
                          {
                            label: '👉提交Issue',
                            onClick: () => onPublish(ModelDiscussionType.DiscussionTypeIssue, searchQuery.trim()),
                          },
                        ]
                        : []),
                      {
                        label: '👉发布文章',
                        onClick: () => onPublish(ModelDiscussionType.DiscussionTypeBlog, searchQuery.trim()),
                        variant: 'outlined' as const,
                      },
                    ].map((button, index) => (
                      <Button
                        key={index}
                        variant={'outlined'}
                        onClick={button.onClick}
                        sx={{
                          color: 'rgba(0,0,0,0.6)',
                          borderRadius: 2,
                          py: 1.5,
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        {button.label}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              ) : (
                <>
                  <Stack spacing={1}>
                    {searchResults.map((item, index) => (
                      <SearchDiscussCard
                        size='small'
                        key={item.id || index}
                        sx={{}}
                        data={item}
                        keywords={searchQuery}
                        showType={true}
                        onNavigate={onClose}
                      />
                    ))}
                    {loadingMore && (
                      <Stack alignItems='center' justifyContent='center' sx={{ py: 2 }}>
                        <Typography variant='body2' sx={{ color: 'rgba(0,0,0,0.6)' }}>
                          加载中...
                        </Typography>
                      </Stack>
                    )}
                    {!loading && !loadingMore && !hasMore && searchResults.length > 0 && (
                      <Typography
                        variant='body2'
                        sx={{ color: 'rgba(0,0,0,0.4)', textAlign: 'center', py: 1 }}
                      >
                        没有更多了
                      </Typography>
                    )}
                  </Stack>
                </>
              )}
            </Box>{' '}
            {/* 结束搜索结果列表的可滚动区域 */}
          </Box>{' '}
          {/* 结束左侧搜索结果区域 */}
          {/* 右侧智能总结面板 - 30% */}
          {!isMobile && (
            <AISummaryPanel
              searchResults={searchResults}
              searchQuery={searchQuery}
              visible={!loading && searchResults.length > 0}
            />
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SearchResultModal
