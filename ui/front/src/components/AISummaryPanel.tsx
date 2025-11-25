'use client'
import { Box, Paper, Typography, LinearProgress, Stack, Chip } from '@mui/material'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import { ModelDiscussionListItem } from '@/api/types'
import { getCsrfToken } from '@/api/httpClient'
import { useCallback, useEffect, useState, useRef } from 'react'
import SSEClient from '@/utils/fetch'
import dayjs from 'dayjs'
import MarkDown from './markDown'
import EditorContent from './EditorContent'
import { Icon } from '@ctzhian/ui'

interface AISummaryPanelProps {
  searchResults: ModelDiscussionListItem[]
  searchQuery: string
  visible: boolean
}

export const AISummaryPanel = ({ searchResults, searchQuery, visible }: AISummaryPanelProps) => {
  const [summary, setSummary] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sseClientRef = useRef<any>(null)

  // 开始生成总结
  const startSummary = useCallback(
    async (retryCount: number = 0) => {
      if (!searchQuery.trim() || searchResults.length === 0) {
        return
      }
      setIsSummarizing(true)
      setSummary('')
      setError(null)

      try {
        // 提取搜索结果的 UUIDs
        const uuids = searchResults
          .map((item) => item.uuid)
          .filter((uuid): uuid is string => Boolean(uuid))
          .slice(0, 10) // 限制总结的讨论数量

        if (uuids.length === 0) {
          setError('无法获取讨论内容进行总结')
          setIsSummarizing(false)
          return
        }

        // 获取 CSRF token（重试时强制刷新token）
        const csrfToken = await getCsrfToken()

        // 创建 SSE 客户端进行 POST 请求（启用流式模式）
        const sseClient = new SSEClient<any>({
          url: '/api/discussion/summary',
          headers: {
            'X-CSRF-TOKEN': csrfToken,
          },
          method: 'POST',
          streamMode: true, // 启用流式模式，实时处理每个数据块
          onError: (error) => {
            console.error('SSE error:', error)

            // 检查是否是CSRF token错误，且重试次数未超过限制
            const isCsrfError =
              error.message.includes('csrf token mismatch') ||
              error.message.includes('403') ||
              error.message.includes('419')

            if (isCsrfError && retryCount < 1) {
              console.log('CSRF token error detected, retrying with fresh token...')
              // 清除缓存的token
              import('@/api/httpClient').then(({ clearCsrfTokenCache }) => {
                clearCsrfTokenCache()
              })

              // 延迟后重试
              setTimeout(() => {
                startSummary(retryCount + 1)
              }, 1000)
              return
            }

            setError('总结生成失败，请稍后重试')
            setIsSummarizing(false)
          },
          onComplete: () => {
            setIsSummarizing(false)
          },
        })

        sseClientRef.current = sseClient

        // 发送 POST 请求并订阅 SSE 流
        const requestBody = JSON.stringify({ uuids })
        sseClient.subscribe(requestBody, (data) => {
          // 检查是否是CSRF错误消息
          if (data.data === 'csrf token mismatch' || data === 'csrf token mismatch') {
            console.error('CSRF token mismatch detected in SSE data')
            if (retryCount < 1) {
              console.log('CSRF token error in SSE stream, retrying...')
              // 断开当前连接
              sseClient.unsubscribe()

              // 清除缓存的token并重试
              import('@/api/httpClient').then(({ clearCsrfTokenCache }) => {
                clearCsrfTokenCache()
              })

              setTimeout(() => {
                startSummary(retryCount + 1)
              }, 1000)
              return
            } else {
              setError('CSRF验证失败，请刷新页面重试')
              setIsSummarizing(false)
              return
            }
          }

          // 处理接收到的数据 - 简化逻辑

          // 提取文本内容
          let textToAdd = ''

          if (typeof data === 'string') {
            textToAdd = data
          } else if (data && typeof data === 'object') {
            // 尝试从常见字段中提取文本
            textToAdd =
              data.content || data.text || data.data || data.chunk || data.message || data.result || data.summary || ''
          }

          // 追加到总结中
          if (textToAdd) {
            setSummary((prev) => prev + textToAdd)
          }
        })
      } catch (err) {
        console.error('Failed to start SSE connection:', err)

        // 检查是否是CSRF相关错误
        const isCsrfError =
          err instanceof Error &&
          (err.message.includes('csrf') || err.message.includes('403') || err.message.includes('419'))

        if (isCsrfError && retryCount < 1) {
          console.log('CSRF error in request, retrying...')
          // 清除缓存的token
          import('@/api/httpClient').then(({ clearCsrfTokenCache }) => {
            clearCsrfTokenCache()
          })

          // 延迟后重试
          setTimeout(() => {
            startSummary(retryCount + 1)
          }, 1000)
          return
        }

        setError('总结生成失败，请稍后重试')
        setIsSummarizing(false)
      }
    },
    [searchQuery, searchResults],
  )

  // 清理资源
  useEffect(() => {
    return () => {
      // 清理 SSE 连接
      if (sseClientRef.current) {
        sseClientRef.current.unsubscribe()
        sseClientRef.current = null
      }
    }
  }, [])

  // 当搜索结果变化时，自动开始总结
  useEffect(() => {
    // 清理之前的 SSE 连接
    if (sseClientRef.current) {
      sseClientRef.current.unsubscribe()
      sseClientRef.current = null
    }

    if (visible && searchQuery.trim() && searchResults.length > 0) {
      // 延迟一点开始总结，让用户先看到搜索结果
      const timer = setTimeout(() => {
        startSummary()
      }, 1000)

      return () => clearTimeout(timer)
    } else if (!visible) {
      // 组件隐藏时清空状态并断开连接
      setSummary('')
      setError(null)
      setIsSummarizing(false)
      if (sseClientRef.current) {
        sseClientRef.current.unsubscribe()
        sseClientRef.current = null
      }
    }
  }, [visible, searchQuery, searchResults, startSummary])

  if (!visible) {
    return null
  }

  return (
    <Paper
      elevation={0}
      sx={{
        width: '30%',
        height: '100%',
        overflow:'auto',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        backgroundColor: 'grey.50',
        ml: 2,
      }}
    >
      {/* 头部 */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction='row' alignItems='center' spacing={1.5}>
          {isSummarizing ? (
            <img src='/search_loading.gif' alt='loading' style={{ width: 18, height: 18 }} />
          ) : (
            <Icon type='icon-xingxingzuhe' sx={{ fontSize: 14, color: 'primary.main' }} />
          )}
          <Stack>
            <Typography variant='h6' sx={{ fontSize: 16, fontWeight: 600, lineHeight: 1.2 }}>
              AI 智能总结
            </Typography>
          </Stack>
        </Stack>

        {/* 进度条 */}
        {isSummarizing && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: 'grey.200',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  animation: 'progress 2s ease-in-out infinite',
                  '@keyframes progress': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                  },
                },
              }}
            />
          </Box>
        )}
      </Box>

      {/* 内容区域 */}
      <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        {error ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 100,
              textAlign: 'center',
            }}
          >
            <Typography variant='body2' sx={{ color: 'error.main' }}>
              {error}
            </Typography>
          </Box>
        ) : summary ? (
          <Box>
            <EditorContent content={summary} />
            {/* 总结完成的标签 */}
            {!isSummarizing && summary && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  label='总结完成'
                  size='small'
                  sx={{
                    backgroundColor: 'success.light',
                    color: 'success.dark',
                    fontWeight: 500,
                    fontSize: 11,
                  }}
                />
              </Box>
            )}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 100,
              textAlign: 'center',
            }}
          >
            <Stack alignItems='center' spacing={1}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
              <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                正在分析搜索结果...
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>
    </Paper>
  )
}

export default AISummaryPanel
