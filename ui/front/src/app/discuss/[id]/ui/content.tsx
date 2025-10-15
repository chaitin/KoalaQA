'use client'
import {
  deleteDiscussionDiscIdCommentCommentId,
  postDiscussionDiscIdComment,
  postDiscussionDiscIdCommentCommentIdAccept,
  postDiscussionDiscIdCommentCommentIdDislike,
  postDiscussionDiscIdCommentCommentIdLike,
  postDiscussionDiscIdCommentCommentIdRevokeLike,
  putDiscussionDiscIdCommentCommentId,
} from '@/api'
import { generateCacheKey, clearCache } from '@/lib/api-cache'
import { ModelCommentLikeState, ModelDiscussionComment, ModelDiscussionDetail, ModelDiscussionReply } from '@/api/types'
import { Card, MarkDown } from '@/components'
import { AuthContext } from '@/components/authProvider'
import { Avatar } from '@/components/discussion'
import EditorWrap from '@/components/editor/edit/Wrap'
import Modal from '@/components/modal'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import { Box, Divider, IconButton, Menu, MenuItem, OutlinedInput, Stack, Typography } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useParams, useRouter } from 'next/navigation'
import React, { useContext, useState } from 'react'
import EditCommentModal from './editCommentModal'

import { formatNumber } from '@/lib/utils'

// 添加CSS动画样式
const animationStyles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = animationStyles
  document.head.appendChild(styleSheet)
}

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const BaseDiscussCard = (props: {
  isReply?: boolean
  data: ModelDiscussionComment | ModelDiscussionReply
  disData: ModelDiscussionDetail
  index: number
  onOpt(
    event: React.MouseEvent<HTMLButtonElement>,
    comment: string,
    index: ModelDiscussionComment | ModelDiscussionReply,
  ): void
}) => {
  const { data, onOpt, disData, isReply } = props
  const router = useRouter()
  const [repliesCollapsed, setRepliesCollapsed] = useState(false)
  // 检查是否有可用的菜单项
  const hasMenuItems =
    // 是当前用户的评论（可以编辑和删除）
    data.user_id === disData.current_user_id ||
    // 是问题作者且问题未被采纳，且不是回复（只有评论可以被采纳）
    (disData.user_id === disData.current_user_id && !disData.comments?.[0]?.accepted && !isReply)

  const revokeLike = () => {
    postDiscussionDiscIdCommentCommentIdRevokeLike({
      discId: disData.uuid!,
      commentId: data.id!,
    })
  }
  const isLiked = data.user_like_state == ModelCommentLikeState.CommentLikeStateLike
  const isDisliked = data.user_like_state == ModelCommentLikeState.CommentLikeStateDislike
  const { checkAuth } = useAuthCheck()

  const handleLike = async () => {
    // 检查登录状态
    const isAuthenticated = checkAuth()
    if (!isAuthenticated) return

    try {
      if (isLiked) await revokeLike()
      else
        await postDiscussionDiscIdCommentCommentIdLike({
          discId: disData.uuid!,
          commentId: data.id!,
        })
    } finally {
      // 清除讨论详情的缓存
      const cacheKey = generateCacheKey(`/discussion/${disData.uuid}`, {})
      clearCache(cacheKey)
      router.refresh()
    }
  }
  const handleDislike = async () => {
    // 检查登录状态
    const isAuthenticated = checkAuth()
    if (!isAuthenticated) return

    try {
      if (isDisliked) await revokeLike()
      else
        await postDiscussionDiscIdCommentCommentIdDislike({
          discId: disData.uuid!,
          commentId: data.id!,
        })
    } finally {
      // 清除讨论详情的缓存
      const cacheKey = generateCacheKey(`/discussion/${disData.uuid}`, {})
      clearCache(cacheKey)
      router.refresh()
    }
  }

  return (
    <Box
      sx={{
        ...(isReply
          ? {
              p: { xs: 1, sm: 2 },
              backgroundColor: '#F6F6FB',
              mt: 2,
              borderRadius: 2,
              width: '100%',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateY(0)',
              '&:hover': {
                backgroundColor: '#F0F0F8',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              },
            }
          : {
              width: '100%',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateY(0)',
              '&:hover': {
                transform: 'translateY(-1px)',
              },
            }),
        '&:hover #accept_btn': {
          display: 'block',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 2, borderBottom: isReply ? 'none' : '1px solid #eee' }}
      >
        <Stack direction='row' gap={1} alignItems='center' sx={{ flex: 1 }}>
          <img src={data.user_avatar} width={28} height={28} style={{ borderRadius: '50%' }} />

          <Typography className='text-ellipsis' variant='subtitle2'>
            {data.user_name}
          </Typography>
          {data.bot && (
            <Box
              sx={{
                width: 22,
                height: 18,
                backgroundColor: 'white',
                position: 'relative',
                borderRadius: '3px',
                background: 'linear-gradient(90deg, #4FC3F7 0%, #9C27B0 100%)',
                p: '1.5px',
              }}
            >
              <Stack
                justifyContent='center'
                alignItems='center'
                sx={{
                  borderRadius: '2px',
                  background: '#fff',
                  height: '100%',
                  width: '100%',
                }}
              >
                <Stack
                  justifyContent='center'
                  alignItems='center'
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    backgroundImage: 'linear-gradient(90deg, #4FC3F7 0%, #9C27B0 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    lineHeight: 1,
                    fontFamily: 'Mono',
                  }}
                >
                  AI
                </Stack>
              </Stack>
            </Box>
          )}
        </Stack>
        <Stack direction='row' gap={2} alignItems='center' sx={{ mt: { xs: '12px', sm: 0 } }}>
          {/* 已采纳标签 */}
          {data?.accepted && (
            <Stack
              direction='row'
              alignItems='center'
              gap={0.5}
              sx={{
                backgroundColor: '#E8F5E8',
                color: '#2E7D32',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 500 }}>已采纳</Typography>
            </Stack>
          )}
          <Typography
            variant='body2'
            sx={{
              fontSize: 12,
              color: 'rgba(0,0,0,0.5)',
            }}
          >
            <time
              dateTime={dayjs.unix(data.updated_at!).format()}
              title={dayjs.unix(data.updated_at!).format('YYYY-MM-DD HH:mm:ss')}
            >
              更新于 {dayjs.unix(data.updated_at!).fromNow()}
            </time>
          </Typography>
          <Stack direction='row' gap={2} alignItems='center' sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <Stack
              direction='row'
              alignItems='center'
              gap={1}
              sx={{
                background: isLiked ? 'rgba(32,108,255,0.1)' : '#F2F3F5',
                borderRadius: 0.5,
                px: 1,
                py: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'scale(1)',
                '&:hover': {
                  background: isLiked ? 'rgba(32,108,255,0.2)' : 'rgba(0, 0, 0, 0.12)',
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                  transition: 'transform 0.1s ease-out',
                },
              }}
              onClick={() => handleLike()}
            >
              <ThumbUpAltOutlinedIcon
                sx={{
                  color: isLiked ? 'info.main' : 'rgba(0,0,0,0.5)',
                  fontSize: 14,
                }}
              />
              <Typography
                variant='body2'
                sx={{
                  fontSize: 14,
                  color: isLiked ? 'info.main' : 'rgba(0,0,0,0.5)',
                  lineHeight: '20px',
                }}
              >
                {formatNumber(data.like || 0)}
              </Typography>
            </Stack>
            <Stack
              direction='row'
              alignItems='center'
              gap={1}
              sx={{
                background: isDisliked ? 'rgba(32,108,255,0.1)' : '#F2F3F5',
                borderRadius: 0.5,
                px: 1,
                py: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'scale(1)',
                '&:hover': {
                  background: isDisliked ? 'rgba(32,108,255,0.2)' : 'rgba(0, 0, 0, 0.12)',
                  transform: 'scale(1.05)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                  transition: 'transform 0.1s ease-out',
                },
              }}
              onClick={() => handleDislike()}
            >
              <ThumbDownAltOutlinedIcon
                sx={{
                  color: isDisliked ? 'info.main' : 'rgba(0,0,0,0.5)',
                  fontSize: 14,
                }}
              />
              <Typography
                variant='body2'
                sx={{
                  fontSize: 14,
                  lineHeight: '20px',
                  color: isDisliked ? 'info.main' : 'rgba(0,0,0,0.5)',
                }}
              >
                {formatNumber(data.dislike || 0)}
              </Typography>
            </Stack>
            {/* 只在有可用菜单项时显示 MoreVertIcon */}
            {hasMenuItems && (
              <IconButton
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  p: 0,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'scale(1)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    transform: 'scale(1.1)',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                    transition: 'transform 0.1s ease-out',
                  },
                }}
                onClick={(e) => {
                  onOpt(e, data.content || '', data)
                }}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Stack>
      <MarkDown
        content={data.content}
        sx={{
          backgroundColor: isReply ? 'transparent !important' : 'inherit',
        }}
      />
      {!isReply && !!(data as ModelDiscussionComment)?.replies?.length && (
        <>
          <Divider sx={{ my: 2 }} />
          <Stack direction='row' alignItems='center'>
            <Typography variant='subtitle2'>评论({(data as ModelDiscussionComment)?.replies?.length})</Typography>
            {/* 折叠/展开评论按钮 */}
            <IconButton
              size='small'
              sx={{
                ml: 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'scale(1)',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  transform: 'scale(1.1)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                  transition: 'transform 0.1s ease-out',
                },
              }}
              onClick={() => setRepliesCollapsed?.((prev: boolean) => !prev)}
            >
              {repliesCollapsed ? (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'transform 0.2s ease-in-out',
                    transform: 'rotate(0deg)',
                  }}
                >
                  <svg width='20' height='20' viewBox='0 0 24 24'>
                    <path fill='currentColor' d='M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z' />
                  </svg>
                </span>
              ) : (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'transform 0.2s ease-in-out',
                    transform: 'rotate(180deg)',
                  }}
                >
                  <svg width='20' height='20' viewBox='0 0 24 24'>
                    <path fill='currentColor' d='M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z' />
                  </svg>
                </span>
              )}
            </IconButton>
          </Stack>
        </>
      )}
      {!repliesCollapsed &&
        !isReply &&
        (data as ModelDiscussionComment)?.replies?.map((it) => (
          <BaseDiscussCard isReply key={it.id} data={it} disData={disData} onOpt={onOpt} index={1} />
        ))}
    </Box>
  )
}

const DiscussCard = (props: {
  data: ModelDiscussionComment
  disData: ModelDiscussionDetail
  index: number
  onOpt(
    event: React.MouseEvent<HTMLButtonElement>,
    comment: string,
    index: ModelDiscussionComment | ModelDiscussionReply,
  ): void
}) => {
  const { id }: { id: string } = useParams() || { id: '' }
  const { user } = useContext(AuthContext)
  const { checkAuth } = useAuthCheck()
  const [comment, setComment] = useState('')
  const router = useRouter()
  const [mdEditShow, setMdEditShow] = useState(false)

  // 检查登录状态，未登录则跳转到登录页
  const checkLoginAndFocus = () => {
    return checkAuth(() => setMdEditShow(true))
  }
  const onSubmit = async () => {
    await postDiscussionDiscIdComment(
      { discId: id },
      {
        content: comment,
        comment_id: props.data.id,
      },
    )
    setComment('')
    setMdEditShow(false)
    router.refresh()
  }

  return (
    <Card
      sx={{
        boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
        cursor: 'auto',
        pt: 1.5,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0)',
        '&:hover': {
          boxShadow: 'rgba(0, 28, 85, 0.12) 0px 8px 25px 0px',
          transform: 'translateY(-2px)',
        },
        animation: `fadeInUp 0.6s ease-out ${props.index * 0.1}s both`,
      }}
    >
      <BaseDiscussCard {...props}></BaseDiscussCard>
      <Box
        sx={{
          mt: 3,
        }}
      >
        <Box sx={{ display: !mdEditShow ? 'none' : 'block', height: 400 }}>
          <EditorWrap
            detail={{
              id: 'reply-editor',
              name: '评论',
              content: comment,
            }}
            onSave={async () => {
              await onSubmit()
            }}
            onCancel={() => setMdEditShow(false)}
            onContentChange={setComment}
          />
        </Box>
        <OutlinedInput
          fullWidth
          size='small'
          sx={{
            display: mdEditShow ? 'none' : 'block',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(32, 108, 255, 0.1)',
            },
            '&.Mui-focused': {
              boxShadow: '0 4px 12px rgba(32, 108, 255, 0.2)',
              transform: 'translateY(-1px)',
            },
          }}
          placeholder={user?.uid ? '评论' : '请先登录后评论'}
          onFocus={checkLoginAndFocus}
        />
      </Box>
    </Card>
  )
}

const Content = (props: { data: ModelDiscussionDetail }) => {
  const { data } = props
  const { id }: { id: string } = useParams() || { id: '' }
  const router = useRouter()
  const [commentIndex, setCommentIndex] = useState<ModelDiscussionComment | ModelDiscussionReply | null>(null)
  const [editCommentModalVisible, setEditCommentModalVisible] = useState(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    _comment: string,
    index: ModelDiscussionComment | ModelDiscussionReply,
  ) => {
    setAnchorEl(event.currentTarget)
    setCommentIndex(index)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }
  const onSubmit = (comment: string) => {
    return putDiscussionDiscIdCommentCommentId(
      { discId: id, commentId: commentIndex?.id ?? 0 },
      {
        content: comment,
      },
    ).then(() => {
      // 清除讨论详情的缓存
      const cacheKey = generateCacheKey(`/discussion/${id}`, {})
      clearCache(cacheKey)
      router.refresh()
      setEditCommentModalVisible(false)
    })
  }
  const handleDelete = () => {
    setAnchorEl(null)
    Modal.confirm({
      title: '确定删除吗？',
      okButtonProps: { color: 'error' },
      onOk: async () => {
        if (!commentIndex) return
        await deleteDiscussionDiscIdCommentCommentId({
          discId: data.uuid!,
          commentId: commentIndex.id!,
        })
        // 清除讨论详情的缓存
        const cacheKey = generateCacheKey(`/discussion/${data.uuid}`, {})
        clearCache(cacheKey)
        router.refresh()
      },
    })
  }
  const handleAccept = () => {
    Modal.confirm({
      title: '确定采纳吗？',
      okButtonProps: { color: 'info' },
      onOk: async () => {
        if (!commentIndex) return
        await postDiscussionDiscIdCommentCommentIdAccept({
          discId: data.uuid!,
          commentId: commentIndex.id!,
        })
        // 清除讨论详情的缓存
        const cacheKey = generateCacheKey(`/discussion/${data.uuid}`, {})
        clearCache(cacheKey)
        router.refresh()
      },
    })
  }
  const handleEditComment = () => {
    setEditCommentModalVisible(true)
    setAnchorEl(null)
  }
  return (
    <Stack id='comment-card' gap={3} sx={{ width: { xs: '100%' } }}>
      <Menu id='basic-menu' anchorEl={anchorEl} open={open} onClose={handleClose}>
        {commentIndex?.user_id == data.current_user_id && <MenuItem onClick={handleEditComment}>编辑</MenuItem>}
        {commentIndex?.user_id == data.current_user_id && <MenuItem onClick={handleDelete}>删除</MenuItem>}
        {data?.user_id == data.current_user_id &&
          !data.comments?.[0]?.accepted &&
          'replies' in (commentIndex || {}) && <MenuItem onClick={handleAccept}>采纳</MenuItem>}
      </Menu>
      <EditCommentModal
        open={editCommentModalVisible}
        data={commentIndex!}
        onOk={onSubmit}
        onClose={() => setEditCommentModalVisible(false)}
      />
      {data.comments?.map((it, index) => (
        <DiscussCard data={it} index={index} key={it.id} disData={data} onOpt={handleClick} />
      ))}
    </Stack>
  )
}

export default Content
