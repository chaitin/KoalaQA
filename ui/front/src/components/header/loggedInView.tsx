'use client'
import { AuthContext } from '@/components/authProvider'
import { Avatar } from '@/components/discussion'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import { Badge, Box, Button, Stack, Tooltip, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import React, { useContext, useEffect, useRef, useState } from 'react'
import ProfilePanel from './profilePanel'

enum MsgNotifyType {
  MsgNotifyTypeUnknown,
  MsgNotifyTypeReplyDiscuss, // 回答了你的问题
  MsgNotifyTypeReplyComment, // 回复了你的回答
  MsgNotifyTypeApplyComment, // 采纳了你的回答
  MsgNotifyTypeLikeComment, //赞同了你的回答
  MsgNotifyTypeDislikeComment, // 不喜欢你的回答 、不喜欢机器人的回答（仅管理员）
  MsgNotifyTypeBotUnknown, //提出了机器人无法回答的问题（仅管理员
}
const getNotificationText = (info: MessageNotifyInfo): string => {
  switch (info.type) {
    case MsgNotifyType.MsgNotifyTypeReplyDiscuss:
      return '回答了你的问题'
    case MsgNotifyType.MsgNotifyTypeReplyComment:
      return '回复了你的回答'
    case MsgNotifyType.MsgNotifyTypeApplyComment:
      return '采纳了你的回答'
    case MsgNotifyType.MsgNotifyTypeLikeComment:
      return '赞同了你的回答'
    case MsgNotifyType.MsgNotifyTypeDislikeComment:
      return info?.to_bot ? '不喜欢机器人的回答' : '不喜欢你的回答'
    case MsgNotifyType.MsgNotifyTypeBotUnknown:
      return '提出了机器人无法回答的问题'
    default:
      return ''
  }
}

type MessageNotifyInfo = {
  discuss_id: number
  discuss_title: string
  discuss_uuid: string
  type: MsgNotifyType
  from_id: number
  from_name: string
  from_bot: boolean
  to_id: number
  to_name: string
  to_bot: boolean
  id: number
}
export interface LoggedInProps {
  user: any | null
  verified?: boolean
}

const LoggedInView: React.FC<LoggedInProps> = ({ user: propUser }) => {
  const { user: contextUser } = useContext(AuthContext)
  const user = propUser || contextUser
  const [notifications, setNotifications] = useState<MessageNotifyInfo[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
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
      router.push(`/discuss/${notification.discuss_uuid}`)
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
          <Stack spacing={1} sx={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>暂无通知</Box>
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
                  direction='row'
                  alignItems='center'
                >
                  <Box onClick={() => handleNotificationClick(notification)}>
                    <Typography variant='body1' sx={{ display: 'inline', pr: 1 }}>
                      {notification.from_name}
                    </Typography>
                    <Typography sx={{ display: 'inline' }} variant='caption'>
                      {getNotificationText(notification)}
                    </Typography>
                  </Box>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 2, id: notification.id }))
                      }
                      setUnreadCount((c) => Math.max(0, c - 1))
                      setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
                    }}
                    sx={{
                      ml: 1,
                      flexShrink: 0,
                      borderRadius: 1,
                      fontSize: '12px',
                    }}
                    size='small'
                  >
                    忽略
                  </Button>
                </Stack>
              ))
            )}
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
              minWidth: 20,
              height: 20,
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
                backgroundColor: '#E6F0FF',
                transform: 'translateY(-1px)',
              },
              '&:active': { transform: 'translateY(0)' },
            }}
          >
            <NotificationsNoneOutlinedIcon sx={{ color: '#000' }} />
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
          {/* 头像：浅蓝色渐变背景，悬停有阴影 */}
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background .18s, box-shadow .18s, transform .08s',
              '&:hover': {
                background: '#E6F3FF',
                boxShadow: '0 6px 12px rgba(11,92,255,0.12)',
                transform: 'translateY(-1px)',
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
