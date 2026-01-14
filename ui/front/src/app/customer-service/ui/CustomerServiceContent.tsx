'use client'

import { getBot, getDiscussionAskAskSessionId } from '@/api'
import { getCsrfToken } from '@/api/httpClient'
import { ModelDiscussionListItem, ModelUserInfo } from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import EditorContent from '@/components/EditorContent'
import { useForumStore } from '@/store'
import SSEClient from '@/utils/fetch'
import AddIcon from '@mui/icons-material/Add'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  alpha,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Fade,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  type?: 'ai' | 'search' // ai: AI知识库回答, search: 搜索帖子回答
  sources?: ModelDiscussionListItem[] // 引用帖子
  summary?: string // 智能总结
  needsForumSelection?: boolean // 是否需要选择板块
  pendingQuestion?: string // 待处理的问题
  showPostPrompt?: boolean // 是否显示发帖提示
  originalQuestion?: string // 原始问题，用于填充发帖表单
  forumId?: number // 板块ID，用于发帖
  timestamp?: string // 时间戳
}

interface CustomerServiceContentProps {
  initialUser: ModelUserInfo
}

export default function CustomerServiceContent({ initialUser }: CustomerServiceContentProps) {
  const { user } = useContext(AuthContext)
  const router = useRouter()
  const searchParams = useSearchParams()
  const theme = useTheme()
  const forumId = useForumStore((s) => s.selectedForumId)
  const forums = useForumStore((s) => s.forums)
  const [botName, setBotName] = useState('小智助手')
  const [botAvatar, setBotAvatar] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)

  // 生成 UUID 的工具函数
  const generateUuid = useCallback(() => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }, [])

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return '刚刚'
    if (diffMins < 60) return `${diffMins}分钟前`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`

    return date.toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 复制消息内容
  const handleCopyMessage = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }, [])

  // 记录初始 URL 中是否有 id（用于区分是否需要加载历史对话）
  const initialUrlIdRef = useRef<string | null>(searchParams.get('id'))

  const [sessionId, setSessionId] = useState(() => {
    // 从 URL 参数中获取 id
    const urlId = searchParams.get('id')
    if (urlId) {
      return urlId
    }
    return generateUuid()
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sseClientRef = useRef<SSEClient<any> | null>(null)
  const currentMessageRef = useRef<Message | null>(null)

  // 如果 URL 中没有 id 参数，添加生成的 sessionId 到 URL
  useEffect(() => {
    const urlId = searchParams.get('id')
    if (!urlId && sessionId) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('id', sessionId)
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
    }
  }, [sessionId, searchParams, router])

  // 检查登录状态
  useEffect(() => {
    if (!user?.uid) {
      router.push('/login')
    }
  }, [user, router])

  // 加载历史对话或初始化欢迎消息
  useEffect(() => {
    // 只有当 URL 原本就有 id 时才尝试加载历史对话（区分新会话和已有会话）
    const shouldLoadHistory = initialUrlIdRef.current !== null

    const loadHistory = async () => {
      console.log('加载历史对话检查:', {
        shouldLoadHistory,
        initialUrlId: initialUrlIdRef.current,
        hasUser: !!user?.uid,
        messagesLength: messages.length,
      })

      // 如果是原本就有 id 的 URL 且用户已登录，尝试加载历史对话
      if (shouldLoadHistory && initialUrlIdRef.current && user?.uid) {
        try {
          console.log('开始请求历史对话:', initialUrlIdRef.current)
          const response = await getDiscussionAskAskSessionId({ askSessionId: initialUrlIdRef.current })
          console.log('历史对话响应:', response)

          const historyItems = response.items || []
          console.log('历史对话数据:', historyItems)

          if (historyItems && historyItems.length > 0) {
            // 转换历史记录为 Message 格式
            const historyMessages: Message[] = historyItems.map((item, index) => ({
              id: item.id?.toString() || `history-${index}`,
              role: item.bot ? 'assistant' : 'user',
              content: item.content || '',
              type: item.bot ? 'ai' : undefined,
              timestamp: item.created_at
                ? typeof item.created_at === 'number'
                  ? new Date(item.created_at * 1000).toISOString()
                  : item.created_at
                : new Date().toISOString(),
            }))

            // 在历史消息开头添加欢迎消息
            const messagesWithWelcome: Message[] = [
              {
                id: 'welcome',
                role: 'assistant',
                content: `您好！我是${botName}，很高兴为您服务。有什么问题可以帮您？`,
                type: 'ai',
                timestamp: new Date().toISOString(),
              },
              ...historyMessages,
            ]

            console.log('转换后的历史消息（含欢迎语）:', messagesWithWelcome)
            setMessages(messagesWithWelcome)
            return // 成功加载历史记录
          } else {
            console.log('没有历史记录')
          }
        } catch (error) {
          console.error('加载历史对话失败:', error)
          // 加载失败，继续显示欢迎消息
        }
      }

      // 没有历史记录或加载失败，或者是新会话，显示默认欢迎消息
      if (messages.length === 0) {
        console.log('显示欢迎消息')
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `您好！我是${botName}，很高兴为您服务。有什么问题可以帮您？`,
            type: 'ai',
            timestamp: new Date().toISOString(),
          },
        ])
      }
    }

    // 只在用户信息加载完成后执行（或者不需要加载历史）
    if (user?.uid || !shouldLoadHistory) {
      loadHistory()
    }
  }, [user?.uid, botName])

  // 获取机器人信息
  useEffect(() => {
    const fetchBotInfo = async () => {
      try {
        const botData = await getBot()
        if (botData?.name) {
          setBotName(botData.name)
        }
        if (botData?.avatar) {
          setBotAvatar(botData.avatar)
        }
      } catch (error) {
        console.error('获取机器人信息失败:', error)
      }
    }
    fetchBotInfo()
  }, [])

  // 清理资源
  useEffect(() => {
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.unsubscribe()
        sseClientRef.current = null
      }
    }
  }, [])

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // 调用智能总结接口的公共函数
  const callSummaryContent = useCallback(
    async (forumId: number, question: string, messageId: string, originalQuestion?: string) => {
      try {
        const summaryCsrfToken = await getCsrfToken()

        const summarySseClient = new SSEClient<any>({
          url: '/api/discussion/summary/content',
          headers: {
            'X-CSRF-TOKEN': summaryCsrfToken,
          },
          method: 'POST',
          streamMode: true,
          onError: (err: Error) => {
            console.error('智能总结生成失败:', err)
            setIsLoading(false)
            setMessages((prev) => {
              const newMessages = [...prev]
              const index = newMessages.findIndex((m) => m.id === messageId)
              if (index !== -1) {
                newMessages[index] = {
                  ...newMessages[index],
                  content: '抱歉，搜索失败，请稍后重试。',
                }
              }
              return newMessages
            })
          },
          onComplete: () => {
            setIsLoading(false)
          },
        })

        sseClientRef.current = summarySseClient

        let summaryText = ''
        let searchResults: ModelDiscussionListItem[] = []

        const summaryRequestBody = JSON.stringify({
          content: question,
          forum_id: forumId,
          session_id: sessionId,
        })

        const thinkingPatterns = [/思考[:：]/, /推理[:：]/, /分析[:：]/, /让我想想/, /我需要/, /正在思考/]

        summarySseClient.subscribe(summaryRequestBody, (data) => {
          // 检测 no_disc 事件
          // SSE 事件格式: { event: 'no_disc', data: true }
          const isNoDiscEvent = (data && typeof data === 'object' && (data as any).event === 'no_disc') || data === true // 某些情况下 data 可能直接是 true

          if (isNoDiscEvent) {
            setMessages((prev) => {
              const newMessages = [...prev]
              const index = newMessages.findIndex((m) => m.id === messageId)
              if (index !== -1) {
                newMessages[index] = {
                  ...newMessages[index],
                  content: data.message || '抱歉，暂时没有找到相关帖子。',
                  type: 'search',
                  showPostPrompt: !!originalQuestion,
                  originalQuestion: originalQuestion,
                  forumId: forumId, // 保存板块ID
                }
              }
              return newMessages
            })
            setIsLoading(false)
            return
          }

          let textToAdd = ''
          if (typeof data === 'string') {
            try {
              const unquoted = data.replaceAll(/^"|"$/g, '')
              textToAdd = unquoted.replaceAll(/\\"/g, '"').replaceAll(/\\n/g, '\n')
            } catch {
              textToAdd = data
            }
          } else if (data && typeof data === 'object') {
            // 如果是带 event 字段的对象，从 data.data 中提取内容
            if ((data as any).event === 'text') {
              // event:text 类型，提取 data 字段
              const eventData = (data as any).data
              if (typeof eventData === 'string') {
                textToAdd = eventData
              } else if (eventData && typeof eventData === 'object') {
                textToAdd =
                  eventData.content ||
                  eventData.text ||
                  eventData.chunk ||
                  eventData.message ||
                  eventData.result ||
                  eventData.summary ||
                  ''
              }
            } else if (!(data as any).event) {
              // 没有 event 字段的普通对象
              textToAdd =
                data.content ||
                data.text ||
                (typeof (data as any).data === 'string' ? (data as any).data : '') ||
                data.chunk ||
                data.message ||
                data.result ||
                data.summary ||
                ''
            }
            // 其他 event 类型（如 end）已在 fetch.ts 中处理，这里不处理
          }

          if (textToAdd) {
            // 过滤思考过程
            const isThinkingLine = thinkingPatterns.some((pattern) => pattern.test(textToAdd))
            if (!isThinkingLine) {
              summaryText += textToAdd
              setMessages((prev) => {
                const newMessages = [...prev]
                const index = newMessages.findIndex((m) => m.id === messageId)
                if (index !== -1) {
                  newMessages[index] = {
                    ...newMessages[index],
                    content: summaryText,
                    type: 'search',
                    summary: summaryText,
                    sources: searchResults,
                  }
                }
                return newMessages
              })
            }
          }
        })
      } catch (err) {
        console.error('调用智能总结失败:', err)
        setIsLoading(false)
        setMessages((prev) => {
          const newMessages = [...prev]
          const index = newMessages.findIndex((m) => m.id === messageId)
          if (index !== -1) {
            newMessages[index] = {
              ...newMessages[index],
              content: '抱歉，搜索失败，请稍后重试。',
            }
          }
          return newMessages
        })
      }
    },
    [],
  )

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    const question = inputValue.trim()
    setInputValue('')
    setIsLoading(true)
    setIsWaiting(true)

    // 创建助手消息占位符
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      type: 'ai',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, assistantMessage])
    currentMessageRef.current = assistantMessage

    try {
      // 使用 postDiscussionAsk 进行流式输出
      const csrfToken = await getCsrfToken()

      // 构建请求体
      const requestBody = JSON.stringify({
        question: question,
        session_id: sessionId,
      })

      let answerText = ''
      const thinkingPatterns = [/思考[:：]/, /推理[:：]/, /分析[:：]/, /让我想想/, /我需要/, /正在思考/]

      // 使用 Promise 来等待流式输出完成
      const streamComplete = new Promise<void>((resolve, reject) => {
        // 创建 SSE 客户端，在回调中处理完成逻辑
        const askSseClient = new SSEClient<any>({
          url: '/api/discussion/ask',
          headers: {
            'X-CSRF-TOKEN': csrfToken,
          },
          method: 'POST',
          streamMode: true,
          onError: (err: Error) => {
            console.error('AI 回答生成失败:', err)
            setIsLoading(false)
            setIsWaiting(false)
            reject(err)
          },
          onComplete: () => {
            setIsWaiting(false)

            // 检查回答是否是"无法回答问题"
            const cannotAnswerPatterns = [/^无法回答问题$/, /^无法回答$/]

            const finalAnswer = answerText.trim()
            const cannotAnswer = cannotAnswerPatterns.some((pattern) => pattern.test(finalAnswer))

            if (cannotAnswer) {
              // 检查是否有多个板块
              const hasMultipleForums = forums && forums.length > 1

              if (hasMultipleForums) {
                // 提示选择板块
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const lastIndex = newMessages.length - 1
                  if (newMessages[lastIndex]?.role === 'assistant') {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: '抱歉，我暂时无法回答这个问题。请选择一个板块，我将为您搜索相关帖子。',
                      type: 'ai',
                      needsForumSelection: true,
                      pendingQuestion: question,
                    }
                  }
                  return newMessages
                })
                setIsLoading(false)
                resolve()
              } else {
                // 只有一个板块，直接调用智能总结
                const lastMessageId = currentMessageRef.current?.id
                // 如果没有 forumId，使用第一个（唯一的）板块
                const targetForumId = forumId ?? forums?.[0]?.id

                if (lastMessageId && targetForumId !== undefined && targetForumId !== null) {
                  // 更新消息为loading状态，不展示"无法回答"
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastIndex = newMessages.length - 1
                    if (newMessages[lastIndex]?.role === 'assistant') {
                      newMessages[lastIndex] = {
                        ...newMessages[lastIndex],
                        content: '正在为您搜索相关帖子...',
                        type: 'search',
                      }
                    }
                    return newMessages
                  })
                  
                  // 保持loading状态
                  setIsLoading(true)
                  
                  ;(async () => {
                    await callSummaryContent(targetForumId, question, lastMessageId, question)
                    resolve()
                  })()
                } else {
                  setIsLoading(false)
                  resolve()
                }
              }
            } else {
              setIsLoading(false)
              resolve()
            }
          },
        })

        sseClientRef.current = askSseClient

        askSseClient.subscribe(requestBody, (data) => {
          let textToAdd = ''
          if (typeof data === 'string') {
            // 处理 JSON 字符串化的内容（后端使用 fmt.Sprintf("%q", content)）
            try {
              // 移除引号
              const unquoted = data.replaceAll(/^"|"$/g, '')
              textToAdd = unquoted.replaceAll(/\\"/g, '"').replaceAll(/\\n/g, '\n')
            } catch {
              textToAdd = data
            }
          } else if (data && typeof data === 'object') {
            // 如果是带 event 字段的对象，从 data.data 中提取内容
            if ((data as any).event === 'text') {
              // event:text 类型，提取 data 字段
              const eventData = (data as any).data
              if (typeof eventData === 'string') {
                textToAdd = eventData
              } else if (eventData && typeof eventData === 'object') {
                textToAdd =
                  eventData.content || eventData.text || eventData.chunk || eventData.message || eventData.result || ''
              }
            } else if (!(data as any).event) {
              // 没有 event 字段的普通对象
              textToAdd = data.content || data.text || data.data || data.chunk || data.message || data.result || ''
            }
            // 其他 event 类型（如 end, no_disc）已在 fetch.ts 中处理，这里不处理
          }

          if (textToAdd) {
            // 检查是否是思考过程
            const isThinkingLine = thinkingPatterns.some((pattern) => pattern.test(textToAdd))

            // 只添加非思考过程的内容
            if (!isThinkingLine) {
              answerText += textToAdd

              setMessages((prev) => {
                const newMessages = [...prev]
                const lastIndex = newMessages.length - 1
                if (newMessages[lastIndex]?.role === 'assistant') {
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: answerText,
                    type: 'ai',
                  }
                }
                return newMessages
              })
            }
          }
        })
      })

      setIsWaiting(false)

      // 等待流式输出完成
      try {
        await streamComplete
      } catch (err) {
        console.error('流式输出错误:', err)
        return
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastIndex = newMessages.length - 1
        if (newMessages[lastIndex]?.role === 'assistant') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            content: '抱歉，服务暂时不可用，请稍后重试。',
            type: 'ai',
          }
        }
        return newMessages
      })
      setIsLoading(false)
      setIsWaiting(false)
      currentMessageRef.current = null
    }
  }, [inputValue, isLoading, forumId, forums, router, sessionId, callSummaryContent])

  // 处理回车发送
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 点击引用帖
  const handleSourceClick = (discussion: ModelDiscussionListItem) => {
    // ModelDiscussionListItem 可能没有 route_name，需要通过 forum_id 查找
    const forum = forums.find((f) => f.id === discussion.forum_id)
    const routePath = forum?.route_name ? `/${forum.route_name}/${discussion.id}` : `/${discussion.id}`
    window.open(routePath, '_blank')
  }

  // 处理跳转到发帖页面
  const handleGoToPost = (question: string, messageForumId?: number) => {
    // 优先使用消息中保存的 forumId，否则使用全局 forumId
    const targetForumId = messageForumId ?? forumId
    const forum = forums.find((f) => f.id === targetForumId)

    if (!forum?.route_name) {
      console.error('未找到板块信息:', { targetForumId, forums })
      return
    }

    // 构建发帖页面 URL，传递标题和类型参数
    const encodedTitle = encodeURIComponent(question)
    const postUrl = `/${forum.route_name}/edit?type=qa&title=${encodedTitle}`
    window.open(postUrl, '_blank')
  }

  // 处理板块选择
  const handleForumSelect = useCallback(
    async (selectedForumId: number, question: string, messageId: string) => {
      setIsLoading(true)

      // 更新消息，移除选择器
      setMessages((prev) => {
        const newMessages = [...prev]
        const index = newMessages.findIndex((m) => m.id === messageId)
        if (index !== -1) {
          newMessages[index] = {
            ...newMessages[index],
            needsForumSelection: false,
            content: '正在为您搜索相关帖子...',
          }
        }
        return newMessages
      })

      await callSummaryContent(selectedForumId, question, messageId, question)
    },
    [callSummaryContent],
  )

  // 处理新会话
  const handleNewSession = useCallback(() => {
    // 生成新的 session ID
    const newSessionId = generateUuid()
    setSessionId(newSessionId)

    // 标记为新会话（不应该加载历史对话）
    initialUrlIdRef.current = null

    // 清空消息，显示欢迎消息
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `您好！我是${botName}，很高兴为您服务。有什么问题可以帮您？`,
        type: 'ai',
        timestamp: new Date().toISOString(),
      },
    ])

    // 更新 URL
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('id', newSessionId)
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })

    // 清空输入框
    setInputValue('')
  }, [generateUuid, botName, router])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(to bottom, #f7f9fc 0%, #ffffff 100%)',
        position: 'relative',
      }}
    >
      {/* 顶部标题栏 - 现代化设计 */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          backdropFilter: 'blur(10px)',
          borderBottom: 'none',
          px: { xs: 2, sm: 4 },
          py: 2.5,
          boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Box
          sx={{ maxWidth: '900px', mx: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={botAvatar}
              sx={{
                bgcolor: 'rgba(255, 255, 255, 0.25)',
                color: 'white',
                width: 40,
                height: 40,
                fontSize: '1.1rem',
                fontWeight: 600,
                border: '2px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              {!botAvatar && botName[0]}
            </Avatar>
            <Box>
              <Typography variant='h6' sx={{ fontWeight: 700, color: 'white', fontSize: '1.1rem', lineHeight: 1.2 }}>
                {botName}
              </Typography>
              <Typography variant='caption' sx={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.75rem' }}>
                🟢 在线客服 · 随时为您服务
              </Typography>
            </Box>
          </Box>
          <Tooltip title='新会话' arrow>
            <IconButton
              onClick={handleNewSession}
              disabled={isLoading}
              sx={{
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.15)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.25)',
                },
                width: 36,
                height: 36,
              }}
            >
              <AddIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 对话内容区域 - 优化滚动和间距 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          px: { xs: 2, sm: 3 },
          py: 4,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '3px',
            '&:hover': {
              background: 'rgba(0, 0, 0, 0.3)',
            },
          },
        }}
      >
        <Stack spacing={3} sx={{ maxWidth: '900px', mx: 'auto' }}>
          {messages.map((message) => {
            return (
              <Fade in={true} key={message.id} timeout={400}>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                    gap: 0.5,
                  }}
                >
                  {/* 时间戳和操作按钮 */}
                  {/* <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: message.role === 'user' ? 0 : 6,
                      mb: 0.5,
                    }}
                  >
                    {message.role === 'assistant' && message.timestamp && (
                      <Typography variant='caption' sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                        {formatTime(message.timestamp)}
                      </Typography>
                    )}
                    {message.role === 'user' && message.timestamp && (
                      <Typography variant='caption' sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                        {formatTime(message.timestamp)}
                      </Typography>
                    )}
                  </Box> */}

                  <Box
                    sx={{
                      display: 'flex',
                      gap: 1.5,
                      alignItems: 'flex-start',
                      width: '100%',
                      flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    }}
                  >
                    {/* 头像 */}
                    {message.role === 'assistant' && (
                      <Avatar
                        src={botAvatar}
                        sx={{
                          background: botAvatar
                            ? 'transparent'
                            : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                          width: 36,
                          height: 36,
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                          flexShrink: 0,
                        }}
                      >
                        {!botAvatar && botName[0]}
                      </Avatar>
                    )}
                    {message.role === 'user' && (
                      <Avatar
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          width: 36,
                          height: 36,
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                          flexShrink: 0,
                        }}
                      >
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </Avatar>
                    )}

                    {/* 消息气泡 */}
                    <Box
                      sx={{
                        position: 'relative',
                        maxWidth: message.role === 'user' ? '70%' : '85%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          px: 2.5,
                          py: 2,
                          borderRadius: message.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          ...(message.role === 'user' && {
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            color: 'white',
                            boxShadow: `0 2px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
                          }),
                          ...(message.role === 'assistant' && {
                            bgcolor: 'white',
                            border: '1px solid',
                            borderColor: 'divider',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                          }),
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow:
                              message.role === 'user'
                                ? `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`
                                : '0 2px 8px rgba(0, 0, 0, 0.12)',
                          },
                          '& p': {
                            my: 0,
                            lineHeight: 1.7,
                          },
                          '& ul, & ol': {
                            my: 1,
                            pl: 2,
                          },
                          '& li': {
                            my: 0.5,
                          },
                          '& code': {
                            bgcolor: message.role === 'user' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                            px: 0.75,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontSize: '0.9em',
                          },
                        }}
                      >
                        {message.role === 'user' ? (
                          <Typography variant='body1' sx={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                            {message.content}
                          </Typography>
                        ) : (
                          <Box>
                            {message.content && (
                              <Box
                                sx={{
                                  mb: message.sources ? 2 : 0,
                                  fontSize: '0.95rem',
                                  '& > *:first-of-type': { mt: 0 },
                                  '& > *:last-child': { mb: 0 },
                                }}
                              >
                                <EditorContent content={message.content} />
                              </Box>
                            )}

                            {/* 等待提示 - 优化的加载状态 */}
                            {isWaiting && message.id === currentMessageRef.current?.id && (
                              <Box 
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 1.5, 
                                  py: 1.5,
                                  px: 2,
                                  borderRadius: 2,
                                  bgcolor: alpha(theme.palette.grey[500], 0.08),
                                }}
                              >
                                <CircularProgress size={18} thickness={4} sx={{ color: 'text.secondary' }} />
                                <Typography variant='body2' sx={{ color: 'text.secondary', fontSize: '0.9rem' }}>
                                  正在查找相关信息...
                                </Typography>
                              </Box>
                            )}

                            {/* 板块选择器 - 优化样式 */}
                            {message.needsForumSelection && message.pendingQuestion && forums && forums.length > 1 && (
                              <Box sx={{ mt: 2 }}>
                                <Typography
                                  variant='subtitle2'
                                  sx={{ mb: 1.5, fontWeight: 600, color: 'text.primary' }}
                                >
                                  请选择板块继续搜索
                                </Typography>
                                <Stack direction='row' spacing={1} flexWrap='wrap' sx={{ gap: 1 }}>
                                  {forums.map((forum) => {
                                    if (!forum.id) return null
                                    return (
                                      <Button
                                        key={forum.id}
                                        variant='outlined'
                                        size='medium'
                                        onClick={() =>
                                          handleForumSelect(forum.id!, message.pendingQuestion!, message.id)
                                        }
                                        disabled={isLoading}
                                        sx={{
                                          textTransform: 'none',
                                          borderRadius: 2,
                                          px: 2,
                                          py: 1,
                                          borderColor: 'divider',
                                          '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                                          },
                                          fontWeight: 500,
                                        }}
                                      >
                                        {forum.name}
                                      </Button>
                                    )
                                  })}
                                </Stack>
                              </Box>
                            )}

                            {/* 引用帖子 - 卡片式设计 */}
                            {message.type === 'search' && message.sources && message.sources.length > 0 && (
                              <Box sx={{ mt: 2 }}>
                                <Divider sx={{ my: 2 }} />
                                <Typography
                                  variant='subtitle2'
                                  sx={{ mb: 1.5, fontWeight: 600, color: 'text.secondary', fontSize: '0.85rem' }}
                                >
                                  📚 相关帖子推荐
                                </Typography>
                                <Stack spacing={1.5}>
                                  {message.sources.map((source, idx) => (
                                    <Paper
                                      key={source.id}
                                      elevation={0}
                                      onClick={() => handleSourceClick(source)}
                                      sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        bgcolor: 'background.paper',
                                        '&:hover': {
                                          borderColor: 'primary.main',
                                          bgcolor: alpha(theme.palette.primary.main, 0.03),
                                          transform: 'translateX(4px)',
                                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                        },
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                        <Box
                                          sx={{
                                            minWidth: 24,
                                            height: 24,
                                            borderRadius: 1,
                                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                                            color: 'primary.main',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                          }}
                                        >
                                          {idx + 1}
                                        </Box>
                                        <Typography
                                          variant='body2'
                                          sx={{
                                            flex: 1,
                                            fontWeight: 500,
                                            color: 'text.primary',
                                            lineHeight: 1.5,
                                            fontSize: '0.9rem',
                                          }}
                                        >
                                          {source.title}
                                        </Typography>
                                      </Box>
                                    </Paper>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                            {/* 发帖提示 - 优化样式 */}
                            {message.showPostPrompt && message.originalQuestion && (
                              <Box
                                sx={{
                                  mt: 2,
                                  p: 2.5,
                                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.primary.dark, 0.05)} 100%)`,
                                  borderRadius: 2,
                                  border: '1px solid',
                                  borderColor: alpha(theme.palette.primary.main, 0.2),
                                }}
                              >
                                <Typography variant='body2' sx={{ mb: 1.5, color: 'text.secondary', lineHeight: 1.6 }}>
                                  💡 如未解决问题，可前往社区发帖补充详细信息寻求帮助
                                </Typography>
                                <Button
                                  variant='contained'
                                  size='medium'
                                  onClick={() => handleGoToPost(message.originalQuestion!, message.forumId)}
                                  sx={{
                                    mt: 0.5,
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    '&:hover': {
                                      boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                                    },
                                    fontWeight: 600,
                                  }}
                                >
                                  前往社区发帖
                                </Button>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Paper>

                      {/* 消息操作按钮 - 只对助手消息显示 */}
                      {message.role === 'assistant' && message.content && !isWaiting && (
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 0.5,
                            mt: 0.5,
                            opacity: 0,
                            transition: 'opacity 0.2s',
                            '&:hover': { opacity: 1 },
                            '.MuiBox-root:hover &': { opacity: 1 },
                          }}
                        >
                          <Tooltip title={copiedMessageId === message.id ? '已复制' : '复制'} arrow>
                            <IconButton
                              size='small'
                              onClick={() => handleCopyMessage(message.content, message.id)}
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                  borderColor: 'primary.main',
                                },
                              }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Fade>
            )
          })}

          <div ref={messagesEndRef} />
        </Stack>
      </Box>

      {/* 底部输入区域 - 现代化设计 */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          px: { xs: 2, sm: 3 },
          py: 2.5,
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
          <Stack direction='row' spacing={1.5} alignItems='flex-end'>
            <Box
              sx={{
                flex: 1,
                position: 'relative',
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '2px solid',
                borderColor: inputValue.trim() ? 'primary.main' : 'divider',
                transition: 'all 0.2s ease',
                '&:focus-within': {
                  borderColor: 'primary.main',
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder='请输入人问题描述你的问题...'
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                variant='standard'
                slotProps={{
                  input: {
                    disableUnderline: true,
                    sx: {
                      px: 2.5,
                      py: 1.5,
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                    },
                  },
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    '&::placeholder': {
                      color: 'text.disabled',
                      opacity: 0.7,
                    },
                  },
                }}
              />
              {/* 快捷键提示 */}
              {!inputValue && (
                <Typography
                  variant='caption'
                  sx={{
                    position: 'absolute',
                    right: 12,
                    bottom: 10,
                    color: 'text.disabled',
                    fontSize: '0.7rem',
                    pointerEvents: 'none',
                  }}
                >
                  Enter 发送
                </Typography>
              )}
            </Box>
            <Tooltip title='发送消息' arrow>
              <span>
                <IconButton
                  color='primary'
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  sx={{
                    width: 44,
                    height: 44,
                    background:
                      inputValue.trim() && !isLoading
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                        : 'transparent',
                    color: inputValue.trim() && !isLoading ? 'white' : 'action.disabled',
                    border: '2px solid',
                    borderColor: inputValue.trim() && !isLoading ? 'transparent' : 'divider',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background:
                        inputValue.trim() && !isLoading
                          ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.dark} 100%)`
                          : 'action.hover',
                      transform: inputValue.trim() && !isLoading ? 'scale(1.05)' : 'none',
                      boxShadow:
                        inputValue.trim() && !isLoading
                          ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`
                          : 'none',
                    },
                    '&:disabled': {
                      bgcolor: 'action.disabledBackground',
                      color: 'action.disabled',
                      border: '2px solid',
                      borderColor: 'divider',
                    },
                  }}
                >
                  {isLoading ? <CircularProgress size={20} sx={{ color: 'inherit' }} /> : <ArrowUpwardIcon />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
          {/* 底部提示文字 */}
          <Typography
            variant='caption'
            sx={{
              display: 'block',
              textAlign: 'center',
              color: 'text.disabled',
              mt: 1.5,
              fontSize: '0.7rem',
            }}
          >
            {botName} 由 AI 驱动，可能会出错。请核实重要信息。
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
