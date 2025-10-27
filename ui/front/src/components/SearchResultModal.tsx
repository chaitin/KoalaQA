'use client'
import { ModelDiscussionListItem } from '@/api/types'
import DiscussCard, { DiscussCardMobile } from '@/app/[route_name]/ui/discussCard'
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
import { Fragment, useEffect, useRef } from 'react'

interface SearchResultModalProps {
  open: boolean
  onClose: () => void
  searchQuery: string
  searchResults: ModelDiscussionListItem[]
  loading?: boolean
  onSearchChange?: (query: string) => void
  onSearch?: (query: string) => void
  onAsk?: () => void
  onFeedback?: () => void
  onArticle?: () => void
}

export const SearchResultModal = ({
  open,
  onClose,
  searchQuery,
  searchResults,
  loading = false,
  onSearchChange,
  onSearch,
  onAsk,
  onFeedback,
  onArticle,
}: SearchResultModalProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 当弹窗打开时，聚焦到搜索框
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSearch?.(searchQuery)
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
            onChange={(e) => onSearchChange?.(e.target.value)}
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
                  {
                    label: '👉提交反馈',
                    onClick: onFeedback,
                  },
                  {
                    label: '👉发布文章',
                    onClick: onArticle,
                    variant: 'outlined' as const,
                    disabled: true,
                  },
                ].map((button, index) => (
                  <Button
                    key={index}
                    variant={'outlined'}
                    onClick={button.onClick}
                    disabled={button.disabled}
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
                <Fragment key={item.id || index}>
                  {isMobile ? (
                    <DiscussCardMobile
                      sx={{ border: '1px solid ', borderColor: 'divider', borderRadius: 1 }}
                      data={item}
                      keywords={searchQuery}
                      showType={true}
                    />
                  ) : (
                    <DiscussCard
                      sx={{ border: '1px solid ', borderColor: 'divider', borderRadius: 1 }}
                      data={item}
                      keywords={searchQuery}
                      showType={true}
                    />
                  )}
                </Fragment>
              ))}
            </Stack>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SearchResultModal
