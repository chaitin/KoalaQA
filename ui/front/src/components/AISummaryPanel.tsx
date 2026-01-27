'use client'

import { ModelDiscussionListItem } from '@/api/types'
import SSEClient from '@/utils/fetch'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { useCallback, useEffect, useRef, useState } from 'react'
import EditorContent from './EditorContent'

interface AISummaryPanelProps {
  searchResults: ModelDiscussionListItem[]
  searchQuery: string
  visible: boolean
  // 控制是否触发自动总结（用于输入过程中禁用自动请求）
  shouldSummarize?: boolean
}

export const AISummaryPanel = ({
  searchResults,
  searchQuery,
  visible,
  shouldSummarize = true,
}: AISummaryPanelProps) => {
  const [summary, setSummary] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sseClientRef = useRef<any>(null)


  // 开始生成总结
  const startSummary = useCallback(
    async () => {
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



        // 创建 SSE 客户端进行 POST 请求（启用流式模式）
        const sseClient = new SSEClient<any>({
          url: '/api/discussion/summary',
          headers: {
          },
          method: 'POST',
          streamMode: true, // 启用流式模式，实时处理每个数据块
          onError: (error) => {
            console.error('SSE error:', error)



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
          // 处理 SSE 事件格式: { event: 'text', data: ... } 或 { event: 'end', data: true }
          if (data && typeof data === 'object' && (data as any).event) {
            const eventType = (data as any).event
            // 只处理 text 事件，跳过 end 等其他事件
            if (eventType !== 'text') {
              return
            }
            // 从 event 对象中提取实际数据
            data = (data as any).data
          }



          // 处理接收到的数据 - 简化逻辑

          // 提取文本内容
          let textToAdd = ''

          if (typeof data === 'string') {
            textToAdd = data
          } else if (data && typeof data === 'object') {
            // 跳过包含 event 字段的对象（这些是 SSE 事件，不是内容数据）
            if ((data as any).event) {
              return
            }
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

    if (visible && shouldSummarize && searchQuery.trim() && searchResults.length > 0) {
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
  }, [visible, shouldSummarize, searchQuery, searchResults, startSummary])

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
              fontSize: '12px !important',
            }}
          >
            <Typography variant='body2' sx={{ color: 'text.secondary', fontSize: '12px !important' }}>
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
          sx={{ fontSize: '11px', marginTop: 1 }}
        >
          本内容由 AI 基于搜索结果生成整理，如信息已过期或失效，可能不适用于当前情形，仅供参考。
        </Typography>
      )}
    </Paper>
  )
}

export default AISummaryPanel
