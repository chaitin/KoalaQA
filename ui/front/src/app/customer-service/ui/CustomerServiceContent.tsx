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
  Collapse,
  Fade,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Icon } from '@ctzhian/ui'

// 检查回答是否是"无法回答问题"
const cannotAnswerPatterns = [/^无法回答问题$/, /^无法回答$/]
const SEARCH_LOADING_TEXT = '正在为您搜索相关帖子...'
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  type?: 'ai' | 'search' // ai: AI知识库回答, search: 搜索帖子回答
  sources?: ModelDiscussionListItem[] // 引用帖子
  discCount?: number // 搜索结果数量
  summary?: string // 智能总结
  needsForumSelection?: boolean // 是否需要选择板块
  pendingQuestion?: string // 待处理的问题
  originalQuestionForSearch?: string // 用于重新搜索的原始问题
  showPostPrompt?: boolean // 是否显示发帖提示
  originalQuestion?: string // 原始问题，用于填充发帖表单
  forumId?: number // 板块ID，用于发帖
  timestamp?: string // 时间戳
  isComplete?: boolean // 是否已完成（流式输出完成）
}

interface CustomerServiceContentProps {
  readonly initialUser?: ModelUserInfo
  readonly botData?: SvcBotGetRes | null
  readonly initialSessionId?: string | null
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
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isServiceEnabled, setIsServiceEnabled] = useState<boolean | null>(null) // null表示正在加载
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set()) // 展开的搜索结果消息ID
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

  // 获取当前的 sessionId，优先从 URL 获取，确保与 URL 同步
  const getCurrentSessionId = useCallback(() => {
    // 优先从 searchParams 获取（Next.js 的 useSearchParams 是响应式的）
    const urlId = searchParams.get('id')
    if (urlId) {
      return urlId
    }
    // 如果没有，则使用 state 中的 sessionId
    return sessionId
  }, [searchParams, sessionId])

  // 如果 URL 中没有 id 参数，添加 sessionId 到 URL
  useEffect(() => {
    const urlId = searchParams.get('id')
    if (urlId !== sessionId && sessionId) {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('id', sessionId)
      router.replace(currentUrl.pathname + currentUrl.search, { scroll: false })
    }
  }, [sessionId, searchParams, router])

  // 移除登录检查，允许未登录用户访问

  // 用于标记是否已经加载过历史对话，避免重复加载
  const historyLoadedRef = useRef<string | null>(null)

  // 当 sessionId 变化时，加载历史对话
  useEffect(() => {
    // 使用 initialUser 或 user 来检查用户ID，确保在服务端渲染时也能正确加载
    // 允许未登录用户（currentUserId 为 0 或 undefined）
    const currentUserId = user?.uid || initialUser?.uid
    if (!sessionId) {
      return
    }
    // 如果用户未登录，currentUserId 可能为 0 或 undefined，仍然允许加载历史对话

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
          // 过滤掉匹配 cannotAnswerPatterns 的机器人消息（但保留最后一条）
          const filteredItems = historyItems.filter((item, index) => {
            // 如果是最后一条，无论是否匹配都保留
            const isLastItem = index === historyItems.length - 1
            if (isLastItem) {
              return true
            }

            // 如果是机器人消息，检查内容是否匹配"无法回答问题"的模式
            if (item.bot && item.content) {
              const content = item.content.trim()
              const isCannotAnswer = cannotAnswerPatterns.some((pattern) => pattern.test(content))
              // 过滤掉匹配的消息（但最后一条已经在上面的判断中保留了）
              return !isCannotAnswer
            }
            // 用户消息和空内容的消息都保留
            return true
          })

          // 转换历史记录为 Message 格式
          let lastUserQuestion: string | null = null

          const historyMessages: Message[] = filteredItems.map((item, index) => {
            const message: Message = {
              id: item.id?.toString() || `history-${index}`,
              role: item.bot ? 'assistant' : 'user',
              content: item.content || '',
              type: item.bot ? 'ai' : undefined,
              timestamp: item.created_at
                ? typeof item.created_at === 'number'
                  ? new Date(item.created_at * 1000).toISOString()
                  : item.created_at
                : new Date().toISOString(),
            }

            // 如果有 summary_discs，渲染成搜索结果
            if (item.bot && item.summary_discs && item.summary_discs.length > 0) {
              message.type = 'search'
              message.sources = item.summary_discs
              message.discCount = item.summary_discs.length
              if (!message.forumId) {
                message.forumId = item.summary_discs[0]?.forum_id
              }
            }

            if (item.bot) {
              message.isComplete = true
              if (lastUserQuestion) {
                message.originalQuestion = lastUserQuestion
                message.originalQuestionForSearch = lastUserQuestion
              }
              if (!message.forumId && item.summary_discs && item.summary_discs.length > 0) {
                message.forumId = item.summary_discs[0]?.forum_id
              }
            } else if (message.content) {
              lastUserQuestion = message.content
            }

            return message
          })

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
            // 标记消息已完成
            setMessages((prev) => {
              const newMessages = [...prev]
              const index = newMessages.findIndex((m) => m.id === messageId)
              if (index !== -1) {
                newMessages[index] = {
                  ...newMessages[index],
                  isComplete: true,
                }
              }
              return newMessages
            })
          },
        })

        sseClientRef.current = summarySseClient

        let summaryText = ''
        let searchResults: ModelDiscussionListItem[] = []
        let discCount: number | undefined // 提升到外层作用域

        // 获取当前的 sessionId，确保与 URL 同步
        const currentSessionId = getCurrentSessionId()

        const summaryRequestBody = JSON.stringify({
          content: question,
          forum_id: forumId,
          session_id: currentSessionId,
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

          // 处理新的流式数据格式
          if (data && typeof data === 'object') {
            const dataObj = data as any
            const eventType = dataObj.event
            const eventData = dataObj.data

            // 处理 event:disc_count
            if (eventType === 'disc_count') {
              const count = typeof eventData === 'number' ? eventData : Number.parseInt(String(eventData), 10)
              if (!Number.isNaN(count)) {
                discCount = count
                // 立即更新消息，显示搜索结果数量（此时 sources 可能还是空的）
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const index = newMessages.findIndex((m) => m.id === messageId)
                  if (index !== -1) {
                    newMessages[index] = {
                      ...newMessages[index],
                      type: 'search',
                      discCount: count,
                      sources: searchResults, // 保持现有的 sources
                      content: '', // 此时还没有总结文本
                      forumId: forumId,
                    }
                  }
                  return newMessages
                })

                // 如果 disc_count === 0，显示没有找到结果
                if (count === 0) {
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    const index = newMessages.findIndex((m) => m.id === messageId)
                    if (index !== -1) {
                      newMessages[index] = {
                        ...newMessages[index],
                        content: '抱歉，暂时没有找到相关帖子。',
                        showPostPrompt: !!originalQuestion,
                        originalQuestion: originalQuestion,
                        forumId: forumId,
                      }
                    }
                    return newMessages
                  })
                  setIsLoading(false)
                }
              }
              return
            }

            // 处理 event:disc - 单个帖子信息
            if (eventType === 'disc') {
              let discItem: ModelDiscussionListItem | null = null

              if (typeof eventData === 'string') {
                try {
                  discItem = JSON.parse(eventData) as ModelDiscussionListItem
                } catch {
                  // 解析失败，忽略
                }
              } else if (eventData && typeof eventData === 'object') {
                discItem = eventData as ModelDiscussionListItem
              }

              if (discItem) {
                // 添加到搜索结果列表
                searchResults.push(discItem)

                // 更新消息，显示最新的搜索结果列表
                setMessages((prev) => {
                  const newMessages = [...prev]
                  const index = newMessages.findIndex((m) => m.id === messageId)
                  if (index !== -1) {
                    newMessages[index] = {
                      ...newMessages[index],
                      type: 'search',
                      sources: [...searchResults], // 使用新数组触发更新
                      discCount: discCount ?? searchResults.length,
                      forumId: forumId,
                      // 保持现有的 content（如果有的话）
                    }
                  }
                  return newMessages
                })
              }
              return
            }

            // 处理 event:text - 总结文本
            if (eventType === 'text') {
              let textToAdd = ''

              if (typeof eventData === 'string') {
                try {
                  // 处理 JSON 字符串化的内容（后端使用 fmt.Sprintf("%q", content)）
                  const unquoted = eventData.replaceAll(/^"|"$/g, '')
                  textToAdd = unquoted.replaceAll(/\\"/g, '"').replaceAll(/\\n/g, '\n')
                } catch {
                  textToAdd = eventData
                }
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

              if (textToAdd) {
                // 过滤思考过程
                const isThinkingLine = thinkingPatterns.some((pattern) => pattern.test(textToAdd))
                if (!isThinkingLine) {
                  summaryText += textToAdd
                  // 更新消息，显示总结文本
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
                        discCount: discCount ?? searchResults.length,
                      }
                    }
                    return newMessages
                  })
                }
              }
              return
            }

            // 处理 summary_failed（如果后端还返回这个字段）
            if (dataObj.summary_failed === true) {
              setMessages((prev) => {
                const newMessages = [...prev]
                const index = newMessages.findIndex((m) => m.id === messageId)
                if (index !== -1) {
                  newMessages[index] = {
                    ...newMessages[index],
                    content: '抱歉，总结生成失败，请稍后重试。',
                    type: 'search',
                    sources: searchResults,
                    discCount: discCount ?? searchResults.length,
                  }
                }
                return newMessages
              })
              setIsLoading(false)
              return
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
    [sessionId, getCurrentSessionId],
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
      originalQuestionForSearch: question,
    }
    // 保存消息 ID 到闭包中，确保后续使用正确的 ID
    const assistantMessageId = assistantMessage.id
    setMessages((prev) => [...prev, assistantMessage])
    currentMessageRef.current = assistantMessage

    try {
      // 使用 postDiscussionAsk 进行流式输出
      const csrfToken = await getCsrfToken()

      // 获取当前的 sessionId，确保与 URL 同步
      const currentSessionId = getCurrentSessionId()

      // 构建请求体
      const requestBody = JSON.stringify({
        question: question,
        session_id: currentSessionId,
      })

      let answerText = ''
      const thinkingPatterns = [/思考[:：]/, /推理[:：]/, /分析[:：]/, /让我想想/, /我需要/, /正在思考/]

      // 使用 Promise 来等待流式输出完成
      let hasReceivedData = false

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

            const finalAnswer = answerText.trim()
            const cannotAnswer = cannotAnswerPatterns.some((pattern) => pattern.test(finalAnswer))

            // 标记消息完成状态（无法回答时保持未完成，等待搜索流程结束）
            setMessages((prev) => {
              const newMessages = [...prev]
              const index = newMessages.findIndex((m) => m.id === assistantMessageId)
              if (index !== -1) {
                newMessages[index] = {
                  ...newMessages[index],
                  isComplete: !cannotAnswer,
                }
              }
              return newMessages
            })

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
                      isComplete: false,
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
                        content: SEARCH_LOADING_TEXT,
                        type: 'search',
                        isComplete: false,
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
            // 其他 event 类型（如 end）已在 fetch.ts 中处理，这里不处理
          }

          if (textToAdd) {
            // 检查是否是思考过程
            const isThinkingLine = thinkingPatterns.some((pattern) => pattern.test(textToAdd))

            // 只添加非思考过程的内容
            if (!isThinkingLine) {
              if (!hasReceivedData) {
                hasReceivedData = true
                setIsWaiting(false)
              }
              answerText += textToAdd

              // 使用消息 ID 而不是索引，确保即使消息数组发生变化也能正确更新
              setMessages((prev) => {
                const newMessages = [...prev]
                const index = newMessages.findIndex((m) => m.id === assistantMessageId)
                if (index !== -1) {
                  newMessages[index] = {
                    ...newMessages[index],
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
  }, [inputValue, isLoading, forumId, forums, router, getCurrentSessionId, callSummaryContent])

  // 处理回车发送
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !(e.nativeEvent as KeyboardEvent).isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  // 点击引用帖
  const handleSourceClick = (discussion: ModelDiscussionListItem) => {
    // ModelDiscussionListItem 可能没有 route_name，需要通过 forum_id 查找
    const forum = forums.find((f) => f.id === discussion.forum_id)
    const routePath = forum?.route_name ? `/${forum.route_name}/${discussion.uuid}` : `/${discussion.uuid}`
    window.open(routePath, '_blank')
  }

  // 处理跳转到发帖页面
  const handleGoToPost = (question: string, messageForumId?: number) => {
    // 检查登录状态
    const currentUser = user?.uid ? user : initialUser
    if (!currentUser?.uid) {
      // 未登录，跳转到登录页，带上重定向参数和内容
      const targetForumId = messageForumId ?? forumId ?? forums[0]?.id
      const forum = forums.find((f) => f.id === targetForumId)
      
      if (!forum?.route_name) {
        console.error('未找到板块信息:', { targetForumId, forums })
        return
      }

      // 构建发帖页面 URL，传递标题和类型参数
      const encodedTitle = encodeURIComponent(question)
      const postUrl = `/${forum.route_name}/edit?type=qa&title=${encodedTitle}`
      const loginUrl = `/login?redirect=${encodeURIComponent(postUrl)}`
      router.push(loginUrl)
      return
    }

    // 已登录，直接跳转到发帖页面
    const targetForumId = messageForumId ?? forumId ?? forums[0]?.id
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

  const handleSearchRelatedPosts = useCallback(
    async (question: string, messageForumId?: number) => {
      const trimmedQuestion = question.trim()
      if (!trimmedQuestion) return

      const availableForums = forums || []
      const hasMultipleForums = availableForums.length > 1
      const inferredForumId = messageForumId ?? forumId ?? availableForums[0]?.id

      if (hasMultipleForums && (messageForumId === undefined || messageForumId === null) && !forumId) {
        const selectionMessageId = generateUuid()
        const selectionMessage: Message = {
          id: selectionMessageId,
          role: 'assistant',
          content: '请选择一个板块，我将为您搜索相关帖子。',
          type: 'search',
          timestamp: new Date().toISOString(),
          needsForumSelection: true,
          pendingQuestion: trimmedQuestion,
          originalQuestionForSearch: trimmedQuestion,
          originalQuestion: trimmedQuestion,
          showPostPrompt: false,
          isComplete: false,
        }
        setMessages((prev) => [...prev, selectionMessage])
        return
      }

      if (inferredForumId === undefined || inferredForumId === null) {
        console.error('未找到用于搜索的板块信息', { messageForumId, forumId, forums })
        Alert.warning('请先选择板块后再搜索相关帖子', 3000)
        return
      }

      const searchMessageId = generateUuid()
      const loadingMessage: Message = {
        id: searchMessageId,
        role: 'assistant',
        content: SEARCH_LOADING_TEXT,
        type: 'search',
        timestamp: new Date().toISOString(),
        summary: undefined,
        sources: undefined,
        discCount: undefined,
        showPostPrompt: false,
        needsForumSelection: false,
        pendingQuestion: undefined,
        isComplete: false,
        forumId: inferredForumId,
        originalQuestion: trimmedQuestion,
        originalQuestionForSearch: trimmedQuestion,
      }

      setIsLoading(true)
      setMessages((prev) => [...prev, loadingMessage])

      await callSummaryContent(inferredForumId, trimmedQuestion, searchMessageId, trimmedQuestion)
    },
    [forums, forumId, callSummaryContent, generateUuid],
  )

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
            content: SEARCH_LOADING_TEXT,
            type: 'search',
            summary: undefined,
            sources: undefined,
            discCount: undefined,
            showPostPrompt: false,
            isComplete: false,
            forumId: selectedForumId,
            originalQuestionForSearch: question,
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
          {messages.map((message, index) => {
            // 判断是否是最后一条机器人消息
            // 条件：1. 当前是机器人消息 2. 之后没有机器人消息 3. 之前有用户消息
            const isLastAssistantMessage =
              message.role === 'assistant' &&
              !messages.slice(index + 1).some((m) => m.role === 'assistant') &&
              messages.slice(0, index).some((m) => m.role === 'user')

            // 获取用户最后一条消息作为问题（在当前机器人消息之前）
            const lastUserMessage = messages.slice(0, index + 1).findLast((m) => m.role === 'user')
            const questionForPost = lastUserMessage?.content || ''
            const isSearchSummaryComplete =
              message.type === 'search' &&
              message.isComplete &&
              !!message.content &&
              message.content.trim() !== SEARCH_LOADING_TEXT
            const canShowPostButton =
              isSearchSummaryComplete &&
              isLastAssistantMessage &&
              !!questionForPost &&
              !message.showPostPrompt
            const canShowSearchButton =
              message.role === 'assistant' &&
              message.type === 'ai' &&
              message.isComplete &&
              isLastAssistantMessage &&
              !!questionForPost &&
              !message.showPostPrompt &&
              !!message.content

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
                                fontSize: '14px',
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
                                  {/* 搜索结果展示 - 放在最前面 */}
                                  {message.type === 'search' &&
                                    message.discCount !== undefined &&
                                    message.discCount > 0 && (
                                      <Box
                                        sx={{
                                          mb: message.content ? 2 : 0,
                                        }}
                                      >
                                        {/* 搜索结果标题 - 可点击展开/折叠 */}
                                        <Box
                                          onClick={() => {
                                            setExpandedSources((prev) => {
                                              const newSet = new Set(prev)
                                              if (newSet.has(message.id)) {
                                                newSet.delete(message.id)
                                              } else {
                                                newSet.add(message.id)
                                              }
                                              return newSet
                                            })
                                          }}
                                          sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            py: 1,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          <Typography
                                            variant='body2'
                                            sx={{
                                              fontWeight: 500,
                                              color: 'text.primary',
                                              fontSize: '14px',
                                            }}
                                          >
                                            共找到{message.discCount}个结果
                                          </Typography>
                                          <IconButton
                                            size='small'
                                            sx={{
                                              width: 20,
                                              height: 20,
                                              color: 'text.secondary',
                                              p: 0,
                                            }}
                                          >
                                            {expandedSources.has(message.id) ? (
                                              <ExpandLessIcon sx={{ fontSize: 16 }} />
                                            ) : (
                                              <ExpandMoreIcon sx={{ fontSize: 16 }} />
                                            )}
                                          </IconButton>
                                        </Box>

                                        {/* 搜索结果列表 - 可折叠 */}
                                        <Collapse in={expandedSources.has(message.id)}>
                                          <Box
                                            sx={{
                                              pl: 2,
                                              position: 'relative',
                                              '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                left: 0,
                                                top: 0,
                                                bottom: 0,
                                                width: '1px',
                                                bgcolor: 'divider',
                                              },
                                            }}
                                          >
                                            {message.sources && message.sources.length > 0 ? (
                                              <Stack spacing={0}>
                                                {message.sources.map((source, idx) => (
                                                  <Box
                                                    key={source.id || idx}
                                                    onClick={() => handleSourceClick(source)}
                                                    sx={{
                                                      py: 0.75,
                                                      px: 1,
                                                      borderRadius: 1,
                                                      cursor: 'pointer',
                                                      color: 'text.primary',
                                                      transition: 'color 0.2s, background-color 0.2s',
                                                      '&:hover': {
                                                        color: 'primary.main',
                                                        backgroundColor: 'transparent',
                                                      },
                                                    }}
                                                  >
                                                    <Typography
                                                      variant='body2'
                                                      sx={{
                                                        fontSize: '14px',
                                                        color: 'inherit',
                                                        lineHeight: 1.5,
                                                      }}
                                                    >
                                                      {source.title || '无标题'}
                                                    </Typography>
                                                  </Box>
                                                ))}
                                              </Stack>
                                            ) : (
                                              <Typography
                                                variant='body2'
                                                sx={{
                                                  color: 'text.secondary',
                                                  fontSize: '14px',
                                                  py: 1,
                                                }}
                                              >
                                                正在加载搜索结果...
                                              </Typography>
                                            )}
                                          </Box>
                                        </Collapse>
                                      </Box>
                                    )}

                                  {/* 消息内容 - 总结文本 */}
                                  {message.content && message.content.trim() === SEARCH_LOADING_TEXT ? (
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        py: 1.5,
                                        px: 2,
                                        color: 'text.secondary',
                                      }}
                                    >
                                      <CircularProgress size={18} thickness={4} sx={{ color: 'text.secondary' }} />
                                      <Typography variant='body2' sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
                                        {SEARCH_LOADING_TEXT}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    <Box
                                      sx={{
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

                            {/* 发帖提问按钮 - 放在气泡外部 */}
                            {message.role === 'assistant' && (
                              <>
                                {message.showPostPrompt &&
                                  message.originalQuestion &&
                                  message.isComplete &&
                                  isLastAssistantMessage ? (
                                  <Box sx={{ mt: 1.5, pl: 0.5 }}>
                                    <Button
                                      variant='contained'
                                      size='small'
                                      onClick={() =>
                                        handleGoToPost(
                                          message.originalQuestion!,
                                          message.forumId ?? message.sources?.[0]?.forum_id,
                                        )
                                      }
                                      sx={{
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        backgroundColor: theme.palette.primary.main,
                                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                        '&:hover': {
                                          backgroundColor: theme.palette.primary.dark,
                                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                                        },
                                        fontWeight: 600,
                                      }}
                                    >
                                      前往发帖提问
                                    </Button>
                                  </Box>
                                ) : canShowSearchButton ? (
                                  <Box sx={{ mt: 1.5, pl: 0.5 }}>
                                    <Button
                                      variant='contained'
                                      size='small'
                                      disabled={isLoading}
                                      onClick={() =>
                                        void handleSearchRelatedPosts(
                                          message.originalQuestionForSearch || questionForPost,
                                          message.forumId ?? forumId ?? undefined,
                                        )
                                      }
                                      sx={{
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        backgroundColor: theme.palette.primary.main,
                                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                        '&:hover': {
                                          backgroundColor: theme.palette.primary.dark,
                                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                                        },
                                        fontWeight: 600,
                                      }}
                                    >
                                      搜索相关帖子
                                    </Button>
                                  </Box>
                                ) : canShowPostButton ? (
                                  <Box sx={{ mt: 1.5, pl: 0.5 }}>
                                    <Button
                                      variant='contained'
                                      size='small'
                                      onClick={() => handleGoToPost(questionForPost, forumId || undefined)}
                                      disabled={isLoading}
                                      sx={{
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        backgroundColor: theme.palette.primary.main,
                                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                        '&:hover': {
                                          backgroundColor: theme.palette.primary.dark,
                                          boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                                        },
                                        fontWeight: 600,
                                      }}
                                    >
                                      前往发帖提问
                                    </Button>
                                  </Box>
                                ) : null}
                              </>
                            )}
                          </Box>

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
                            fontSize: '14px',
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
      <Box sx={{ pb: 2, pt: 1 }}>
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
              新问题
            </Button>
          </Box>
          <Box
            sx={{
              position: 'relative',
              borderRadius: '10px',
              border: '1px solid',
              borderColor: isInputFocused ? 'primary.main' : 'divider',
              transition: 'border-color 0.2s ease',
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
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
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
