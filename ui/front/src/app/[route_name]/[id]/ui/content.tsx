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
import { TimeDisplayWithTag } from '@/components/TimeDisplay'
import EditorWrap, { EditorWrapRef } from '@/components/editor/edit/Wrap'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import SendIcon from '@mui/icons-material/Send'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  OutlinedInput,
  Paper,
  Stack,
  TextField,
  Typography,
  Avatar,
} from '@mui/material'
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
  const { data, onOpt, disData, isReply, index } = props
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
            {!isReply && disData.type !== ModelDiscussionType.DiscussionTypeBlog && (
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
                {disData.type === ModelDiscussionType.DiscussionTypeQA && (
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
      <EditorContent
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
  const editorRef = React.useRef<EditorWrapRef>(null)
  const router = useRouter()
  const [mdEditShow, setMdEditShow] = useState(false)

  // 检查登录状态，未登录则跳转到登录页
  const checkLoginAndFocus = () => {
    return checkAuth(() => setMdEditShow(true))
  }
  const onSubmit = async () => {
    const content = editorRef.current?.getMarkdown() || ''
    await postDiscussionDiscIdComment(
      { discId: id },
      {
        content,
        comment_id: props.data.id,
      },
    )
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
            ref={editorRef}
            value=''
            onSave={async () => {
              return onSubmit()
            }}
            onCancel={() => setMdEditShow(false)}
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
  const { checkAuth } = useAuthCheck()
  const [commentIndex, setCommentIndex] = useState<ModelDiscussionComment | ModelDiscussionReply | null>(null)
  const [editCommentModalVisible, setEditCommentModalVisible] = useState(false)
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const isArticlePost = data.type === ModelDiscussionType.DiscussionTypeBlog
  const isFeedbackPost = data.type === ModelDiscussionType.DiscussionTypeFeedback

  // 回答/评论相关状态
  const [newAnswer, setNewAnswer] = useState('')
  const [newComment, setNewComment] = useState('')
  const [newComments, setNewComments] = useState<{ [key: number]: string }>({})
  const [showAnswerEditor, setShowAnswerEditor] = useState(false)
  const [showCommentEditor, setShowCommentEditor] = useState(false)
  const [answerEditorKey, setAnswerEditorKey] = useState(0)
  const [commentEditorKey, setCommentEditorKey] = useState(0)
  const [commentEditorKeys, setCommentEditorKeys] = useState<{ [key: number]: number }>({})
  const [showCommentEditors, setShowCommentEditors] = useState<{ [key: number]: boolean }>({})
  const [collapsedComments, setCollapsedComments] = useState<{ [key: number]: boolean }>({})
  const editorRef = React.useRef<EditorWrapRef>(null)
  const answerEditorRef = React.useRef<EditorWrapRef>(null)
  const commentEditorRef = React.useRef<EditorWrapRef>(null)
  const commentEditorRefs = React.useRef<{ [key: number]: EditorWrapRef | null }>({})

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
  const isAuthor = data.user_id === (user?.uid || 0)

  const handleSubmitAnswer = async () => {
    const content = answerEditorRef.current?.getMarkdown() || ''
    if (!content.trim()) return
    return checkAuth(async () => {
      await postDiscussionDiscIdComment({ discId: id }, { content })
      setShowAnswerEditor(false)
      setAnswerEditorKey((prev) => prev + 1) // 重置编辑器
      const cacheKey = generateCacheKey(`/discussion/${id}`, {})
      clearCache(cacheKey)
      router.refresh()
    })
  }

  const handleSubmitNewComment = async () => {
    const content = commentEditorRef.current?.getMarkdown() || ''
    if (!content.trim()) return
    return checkAuth(async () => {
      await postDiscussionDiscIdComment({ discId: id }, { content })
      setShowCommentEditor(false)
      setCommentEditorKey((prev) => prev + 1) // 重置编辑器
      const cacheKey = generateCacheKey(`/discussion/${id}`, {})
      clearCache(cacheKey)
      router.refresh()
    })
  }

  const handleSubmitComment = async (answerId: number) => {
    const comment = commentEditorRefs.current[answerId]?.getMarkdown() || ''
    if (!comment.trim()) return
    return checkAuth(async () => {
      await postDiscussionDiscIdComment({ discId: id }, { content: comment, comment_id: answerId })
      // 重置编辑器并隐藏
      setShowCommentEditors({ ...showCommentEditors, [answerId]: false })
      setCommentEditorKeys((prev) => ({ ...prev, [answerId]: (prev[answerId] || 0) + 1 }))
      const cacheKey = generateCacheKey(`/discussion/${id}`, {})
      clearCache(cacheKey)
      router.refresh()
    })
  }

  const handleAcceptAnswer = async (answerId: number) => {
    await postDiscussionDiscIdCommentCommentIdAccept({ discId: data.uuid!, commentId: answerId })
    const cacheKey = generateCacheKey(`/discussion/${data.uuid}`, {})
    clearCache(cacheKey)
    router.refresh()
  }

  const handleVote = async (answerId: number, type: 'up' | 'down') => {
    return checkAuth(async () => {
      const comment = data.comments?.find((c) => c.id === answerId)
      if (!comment) return

      if (type === 'up') {
        if (comment.user_like_state === ModelCommentLikeState.CommentLikeStateLike) {
          await postDiscussionDiscIdCommentCommentIdRevokeLike({ discId: id, commentId: answerId })
        } else {
          await postDiscussionDiscIdCommentCommentIdLike({ discId: id, commentId: answerId })
        }
      } else {
        if (comment.user_like_state === ModelCommentLikeState.CommentLikeStateDislike) {
          await postDiscussionDiscIdCommentCommentIdRevokeLike({ discId: id, commentId: answerId })
        } else {
          await postDiscussionDiscIdCommentCommentIdDislike({ discId: id, commentId: answerId })
        }
      }
      const cacheKey = generateCacheKey(`/discussion/${id}`, {})
      clearCache(cacheKey)
      router.refresh()
    })
  }

  const toggleComments = (answerId: number) => {
    setCollapsedComments((prev) => ({ ...prev, [answerId]: !prev[answerId] }))
  }

  const sortedComments =
    data.comments?.sort((a, b) => {
      if (a.accepted && !b.accepted) return -1
      if (!a.accepted && b.accepted) return 1
      return 0
    }) || []

  return (
    <>
      <Menu id='basic-menu' anchorEl={anchorEl} open={open} onClose={handleClose}>
        {data.type === ModelDiscussionType.DiscussionTypeQA &&
          data.user_id === (user?.uid || 0) &&
          commentIndex &&
          !commentIndex.accepted &&
          hasAcceptedComment && <MenuItem onClick={handleAcceptComment}>采纳</MenuItem>}
        {data.type === ModelDiscussionType.DiscussionTypeQA &&
          data.user_id === (user?.uid || 0) &&
          commentIndex &&
          commentIndex.accepted && <MenuItem onClick={handleUnacceptComment}>取消采纳</MenuItem>}

        {(commentIndex?.user_id == (user?.uid || 0) ||
          [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
            user?.role || ModelUserRole.UserRoleUnknown,
          )) && <MenuItem onClick={handleEditComment}>编辑</MenuItem>}

        {(commentIndex?.user_id == (user?.uid || 0) ||
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

      <>
        {/* Answers section for questions */}
        <Paper
          elevation={0}
          sx={{
            bgcolor: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            p: 3,
            mb: 3,
          }}
        >
          <Typography
            variant='h6'
            sx={{
              fontWeight: 700,
              color: '#111827',
              mb: 2,
              fontSize: '1.125rem',
            }}
          >
            {isArticlePost ? '发表评论' : '回答问题'}
          </Typography>

          {!showAnswerEditor ? (
            <TextField
              fullWidth
              size='small'
              placeholder={isArticlePost ? '分享你的见解和经验，帮助提问者解决问题...' : '分享你的见解和经验，帮助提问者解决问题...'}
              onClick={() => setShowAnswerEditor(true)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#fafbfc',
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  '& fieldset': { borderColor: '#e5e7eb' },
                  '&:hover fieldset': { borderColor: '#d1d5db' },
                },
                '& input': {
                  cursor: 'pointer',
                },
              }}
            />
          ) : (
            <>
              <Box sx={{ mb: 2, height: 400, border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                <EditorWrap
                  key={answerEditorKey}
                  ref={answerEditorRef}
                  value=''
                  showActions={false}
                  onChange={(value) => {
                    // 可以在这里更新状态如果需要
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                  disableRipple
                  onClick={() => {
                    setShowAnswerEditor(false)
                    setAnswerEditorKey((prev) => prev + 1) // 重置编辑器
                  }}
                  sx={{
                    textTransform: 'none',
                    color: '#6b7280',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': { bgcolor: '#f3f4f6', transform: 'scale(1.02)' },
                    '&:active': { transform: 'scale(0.98)' },
                  }}
                >
                  取消
                </Button>
                <Button
                  disableRipple
                  variant='contained'
                  endIcon={<SendIcon />}
                  onClick={handleSubmitAnswer}
                  sx={{
                    background: '#000000',
                    color: '#ffffff',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    py: 1,
                    borderRadius: '6px',
                    fontSize: '0.9375rem',
                    transition: 'all 0.15s ease-in-out',
                    '&:hover': {
                      background: '#111827',
                      transform: 'translateY(-1px)',
                    },
                    '&:active': { transform: 'translateY(0) scale(0.98)' },
                  }}
                >
                  提交回答
                </Button>
              </Box>
            </>
          )}
        </Paper>

        <Box sx={{ mb: 3 }}>
          <Typography
            variant='h6'
            sx={{
              fontWeight: 700,
              color: '#111827',
              mb: 2,
              fontSize: '1.125rem',
            }}
          >
            {sortedComments.length} 个回答
          </Typography>

          {sortedComments.map((answer) => {
            const isLiked = answer.user_like_state === ModelCommentLikeState.CommentLikeStateLike
            const isDisliked = answer.user_like_state === ModelCommentLikeState.CommentLikeStateDislike
            return (
              <Paper
                key={answer.id}
                elevation={0}
                sx={{
                  bgcolor: answer.accepted ? '#ffffff' : '#ffffff',
                  borderRadius: '6px',
                  border: answer.accepted ? '2px solid #10b981' : '1px solid #e5e7eb',
                  p: 3,
                  mb: 2,
                  position: 'relative',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: '#6b7280',
                        width: 20,
                        height: 20,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                      }}
                    >
                      {answer.user_name?.[0] || 'U'}
                    </Avatar>
                    <Typography variant='body2' sx={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                      {answer.user_name || '未知用户'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {answer.accepted ? (
                      <Chip
                        icon={<CheckCircleOutlineIcon sx={{ fontSize: 10, color: '#10b981 !important' }} />}
                        label='已采纳'
                        size='small'
                        sx={{
                          bgcolor: '#f0fdf4',
                          color: '#10b981',
                          height: 24,
                          width: 90,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          borderRadius: '4px',
                          border: '1px solid #86efac',
                        }}
                      />
                    ) : (
                      isAuthor && (
                        <Button
                          disableRipple
                          size='small'
                          variant='outlined'
                          startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 12 }} />}
                          onClick={() => handleAcceptAnswer(answer.id!)}
                          sx={{
                            textTransform: 'none',
                            color: '#6b7280',
                            borderColor: '#d1d5db',
                            bgcolor: '#ffffff',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            px: 1,
                            py: 0.25,
                            borderRadius: '4px',
                            minWidth: 'auto',
                            width: 70,
                            height: 24,
                            transition: 'all 0.15s ease-in-out',
                            '&:hover': {
                              bgcolor: '#f9fafb',
                              borderColor: '#9ca3af',
                              color: '#111827',
                              transform: 'scale(1.02)',
                            },
                            '&:active': { transform: 'scale(0.98)' },
                          }}
                        >
                          采纳
                        </Button>
                      )
                    )}

                    <Button
                      disableRipple
                      size='small'
                      variant='outlined'
                      startIcon={<ThumbUpIcon sx={{ fontSize: 12 }} />}
                      onClick={() => handleVote(answer.id!, 'up')}
                      sx={{
                        textTransform: 'none',
                        color: isLiked ? '#3b82f6' : '#6b7280',
                        borderColor: isLiked ? '#3b82f6' : '#d1d5db',
                        bgcolor: isLiked ? '#eff6ff' : '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        px: 1,
                        py: 0.5,
                        borderRadius: '4px',
                        minWidth: 'auto',
                        width: 60,
                        height: 24,
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          bgcolor: isLiked ? '#dbeafe' : '#f9fafb',
                          borderColor: isLiked ? '#3b82f6' : '#9ca3af',
                          color: isLiked ? '#3b82f6' : '#111827',
                          transform: 'scale(1.02)',
                        },
                        '&:active': { transform: 'scale(0.98)' },
                      }}
                    >
                      {formatNumber(answer.like || 0)}
                    </Button>

                    <Button
                      disableRipple
                      size='small'
                      variant='outlined'
                      startIcon={<ThumbDownIcon sx={{ fontSize: 12 }} />}
                      onClick={() => handleVote(answer.id!, 'down')}
                      sx={{
                        textTransform: 'none',
                        color: isDisliked ? '#ef4444' : '#6b7280',
                        borderColor: isDisliked ? '#ef4444' : '#d1d5db',
                        bgcolor: isDisliked ? '#fef2f2' : '#ffffff',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        px: 1,
                        py: 0.5,
                        borderRadius: '4px',
                        minWidth: 'auto',
                        width: 60,
                        height: 24,
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          bgcolor: isDisliked ? '#fee2e2' : '#f9fafb',
                          borderColor: isDisliked ? '#ef4444' : '#9ca3af',
                          color: isDisliked ? '#ef4444' : '#111827',
                          transform: 'scale(1.02)',
                        },
                        '&:active': { transform: 'scale(0.98)' },
                      }}
                    >
                      {formatNumber(answer.dislike || 0)}
                    </Button>

                    <IconButton
                      disableRipple
                      size='small'
                      onClick={(e) => handleClick(e, answer.content || '', answer)}
                      sx={{
                        color: '#6b7280',
                        ml: 0.5,
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': { color: '#000000', bgcolor: '#f3f4f6', transform: 'rotate(90deg)' },
                        '&:active': { transform: 'rotate(90deg) scale(0.9)' },
                      }}
                    >
                      <MoreVertIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                </Box>

                <Box
                  sx={{
                    bgcolor: '#fafbfc',
                    borderRadius: '6px',
                    p: 2,
                    mb: 1,
                    border: '1px solid #f3f4f6',
                  }}
                >
                  <EditorContent content={answer.content} onTocUpdate={() => {}} />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mb: 2 }}>
                  {answer.updated_at && (
                    <Typography variant='body2' sx={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                      更新于{' '}
                      <TimeDisplayWithTag
                        timestamp={answer.updated_at}
                        title={dayjs.unix(answer.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                      />
                    </Typography>
                  )}
                </Box>

                <Box sx={{ pt: 2, borderTop: '1px solid #f3f4f6' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      mb: collapsedComments[answer.id!] ? 0 : 2,
                    }}
                  >
                    <Button
                      disableRipple
                      size='small'
                      onClick={() => toggleComments(answer.id!)}
                      endIcon={collapsedComments[answer.id!] ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                      sx={{
                        textTransform: 'none',
                        color: '#6b7280',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': { color: '#000000', bgcolor: '#f3f4f6', transform: 'scale(1.02)' },
                        '&:active': { transform: 'scale(0.98)' },
                      }}
                    >
                      {answer.replies?.length || 0} 条评论
                    </Button>
                  </Box>

                  <Collapse in={!collapsedComments[answer.id!]}>
                    <Box sx={{ pl: 0 }}>
                      {answer.replies?.map((reply) => (
                        <Box
                          key={reply.id}
                          sx={{
                            mb: 2,
                            pb: 2,
                            borderBottom: '1px solid #f3f4f6',
                            '&:last-child': { borderBottom: 'none', mb: 0, pb: 0 },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Avatar
                              sx={{
                                bgcolor: '#9ca3af',
                                width: 20,
                                height: 20,
                                fontSize: '0.625rem',
                              }}
                            >
                              {reply.user_name?.[0] || 'U'}
                            </Avatar>
                            <Typography
                              variant='body2'
                              sx={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem' }}
                            >
                              {reply.user_name || '未知用户'}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              bgcolor: '#fafbfc',
                              borderRadius: '6px',
                              p: 2,
                              mb: 0.5,
                              border: '1px solid #f3f4f6',
                            }}
                          >
                            <EditorContent
                              content={reply.content}
                              sx={{
                                color: '#374151',
                                fontSize: '0.875rem',
                                lineHeight: 1.6,
                              }}
                            />
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
                            {reply.updated_at && (
                              <Typography variant='body2' sx={{ color: '#9ca3af', fontSize: '0.7rem' }}>
                                更新于{' '}
                                <TimeDisplayWithTag
                                  timestamp={reply.updated_at}
                                  title={dayjs.unix(reply.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                                />
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                      <Box sx={{ mt: (answer.replies?.length || 0) > 0 ? 2 : 0 }}>
                        {!showCommentEditors[answer.id!] ? (
                          <TextField
                            fullWidth
                            size='small'
                            placeholder='添加评论...'
                            onClick={() => {
                              setShowCommentEditors({ ...showCommentEditors, [answer.id!]: true })
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                bgcolor: '#fafbfc',
                                fontSize: '0.875rem',
                                cursor: 'pointer',
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#d1d5db' },
                              },
                              '& input': {
                                cursor: 'pointer',
                              },
                            }}
                          />
                        ) : (
                          <>
                            <Box
                              sx={{
                                mb: 1,
                                height: 300,
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                overflow: 'hidden',
                              }}
                            >
                              <EditorWrap
                                key={commentEditorKeys[answer.id!] || 0}
                                ref={(ref) => {
                                  if (ref) {
                                    commentEditorRefs.current[answer.id!] = ref
                                  }
                                }}
                                value=''
                                showActions={false}
                                onChange={() => {
                                  // 可以在这里更新状态如果需要
                                }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Button
                                disableRipple
                                onClick={() => {
                                  setShowCommentEditors({ ...showCommentEditors, [answer.id!]: false })
                                  setCommentEditorKeys((prev) => ({
                                    ...prev,
                                    [answer.id!]: (prev[answer.id!] || 0) + 1,
                                  }))
                                }}
                                sx={{
                                  textTransform: 'none',
                                  color: '#6b7280',
                                  fontWeight: 600,
                                  fontSize: '0.875rem',
                                  transition: 'all 0.15s ease-in-out',
                                  '&:hover': { bgcolor: '#f3f4f6', transform: 'scale(1.02)' },
                                  '&:active': { transform: 'scale(0.98)' },
                                }}
                              >
                                取消
                              </Button>
                              <Button
                                disableRipple
                                variant='contained'
                                endIcon={<SendIcon />}
                                onClick={() => handleSubmitComment(answer.id!)}
                                sx={{
                                  background: '#000000',
                                  color: '#ffffff',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  px: 2,
                                  py: 0.5,
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  transition: 'all 0.15s ease-in-out',
                                  '&:hover': {
                                    background: '#111827',
                                    transform: 'translateY(-1px)',
                                  },
                                  '&:active': { transform: 'translateY(0) scale(0.98)' },
                                }}
                              >
                                发送评论
                              </Button>
                            </Box>
                          </>
                        )}
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              </Paper>
            )
          })}
        </Box>
      </>
    </>
  )
}

export default Content
