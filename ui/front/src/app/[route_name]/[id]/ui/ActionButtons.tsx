'use client'
import {
  deleteDiscussionDiscIdFollow,
  getDiscussionDiscIdFollow,
  postDiscussionDiscIdFollow,
  postDiscussionDiscIdLike,
  postDiscussionDiscIdRevokeLike,
} from '@/api'
import {
  ModelDiscussionDetail,
  ModelDiscussionState,
  ModelDiscussionType,
  ModelUserRole,
} from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { formatNumber } from '@/lib/utils'
import { PointActionType, showPointNotification } from '@/utils/pointNotification'
import { Icon } from '@ctzhian/ui'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Box, IconButton, Stack, Typography } from '@mui/material'
import { useParams, useRouter } from 'next/navigation'
import { useContext, useEffect, useState, useCallback } from 'react'

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

  const isIssuePost = data.type === ModelDiscussionType.DiscussionTypeIssue
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

  return (
    <Stack
      direction='column'
      spacing={2}
      sx={{
        alignItems: 'center',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
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

      {/* 点赞按钮 - 所有类型显示 */}
      {!isClosed && (
        <Box
          component='button'
          onClick={handleLike}
          sx={(theme) => ({
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: data.user_like ? theme.palette.primaryAlpha?.[6] : '#ffffff',
            borderRadius: '8px',
            border: '1px solid rgba(217,222,226,0.5)',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)',
            '&:hover': {
              background: data.user_like ? theme.palette.primaryAlpha?.[10] : 'rgba(0, 0, 0, 0.12)',
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

      {/* 评论数按钮 - 所有类型显示（仅展示，不可点击） */}
      {!isClosed && (
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid rgba(217,222,226,0.5)',
            width: '40px',
            height: '40px',
          }}
        >
          <Icon
            type='icon-wendapinglun'
            sx={{
              color: 'rgba(0,0,0,0.5)',
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
              {formatNumber(data.comment || 0)}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Issue 类型显示关注按钮（星星图标+关注数） */}
      {isIssuePost && !isClosed && (
        <Box
          component='button'
          onClick={handleFollow}
          sx={(theme) => ({
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: followInfo.followed
              ? theme.palette.warning
                ? `${theme.palette.warning.main}15`
                : 'rgba(255, 152, 0, 0.1)'
              : '#ffffff',
            borderRadius: '8px',
            border: '1px solid rgba(217,222,226,0.5)',
            width: '40px',
            height: '40px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'scale(1)',
            '&:hover': {
              background: followInfo.followed
                ? theme.palette.warning
                  ? `${theme.palette.warning.main}20`
                  : 'rgba(255, 152, 0, 0.15)'
                : 'rgba(0, 0, 0, 0.12)',
            },
            '&:active': {
              transform: 'scale(0.95)',
              transition: 'transform 0.1s ease-out',
            },
          })}
        >
          {followInfo.followed ? (
            <StarIcon
              sx={(theme) => ({
                fontSize: 18,
                color: theme.palette.warning?.main || '#ff9800',
              })}
            />
          ) : (
            <StarBorderIcon
              sx={{
                fontSize: 18,
                color: 'rgba(0,0,0,0.5)',
              }}
            />
          )}
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
  )
}

export default ActionButtons

