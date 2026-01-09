'use client'
import {
  deleteDiscussionDiscIdFollow,
  getDiscussionDiscIdFollow,
  postDiscussionDiscIdFollow,
  postDiscussionDiscIdLike,
  postDiscussionDiscIdRevokeLike,
} from '@/api'
import { ModelDiscussionDetail, ModelDiscussionState, ModelDiscussionType, ModelUserRole } from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { formatNumber } from '@/lib/utils'
import { PointActionType, showPointNotification } from '@/utils/pointNotification'
import { Icon } from '@ctzhian/ui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import MoreVertIcon from '@mui/icons-material/MoreHoriz'
import CloseIcon from '@mui/icons-material/Close'
import { Box, IconButton, Stack, Typography, Fab, Backdrop } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'
import { useContext, useEffect, useState, useCallback, useRef } from 'react'

interface ActionButtonsProps {
  data: ModelDiscussionDetail
  menuAnchorEl?: HTMLElement | null
  onMenuClick: (event: React.MouseEvent<HTMLButtonElement>) => void
}

const ActionButtons = ({ data, menuAnchorEl, onMenuClick }: ActionButtonsProps) => {
  const { user } = useContext(AuthContext)
  const { checkAuth } = useAuthCheck()
  const router = useRouter()
  const { route_name }: { route_name?: string } = (useParams() as any) || {}
  const [followInfo, setFollowInfo] = useState<{ followed?: boolean; follower?: number }>({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mobileMoreButtonRef = useRef<HTMLButtonElement | null>(null)

  const isIssuePost = data.type === ModelDiscussionType.DiscussionTypeIssue
  const isQAPost = data.type === ModelDiscussionType.DiscussionTypeQA
  const isClosed = data.resolved === ModelDiscussionState.DiscussionStateClosed

  // 获取关注信息
  useEffect(() => {
    const fetchFollowInfo = async () => {
      try {
        const followData = await getDiscussionDiscIdFollow({ discId: data.uuid || '' })
        if (followData) {
          setFollowInfo({
            followed: followData.followed,
            follower: followData.follower,
          })
        }
      } catch (error) {
        console.error('Failed to fetch follow info:', error)
      }
    }
    if (isIssuePost) {
      fetchFollowInfo()
    }
  }, [data.uuid, isIssuePost])

  // 刷新页面但不增加浏览次数
  const refreshWithoutView = useCallback(() => {
    const url = new URL(globalThis.location.pathname, globalThis.location.origin)
    url.searchParams.set('refresh', 'true')
    router.replace(url.pathname + url.search)
  }, [router])

  const handleLike = async () => {
    return checkAuth(async () => {
      try {
        if (data.user_like) {
          await postDiscussionDiscIdRevokeLike({ discId: data.uuid || '' })
          showPointNotification(PointActionType.REVOKE_LIKE)
        } else {
          await postDiscussionDiscIdLike({ discId: data.uuid || '' })
        }
        refreshWithoutView()
      } catch (error) {
        console.error('点赞操作失败:', error)
      }
    })
  }

  const handleFollow = async () => {
    return checkAuth(async () => {
      const isFollowed = followInfo.followed
      try {
        if (isFollowed) {
          await deleteDiscussionDiscIdFollow({ discId: data.uuid || '' })
        } else {
          await postDiscussionDiscIdFollow({ discId: data.uuid || '' })
        }
        const followData = await getDiscussionDiscIdFollow({ discId: data.uuid || '' })
        if (followData) {
          setFollowInfo({
            followed: followData.followed,
            follower: followData.follower,
          })
        }
        refreshWithoutView()
      } catch (error) {
        console.error('关注操作失败:', error)
      }
    })
  }

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onMenuClick(event)
  }

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const handleMobileAction = (callback: () => void) => {
    callback()
    setMobileMenuOpen(false)
  }

  // 渲染单个圆形操作按钮（用于移动端菜单）
  const renderCircularButton = (
    icon: React.ReactNode,
    count?: number,
    onClick?: () => void,
    isActive?: boolean,
    index: number = 0,
    sx?: any,
    buttonRef?: React.Ref<HTMLButtonElement>,
  ) => (
    <Box
      component={onClick ? 'button' : 'div'}
      ref={buttonRef as any}
      onClick={onClick ? () => handleMobileAction(onClick) : undefined}
      sx={(theme) => ({
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: '50%',
        bgcolor: '#ffffff',
        color: 'text.primary',
        border: 'none',
        cursor: onClick ? 'pointer' : 'default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: mobileMenuOpen ? 'scale(1) translateY(0)' : 'scale(0) translateY(20px)',
        opacity: mobileMenuOpen ? 1 : 0,
        animation: mobileMenuOpen ? `fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both` : 'none',
        '&:active': onClick
          ? {
              transform: 'scale(0.9)',
            }
          : {},
        '@keyframes fadeInUp': {
          from: {
            opacity: 0,
            transform: 'translateY(20px) scale(0.8)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0) scale(1)',
          },
        },
        ...sx,
      })}
    >
      {icon}
      {count !== undefined && count > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: -4,
            right: -4,
            minWidth: 20,
            height: 20,
            px: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'error.main',
            color: 'white',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 600,
            border: '2px solid white',
          }}
        >
          {formatNumber(count)}
        </Box>
      )}
    </Box>
  )

  return (
    <>
      {/* 桌面端：侧边栏按钮组 */}
      <Stack
        direction='column'
        spacing={2}
        sx={{
          alignItems: 'center',
          flexShrink: 0,
          position: 'sticky',
          top: 24,
          display: { xs: 'none', lg: 'flex' },
          alignSelf: 'flex-start',
        }}
      >
        {/* 返回首页按钮 */}
        <IconButton
          disableRipple
          size='small'
          onClick={() => router.push(`/${route_name || ''}`)}
          sx={{
            width: '40px',
            height: '40px',
            p: 0,
            color: '#6b7280',
            bgcolor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid rgba(217,222,226,0.5)',
            transition: 'all 0.15s ease-in-out',
            '&:hover': { color: '#000000', bgcolor: '#f3f4f6' },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* 点赞按钮 - 问题类型不显示 */}
        {!isClosed && !isQAPost && (
          <Box
            component='button'
            onClick={handleLike}
            sx={(theme) => ({
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: data.user_like ? theme.palette.primaryAlpha?.[10] : '#ffffff',
              borderRadius: '8px',
              border: '1px solid rgba(217,222,226,0.5)',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
              '&:hover': {
                background: data.user_like ? theme.palette.primaryAlpha?.[10] : 'rgba(0, 0, 0, 0.08)',
              },
              '&:active': {
                transform: 'scale(0.95)',
                transition: 'transform 0.1s ease-out',
              },
            })}
          >
            <Icon
              type='icon-dianzan1'
              sx={{
                color: data.user_like ? 'info.main' : 'rgba(0,0,0,0.5)',
                fontSize: 18,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                minWidth: '18px',
                height: '18px',
                px: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#D9DEE2',
                borderRadius: '7px',
              }}
            >
              <Typography
                variant='caption'
                sx={{
                  fontSize: 11,
                  color: 'rgba(0,0,0,0.7)',
                  lineHeight: 1,
                  fontWeight: 500,
                }}
              >
                {formatNumber(data.like || 0)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Issue 类型显示关注按钮（爱心图标+关注数） */}
        {isIssuePost && !isClosed && (
          <Box
            component='button'
            onClick={handleFollow}
            sx={(theme) => ({
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: followInfo.followed ? `${theme.palette.primaryAlpha?.[10]}` : '#ffffff',
              borderRadius: '8px',
              border: '1px solid rgba(217,222,226,0.5)',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
              '&:active': {
                transform: 'scale(0.95)',
                transition: 'transform 0.1s ease-out',
              },
            })}
          >
            <Icon
              type='icon-guanzhu'
              sx={{
                fontSize: 24,
                color: followInfo.followed ? 'primary.main' : 'rgba(0,0,0,0.6)',
              }}
            />

            <Box
              sx={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                minWidth: '18px',
                height: '18px',
                px: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#D9DEE2',
                borderRadius: '7px',
              }}
            >
              <Typography
                variant='caption'
                sx={{
                  fontSize: 11,
                  color: 'rgba(0,0,0,0.7)',
                  lineHeight: 1,
                  fontWeight: 500,
                }}
              >
                {formatNumber(followInfo.follower || 0)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* 更多操作按钮 */}
        {(data.user_id === user?.uid ||
          [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
            user?.role || ModelUserRole.UserRoleUnknown,
          )) && (
          <IconButton
            disableRipple
            size='small'
            onClick={handleMenuClick}
            sx={{
              width: '40px',
              height: '40px',
              p: 0,
              color: '#6b7280',
              bgcolor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid rgba(217,222,226,0.5)',
              transition: 'all 0.15s ease-in-out',
              '&:hover': { color: '#000000', bgcolor: '#f3f4f6' },
            }}
          >
            <MoreVertIcon sx={{ fontSize: 20 }} />
          </IconButton>
        )}
      </Stack>

      {/* 移动端：悬浮球 - 仅在登录时显示 */}
      {!!user.uid && (
        <Box
          sx={{
            display: { xs: 'block', lg: 'none' },
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          {/* 展开的菜单 */}
          {mobileMenuOpen && (
            <Backdrop
              open={mobileMenuOpen}
              onClick={handleMobileMenuToggle}
              sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.3)',
                zIndex: 999,
              }}
            />
          )}
          <Stack
            spacing={2}
            sx={{
              position: 'absolute',
              bottom: 72,
              right: 0,
              alignItems: 'center',
              zIndex: 1001,
            }}
          >
            {/* 点赞 - 问题类型不显示 */}
            {!isClosed &&
              !isQAPost &&
              renderCircularButton(
                <Icon
                  type='icon-dianzan1'
                  sx={{
                    color: data.user_like ? 'primary.main' : 'rgba(0,0,0,0.6)',
                    fontSize: 24,
                  }}
                />,
                data.like || 0,
                handleLike,
                data.user_like,
                0,
              )}

            {/* 评论数 */}
            {/* {!isClosed &&
            renderCircularButton(
              <Icon
                type='icon-wendapinglun'
                sx={{
                  color: 'rgba(0,0,0,0.6)',
                  fontSize: 24,
                }}
              />,
              data.comment || 0,
              undefined,
              false,
              1,
            )} */}

            {/* 关注（Issue类型） */}
            {isIssuePost &&
              !isClosed &&
              renderCircularButton(
                <Icon
                  type='icon-guanzhu'
                  sx={{
                    fontSize: 24,
                    color: followInfo.followed ? 'primary.main' : 'rgba(0,0,0,0.6)',
                  }}
                />,
                followInfo.follower || 0,
                handleFollow,
                followInfo.followed,
                2,
              )}

            {/* 更多操作 */}
            {(data.user_id === user?.uid ||
              [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
                user?.role || ModelUserRole.UserRoleUnknown,
              )) &&
              renderCircularButton(
                <MoreVertIcon sx={{ fontSize: 24, color: 'rgba(0,0,0,0.6)' }} />,
                undefined,
                () => {
                  setMobileMenuOpen(false)
                  // 使用实际的按钮元素来触发菜单
                  if (mobileMoreButtonRef.current) {
                    const event = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                    })
                    Object.defineProperty(event, 'currentTarget', {
                      value: mobileMoreButtonRef.current,
                      writable: false,
                    })
                    handleMenuClick(event as any)
                  }
                },
                false,
                3,
                undefined,
                mobileMoreButtonRef,
              )}
          </Stack>

          {/* 主悬浮按钮 */}
          <Fab
            onClick={handleMobileMenuToggle}
            sx={{
              width: 56,
              height: 56,
              bgcolor: mobileMenuOpen ? '#000000' : 'primary.main',
              color: 'white',
              boxShadow: mobileMenuOpen ? '0 8px 24px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: mobileMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
              '&:hover': {
                boxShadow: mobileMenuOpen ? '0 8px 24px rgba(0, 0, 0, 0.3)' : '0 6px 16px rgba(0, 0, 0, 0.2)',
                transform: mobileMenuOpen ? 'rotate(45deg) scale(1.05)' : 'rotate(0deg) scale(1.05)',
              },
              '&:active': {
                transform: mobileMenuOpen ? 'rotate(45deg) scale(0.95)' : 'rotate(0deg) scale(0.95)',
              },
            }}
          >
            {mobileMenuOpen ? <CloseIcon sx={{ fontSize: 24 }} /> : <MoreVertIcon sx={{ fontSize: 24 }} />}
          </Fab>
        </Box>
      )}
    </>
  )
}

export default ActionButtons
