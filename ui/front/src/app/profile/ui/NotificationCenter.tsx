'use client'

import {
  deleteUserNotifySub,
  getSystemNotifySub,
  getUserNotifyList,
  getUserNotifySubAuthUrl,
  getUserNotifySubBind,
  getUserNotifySubWechatOfficialAccountQrcode,
  getUserNotifyUnread,
  ModelMessageNotify,
  ModelMessageNotifySubType,
  ModelMsgNotifyType,
  postUserNotifyRead,
} from '@/api'
import { MarkDown, Message } from '@/components'
import { getNotificationTextForExport } from '@/components/header/loggedInView'
import Modal from '@/components/modal'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import dayjs from '@/lib/dayjs'
import { useForumStore } from '@/store'
import { Icon } from '@ctzhian/ui'
import SettingsIcon from '@mui/icons-material/Settings'
import { Box, Button, Card, Pagination, Stack, Typography, useMediaQuery, useTheme, IconButton } from '@mui/material'
import { useRequest } from 'ahooks'
import Image from 'next/image'
import { useSearchParams, usePathname } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react'

export default function NotificationCenter() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const routerWithRouteName = useRouterWithRouteName()
  const forums = useForumStore((s) => s.forums)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [notifyPage, setNotifyPage] = useState(1)
  const [notifyPageSize, setNotifyPageSize] = useState(10)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showChannelConfigModal, setShowChannelConfigModal] = useState(false)
  const [dingtalkBound, setDingtalkBound] = useState(false)
  const [dingtalkAccount, setDingtalkAccount] = useState('')
  const [wechatBound, setWechatBound] = useState(false)
  const [wechatAccount, setWechatAccount] = useState('')
  const [enabledConfigs, setEnabledConfigs] = useState<ModelMessageNotifySubType[]>([])
  const [showConfigButton, setShowConfigButton] = useState(false)
  const pollTimerRef = useRef<any>(null)
  const [showQrcodeModal, setShowQrcodeModal] = useState(false)
  const [qrcodeUrl, setQrcodeUrl] = useState('')
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

  // 检测是否在钉钉应用内打开
  const isInDingtalkApp = useCallback((): boolean => {
    if (typeof globalThis === 'undefined' || typeof navigator === 'undefined') return false

    // 方法1: 检查钉钉 JS-SDK 注入的全局对象（最可靠）
    // 钉钉会在 window 上注入 dd 对象
    if ((globalThis as any).dd) {
      return true
    }

    // 方法2: 检查 User-Agent（辅助判断）
    const ua = navigator.userAgent.toLowerCase()
    // 钉钉的 User-Agent 通常包含 DingTalk 或 AliApp
    if (ua.includes('dingtalk') || ua.includes('aliapp')) {
      return true
    }

    return false
  }, [])

  // 获取绑定状态
  const loadBindStatus = useCallback(async () => {
    try {
      const res = await getUserNotifySubBind()
      const items = res?.items || []
      // 查找钉钉类型的绑定记录
      const dingtalkBind = items.find(
        (item) => item.type === ModelMessageNotifySubType.MessageNotifySubTypeDingtalk,
      )
      setDingtalkBound(!!dingtalkBind)
      setDingtalkAccount((dingtalkBind as any)?.third_name || dingtalkBind?.third_id || '')

      // 查找微信类型的绑定记录
      const wechatBind = items.find(
        (item) => item.type === ModelMessageNotifySubType.MessageNotifySubTypeWechatOfficialAccount,
      )
      setWechatBound(!!wechatBind)
      // 绑定后需要展示绑定的微信账户名称
      setWechatAccount((wechatBind as any)?.third_name || wechatBind?.third_id || '')
    } catch (error) {
      console.error('获取绑定状态失败:', error)
      setDingtalkBound(false)
      setWechatBound(false)
    }
  }, [])

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

  // 开始轮询绑定状态
  const startPollingBindStatus = useCallback(() => {
    // 如果已经在轮询，先清除
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await getUserNotifySubBind()
        const items = res?.items || []
        const wechatBind = items.find(
          (item) => item.type === ModelMessageNotifySubType.MessageNotifySubTypeWechatOfficialAccount,
        )

        if (wechatBind) {
          // 已经绑定成功
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null

          // 关闭二维码弹窗
          setShowQrcodeModal(false)

          // 更新当前状态
          setWechatBound(true)
          setWechatAccount((wechatBind as any)?.third_name || wechatBind?.third_id || '')
          Message.success('微信已成功绑定')
        }
      } catch (error) {
        console.error('轮询绑定状态失败:', error)
      }
    }, 2000)
  }, [])

  // 清除轮询
  const stopPollingBindStatus = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  // 组件销毁或弹窗关闭时清除轮询
  useEffect(() => {
    if (!showChannelConfigModal || !showQrcodeModal) {
      if (!showQrcodeModal) {
        stopPollingBindStatus()
      }
    }
  }, [showChannelConfigModal, showQrcodeModal, stopPollingBindStatus])

  useEffect(() => {
    return () => {
      stopPollingBindStatus()
    }
  }, [stopPollingBindStatus])

  // 加载系统通知订阅配置，判断是否显示配置按钮
  const loadSystemNotifySubConfig = useCallback(async () => {
    try {
      const res = await getSystemNotifySub()
      const items = res?.items || []
      // 获取已启用的配置类型
      const enabledTypes = items.filter(item => item.enabled).map(item => item.type)
      setEnabledConfigs(enabledTypes as ModelMessageNotifySubType[])
      // 只有当存在启用的配置时才显示配置按钮
      setShowConfigButton(enabledTypes.length > 0)
    } catch (error) {
      console.error('加载系统通知订阅配置失败:', error)
      setShowConfigButton(false)
    }
  }, [])

  // 加载系统通知订阅配置
  useEffect(() => {
    loadSystemNotifySubConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 处理关闭弹窗并清除 URL 参数
  const handleCloseModal = useCallback(() => {
    setShowChannelConfigModal(false)
    // 清除 URL 中的 notify_sub 和 error 参数
    const currentPath = pathname || '/profile'
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('notify_sub')
    params.delete('error')
    const newSearch = params.toString()
    const newUrl = newSearch ? `${currentPath}?${newSearch}` : currentPath
    routerWithRouteName.replace(newUrl)
  }, [pathname, searchParams, routerWithRouteName])

  // 当弹窗打开时，调用接口获取绑定状态
  useEffect(() => {
    if (showChannelConfigModal) {
      loadBindStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChannelConfigModal])

  // 处理从钉钉返回后的参数
  useEffect(() => {
    const notifySub = searchParams?.get('notify_sub')
    const error = searchParams?.get('error')

    if (notifySub === 'true') {
      // 清除 URL 参数
      // const currentPath = pathname || '/profile'
      // routerWithRouteName.replace(currentPath)

      // 只要 notify_sub=true 就打开弹窗
      setShowChannelConfigModal(true)

      if (error) {
        // 如果有错误，显示错误提示，但状态不改为已绑定
        Message.error(`绑定失败: ${error}`)
        setDingtalkBound(false)
      } else {
        // 如果成功，重新获取绑定状态
        getUserNotifySubBind()
          .then((res) => {
            const items = res?.items || []
            const dingtalkBind = items.find(
              (item) => item.type === ModelMessageNotifySubType.MessageNotifySubTypeDingtalk,
            )
            setDingtalkBound(!!dingtalkBind)
            if (dingtalkBind) {
              Message.success('绑定成功')
            }
          })
          .catch((err) => {
            console.error('获取绑定状态失败:', err)
            setDingtalkBound(false)
          })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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
        {showConfigButton && (
          <IconButton
            onClick={() => setShowChannelConfigModal(true)}
            sx={{
              ml: 'auto',
              color: 'primary.main',
              padding: '4px',
              '&:hover': {
                backgroundColor: 'transparent',
              },
            }}
            size='small'
          >
            <SettingsIcon sx={{ fontSize: '18px' }} />
          </IconButton>
        )}
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

      {/* 通知渠道配置弹窗 */}
      <Modal
        open={showChannelConfigModal}
        onClose={handleCloseModal}
        onCancel={handleCloseModal}
        title='通知渠道配置'
        width={540}
        footer={null}
      >
        <Stack spacing={2}>
          <Typography
            variant='body2'
            sx={{
              color: 'rgba(33, 34, 45, 0.70)',
              fontSize: '14px',
              mb: 3,
            }}
          >
            绑定通知渠道后,您可以在对应平台接收消息通知
          </Typography>

          {/* 钉钉渠道卡片 */}
          {enabledConfigs.includes(ModelMessageNotifySubType.MessageNotifySubTypeDingtalk) && (
            <Card
              sx={{
                p: 2.5,
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: 'none',
                mb: 0,
              }}
            >
              <Stack direction='row' alignItems='center' spacing={2}>
                <Icon type='icon-dingding' sx={{ fontSize: 40 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant='body1'
                    sx={{
                      fontWeight: 600,
                      fontSize: '16px',
                      color: 'rgba(33, 34, 45, 1)',
                      mb: 0.5,
                    }}
                  >
                    钉钉
                    {dingtalkBound && dingtalkAccount && (
                      <Typography component='span' sx={{ ml: 1, color: 'primary.main', fontSize: '14px' }}>
                        ({dingtalkAccount})
                      </Typography>
                    )}
                  </Typography>

                  <Typography
                    variant='body2'
                    sx={{
                      fontSize: '14px',
                      color: 'rgba(33, 34, 45, 0.70)',
                    }}
                  >
                    绑定钉钉账号,接收钉钉消息通知
                  </Typography>
                </Box>

                <Stack direction='row' alignItems='center' spacing={2}>
                  {dingtalkBound ? (
                    <>
                      <Stack direction='row' alignItems='center' spacing={1}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#52c41a',
                          }}
                        />
                        <Typography
                          variant='body2'
                          sx={{
                            fontSize: '14px',
                            color: 'rgba(33, 34, 45, 0.70)',
                          }}
                        >
                          已绑定
                        </Typography>
                      </Stack>
                      <Button
                        variant='outlined'
                        color='error'
                        size='small'
                        onClick={() => {
                          Modal.confirm({
                            title: '确定要解除绑定吗？',
                            content: '解除绑定后，您将无法在钉钉接收消息通知。',
                            okButtonProps: { color: 'primary' },
                            onOk: () => {
                              void deleteUserNotifySub({
                                type: ModelMessageNotifySubType.MessageNotifySubTypeDingtalk,
                              })
                                .then(() => {
                                  return loadBindStatus()
                                })
                                .then(() => {
                                  Message.success('已解除绑定')
                                })
                                .catch((error) => {
                                  console.error('解除绑定失败:', error)
                                  Message.error('解除绑定失败，请稍后重试')
                                })
                            },
                          })
                        }}
                        sx={{
                          textTransform: 'none',
                          fontSize: '14px',
                          minWidth: 'auto',
                          px: 2,
                        }}
                      >
                        解除绑定
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant='contained'
                      color='primary'
                      size='small'
                      onClick={async () => {
                        try {
                          const url = await getUserNotifySubAuthUrl({
                            app: isInDingtalkApp(),
                            type: ModelMessageNotifySubType.MessageNotifySubTypeDingtalk,
                          })
                          if (url && url.trim() !== '') {
                            if (typeof globalThis !== 'undefined' && globalThis.location) {
                              globalThis.location.href = url
                            }
                          } else {
                            Message.error('获取绑定链接失败，请稍后重试')
                          }
                        } catch (error) {
                          console.error('获取绑定链接失败:', error)
                          Message.error('获取绑定链接失败，请稍后重试')
                        }
                      }}
                      sx={{
                        textTransform: 'none',
                        fontSize: '14px',
                        minWidth: 'auto',
                        px: 2,
                      }}
                    >
                      立即绑定
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Card>
          )}

          {/* 微信服务号渠道卡片 */}
          {enabledConfigs.includes(ModelMessageNotifySubType.MessageNotifySubTypeWechatOfficialAccount) && (
            <Card
              sx={{
                p: 2.5,
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                boxShadow: 'none',
              }}
            >
              <Stack direction='row' alignItems='center' spacing={2}>
                <Icon type='icon-weixingongzhonghao1' sx={{ fontSize: 40 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant='body1'
                    sx={{
                      fontWeight: 600,
                      fontSize: '16px',
                      color: 'rgba(33, 34, 45, 1)',
                      mb: 0.5,
                    }}
                  >
                    微信服务号
                    {/* <Typography component='span' sx={{ ml: 1, color: 'primary.main', fontSize: '14px' }}>
                      (微信服务号)
                    </Typography> */}
                  </Typography>
                  <Typography
                    variant='body2'
                    sx={{
                      fontSize: '14px',
                      color: 'rgba(33, 34, 45, 0.70)',
                    }}
                  >
                    绑定微信服务号,接收微信消息通知
                  </Typography>
                </Box>

                <Stack direction='row' alignItems='center' spacing={2}>
                  {wechatBound ? (
                    <>
                      <Stack direction='row' alignItems='center' spacing={1}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: '#52c41a',
                          }}
                        />
                        <Typography
                          variant='body2'
                          sx={{
                            fontSize: '14px',
                            color: 'rgba(33, 34, 45, 0.70)',
                          }}
                        >
                          已绑定
                        </Typography>
                      </Stack>
                      <Button
                        variant='outlined'
                        color='error'
                        size='small'
                        onClick={() => {
                          Modal.confirm({
                            title: '确定要解除绑定吗？',
                            content: '解除绑定后，您将无法在微信接收消息通知。',
                            okButtonProps: { color: 'primary' },
                            onOk: () => {
                              void deleteUserNotifySub({
                                type: ModelMessageNotifySubType.MessageNotifySubTypeWechatOfficialAccount,
                              })
                                .then(() => {
                                  return loadBindStatus()
                                })
                                .then(() => {
                                  Message.success('已解除绑定')
                                })
                                .catch((error) => {
                                  console.error('解除绑定失败:', error)
                                  Message.error('解除绑定失败，请稍后重试')
                                })
                            },
                          })
                        }}
                        sx={{
                          textTransform: 'none',
                          fontSize: '14px',
                          minWidth: 'auto',
                          px: 2,
                        }}
                      >
                        解除绑定
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant='contained'
                      color='primary'
                      size='small'
                      onClick={async () => {
                        try {
                          const blob = await getUserNotifySubWechatOfficialAccountQrcode({ format: 'blob' })

                          if (blob && blob instanceof Blob) {
                            const url = URL.createObjectURL(blob)
                            setQrcodeUrl(url)
                            setShowQrcodeModal(true)

                            // 开启轮询
                            startPollingBindStatus()
                          } else {
                            Message.error('获取绑定二维码失败，请稍后重试')
                          }
                        } catch (error) {
                          console.error('获取绑定链接失败:', error)
                          Message.error('获取绑定链接失败，请稍后重试')
                        }
                      }}
                      sx={{
                        textTransform: 'none',
                        fontSize: '14px',
                        minWidth: 'auto',
                        px: 2,
                      }}
                    >
                      立即绑定
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Card>
          )}
        </Stack>
      </Modal>

      {/* 微信绑定二维码弹窗 */}
      <Modal
        open={showQrcodeModal}
        onCancel={() => setShowQrcodeModal(false)}
        onClose={() => setShowQrcodeModal(false)}
        title='微信绑定'
        width={400}
        footer={null}
      >
        <Stack alignItems='center' spacing={2} sx={{ py: 2 }}>
          {qrcodeUrl ? (
            <Image
              src={qrcodeUrl}
              alt='微信绑定二维码'
              width={240}
              height={240}
              style={{ borderRadius: '8px' }}
            />
          ) : (
            <Box sx={{ width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.05)', borderRadius: '8px' }}>
              加载中...
            </Box>
          )}
          <Typography variant='body2' color='text.secondary'>
            请使用微信扫描上方二维码进行绑定
          </Typography>
        </Stack>
      </Modal>
    </Box>
  )
}
