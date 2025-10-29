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
import {
  ModelCommentLikeState,
  ModelDiscussionComment,
  ModelDiscussionDetail,
  ModelDiscussionReply,
  ModelDiscussionType,
  ModelUserRole,
} from '@/api/types'
import { Card, MarkDown } from '@/components'
import { AuthContext } from '@/components/authProvider'
// import { Avatar } from '@/components/discussion'
import { TimeDisplayWithTag } from '@/components/TimeDisplay'
import EditorWrap from '@/components/editor/edit/Wrap'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import { Box, Button, Divider, IconButton, Menu, MenuItem, OutlinedInput, Stack, Typography } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import React, { useContext, useState, useEffect } from 'react'
import EditCommentModal from './editCommentModal'

import { formatNumber } from '@/lib/utils'
import EditorContent from '@/components/EditorContent'
import Modal from '@/components/modal'

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

// 样式注入逻辑将在组件内部通过useEffect处理

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
  const { user } = useContext(AuthContext)
  const [repliesCollapsed, setRepliesCollapsed] = useState(false)

  // 安全地注入样式，避免水合失败
  useEffect(() => {
    const styleSheet = document.createElement('style')
    styleSheet.textContent = animationStyles
    document.head.appendChild(styleSheet)
    
    // 清理函数，组件卸载时移除样式
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet)
      }
    }
  }, [])
  // 检查是否有可用的菜单项
  const hasMenuItems =
    // 是当前用户的评论（可以编辑和删除）
    data.user_id === disData.current_user_id ||
    // 管理员、客服运营可以编辑和删除任何评论
    [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
      user?.role || ModelUserRole.UserRoleUnknown,
    ) ||
    // 问答类型且问题作者可以采纳/取消采纳评论
    (!isReply && disData.type === 'qa' && disData.user_id === disData.current_user_id)

  const revokeLike = async () => {
    return postDiscussionDiscIdCommentCommentIdRevokeLike({
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
            }
          : {
              width: '100%',
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
        sx={{ mb: 2, borderBottom: isReply ? 'none' : '1px solid #eee', pb: '4px' }}
      >
        <Stack direction='row' gap={1} alignItems='center' sx={{ flex: 1 }}>
          <Image
            src={data.user_avatar || '/logo.png'}
            alt='用户头像'
            width={28}
            height={28}
            style={{ borderRadius: '50%', objectFit: 'contain' }}
            unoptimized={true}
          />

          <Typography className='text-ellipsis' variant='subtitle2'>
            {data.user_id === 0 ? '未知用户' : data.user_name}
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
          {/* 采纳按钮 - 只有问答类型且问题作者且问题未被采纳，且不是回复时才显示 */}
          {!isReply &&
            disData.type === 'qa' &&
            disData.user_id === disData.current_user_id &&
            !disData.comments?.some((comment) => comment.accepted === true) &&
            !data?.accepted && (
              <Button
                variant='outlined'
                size='small'
                sx={{ px: '4px', py: 0 }}
                onClick={(e) => {
                  e.stopPropagation()
                  // 直接调用采纳逻辑
                  Modal.confirm({
                    title: '采纳',
                    content: '确定要采纳这个回答吗？',
                    okText: '采纳',
                    onOk: async () => {
                      await postDiscussionDiscIdCommentCommentIdAccept({
                        discId: disData.uuid!,
                        commentId: data.id!,
                      })
                      // 清除讨论详情的缓存
                      const cacheKey = generateCacheKey(`/discussion/${disData.uuid}`, {})
                      clearCache(cacheKey)
                      router.refresh()
                    },
                  })
                }}
              >
                采纳
              </Button>
            )}
          <Typography
            variant='body2'
            sx={{
              fontSize: 12,
              color: 'rgba(0,0,0,0.5)',
            }}
          >
            <TimeDisplayWithTag
              timestamp={data.updated_at!}
              title={dayjs.unix(data.updated_at!).format('YYYY-MM-DD HH:mm:ss')}
            />
          </Typography>
          <Stack direction='row' gap={2} alignItems='center' sx={{ display: { xs: 'none', sm: 'flex' } }}>
            {!isReply && (
              <>
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
                {disData.type !== ModelDiscussionType.DiscussionTypeFeedback && (
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
                )}
              </>
            )}
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
      {data.bot ? (
        <MarkDown
          content={data.content}
          sx={{
            backgroundColor: isReply ? 'transparent !important' : 'inherit',
          }}
        />
      ) : (
        <EditorContent
          content={data.content}
          sx={{
            backgroundColor: isReply ? 'transparent !important' : 'inherit',
          }}
        />
      )}
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
  const { user } = useContext(AuthContext)
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
  const handleEditComment = () => {
    setEditCommentModalVisible(true)
    setAnchorEl(null)
  }

  const handleAcceptComment = () => {
    setAnchorEl(null)
    Modal.confirm({
      title: '确定采纳这个回答吗？',
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

  const handleUnacceptComment = () => {
    setAnchorEl(null)
    Modal.confirm({
      title: '确定取消采纳这个回答吗？',
      okButtonProps: { color: 'error' },
      onOk: async () => {
        if (!commentIndex) return
        // 取消采纳就是再次调用采纳接口
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

  // 判断帖子是否有被采纳的评论
  const hasAcceptedComment = data.comments?.some((comment) => comment.accepted)
  return (
    <Stack id='comment-card' gap={3} sx={{ width: '100%' }}>
      <Menu id='basic-menu' anchorEl={anchorEl} open={open} onClose={handleClose}>
        {/* 问答类型且问题作者可以采纳/取消采纳评论（置顶显示） */}
        {data.type === 'qa' &&
          data.user_id === data.current_user_id &&
          commentIndex &&
          !commentIndex.accepted &&
          hasAcceptedComment && <MenuItem onClick={handleAcceptComment}>采纳</MenuItem>}
        {data.type === 'qa' && data.user_id === data.current_user_id && commentIndex && commentIndex.accepted && (
          <MenuItem onClick={handleUnacceptComment}>取消采纳</MenuItem>
        )}

        {(commentIndex?.user_id == data.current_user_id ||
          [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
            user?.role || ModelUserRole.UserRoleUnknown,
          )) && <MenuItem onClick={handleEditComment}>编辑</MenuItem>}

        {(commentIndex?.user_id == data.current_user_id ||
          [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
            user?.role || ModelUserRole.UserRoleUnknown,
          )) && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            删除
          </MenuItem>
        )}
      </Menu>
      <EditCommentModal
        open={editCommentModalVisible}
        data={commentIndex!}
        onOk={onSubmit}
        onClose={() => setEditCommentModalVisible(false)}
      />
      {data.comments
        ?.sort((a, b) => {
          // 已采纳的评论置顶
          if (a.accepted && !b.accepted) return -1
          if (!a.accepted && b.accepted) return 1
          return 0
        })
        ?.map((it, index) => (
          <DiscussCard data={it} index={index} key={it.id} disData={data} onOpt={handleClick} />
        ))}
    </Stack>
  )
}

export default Content
