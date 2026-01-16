'use client'

import { getDiscussionAskAskSessionId, getDiscussionAskSession } from '@/api'
import { getCsrfToken } from '@/api/httpClient'
import { ModelDiscussionListItem, ModelUserInfo, SvcBotGetRes } from '@/api/types'
import { getSystemWebPlugin } from '@/api/WebPlugin'
import { AuthContext } from '@/components/authProvider'
import EditorContent from '@/components/EditorContent'
import UserAvatar from '@/components/UserAvatar'
import Alert from '@/components/alert'
import { useForumStore } from '@/store'
import SSEClient from '@/utils/fetch'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import SendIcon from '@mui/icons-material/Send'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
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
import { Icon } from '@ctzhian/ui'

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
  quickActions?: string[] // 快速操作按钮
}

interface CustomerServiceContentProps {
  initialUser: ModelUserInfo
  botData?: SvcBotGetRes | null
  initialSessionId?: string | null
}

export default function CustomerServiceContent({
  initialUser,
  botData,
  initialSessionId,
}: CustomerServiceContentProps) {
  const { user } = useContext(AuthContext)
  const router = useRouter()
  const searchParams = useSearchParams()
  const theme = useTheme()
  const displayUser = user?.uid ? user : initialUser
  const userInitial = displayUser?.username?.[0]?.toUpperCase() || 'U'
  const forumId = useForumStore((s) => s.selectedForumId)
  const forums = useForumStore((s) => s.forums)
  const [botName, setBotName] = useState(botData?.name || '小智助手')
  const [botAvatar, setBotAvatar] = useState<string>(botData?.avatar || '')
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isServiceEnabled, setIsServiceEnabled] = useState<boolean | null>(null) // null表示正在加载
  const [commonQuestions, setCommonQuestions] = useState<string[]>([
    '管理员密码忘了怎么办?',
    '如何配置 SSO 登录',
    '如何配置在线客服来使用智能问答',
    '如何写文章',
    '如何创建新文档',
    '如何编辑功能',
  ])

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
    // 优先使用服务器端传入的 sessionId
    if (initialSessionId) {
      return initialSessionId
    }
    // 从 URL 参数中获取 id
    const urlId = searchParams.get('id')
    if (urlId) {
      return urlId
    }
    // 如果都没有，生成新的 UUID（这种情况不应该发生）
    return generateUuid()
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sseClientRef = useRef<SSEClient<any> | null>(null)
  const currentMessageRef = useRef<Message | null>(null)

  // 如果 URL 中没有 id 参数，添加 sessionId 到 URL
  useEffect(() => {
    const urlId = searchParams.get('id')
    if (urlId !== sessionId && sessionId) {
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

  // 用于标记是否已经加载过历史对话，避免重复加载
  const historyLoadedRef = useRef<string | null>(null)

  // 当 sessionId 变化时，加载历史对话
  useEffect(() => {
    // 使用 initialUser 或 user 来检查用户ID，确保在服务端渲染时也能正确加载
    const currentUserId = user?.uid || initialUser?.uid
    if (!sessionId || !currentUserId) {
      return
    }

    // 如果已经加载过这个 sessionId 的历史对话，不再重复加载
    if (historyLoadedRef.current === sessionId) {
      return
    }

    // 如果 URL 中没有 id 参数，说明是新访问的页面（从 header 点击进入），应该加载历史对话
    // 如果 URL 中有 id 参数，且与 sessionId 相同，说明是直接访问某个会话，也应该加载历史对话
    const urlId = searchParams.get('id')
    const shouldLoadHistory = !urlId || urlId === sessionId

    if (!shouldLoadHistory) {
      return
    }

    const loadHistory = async () => {
      try {
        const response = await getDiscussionAskAskSessionId({ askSessionId: sessionId })

        const historyItems = response.items || []

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

          setMessages(historyMessages)
        } else {
          // 没有历史记录，清空消息
          setMessages([])
        }

        // 标记已加载
        historyLoadedRef.current = sessionId
      } catch (error) {
        console.error('加载历史对话失败:', error)
        // 加载失败，清空消息
        setMessages([])
        // 即使加载失败，也标记为已尝试加载，避免重复请求
        historyLoadedRef.current = sessionId
      }
    }

    loadHistory()
  }, [sessionId, user?.uid, initialUser?.uid, searchParams])

  // 检查智能客服是否开启
  useEffect(() => {
    const checkServiceEnabled = async () => {
      try {
        const response = await getSystemWebPlugin()
        const isEnabled = response?.display !== false
        setIsServiceEnabled(isEnabled)
      } catch (error) {
        console.error('获取智能客服配置失败:', error)
        // 默认允许访问，避免因网络问题阻止用户
        setIsServiceEnabled(true)
      }
    }
    checkServiceEnabled()
  }, [])

  // 从 props 更新机器人信息（如果服务端获取到了）
  useEffect(() => {
    if (botData?.name) {
      setBotName(botData.name)
    }
    if (botData?.avatar) {
      setBotAvatar(botData.avatar)
    }
  }, [botData])

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
            const errorMessage = err.message || err.toString()

            // 检查是否是 session closed 错误
            if (errorMessage.toLowerCase().includes('session closed')) {
              Alert.info('会话已过期，请点击右上角开启新会话', 5000)
              setIsLoading(false)
              setMessages((prev) => {
                const newMessages = [...prev]
                const index = newMessages.findIndex((m) => m.id === messageId)
                if (index !== -1) {
                  newMessages[index] = {
                    ...newMessages[index],
                    content: '会话已过期，请点击右上角开启新会话。',
                  }
                }
                return newMessages
              })
              return
            }

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
          // 检测 session closed 错误
          let dataStr = ''
          if (typeof data === 'string') {
            dataStr = data
          } else if (data && typeof data === 'object') {
            dataStr = JSON.stringify(data)
          }

          if (dataStr.toLowerCase().includes('session closed')) {
            Alert.info('会话已过期，请点击右上角开启新会话', 5000)
            setIsLoading(false)
            setMessages((prev) => {
              const newMessages = [...prev]
              const index = newMessages.findIndex((m) => m.id === messageId)
              if (index !== -1) {
                newMessages[index] = {
                  ...newMessages[index],
                  content: '会话已过期，请点击右上角开启新会话。',
                }
              }
              return newMessages
            })
            return
          }

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
        const errorMessage = err instanceof Error ? err.message : String(err)

        // 检查是否是 session closed 错误
        if (errorMessage.toLowerCase().includes('session closed')) {
          Alert.info('会话已过期，请点击右上角开启新会话', 5000)
          setIsLoading(false)
          setMessages((prev) => {
            const newMessages = [...prev]
            const index = newMessages.findIndex((m) => m.id === messageId)
            if (index !== -1) {
              newMessages[index] = {
                ...newMessages[index],
                content: '会话已过期，请点击右上角开启新会话。',
              }
            }
            return newMessages
          })
          return
        }

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
    // 保存消息 ID 到闭包中，确保后续使用正确的 ID
    const assistantMessageId = assistantMessage.id
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
            const errorMessage = err.message || err.toString()

            // 检查是否是 session closed 错误
            if (errorMessage.toLowerCase().includes('session closed')) {
              Alert.info('会话已过期，请点击右上角开启新会话', 5000)
              setIsLoading(false)
              setIsWaiting(false)
              setMessages((prev) => {
                const newMessages = [...prev]
                const index = newMessages.findIndex((m) => m.id === assistantMessageId)
                if (index !== -1) {
                  newMessages[index] = {
                    ...newMessages[index],
                    content: '会话已过期，请点击右上角开启新会话。',
                  }
                }
                return newMessages
              })
              resolve() // 使用 resolve 而不是 reject，避免触发 catch
              return
            }

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
                // 提示选择板块 - 使用消息 ID 而不是索引
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const index = newMessages.findIndex((m) => m.id === assistantMessageId)
                  if (index !== -1) {
                    newMessages[index] = {
                      ...newMessages[index],
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
                // 使用闭包中保存的 assistantMessageId，而不是从 ref 获取
                // 如果没有 forumId，使用第一个（唯一的）板块
                const targetForumId = forumId ?? forums?.[0]?.id

                if (assistantMessageId && targetForumId !== undefined && targetForumId !== null) {
                  // 更新消息为loading状态，不展示"无法回答" - 使用消息 ID 而不是索引
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    const index = newMessages.findIndex((m) => m.id === assistantMessageId)
                    if (index !== -1) {
                      newMessages[index] = {
                        ...newMessages[index],
                        content: '正在为您搜索相关帖子...',
                        type: 'search',
                      }
                    }
                    return newMessages
                  })

                  // 保持loading状态
                  setIsLoading(true)
                    ; (async () => {
                      await callSummaryContent(targetForumId, question, assistantMessageId, question)
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
          // 检测 session closed 错误
          let dataStr = ''
          if (typeof data === 'string') {
            dataStr = data
          } else if (data && typeof data === 'object') {
            dataStr = JSON.stringify(data)
          }

          if (dataStr.toLowerCase().includes('session closed')) {
            Alert.info('会话已过期，请点击右上角开启新会话', 5000)
            setIsLoading(false)
            setIsWaiting(false)
            setMessages((prev) => {
              const newMessages = [...prev]
              const index = newMessages.findIndex((m) => m.id === assistantMessageId)
              if (index !== -1) {
                newMessages[index] = {
                  ...newMessages[index],
                  content: '会话已过期，请点击右上角开启新会话。',
                }
              }
              return newMessages
            })
            // 停止处理后续数据
            askSseClient.unsubscribe()
            resolve()
            return
          }

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

              // 使用消息 ID 而不是索引，确保即使消息数组发生变化也能正确更新
              setMessages((prev) => {
                const newMessages = [...prev]
                const index = newMessages.findIndex((m) => m.id === assistantMessageId)
                if (index !== -1) {
                  // 从回答中提取可能的快速操作按钮（简单示例：提取标题或关键词）
                  const quickActions: string[] = []
                  // 如果回答包含"如何"开头的内容，可以提取作为快速操作
                  const howToMatches = answerText.match(/如何[^。，\n]{2,10}/g)
                  if (howToMatches && howToMatches.length > 0) {
                    quickActions.push(...howToMatches.slice(0, 2))
                  }

                  newMessages[index] = {
                    ...newMessages[index],
                    content: answerText,
                    type: 'ai',
                    quickActions: quickActions.length > 0 ? quickActions : undefined,
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
        const errorMessage = err instanceof Error ? err.message : String(err)

        // 检查是否是 session closed 错误
        if (errorMessage.toLowerCase().includes('session closed')) {
          Alert.info('会话已过期，请点击右上角开启新会话', 5000)
          setMessages((prev) => {
            const newMessages = [...prev]
            const index = newMessages.findIndex((m) => m.id === assistantMessageId)
            if (index !== -1) {
              newMessages[index] = {
                ...newMessages[index],
                content: '会话已过期，请点击右上角开启新会话。',
              }
            }
            return newMessages
          })
        }
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
  const handleNewSession = useCallback(async () => {
    try {
      // 调用接口创建新会话
      const response = await getDiscussionAskSession({ force_create: true })
      const newSessionId = response

      if (newSessionId) {
        setSessionId(newSessionId)

        // 标记为新会话（不应该加载历史对话）
        initialUrlIdRef.current = null

        // 重置历史加载标记，以便新会话可以加载历史（如果有的话）
        historyLoadedRef.current = null

        // 清空消息
        setMessages([])

        // 更新 URL
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set('id', newSessionId)
        router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })

        // 清空输入框
        setInputValue('')
      }
    } catch (error) {
      console.error('创建新会话失败:', error)
    }
  }, [router])

  // 刷新常见问题
  const handleRefreshQuestions = useCallback(() => {
    // 随机打乱常见问题列表
    const shuffled = [...commonQuestions].sort(() => Math.random() - 0.5)
    setCommonQuestions(shuffled)
  }, [commonQuestions])

  // 处理快速操作按钮点击
  const handleQuickAction = useCallback(
    (action: string) => {
      // 直接使用 action 作为问题发送
      if (!action.trim() || isLoading) return

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: action.trim(),
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])
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
      const assistantMessageId = assistantMessage.id
      setMessages((prev) => [...prev, assistantMessage])
      currentMessageRef.current = assistantMessage

        // 调用发送逻辑（复用 handleSend 的核心逻辑）
        ; (async () => {
          try {
            const csrfToken = await getCsrfToken()
            const requestBody = JSON.stringify({
              question: action.trim(),
              session_id: sessionId,
            })

            let answerText = ''
            const thinkingPatterns = [/思考[:：]/, /推理[:：]/, /分析[:：]/, /让我想想/, /我需要/, /正在思考/]

            const streamComplete = new Promise<void>((resolve, reject) => {
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
                  setIsLoading(false)
                  resolve()
                },
              })

              sseClientRef.current = askSseClient

              askSseClient.subscribe(requestBody, (data) => {
                let textToAdd = ''
                if (typeof data === 'string') {
                  try {
                    const unquoted = data.replaceAll(/^"|"$/g, '')
                    textToAdd = unquoted.replaceAll(/\\"/g, '"').replaceAll(/\\n/g, '\n')
                  } catch {
                    textToAdd = data
                  }
                } else if (data && typeof data === 'object') {
                  if ((data as any).event === 'text') {
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
                        ''
                    }
                  } else if (!(data as any).event) {
                    textToAdd = data.content || data.text || data.data || data.chunk || data.message || data.result || ''
                  }
                }

                if (textToAdd) {
                  const isThinkingLine = thinkingPatterns.some((pattern) => pattern.test(textToAdd))
                  if (!isThinkingLine) {
                    answerText += textToAdd
                    setMessages((prev) => {
                      const newMessages = [...prev]
                      const index = newMessages.findIndex((m) => m.id === assistantMessageId)
                      if (index !== -1) {
                        const howToMatches = answerText.match(/如何[^。，\n]{2,10}/g)
                        const quickActions: string[] =
                          howToMatches && howToMatches.length > 0 ? howToMatches.slice(0, 2) : []
                        newMessages[index] = {
                          ...newMessages[index],
                          content: answerText,
                          type: 'ai',
                          quickActions: quickActions.length > 0 ? quickActions : undefined,
                        }
                      }
                      return newMessages
                    })
                  }
                }
              })
            })

            await streamComplete
          } catch (error) {
            console.error('发送消息失败:', error)
            setIsLoading(false)
            setIsWaiting(false)
          }
        })()
    },
    [isLoading, sessionId],
  )

  // 处理常见问题点击
  const handleCommonQuestionClick = useCallback((question: string) => {
    setInputValue(question)
  }, [])

  // 如果正在检查服务状态，显示加载状态
  if (isServiceEnabled === null) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: 'linear-gradient(to bottom, #f7f9fc 0%, #ffffff 100%)',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  // 如果服务未开启，显示提示信息
  if (isServiceEnabled === false) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          background: 'linear-gradient(to bottom, #f7f9fc 0%, #ffffff 100%)',
          px: 3,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 500,
            p: 4,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            background: 'white',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 32, color: 'warning.main' }} />
          </Box>
          <Typography variant='h6' sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
            智能客服暂未开启
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            管理员未开启智能客服功能，请联系管理员后重试
          </Typography>
        </Paper>
      </Box>
    )
  }

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
      {/* 对话内容区域 - 优化滚动和间距 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          py: 4,
          width: '800px',
          mx: 'auto',
          maxWidth: '100%',
          // 隐藏滚动条但保持滚动功能
          '&::-webkit-scrollbar': {
            display: 'none',
            width: 0,
            height: 0,
          },
          // Firefox
          scrollbarWidth: 'none' as any,
          // IE and Edge
          msOverflowStyle: 'none' as any,
        }}
      >
        <Stack spacing={3}>
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
                  {message.role === 'assistant' ? (
                    /* 机器人消息布局：第一行头像+名字，第二行内容 */
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        width: '100%',
                      }}
                    >
                      {/* 第一行：头像 + 机器人名字 */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Avatar
                          src={botAvatar}
                          sx={{
                            background: botAvatar
                              ? 'transparent'
                              : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            width: 40,
                            height: 40,
                            fontWeight: 600,
                            boxShadow: 'none',
                            flexShrink: 0,
                          }}
                        >
                          {!botAvatar && botName[0]}
                        </Avatar>
                        <Typography
                          variant='body2'
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            fontSize: '16px',
                          }}
                        >
                          {botName}
                        </Typography>
                      </Box>

                      {/* 第二行：消息内容 */}
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          alignItems: 'flex-start',
                          pl: 5, // 左边距对齐到内容区域
                        }}
                      >
                        {/* 消息气泡和快速操作按钮容器 */}
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            alignItems: 'flex-start',
                            flex: 1,
                            maxWidth: 'calc(100% - 40px)',
                          }}
                        >
                          {/* 消息气泡 */}
                          <Box
                            sx={{
                              position: 'relative',
                              maxWidth: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                            }}
                          >
                            <Paper
                              elevation={0}
                              sx={{
                                px: 2.5,
                                py: 1.5,
                                boxShadow: 'none',
                                borderRadius: 1,
                                bgcolor: 'white',
                                border: '1px solid',
                                borderColor: 'divider',
                                transition: 'all 0.2s ease',
                                fontSize: '14px',
                                '&:hover': {
                                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
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
                                  bgcolor: 'rgba(0, 0, 0, 0.05)',
                                  px: 0.75,
                                  py: 0.25,
                                  borderRadius: 0.5,
                                },
                              }}
                            >
                              {message.role === 'assistant' ? (
                                <Box>
                                  {message.content && (
                                    <Box
                                      sx={{
                                        mb: message.sources ? 2 : 0,
                                        '& > *:first-of-type': { mt: 0 },
                                        '& > *:last-child': { mb: 0 },
                                        '& p': {
                                          fontSize: '14px',
                                        },
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
                                        borderRadius: 1,
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
                                  {message.needsForumSelection &&
                                    message.pendingQuestion &&
                                    forums &&
                                    forums.length > 1 && (
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
                                  {/* {message.type === 'search' && message.sources && message.sources.length > 0 && (
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
                                  )} */}
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
                                      <Typography
                                        variant='body2'
                                        sx={{ mb: 1.5, color: 'text.secondary', lineHeight: 1.6 }}
                                      >
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
                              ) : (
                                /* 用户消息内容 */
                                <Typography
                                  variant='body1'
                                  sx={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
                                >
                                  {message.content}
                                </Typography>
                              )}
                            </Paper>

                            {/* 消息底部信息 - 时间戳、复制按钮、免责声明 */}
                            {message.role === 'assistant' && message.content && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  mt: 0.5,
                                  pl: 0.5,
                                  flexWrap: 'wrap',
                                }}
                              >
                                {message.timestamp && (
                                  <Typography variant='caption' sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                                    生成于 {formatTime(message.timestamp)}
                                  </Typography>
                                )}
                                <Tooltip title={copiedMessageId === message.id ? '已复制' : '复制'} arrow>
                                  <IconButton
                                    size='small'
                                    onClick={() => handleCopyMessage(message.content, message.id)}
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      color: 'text.disabled',
                                      '&:hover': {
                                        color: 'primary.main',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                    }}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: 12 }} />
                                  </IconButton>
                                </Tooltip>
                                <Typography variant='caption' sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                                  本回答由 AI 驱动，仅供参考
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {/* 快速操作按钮 - 显示在消息右侧 */}
                          {message.role === 'assistant' &&
                            message.content &&
                            message.quickActions &&
                            message.quickActions.length > 0 && (
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 1,
                                  mt: 0.5,
                                  flexShrink: 0,
                                }}
                              >
                                {message.quickActions.map((action, idx) => (
                                  <Button
                                    key={idx}
                                    variant='outlined'
                                    size='small'
                                    onClick={() => handleQuickAction(action)}
                                    sx={{
                                      textTransform: 'none',
                                      borderRadius: 2,
                                      px: 2,
                                      py: 0.75,
                                      borderColor: alpha(theme.palette.primary.main, 0.3),
                                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                                      color: 'primary.main',
                                      fontSize: '0.85rem',
                                      whiteSpace: 'nowrap',
                                      '&:hover': {
                                        borderColor: 'primary.main',
                                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      },
                                    }}
                                  >
                                    {action}
                                  </Button>
                                ))}
                              </Box>
                            )}
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    /* 用户消息布局：头像和内容垂直居中 */
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                        width: '100%',
                        flexDirection: 'row-reverse',
                        justifyContent: 'flex-start',
                      }}
                    >
                      {/* 头像 */}
                      <UserAvatar
                        user={displayUser}
                        showSkeleton={false}
                        containerSx={{ flexShrink: 0 }}
                        sx={{
                          width: 40,
                          height: 40,
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: theme.palette.primary.main,
                          backgroundColor: 'transparent',
                        }}
                      >
                        {userInitial}
                      </UserAvatar>

                      {/* 消息气泡 */}
                      <Box
                        sx={{
                          position: 'relative',
                          maxWidth: '70%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <Paper
                          elevation={0}
                          sx={{
                            px: 2.5,
                            py: 1,
                            borderRadius: 1,
                            bgcolor: 'primary.main',
                            color: 'white',
                            boxShadow: `none`,
                            transition: 'all 0.2s ease',
                            fontSize: '14px',
                            '&:hover': {
                              boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.35)}`,
                            },
                            '& p': {
                              my: 0,
                              lineHeight: 1.5,
                            },
                            '& code': {
                              bgcolor: 'rgba(255, 255, 255, 0.2)',
                              px: 0.75,
                              py: 0.25,
                              borderRadius: 0.5,
                              fontSize: '14px',
                            },
                          }}
                        >
                          <Typography
                            variant='body1'
                            sx={{ fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
                          >
                            {message.content}
                          </Typography>
                        </Paper>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Fade>
            )
          })}

          <div ref={messagesEndRef} />
        </Stack>
      </Box>

      {/* 底部输入区域 - 现代化设计 */}
      <Box sx={{ pb: 2 }}>
        <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
          {/* 新会话按钮 - 位于输入框左上方 */}
          <Box sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
            <Button
              variant='outlined'
              size='small'
              startIcon={<Icon type='icon-xinduihua' />}
              onClick={handleNewSession}
              disabled={isLoading}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                bgcolor: 'white',
                border: '1px solid',
                borderColor: alpha(theme.palette.grey[400], 0.3),
                color: 'text.primary',
                boxShadow: 'none',
                '&:hover': {
                  borderColor: alpha(theme.palette.grey[400], 0.5),
                  bgcolor: 'grey.50',
                  boxShadow: 'none',
                },
                '&:disabled': {
                  bgcolor: 'white',
                  borderColor: alpha(theme.palette.grey[400], 0.3),
                  color: 'text.disabled',
                  opacity: 0.6,
                },
                '& .MuiButton-startIcon': {
                  marginRight: 1,
                },
              }}
            >
              新会话
            </Button>
          </Box>
          <Box
            sx={{
              position: 'relative',
              borderRadius: '10px',
              border: '1px solid',
              // borderColor: inputValue.trim() ? 'primary.main' : 'divider',
              borderColor: 'primary.main',
            }}
          >
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={8}
              placeholder='请使用产品 + 问题描述你的问题'
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
                    pr: 6, // 为按钮留出右侧空间
                    fontSize: '0.95rem',
                    lineHeight: 1.6,
                  },
                },
              }}
            />
            {/* 发送按钮 - 位于输入框内部右下角 */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                zIndex: 1,
              }}
            >
              <Tooltip title='发送消息' arrow>
                <IconButton
                  color='primary'
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  sx={{
                    width: 40,
                    height: 40,
                  }}
                >
                  {isLoading ? (
                    <CircularProgress size={18} sx={{ color: 'inherit' }} />
                  ) : (
                    <SendIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
