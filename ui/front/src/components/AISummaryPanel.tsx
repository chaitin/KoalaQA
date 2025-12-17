'use client'
import { getCsrfToken } from '@/api/httpClient'
import { ModelDiscussionListItem } from '@/api/types'
import SSEClient from '@/utils/fetch'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import EditorContent from './EditorContent'

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
  const lastTokenRefreshRef = useRef<number>(0)
  const maxRetryCount = 3 // 增加重试次数
  const tokenRefreshInterval = 5 * 60 * 1000 // 5分钟刷新一次token

  // 获取新的CSRF token
  const getFreshCsrfToken = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    const shouldRefresh = forceRefresh || (now - lastTokenRefreshRef.current) > tokenRefreshInterval

    if (shouldRefresh) {
      console.log('Refreshing CSRF token...')
      // 清除缓存的token
      const { clearCsrfTokenCache } = await import('@/api/httpClient')
      clearCsrfTokenCache()
      lastTokenRefreshRef.current = now
    }

    return await getCsrfToken()
  }, [])

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
        const csrfToken = await getFreshCsrfToken(retryCount > 0)

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

            if (isCsrfError && retryCount < maxRetryCount) {
              console.log(`CSRF token error detected, retrying (${retryCount + 1}/${maxRetryCount})...`)
              // 延迟后重试，使用getFreshCsrfToken会自动刷新token
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
        const requestBody = JSON.stringify({ uuids, keyword: searchQuery })
        sseClient.subscribe(requestBody, (data) => {
          // 检查是否是CSRF错误消息
          if (data.data === 'csrf token mismatch' || data === 'csrf token mismatch') {
            console.error('CSRF token mismatch detected in SSE data')
            if (retryCount < maxRetryCount) {
              console.log(`CSRF token error in SSE stream, retrying (${retryCount + 1}/${maxRetryCount})...`)
              // 断开当前连接
              sseClient.unsubscribe()

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

        if (isCsrfError && retryCount < maxRetryCount) {
          console.log(`CSRF error in request, retrying (${retryCount + 1}/${maxRetryCount})...`)
          // 延迟后重试，使用getFreshCsrfToken会自动刷新token
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

  // 当组件重新获得可见性时，检查是否需要刷新token
  useEffect(() => {
    if (visible) {
      // 检查距离上次token刷新是否超过设定时间间隔
      const now = Date.now()
      if ((now - lastTokenRefreshRef.current) > tokenRefreshInterval) {
        console.log('Component visible after long time, refreshing CSRF token...')
        getFreshCsrfToken(true).catch(console.error)
      }
    }
  }, [visible, getFreshCsrfToken])

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
        flex: '0 0 32%',
        minWidth: 0,
        height: '100%',
        display: 'flex',
        pt: 0,
        flexDirection: 'column',
        borderRadius: 1,
        alignItems: 'stretch'
      }}
    >
      {/* 头部 - 固定高度 */}
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <Stack direction='row' alignItems='center' spacing={1.5}>
          <img
            src={isSummarizing ? '/ai-loading.gif' : '/ai_purple.png'}
            alt='loading'
            style={{ width: 18, height: 18, position: 'relative', top: '-2px' }}
          />
          <Typography
            variant='h6'
            sx={{
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.2,
              background: 'linear-gradient(180deg, #A76EFB 0%, #2070F9 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {isSummarizing ? '正在总结...' : 'AI 智能总结'}
          </Typography>
        </Stack>
      </Box>
      {/* 内容区域 - 撑满剩余空间，内部滚动 */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0, // 关键：允许flex子项收缩
          borderRadius: 1,
          border: '1px solid rgba(32, 112, 249, 0.5)',
          overflow: 'auto',
          scrollbarWidth: 'thin',
          height: '100%',
          p: 2,
          backgroundImage: 'linear-gradient( 180deg, rgba(32,112,249,0.04) 0%, rgba(167,110,251,0.04) 100%)',
        }}
      >
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
          <Box
            sx={{
              // 限制子元素的字体大小
              '& p': {
                fontSize: '12px !important',
                lineHeight: 1.6,
                margin: '8px 0',
              },
              '& h1': {
                fontSize: '18px !important',
                lineHeight: 1.4,
                margin: '12px 0 8px 0',
                fontWeight: 600,
              },
              '& h2': {
                fontSize: '16px !important',
                lineHeight: 1.4,
                margin: '10px 0 6px 0',
                fontWeight: 600,
              },
              '& h3': {
                fontSize: '15px !important',
                lineHeight: 1.4,
                margin: '8px 0 4px 0',
                fontWeight: 600,
              },
              '& h4, & h5, & h6': {
                fontSize: '14px !important',
                lineHeight: 1.4,
                margin: '6px 0 4px 0',
                fontWeight: 600,
              },
              '& ul, & ol': {
                margin: '8px 0',
                paddingLeft: '20px',
                fontSize: '14px',
              },
              '& li': {
                margin: '4px 0',
                fontSize: '12px',
              },
              '& blockquote': {
                margin: '8px 0',
                padding: '4px 12px',
                fontSize: '12px',
                fontStyle: 'italic',
              },
              '& code': {
                fontSize: '12px !important',
              },
              '& pre': {
                fontSize: '12px !important',
              },
              '& .tiptap.ProseMirror ol, & .tiptap.ProseMirror ul': {
                p: '0 0 0 24px',
              },
              '& .tiptap.ProseMirror ol li:before': {
                fontSize: '12px!important',
                left: '-18px!important'
              }
            }}
          >
            <EditorContent content={summary} />
            {/* 总结完成的标签 */}
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200,
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
      {!isSummarizing && summary && (
        <Typography
          color='rgba(33, 34, 45, 0.30)'
          sx={{ fontSize: '11px', marginTop: 1}}
        >
          本内容由 AI 基于搜索结果生成整理，如信息已过期或失效，可能不适用于当前情形，仅供参考。
        </Typography>
      )}
    </Paper>
  )
}

export default AISummaryPanel
