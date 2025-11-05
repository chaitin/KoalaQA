'use client'
import { getDiscussion } from '@/api'
import { ModelDiscussionListItem, GetDiscussionParams } from '@/api/types'
import DiscussCard from '@/app/[route_name]/ui/discussCard'
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
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'

interface SearchResultModalProps {
  open: boolean
  onClose: () => void
  forumId?: number
  initialQuery?: string
  onAsk?: () => void
  onFeedback?: () => void
  onArticle?: () => void
}

export const SearchResultModal = ({
  open,
  onClose,
  forumId,
  initialQuery = '',
  onAsk,
  onFeedback,
  onArticle,
}: SearchResultModalProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const searchInputRef = useRef<HTMLInputElement>(null)
  
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

  // 执行搜索的函数
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) return
    
    setLoading(true)
    try {
      const params: GetDiscussionParams = {
        forum_id: forumId,
        keyword: query.trim(),
      }
      
      const result = await getDiscussion(params)
      setSearchResults(result.items || [])
    } catch (error) {
      console.error('搜索失败:', error)
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [forumId])

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      performSearch(searchQuery)
    } else if (e.key === 'Escape') {
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
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='输入任意内容，使用 AI 搜索'
            startAdornment={
              <InputAdornment position='start'>
                <SearchIcon sx={{ color: 'rgba(0,0,0,0.4)', mr: 1 }} />
              </InputAdornment>
            }
            endAdornment={
              <InputAdornment position='end'>
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
              '&.Mui-focused': {
                boxShadow: '0px 6px 20px 0px rgba(32,108,255,0.2), 0px 6px 20px 0px rgba(32,108,255,0.1)',
                transform: 'translateY(-2px) scale(1.02)',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#206CFF',
                  borderWidth: 2,
                },
              },
              '& .MuiInputAdornment-root': {
                transition: 'all 0.3s ease',
              },
              '&.Mui-focused .MuiInputAdornment-root': {
                transform: 'scale(1.1)',
                '& .MuiSvgIcon-root': {
                  color: '#206CFF',
                },
              },
            }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 0, pt: 1 }}>
        <Stack sx={{ px: 2, py: 1 }}>
          <Typography variant='body2' sx={{ color: 'rgba(0,0,0,0.6)', fontSize: 14 }}>
            共找到 {searchResults.length} 个结果
          </Typography>
        </Stack>
        <Box
          sx={{
            maxHeight: isMobile ? 'calc(100vh - 120px)' : '60vh',
            overflow: 'auto',
            px: 2,
            py: 1,
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
                      '&:hover': {
                        borderColor: '#206CFF',
                        color: '#206CFF',
                      },
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
                />
              ))}
            </Stack>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SearchResultModal
