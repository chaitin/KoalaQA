'use client'

import {
  getUserNotifyList,
  postUserNotifyRead,
  getUserNotifyUnread,
  postUserNotifyWeb,
  ModelMessageNotify,
} from '@/api'
import { Box, Button, Stack, Typography, Chip, Checkbox, FormControlLabel, Tooltip, IconButton } from '@mui/material'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { Table } from '@ctzhian/ui'
import { useEffect, useState, useCallback, useContext } from 'react'
import { useRequest } from 'ahooks'
import dayjs from '@/lib/dayjs'
import { Message } from '@/components'
import Modal from '@/components/modal'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { useForum } from '@/contexts/ForumContext'
import { getNotificationTextForExport, splitNotificationText } from '@/components/header/loggedInView'
import { AuthContext } from '@/components/authProvider'

export default function NotificationCenter() {
  const { forums } = useForum()
  const routerWithRouteName = useRouterWithRouteName()
  const [notifyPage, setNotifyPage] = useState(1)
  const [notifyPageSize, setNotifyPageSize] = useState(10)
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, fetchUser } = useContext(AuthContext)

  // 检查是否支持浏览器通知（需要 HTTPS 或 localhost）
  const isNotificationSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    (window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1')
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
    // 标记为已读
    if (notification.id) {
      try {
        postUserNotifyRead({ id: notification.id })
      } catch (error) {
        Message.error('标记已读失败')
        return // 如果标记失败，不跳转
      }
    }

    // 跳转到对应的讨论
    if (notification.discuss_uuid && notification.forum_id) {
      routerWithRouteName.push(`/${notification.forum_id}/${notification.discuss_uuid}`)
    }
  }

  const handleMarkAllRead = () => {
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

  // 格式化通知文本（使用 loggedInView 中的逻辑）
  const formatNotificationText = (notification: ModelMessageNotify): string => {
    return getNotificationTextForExport(notification)
  }

  // 定义表格列配置
  const columns = [
    {
      title: '',
      dataIndex: 'content',
      key: 'content',
      render: (_: any, record: ModelMessageNotify) => {
        return (
          <Box onClick={() => handleNotificationClick(record)} sx={{ cursor: 'pointer' }}>
            <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 0.5 }}>
              <Typography
                variant='body1'
                sx={{
                  fontWeight: 500,
                  color: '#333',
                  fontSize: '14px',
                }}
              >
                {record.from_name || '未知用户'}
              </Typography>
              {(() => {
                const notificationText = formatNotificationText(record)
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
              {!record.read && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#FF3B30',
                    ml: 0.5,
                  }}
                />
              )}
            </Stack>
            <Typography
              variant='body2'
              sx={{
                color: '#333',
                fontSize: '14px',
                fontWeight: 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {record.discuss_title || '无标题'}
            </Typography>
          </Box>
        )
      },
    },
    {
      title: '',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      align: 'right' as const,
      render: (_: any, record: ModelMessageNotify) => {
        return (
          <Typography
            variant='caption'
            onClick={() => handleNotificationClick(record)}
            sx={{
              color: '#999',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {record.created_at ? dayjs(record.created_at * 1000).format('YYYY-MM-DD HH:mm:ss') : ''}
          </Typography>
        )
      },
    },
  ]

  return (
    <Box sx={{ p: 0 }}>
      {/* 头部：标题、未读数、全部已读按钮 */}
      <Stack direction='row' alignItems='center' sx={{ pb: 2, borderBottom: '1px solid #e0e0e0' }}>
        <Stack direction='row' spacing={2} alignItems='center'>
          <Typography variant='caption' sx={{ fontSize: '14px' }}>{`${unreadCount}条未读`}</Typography>
        </Stack>
        <Button onClick={handleMarkAllRead} sx={{ color: '#006397' }}>
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
                  color: '#006397',
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
                color: '#333',
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
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color='text.secondary'>暂无通知</Typography>
        </Box>
      ) : (
        <>
          <Table
            columns={columns}
            showHeader={false}
            dataSource={notifications}
            rowKey='id'
            pagination={{
              page: notifyPage,
              pageSize: notifyPageSize,
              total: notifyTotal,
              onChange: (page, rowsPerPage) => {
                if (rowsPerPage !== undefined && rowsPerPage !== notifyPageSize) {
                  setNotifyPageSize(rowsPerPage)
                }
                setNotifyPage(page)
              },
            }}
            sx={{
              '& .MuiTableRow-root': {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#fafafa',
                },
                '&:last-child td': {
                  borderBottom: 'none',
                },
              },
              '& .MuiTableCell-root': {
                borderBottom: '1px solid #f0f0f0',
                padding: '16px 12px',
              },
            }}
          />
        </>
      )}
    </Box>
  )
}
