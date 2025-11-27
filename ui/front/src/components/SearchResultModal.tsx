'use client'
import { getDiscussion } from '@/api'
import { GetDiscussionParams, ModelDiscussionListItem } from '@/api/types'
import DiscussCard from '@/app/[route_name]/ui/discussCard'
import AISummaryPanel from './AISummaryPanel'
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
import ClearIcon from '@mui/icons-material/Clear'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForumStore } from '@/store'

interface SearchResultModalProps {
  open: boolean
  onClose: () => void
  initialQuery?: string
  onAsk?: () => void
  onFeedback?: () => void
  onArticle?: () => void
}

export const SearchResultModal = ({
  open,
  onClose,
  initialQuery = '',
  onAsk,
  onFeedback,
  onArticle,
}: SearchResultModalProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 从 store 获取 forumId
  const forumId = useForumStore((s) => s.selectedForumId)

  // 内部状态管理
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [searchResults, setSearchResults] = useState<ModelDiscussionListItem[]>([])
  const [loading, setLoading] = useState(false)

  // 当弹窗打开时，聚焦到搜索框并初始化查询
  useEffect(() => {
    if (open) {
      setSearchQuery(initialQuery)
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

  // 执行搜索的函数
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return

      setLoading(true)
      try {
        const params: GetDiscussionParams = {
          forum_id: forumId as any,
          keyword: query.trim(),
          stat: true,
        }

        const result = await getDiscussion(params)
        setSearchResults(result.items || [])
      } catch (error) {
        console.error('搜索失败:', error)
        setSearchResults([])
      } finally {
        setLoading(false)
      }
    },
    [forumId],
  )

  // 处理搜索输入变化
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
  }, [])

  // 清空搜索
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
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
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'transparent',
              },
              fontSize: 16,
              border: '1px solid ',
              borderColor: 'divider',
              px: 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                boxShadow: '0px 4px 12px 0px rgba(0,0,0,0.15), 0px 4px 12px 0px rgba(218,220,224,0.6)',
                transform: 'translateY(-2px)',
              },
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
                共找到 {searchResults.length} 个结果
              </Typography>
            </Box>
            {/* 搜索结果列表 - 可滚动区域 */}
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
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
                        onClick: onAsk,
                      },
                      // {
                      //   label: '👉提交反馈',
                      //   onClick: onFeedback,
                      // },
                      {
                        label: '👉发布文章',
                        onClick: onArticle,
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
                <Stack spacing={1}>
                  {searchResults.map((item, index) => (
                    <DiscussCard
                      key={item.id || index}
                      sx={{ border: '1px solid ', borderColor: 'divider', borderRadius: 1 }}
                      data={item}
                      keywords={searchQuery}
                      showType={true}
                      onNavigate={onClose}
                    />
                  ))}
                </Stack>
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
