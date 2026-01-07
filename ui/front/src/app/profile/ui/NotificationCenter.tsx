'use client'

import {
  getUserNotifyList,
  getUserNotifyUnread,
  ModelMessageNotify,
  ModelMsgNotifyType,
  postUserNotifyRead,
} from '@/api'
import { MarkDown, Message } from '@/components'
import { getNotificationTextForExport } from '@/components/header/loggedInView'
import Modal from '@/components/modal'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import dayjs from '@/lib/dayjs'
import { useForumStore } from '@/store'
import { Ellipsis } from '@ctzhian/ui'
import { Box, Button, Card, Pagination, Stack, Typography, useMediaQuery, useTheme } from '@mui/material'
import { useRequest } from 'ahooks'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

export default function NotificationCenter() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const routerWithRouteName = useRouterWithRouteName()
  const forums = useForumStore((s) => s.forums)
  const [notifyPage, setNotifyPage] = useState(1)
  const [notifyPageSize, setNotifyPageSize] = useState(10)
  const [unreadCount, setUnreadCount] = useState(0)
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
    const isUserPoint = notification.type === ModelMsgNotifyType.MsgNotifyTypeUserPoint
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

    if (isUserPoint) {
      // 对于积分变动通知，跳转到个人中心的积分页面
      routerWithRouteName.push('/profile?tab=5')
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
  // MUI Pagination 组件的 onChange 传递的是 (event: React.ChangeEvent<unknown>, page: number)
  const handlePageChange = useCallback((_event: React.ChangeEvent<unknown>, page: number) => {
    setNotifyPage(page)
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
            color: 'primary.main',
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

        {/* <Stack direction='row' alignItems='center' spacing={0.5} sx={{ ml: 'auto' }}>
          <FormControlLabel
            disabled={!isNotificationSupported}
            control={
              <Checkbox
                checked={user.web_notify ?? false}
                onChange={handleWebNotifyChange}
                sx={{
                  color: '#21222D',
                  '&.Mui-checked': {
                    color: 'primary.main',
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
        </Stack> */}
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
                  backgroundColor: '#fafbfc',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  '&:hover': {
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
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

                  {/* 通知内容和时间戳容器 */}
                  <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                    {/* 通知内容 */}
                    <Box sx={{ overflow: 'hidden', mb: { xs: 0.5, sm: 0 } }}>
                      {notification.type === ModelMsgNotifyType.MsgNotifyTypeUserReview ||
                      notification.type === ModelMsgNotifyType.MsgNotifyTypeUserPoint ? (
                        <Typography
                          variant='body2'
                          sx={{
                            color: 'rgba(33, 34, 45, 1)',
                            fontWeight: 500,
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            pr: { xs: 0, sm: 2 },
                          }}
                        >
                          {notificationText}
                        </Typography>
                      ) : (
                        <Stack
                          direction='row'
                          spacing={0.5}
                          alignItems='center'
                          sx={{
                            flexWrap: { xs: 'wrap', sm: 'nowrap' },
                            gap: { xs: 0.5, sm: 0 },
                            pr: { xs: 0, sm: 2 },
                          }}
                        >
                          <Typography
                            variant='body2'
                            sx={{
                              color: 'rgba(33, 34, 45, 0.70)',
                              fontSize: '14px',
                              fontWeight: 400,
                              flexShrink: 0,
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
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                              }}
                            >
                              {notificationText}
                            </Typography>
                          )}
                          <Box sx={{ ml: 0.5 }}>'</Box>
                          <MarkDown
                            content={
                              notification.type === ModelMsgNotifyType.MsgNotifyTypeReplyComment
                                ? notification.parent_comment
                                : notification.discuss_title
                            }
                            truncateLength={10}
                            sx={{
                              ml: '0!important',
                              bgcolor: 'transparent',
                              color: 'rgba(33, 34, 45, 0.70)',
                              fontWeight: 400,
                              fontSize: '14px',
                            }}
                          />
                          '
                        </Stack>
                      )}
                    </Box>

                    {/* 时间戳 - 在手机端显示在内容下方 */}
                    <Typography
                      variant='caption'
                      sx={{
                        color: '#999',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        display: { xs: 'block', sm: 'none' },
                      }}
                    >
                      {notification.created_at
                        ? dayjs(notification.created_at * 1000).format('YYYY/MM/DD HH:mm:ss')
                        : ''}
                    </Typography>
                  </Box>

                  {/* 时间戳 - 在桌面端显示在右侧 */}
                  <Typography
                    variant='caption'
                    sx={{
                      color: '#999',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: { xs: 'none', sm: 'block' },
                      alignSelf: 'center',
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
        <Box
          sx={{
            mt: 3,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            px: { xs: 1, sm: 0 },
          }}
        >
          <Pagination
            count={Math.ceil(notifyTotal / notifyPageSize)}
            page={notifyPage}
            onChange={handlePageChange}
            color='primary'
            size={isMobile ? 'small' : 'medium'}
            showFirstButton={!isMobile}
            showLastButton={!isMobile}
            sx={{
              '& .MuiPagination-ul': {
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: isMobile ? 0.5 : 1,
              },
              '& .MuiPaginationItem-root': {
                fontSize: isMobile ? '0.75rem' : '0.875rem',
                minWidth: isMobile ? 32 : 40,
                height: isMobile ? 32 : 40,
                margin: isMobile ? '0 2px' : '0 4px',
              },
            }}
          />
        </Box>
      )}
    </Box>
  )
}
