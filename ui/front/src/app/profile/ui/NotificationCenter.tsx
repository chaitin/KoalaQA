'use client'

import {
  getUserNotifyList,
  postUserNotifyRead,
  getUserNotifyUnread,
  postUserNotifyWeb,
  ModelMessageNotify,
  ModelMsgNotifyType,
} from '@/api'
import {
  Box,
  Stack,
  Typography,
  Checkbox,
  FormControlLabel,
  Tooltip,
  IconButton,
  Button,
  Card,
  SelectChangeEvent,
} from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { useEffect, useState, useCallback, useContext } from 'react'
import { useRequest } from 'ahooks'
import dayjs from '@/lib/dayjs'
import { MarkDown, Message } from '@/components'
import Modal from '@/components/modal'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { useForumStore } from '@/store'
import { getNotificationTextForExport, splitNotificationText } from '@/components/header/loggedInView'
import { AuthContext } from '@/components/authProvider'
import { Ellipsis } from '@ctzhian/ui'
import Pagination from '@/components/pagination'
import Image from 'next/image'

export default function NotificationCenter() {
  const routerWithRouteName = useRouterWithRouteName()
  const forums = useForumStore((s) => s.forums)
  const [notifyPage, setNotifyPage] = useState(1)
  const [notifyPageSize, setNotifyPageSize] = useState(10)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationSupported, setIsNotificationSupported] = useState(false)
  const { user, fetchUser } = useContext(AuthContext)

  // 检查是否支持浏览器通知（需要 HTTPS 或 localhost）
  // 使用 useEffect 确保只在客户端执行，避免 hydration 不匹配
  useEffect(() => {
    setIsNotificationSupported(
      typeof window !== 'undefined' &&
        'Notification' in window &&
        (window.location.protocol === 'https:' ||
          window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1'),
    )
  }, [])
  // 使用 useRequest 加载通知列表
  const {
    data: notifyData,
    loading: loadingNotifications,
    run: fetchNotifications,
  } = useRequest(
    (params: { page: number; size: number }) =>
      getUserNotifyList({
        page: params.page,
        size: params.size,
      }),
    {
      manual: true,
      onError: (error) => {
        console.error('加载通知失败:', error)
        Message.error('加载通知失败')
      },
    },
  )

  const notifications = notifyData?.items || []
  const notifyTotal = notifyData?.total || 0

  // 加载未读数量
  const loadUnreadCount = useCallback(async () => {
    try {
      // 获取未读通知数量，API 已自动提取 data，直接返回 number 类型
      const count = await getUserNotifyUnread()
      if (typeof count === 'number' && count >= 0) {
        setUnreadCount(count)
      }
    } catch (error) {
      console.error('加载未读数量失败:', error)
      // 不显示错误提示，避免干扰用户体验
    }
  }, [])

  // 处理网页通知开关变化
  const handleWebNotifyChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked
    try {
      await postUserNotifyWeb({ enable: checked })
      await fetchUser()

      // 如果启用了网页通知，请求浏览器通知权限
      if (checked && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          // 权限还未请求，现在请求
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            Message.success('已启用网页通知，浏览器通知权限已授予')
          } else if (permission === 'denied') {
            Message.warning('浏览器通知权限被拒绝，请在浏览器设置中允许通知')
          }
        } else if (Notification.permission === 'granted') {
          Message.success('已启用网页通知')
        } else {
          Message.warning('浏览器通知权限被拒绝，请在浏览器设置中允许通知')
        }
      } else {
        Message.success(checked ? '已启用网页通知' : '已关闭网页通知')
      }
    } catch (error) {
      console.error('更新网页通知状态失败:', error)
      Message.error('更新网页通知状态失败')
    }
  }

  // 加载通知列表和未读数量
  useEffect(() => {
    fetchNotifications({
      page: notifyPage,
      size: notifyPageSize,
    })
    loadUnreadCount()
    // 注意：这里故意不包含 fetchNotifications 和 loadUnreadCount 作为依赖
    // 因为它们应该是稳定的，避免重复调用
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifyPage, notifyPageSize])

  const handleNotificationClick = async (notification: ModelMessageNotify) => {
    const isUserReview = notification.type === ModelMsgNotifyType.MsgNotifyTypeUserReview
    // 标记为已读
    if (notification.id) {
      try {
        postUserNotifyRead({ id: notification.id })
      } catch (error) {
        Message.error('标记已读失败')
        return // 如果标记失败，不跳转
      }
    }

    if (isUserReview) {
      return
    }

    // 跳转到对应的讨论
    if (notification.discuss_uuid && notification.forum_id) {
      const forum = forums.find((f) => f.id === notification.forum_id)
      const routePath = forum?.route_name
        ? `/${forum.route_name}/${notification.discuss_uuid}`
        : `/${notification.forum_id}/${notification.discuss_uuid}`
      routerWithRouteName.push(routePath)
    }
  }

  const handleMarkAllRead = async () => {
    Modal.confirm({
      title: '确定要将所有通知标记为已读吗？',
      content: '此操作将把所有未读通知标记为已读，无法撤销。',
      okButtonProps: { color: 'primary' },
      onOk: async () => {
        try {
          await postUserNotifyRead({ id: 0 })
          // 重新加载通知列表
          fetchNotifications({
            page: notifyPage,
            size: notifyPageSize,
          })
          await loadUnreadCount()
          Message.success('全部标记为已读')
        } catch (error) {
          console.error('标记全部已读失败:', error)
          Message.error('标记全部已读失败')
        }
      },
    })
  }

  // 处理分页变化
  const handlePageChange = useCallback((_event: unknown, newPage: number) => {
    setNotifyPage(newPage)
  }, [])

  // 处理每页条数变化
  const handleRowsPerPageChange = useCallback((event: SelectChangeEvent<number>) => {
    setNotifyPageSize(+event.target.value)
    setNotifyPage(1) // 重置到第一页
  }, [])

  // 格式化通知文本（使用 loggedInView 中的逻辑）
  const formatNotificationText = (notification: ModelMessageNotify): string => {
    return getNotificationTextForExport(notification)
  }

  return (
    <Box sx={{ pb: 3, pt: 1 }}>
      {/* 头部：未读数量和全部已读按钮 */}
      <Stack direction='row' alignItems='center' sx={{ pb: 1, borderBottom: '1px solid #e0e0e0', mb: 3 }}>
        <Typography variant='body2' sx={{ fontSize: '14px', mr: 2 }}>
          <Box component='span' sx={{ color: 'rgba(33, 34, 45, 1)' }}>
            {unreadCount}
          </Box>
          <Box component='span' sx={{ color: 'rgba(33, 34, 45, 0.50)' }}>
            {' 条未读'}
          </Box>
        </Typography>
        <Button
          onClick={handleMarkAllRead}
          sx={{
            fontSize: '14px',
            color: '#006397',
            textTransform: 'none',
            padding: '4px 12px',
            minWidth: 'auto',
            '&:hover': {
              backgroundColor: 'transparent',
            },
          }}
        >
          全部已读
        </Button>

        <Stack direction='row' alignItems='center' spacing={0.5} sx={{ ml: 'auto' }}>
          <FormControlLabel
            disabled={!isNotificationSupported}
            control={
              <Checkbox
                checked={user.web_notify ?? false}
                onChange={handleWebNotifyChange}
                sx={{
                  color: '#21222D',
                  '&.Mui-checked': {
                    color: '#006397',
                  },
                }}
              />
            }
            label='启用网页通知'
            sx={{
              '& .MuiFormControlLabel-label': {
                fontSize: '14px',
                color: 'rgba(33, 34, 45, 1)',
              },
            }}
          />
          <Tooltip
            title='网页的 Notification 功能通常要求网站通过 HTTPS 协议提供服务。这是现代浏览器出于安全考虑而强制执行的一项重要安全措施。'
            arrow
            placement='top'
          >
            <IconButton
              size='small'
              sx={{
                padding: '4px',
                color: '#999',
                '&:hover': {
                  color: '#666',
                },
              }}
            >
              <HelpOutlineIcon sx={{ fontSize: '16px' }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* 通知列表 */}
      {loadingNotifications ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color='text.secondary'>加载中...</Typography>
        </Box>
      ) : notifications.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Image
              src='/empty.png'
              alt='暂无通知'
              width={250}
              height={137}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </Box>
          <Typography color='text.secondary'>暂无通知</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {notifications.map((notification) => {
            const notificationText = formatNotificationText(notification)

            return (
              <Card
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  boxShadow: 'none',
                  p: 2,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(0,99,151,0.03)',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: 'rgba(0,99,151,0.05)',
                  },
                }}
              >
                <Stack direction='row' spacing={1} alignItems='center'>
                  {/* 未读/已读指示点 */}
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: !notification.read ? '#FF3B30' : '#999',
                      flexShrink: 0,
                    }}
                  />

                  {/* 通知内容 */}
                  <Box sx={{ flex: 1, minWidth: 0, textWrap: 'nowrap' }}>
                    {notification.type === ModelMsgNotifyType.MsgNotifyTypeUserReview ? (
                      <Typography
                        variant='body2'
                        sx={{
                          color: 'rgba(33, 34, 45, 1)',
                          fontWeight: 500,
                          fontSize: '14px',
                        }}
                      >
                        {notificationText}
                      </Typography>
                    ) : (
                      <Stack direction='row' spacing={0.5} alignItems='center'>
                        <Typography
                          variant='body2'
                          sx={{
                            color: 'rgba(33, 34, 45, 0.70)',
                            fontSize: '14px',
                            fontWeight: 400,
                          }}
                        >
                          {notification.from_name || '未知用户'}
                        </Typography>
                        {notificationText && (
                          <Typography
                            variant='body2'
                            sx={{
                              color: 'rgba(33, 34, 45, 1)',
                              fontWeight: '500',
                              fontSize: '14px',
                            }}
                          >
                            {notificationText}
                          </Typography>
                        )}
                        {notification.type === ModelMsgNotifyType.MsgNotifyTypeReplyComment ? (
                          <>
                            {" '"}
                            <MarkDown
                              content={notification.parent_comment}
                              truncateLength={10}
                              sx={{ bgcolor: 'transparent', color: 'rgba(33, 34, 45, 0.70)', fontWeight: 400 }}
                            />
                            {"'"}
                          </>
                        ) : (
                          <Ellipsis
                            sx={{
                              color: 'rgba(33, 34, 45, 0.70)',
                              fontSize: '14px',
                              fontWeight: 400,
                            }}
                          >
                            "{notification.discuss_title}"
                          </Ellipsis>
                        )}
                      </Stack>
                    )}
                  </Box>

                  {/* 时间戳 */}
                  <Typography
                    variant='caption'
                    sx={{
                      color: '#999',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {notification.created_at ? dayjs(notification.created_at * 1000).format('YYYY/MM/DD HH:mm:ss') : ''}
                  </Typography>
                </Stack>
              </Card>
            )
          })}
        </Stack>
      )}

      {/* 分页器 */}
      {notifyTotal > notifyPageSize && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={notifyTotal}
            page={notifyPage}
            rowsPerPage={notifyPageSize}
            onPageChange={handlePageChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
            onRowsPerPageChange={handleRowsPerPageChange}
            sx={{
              backgroundColor: 'transparent',
            }}
          />
        </Box>
      )}
    </Box>
  )
}
