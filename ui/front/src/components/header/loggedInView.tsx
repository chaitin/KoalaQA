'use client'
import { AuthContext } from '@/components/authProvider'
import { Avatar } from '@/components/discussion'
import { useForum } from '@/contexts/ForumContext'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import { Badge, Box, Button, Stack, Tooltip, Typography } from '@mui/material'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import React, { useContext, useEffect, useRef, useState } from 'react'
import ProfilePanel from './profilePanel'

// 内容类型枚举
enum ContentType {
  FEEDBACK = 'feedback',
  QA = 'qa',
  BLOG = 'blog', // 新增文章类型
}

// 消息通知类型枚举
enum MsgNotifyType {
  MsgNotifyTypeUnknown,
  MsgNotifyTypeReplyDiscuss, // 回答了你的问题
  MsgNotifyTypeReplyComment, // 回复了你的回答
  MsgNotifyTypeApplyComment, // 采纳了你的回答
  MsgNotifyTypeLikeComment, //赞同了你的回答
  MsgNotifyTypeDislikeComment, // 不喜欢你的回答 、不喜欢机器人的回答（仅管理员）
  MsgNotifyTypeBotUnknown, //提出了机器人无法回答的问题（仅管理员
  MsgNotifyTypeLikeFeedback, //点赞了你的反馈
}

// 内容类型配置接口
interface ContentTypeConfig {
  // 回复/评论相关
  replyAction: string // 回复动作文本
  commentAction: string // 评论动作文本
  // 采纳相关
  applyAction: string // 采纳动作文本
  // 点赞相关
  likeAction: string // 点赞动作文本
  // 不喜欢相关
  dislikeAction: string // 不喜欢动作文本
  dislikeBotAction: string // 不喜欢机器人动作文本
  // 特殊动作
  botUnknownAction: string // 机器人无法回答动作文本
  likeFeedbackAction: string // 点赞反馈动作文本
}

// 内容类型配置映射
const CONTENT_TYPE_CONFIGS: Record<ContentType, ContentTypeConfig> = {
  [ContentType.FEEDBACK]: {
    replyAction: '评论了你的反馈',
    commentAction: '回复了你的评论',
    applyAction: '采纳了你的评论',
    likeAction: '点赞了你的评论',
    dislikeAction: '不喜欢你的评论',
    dislikeBotAction: '不喜欢机器人的评论',
    botUnknownAction: '提出了机器人无法回答的问题',
    likeFeedbackAction: '点赞了你的反馈',
  },
  [ContentType.QA]: {
    replyAction: '回答了你的问题',
    commentAction: '回复了你的回答',
    applyAction: '采纳了你的回答',
    likeAction: '赞同了你的回答',
    dislikeAction: '不喜欢你的回答',
    dislikeBotAction: '不喜欢机器人的回答',
    botUnknownAction: '提出了机器人无法回答的问题',
    likeFeedbackAction: '点赞了你的反馈',
  },
  [ContentType.BLOG]: {
    replyAction: '评论了你的文章',
    commentAction: '回复了你的评论',
    applyAction: '采纳了你的评论',
    likeAction: '点赞了你的评论',
    dislikeAction: '不喜欢你的评论',
    dislikeBotAction: '不喜欢机器人的评论',
    botUnknownAction: '提出了机器人无法回答的问题',
    likeFeedbackAction: '点赞了你的文章',
  },
}

/**
 * 内容类型配置管理器
 */
class ContentTypeConfigManager {
  private static instance: ContentTypeConfigManager
  private configs: Record<string, ContentTypeConfig> = CONTENT_TYPE_CONFIGS

  private constructor() {}

  static getInstance(): ContentTypeConfigManager {
    if (!ContentTypeConfigManager.instance) {
      ContentTypeConfigManager.instance = new ContentTypeConfigManager()
    }
    return ContentTypeConfigManager.instance
  }

  /**
   * 获取内容类型配置
   * @param contentType 内容类型
   * @returns 配置对象
   */
  getConfig(contentType: string): ContentTypeConfig {
    return this.configs[contentType] || this.configs[ContentType.QA]
  }

  /**
   * 注册新的内容类型配置
   * @param contentType 内容类型
   * @param config 配置对象
   */
  registerConfig(contentType: string, config: ContentTypeConfig): void {
    this.configs[contentType] = config
  }

  /**
   * 获取所有支持的内容类型
   * @returns 内容类型数组
   */
  getSupportedTypes(): string[] {
    return Object.keys(this.configs)
  }
}

/**
 * 获取通知文本
 * @param info 消息通知信息
 * @returns 格式化的通知文本
 */
const getNotificationText = (info: MessageNotifyInfo): string => {
  const configManager = ContentTypeConfigManager.getInstance()
  const config = configManager.getConfig(info.discussion_type)
  switch (info.type) {
    case MsgNotifyType.MsgNotifyTypeReplyDiscuss:
      return config.replyAction
    case MsgNotifyType.MsgNotifyTypeReplyComment:
      return config.commentAction
    case MsgNotifyType.MsgNotifyTypeApplyComment:
      return config.applyAction
    case MsgNotifyType.MsgNotifyTypeLikeComment:
      return config.likeAction
    case MsgNotifyType.MsgNotifyTypeDislikeComment:
      return info?.to_bot ? config.dislikeBotAction : config.dislikeAction
    case MsgNotifyType.MsgNotifyTypeBotUnknown:
      return config.botUnknownAction
    case MsgNotifyType.MsgNotifyTypeLikeFeedback:
      return config.likeFeedbackAction
    default:
      return ''
  }
}

/**
 * 拆分通知文本为动作词和内容部分
 * @param text 通知文本
 * @returns 包含动作词和内容的对象
 */
export const splitNotificationText = (text: string): { action: string; content: string } => {
  // 匹配"了"字来拆分文本，格式通常是"动作词了内容"
  const match = text.match(/^(.+了)(.+)$/)
  if (match) {
    return {
      action: match[1],
      content: match[2],
    }
  }
  // 如果没有匹配到，返回原文本作为内容
  return {
    action: '',
    content: text,
  }
}

type MessageNotifyInfo = {
  discuss_id: number
  discuss_title: string
  discuss_uuid: string
  discussion_type: ContentType
  type: MsgNotifyType
  from_id: number
  from_name: string
  from_bot: boolean
  to_id: number
  to_name: string
  to_bot: boolean
  id: number
  forum_id: number
}

// 导出内容类型配置管理器，供其他模块使用
export const getContentTypeConfigManager = () => ContentTypeConfigManager.getInstance()

// 导出内容类型枚举，供其他模块使用
export { ContentType, MsgNotifyType, type ContentTypeConfig }

// 导出通知文本获取函数，供其他模块使用
// 支持 MessageNotifyInfo 和 ModelMessageNotify 两种类型
export const getNotificationTextForExport = (
  info:
    | MessageNotifyInfo
    | {
        discussion_type?: string | 'qa' | 'feedback' | 'blog'
        type?: number
        to_bot?: boolean
      },
): string => {
  // 类型适配：将 ModelMessageNotify 转换为 MessageNotifyInfo 格式
  const adaptedInfo: MessageNotifyInfo = {
    discuss_id: (info as any).discuss_id || 0,
    discuss_title: (info as any).discuss_title || '',
    discuss_uuid: (info as any).discuss_uuid || '',
    discussion_type: (info.discussion_type as ContentType) || ContentType.QA,
    type: (info.type as MsgNotifyType) || MsgNotifyType.MsgNotifyTypeUnknown,
    from_id: (info as any).from_id || 0,
    from_name: (info as any).from_name || '',
    from_bot: (info as any).from_bot || false,
    to_id: (info as any).to_id || 0,
    to_name: (info as any).to_name || '',
    to_bot: info.to_bot || false,
    id: (info as any).id || 0,
    forum_id: (info as any).forum_id || 0,
  }
  return getNotificationText(adaptedInfo)
}

/**
 * 使用示例：
 *
 * // 在其他模块中注册新的内容类型
 * const configManager = getContentTypeConfigManager()
 * configManager.registerConfig('video', {
 *   replyAction: '评论了你的视频',
 *   commentAction: '回复了你的评论',
 *   applyAction: '采纳了你的评论',
 *   likeAction: '点赞了你的评论',
 *   dislikeAction: '不喜欢你的评论',
 *   dislikeBotAction: '不喜欢机器人的评论',
 *   botUnknownAction: '提出了机器人无法回答的问题',
 *   likeFeedbackAction: '点赞了你的反馈',
 * })
 *
 * // 获取支持的内容类型
 * const supportedTypes = configManager.getSupportedTypes()
 * console.log('支持的内容类型:', supportedTypes)
 */
export interface LoggedInProps {
  user: any | null
  verified?: boolean
}

const LoggedInView: React.FC<LoggedInProps> = ({ user: propUser }) => {
  const { user: contextUser } = useContext(AuthContext)
  const { forums } = useForum()
  const user = propUser || contextUser
  const [notifications, setNotifications] = useState<MessageNotifyInfo[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouterWithRouteName()
  // 保存 ws 实例的 ref
  const wsRef = useRef<WebSocket | null>(null)
  // 保存 ping 定时器的 ref
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 确保在客户端环境中执行
    if (typeof window === 'undefined') return

    const token = localStorage.getItem('auth_token')
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = new URL('/api/user/notify', window.location.href)
    url.protocol = wsProtocol
    const wsUrlBase = url.toString()
    const wsUrl = token ? `${wsUrlBase}` : wsUrlBase
    const ws = new WebSocket(wsUrl)
    // 保存 ws 实例
    wsRef.current = ws

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)

      switch (message.type) {
        case 1: // 未读数量
          setUnreadCount(message.data as number)
          break
        case 3: // 消息内容
          const newNotification = message.data as MessageNotifyInfo
          setNotifications((prev) => [newNotification, ...prev])
          ws.send(JSON.stringify({ type: 1 }))
          break
      }
    }

    // 连接建立后请求未读消息数
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 1 }))

      // 启动 ping 定时器，每30秒发送一次 ping
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          // 发送 ping 消息，使用 type: 'ping' 作为心跳标识
          ws.send(JSON.stringify({ type: 4 }))
        }
      }, 30000) // 30秒
    }
    // 添加错误处理和重连逻辑
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      // 清理 ping 定时器
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }

    return () => {
      // 清理 ping 定时器
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
      ws.close()
      wsRef.current = null
    }
  }, [])

  const handleNotificationClick = (notification: MessageNotifyInfo) => {
    // 使用已存在的 ws 连接
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 2, id: notification.id }))

      // 更新UI
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))

      // 根据 forum_id 查找对应的 route_name
      const forum = forums.find((f) => f.id === notification.forum_id)
      const routePath = forum?.route_name
        ? `/${forum.route_name}/${notification.discuss_uuid}`
        : `/${notification.forum_id}/${notification.discuss_uuid}`
      router.push(routePath)
    }
  }

  return (
    <>
      <Tooltip
        placement='bottom-end'
        slotProps={{
          tooltip: {
            sx: {
              backgroundColor: '#fff',
              boxShadow: '0px 20px 40px 0px rgba(0,28,85,0.06)',
              minWidth: '300px',
              padding: '20px',
              pb: 1,
              borderRadius: '8px',
              color: 'primary.main',
            },
          },
          popper: {
            sx: {
              paddingRight: '24px',
              margin: '0px -24px 0px 0px !important',
            },
          },
        }}
        title={
          <Stack spacing={1}>
            <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary', fontSize: '14px' }}>暂无通知</Box>
              ) : (
                notifications.map((notification, index) => (
                  <Stack
                    key={index}
                    sx={{
                      py: 1,
                      px: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      borderRadius: 1,
                    }}
                  >
                    <Box onClick={() => handleNotificationClick(notification)}>
                      <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
                        <Typography
                          variant='body2'
                          sx={{
                            fontWeight: 500,
                            color: '#333',
                            fontSize: '14px',
                          }}
                        >
                          {notification.from_name || '未知用户'}
                        </Typography>
                        {(() => {
                          const notificationText = getNotificationText(notification)
                          const { action, content } = splitNotificationText(notificationText)
                          return (
                            <>
                              {action && (
                                <Typography
                                  variant='body2'
                                  sx={{
                                    color: '#666',
                                    fontSize: '13px',
                                  }}
                                >
                                  {action}
                                </Typography>
                              )}
                              <Typography
                                variant='body2'
                                sx={{
                                  fontSize: '13px',
                                }}
                              >
                                {content}
                              </Typography>
                            </>
                          )
                        })()}
                      </Stack>
                      <Typography
                        variant='caption'
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'text.auxiliary',
                        }}
                      >
                        {notification.discuss_title || '无标题'}
                      </Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Box>
            <Box
              sx={{
                pt: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                size='small'
                color='info'
                onClick={() => {
                  router.push('/profile?tab=1')
                }}
              >
                查看全部通知
              </Button>
            </Box>
          </Stack>
        }
      >
        <Badge
          badgeContent={unreadCount}
          overlap='circular'
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#FF3B30',
              display: !!unreadCount ? 'block' : 'none',
              minWidth: 18,
              height: 18,
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(11,92,255,0.12)',
              transform: 'translate(10%, -20%)',
            },
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              transition: 'background .18s, transform .08s',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#F3F6FE',
              },
              '&:active': { transform: 'translateY(0)' },
            }}
          >
            <NotificationsNoneOutlinedIcon sx={{ color: '#000', fontSize: 20 }} />
          </Box>
        </Badge>
      </Tooltip>
      <Tooltip
        placement='bottom-end'
        slotProps={{
          tooltip: {
            sx: {
              backgroundColor: '#fff',
              boxShadow: '0px 20px 40px 0px rgba(0,28,85,0.06)',
              minWidth: '300px',
              padding: '20px',
              borderRadius: '8px',
            },
          },
          popper: {
            sx: {
              paddingRight: '24px',
              margin: '0px -24px 0px 0px !important',
            },
          },
        }}
        title={<ProfilePanel />}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 头像 */}
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background .18s, transform .08s',
              '&:hover': {
                backgroundColor: '#F3F6FE',
              },
            }}
          >
            <Avatar size={36} src={user?.avatar} />
          </Box>
        </Box>
      </Tooltip>
    </>
  )
}

export default LoggedInView
