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
import {
  ModelCommentLikeState,
  ModelDiscussionComment,
  ModelDiscussionDetail,
  ModelDiscussionReply,
  ModelDiscussionType,
  ModelUserRole,
} from '@/api/types'
import { Card } from '@/components'
import { AuthContext } from '@/components/authProvider'
import CommonAvatar from '@/components/CommonAvatar'
import EditorWrap, { EditorWrapRef } from '@/components/editor'
import { TimeDisplayWithTag } from '@/components/TimeDisplay'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { clearCache, generateCacheKey } from '@/lib/api-cache'
import dayjs from '@/lib/dayjs'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SendIcon from '@mui/icons-material/Send'
import CancelIcon from '@mui/icons-material/Cancel'
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
  Typography,
} from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import EditCommentModal from './editCommentModal'

import EditorContent from '@/components/EditorContent'
import Modal from '@/components/modal'
import { formatNumber } from '@/lib/utils'
import { Icon } from '@ctzhian/ui'

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
            <Chip
              label='AI'
              sx={{
                width: 28,
                height: 24,
                background: 'rgba(0,99,151,0.06)',
                borderRadius: '4px',
                border: '1px solid rgba(0,99,151,0.1)',
                fontSize: '0.75rem',
                fontWeight: 500,
                '& .MuiChip-label': {
                  px: 0.5,
                },
              }}
            />
          )}
        </Stack>
        <Stack direction='row' gap={2} alignItems='center' sx={{ mt: { xs: '12px', sm: 0 } }}>
          {/* 已采纳标签 - 文章类型不显示 */}
          {data?.accepted && disData.type !== ModelDiscussionType.DiscussionTypeBlog && (
            <Stack
              direction='row'
              alignItems='center'
              gap={0.5}
              sx={{
                backgroundColor: '#E8F5E8',
                color: 'rgba(25, 135, 84, 1)',
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
          {/* 采纳按钮 - 只有问答类型且问题作者且问题未被采纳，且不是回复时才显示，文章类型不显示 */}
          {!isReply &&
            disData.type === ModelDiscussionType.DiscussionTypeQA &&
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
                  <Icon
                    type='icon-dianzan1'
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
                    <Icon
                      type='icon-diancai'
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
                backgroundColor: 'transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: 'scale(1)',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                  transition: 'transform 0.1s ease-out',
                },
                '&:focus': {
                  backgroundColor: 'transparent',
                },
                '&.Mui-focusVisible': {
                  backgroundColor: 'transparent',
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
      {/* {!repliesCollapsed &&
        !isReply &&
        (data as ModelDiscussionComment)?.replies?.map((it) => (
          <BaseDiscussCard isReply key={it.id} data={it} disData={disData} onOpt={onOpt} index={1} />
        ))} */}
    </Box>
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

  const [showAnswerEditor, setShowAnswerEditor] = useState(false)
  const [answerEditorKey, setAnswerEditorKey] = useState(0)
  const [commentEditorKeys, setCommentEditorKeys] = useState<{ [key: number]: number }>({})
  const [showCommentEditors, setShowCommentEditors] = useState<{ [key: number]: boolean }>({})
  const [collapsedComments, setCollapsedComments] = useState<{ [key: number]: boolean }>({})
  const answerEditorRef = React.useRef<EditorWrapRef>(null)
  const answerEditorContainerRef = React.useRef<HTMLDivElement>(null)
  const commentEditorRefs = React.useRef<{ [key: number]: EditorWrapRef | null }>({})
  const prevHasAcceptedRef = React.useRef<boolean>(false)
  const [hasAnswerContent, setHasAnswerContent] = useState(false)
  const isReplyEditorVisible = useMemo(() => Object.values(showCommentEditors).some(Boolean), [showCommentEditors])

  const handleAnswerEditorChange = useCallback((content: string) => {
    const normalized = content
      .replace(/<p><br><\/p>/gi, '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    setHasAnswerContent(normalized.length > 0)
  }, [])

  const handleAnswerEditorBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // 检查焦点是否移到了编辑器内部或其他相关元素
      const relatedTarget = e.relatedTarget as HTMLElement | null
      if (relatedTarget) {
        // 如果焦点移到了编辑器内部或按钮区域，不关闭编辑器
        const editorContainer = e.currentTarget
        if (editorContainer.contains(relatedTarget)) {
          return
        }
      }
      // 延迟检查，确保焦点真的移出了编辑器区域
      setTimeout(() => {
        if (!hasAnswerContent) {
          setShowAnswerEditor(false)
          setAnswerEditorKey((prev) => prev + 1)
        }
      }, 100)
    },
    [hasAnswerContent],
  )

  // 使用 useEffect 监听编辑器容器的 blur 事件
  useEffect(() => {
    if (!showAnswerEditor || !answerEditorContainerRef.current) return

    const container = answerEditorContainerRef.current
    const handleBlur = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement | null
      if (relatedTarget) {
        // 如果焦点移到了编辑器内部或按钮区域，不关闭编辑器
        if (container.contains(relatedTarget)) {
          return
        }
      }
      // 延迟检查，确保焦点真的移出了编辑器区域
      setTimeout(() => {
        if (!hasAnswerContent) {
          setShowAnswerEditor(false)
          setAnswerEditorKey((prev) => prev + 1)
        }
      }, 100)
    }

    container.addEventListener('blur', handleBlur, true)
    return () => {
      container.removeEventListener('blur', handleBlur, true)
    }
  }, [showAnswerEditor, hasAnswerContent])

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

  // 当有采纳的回答时,自动收起其他回答下的评论(仅问答类型)
  useEffect(() => {
    // 如果有采纳且是问答类型,则收起其他回答下的评论
    if (hasAcceptedComment && data.type === ModelDiscussionType.DiscussionTypeQA && data.comments) {
      // 只在采纳状态从无到有时,或者页面首次加载且有采纳时执行
      if (!prevHasAcceptedRef.current) {
        // 收起所有未被采纳的回答下的评论
        setCollapsedComments((prev) => {
          const updated = { ...prev }
          data.comments?.forEach((comment) => {
            if (!comment.accepted) {
              updated[comment.id!] = true
            }
          })
          return updated
        })
      }
    }
    // 更新上一次的采纳状态
    prevHasAcceptedRef.current = hasAcceptedComment || false
  }, [hasAcceptedComment, data.type, data.comments])

  const handleSubmitAnswer = async () => {
    const content = answerEditorRef.current?.getContent() || ''
    if (!content.trim()) return
    return checkAuth(async () => {
      await postDiscussionDiscIdComment({ discId: id }, { content })
      setShowAnswerEditor(false)
      setAnswerEditorKey((prev) => prev + 1) // 重置编辑器
      setHasAnswerContent(false)
      const cacheKey = generateCacheKey(`/discussion/${id}`, {})
      clearCache(cacheKey)
      router.refresh()
    })
  }

  const handleSubmitComment = async (answerId: number) => {
    const comment = commentEditorRefs.current[answerId]?.getContent() || ''
    if (!comment.trim()) return
    return checkAuth(async () => {
      await postDiscussionDiscIdComment({ discId: id }, { content: comment, comment_id: answerId })
      // 重置编辑器并隐藏
      setShowCommentEditors((prev) => ({ ...prev, [answerId]: false }))
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

  const handleReplyInputClick = useCallback(
    (answerId: number) => {
      checkAuth(() => {
        setShowCommentEditors((prev) => ({ ...prev, [answerId]: true }))
      })
    },
    [checkAuth],
  )

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
        {!isArticlePost &&
          data.type === ModelDiscussionType.DiscussionTypeQA &&
          data.user_id === (user?.uid || 0) &&
          commentIndex &&
          !commentIndex.accepted &&
          !hasAcceptedComment && <MenuItem onClick={handleAcceptComment}>采纳</MenuItem>}
        {!isArticlePost &&
          data.type === ModelDiscussionType.DiscussionTypeQA &&
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
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: isArticlePost ? 'unset' : 1,
          '& .md-container .MuiIconButton-root + *': {
            display: 'none',
          },
          '& .md-container > div': {
            // backgroundColor: 'transparent!important',
            '& > div': {
              border: 'none',
            },
          },
        }}
      >
        <Box sx={{ pt: 2, flex: 1 }}>
          <Typography
            variant='h6'
            sx={{
              fontWeight: 700,
              color: 'rgba(33, 34, 45, 0.50)',
              mb: 3,
              fontSize: '1.25rem',
            }}
          >
            共<span style={{ color: 'rgba(33, 34, 45, 1)', margin: '0 4px' }}>{sortedComments.length}</span>条
            {isArticlePost ? '评论' : '回答'}
          </Typography>

          {sortedComments.map((answer) => {
            const isLiked = answer.user_like_state === ModelCommentLikeState.CommentLikeStateLike
            const isDisliked = answer.user_like_state === ModelCommentLikeState.CommentLikeStateDislike
            const answerProfileHref = answer.user_id ? `/profile/${answer.user_id}` : undefined
            const answerCreatedAt = (answer as ModelDiscussionComment & { created_at?: number }).created_at
            return (
              <Paper
                key={answer.id}
                elevation={0}
                sx={{
                  bgcolor: answer.accepted ? '#ffffff' : '#ffffff',
                  p: '20px',
                  mb: 2,
                  border: answer.accepted
                    ? '2px solid rgba(25, 135, 84, 1) !important'
                    : '1px solid rgba(217, 222, 226, 1)!important',
                  position: 'relative',
                }}
              >
                {answer.accepted && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '-2px',
                      left: '-2px',
                      width: '20px',
                      height: '20px',
                      bgcolor: 'rgba(25, 135, 84, 1)',
                      borderTopLeftRadius: '10px',
                      borderTopRightRadius: '0px',
                      borderBottomLeftRadius: '0px',
                      borderBottomRightRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >
                    {/* 用 SVG 替换字符实现直的对钩 */}
                    <Box
                      component='svg'
                      xmlns='http://www.w3.org/2000/svg'
                      viewBox='0 0 18 18'
                      sx={{
                        width: 16,
                        height: 16,
                        display: 'block',
                      }}
                    >
                      <polyline
                        points='4 10 8 14 14 4'
                        stroke='#fff'
                        strokeWidth='2'
                        fill='none'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </Box>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
                  <Stack direction={'row'} spacing={1} alignItems='center'>
                    {/* 用户名区域 */}
                    {answerProfileHref ? (
                      <Link href={answerProfileHref} style={{ display: 'inline-flex' }} tabIndex={-1}>
                        <CommonAvatar src={answer.user_avatar} name={answer.user_name} />
                      </Link>
                    ) : (
                      <CommonAvatar src={answer.user_avatar} name={answer.user_name} />
                    )}
                    {answerProfileHref ? (
                      <Link
                        href={answerProfileHref}
                        style={{
                          display: 'inline-flex',
                          textDecoration: 'none',
                          // 去掉默认a标签样式
                          color: 'inherit',
                        }}
                        tabIndex={-1}
                      >
                        <Typography
                          variant='body2'
                          sx={{
                            fontWeight: 500,
                            color: 'inherit',
                            fontSize: '0.875rem',
                            '&:hover': {
                              color: 'primary.main',
                            },
                          }}
                        >
                          {answer.user_name || '未知用户'}
                        </Typography>
                      </Link>
                    ) : (
                      <Typography variant='body2' sx={{ fontWeight: 500, color: 'inherit', fontSize: '0.875rem' }}>
                        {answer.user_name || '未知用户'}
                      </Typography>
                    )}

                    {/* AI标签 - 已整合到用户名区域 */}
                    {answer.bot && (
                      <Chip
                        label='AI'
                        sx={{
                          width: 28,
                          height: 24,
                          background: 'rgba(0,99,151,0.06)',
                          color: 'primary.main',
                          borderRadius: '4px',
                          border: '1px solid rgba(0,99,151,0.1)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          '& .MuiChip-label': {
                            px: 0.5,
                          },
                        }}
                      />
                    )}
                  </Stack>

                  {/* 时间显示 - 已整合到同一区域 */}
                  <Stack direction='row' alignItems='center'>
                    <Typography variant='body2' sx={{ color: '#9ca3af' }}>
                      发布于 <TimeDisplayWithTag timestamp={(answerCreatedAt || answer.updated_at)!} />
                    </Typography>
                    {answer.updated_at && answerCreatedAt && answer.updated_at !== answerCreatedAt && (
                      <>
                        <Typography variant='body2' sx={{ color: '#9ca3af', ml: 0.5 }}>
                          ,
                        </Typography>
                        <Typography variant='body2' sx={{ color: '#9ca3af', ml: 0.5 }}>
                          更新于 <TimeDisplayWithTag timestamp={answer.updated_at} />
                        </Typography>
                      </>
                    )}
                  </Stack>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                    {/* 采纳按钮 - 只有问答类型且问题作者且问题未被采纳时才显示 */}
                    {!isArticlePost &&
                      data.type === ModelDiscussionType.DiscussionTypeQA &&
                      isAuthor &&
                      !hasAcceptedComment &&
                      !answer.accepted && (
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
                      )}
                    {/* 已采纳标签 - 文章类型不显示，放在点赞前面 */}
                    {answer.accepted && !isArticlePost && (
                      <Chip
                        icon={
                          <CheckCircleOutlineIcon
                            sx={{
                              width: 15,
                              height: 15,
                              color: '#fff !important',
                            }}
                          />
                        }
                        label='已采纳'
                        size='small'
                        sx={{
                          bgcolor: 'rgba(25, 135, 84, 1)',
                          color: '#fff !important',
                          height: 22,
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          border: '1px solid rgba(25, 135, 84, 0.3)',
                          fontFamily:
                            'Glibory, "PingFang SC", "Hiragino Sans GB", "STHeiti", "Microsoft YaHei", sans-serif',
                        }}
                      />
                    )}
                    {/* 问答类型显示点赞/点踩按钮 */}
                    {!isArticlePost && (
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
                          onClick={() => handleVote(answer.id!, 'up')}
                        >
                          <Icon
                            type='icon-dianzan1'
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
                            {formatNumber(answer.like || 0)}
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
                          onClick={() => handleVote(answer.id!, 'down')}
                        >
                          <Icon
                            type='icon-diancai'
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
                            {formatNumber(answer.dislike || 0)}
                          </Typography>
                        </Stack>
                      </>
                    )}

                    {/* 更多操作按钮 */}
                    {(answer.user_id === (user?.uid || 0) ||
                      [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
                        user?.role || ModelUserRole.UserRoleUnknown,
                      ) ||
                      (data.type === ModelDiscussionType.DiscussionTypeQA && isAuthor)) && (
                      <IconButton
                        disableRipple
                        size='small'
                        onClick={(e) => handleClick(e, answer.content || '', answer)}
                        sx={{
                          color: '#6b7280',
                          ml: 0.5,
                          backgroundColor: 'transparent',
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': { color: '#000000', bgcolor: '#f3f4f6' },
                          '&:focus': {
                            backgroundColor: 'transparent',
                          },
                          '&.Mui-focusVisible': {
                            backgroundColor: 'transparent',
                          },
                        }}
                      >
                        <MoreVertIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Box
                  sx={{
                    mb: 2,
                  }}
                >
                  <EditorContent content={answer.content} />
                </Box>

                {/* 操作按钮区域 */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                      backgroundColor: 'transparent',
                      transition: 'all 0.15s ease-in-out',
                      '&:hover': { color: '#000000' },
                      '&:focus': {
                        backgroundColor: 'transparent',
                      },
                      '&.Mui-focusVisible': {
                        backgroundColor: 'transparent',
                      },
                    }}
                  >
                    {answer.replies?.length || 0} 条{isArticlePost ? '回复' : '评论'}
                  </Button>
                </Box>

                <Box>
                  <Collapse in={!collapsedComments[answer.id!]}>
                    <Box sx={{ mt: 2 }}>
                      {answer.replies?.map((reply) => {
                        const replyProfileHref = reply.user_id ? `/profile/${reply.user_id}` : undefined
                        const replyCreatedAt = (reply as ModelDiscussionReply & { created_at?: number }).created_at
                        const displayReplyCreatedAt = replyCreatedAt || reply.updated_at
                        return (
                          <Box
                            key={reply.id}
                            sx={{
                              mb: 2,
                              pb: 2,
                              p: 2,
                              background: 'rgba(0,99,151,0.03)',
                              borderRadius: '8px',
                              border: '1px solid #D9DEE2',
                              '&:last-child': { mb: 0, pb: 0 },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
                              <Stack direction={'row'} spacing={1} alignItems='center'>
                                {/* 用户名区域 */}
                                {replyProfileHref ? (
                                  <Link href={replyProfileHref} style={{ display: 'inline-flex' }} tabIndex={-1}>
                                    <CommonAvatar src={reply.user_avatar} name={reply.user_name} />
                                  </Link>
                                ) : (
                                  <CommonAvatar src={reply.user_avatar} name={reply.user_name} />
                                )}
                                {replyProfileHref ? (
                                  <Link
                                    href={replyProfileHref}
                                    style={{
                                      fontWeight: 600,
                                      color: 'inherit',
                                      fontSize: '0.8125rem',
                                      textDecoration: 'none',
                                    }}
                                    tabIndex={-1}
                                  >
                                    <Box
                                      sx={{
                                        '&:hover': {
                                          color: 'primary.main',
                                        },
                                      }}
                                    >
                                      {reply.user_name || '未知用户'}
                                    </Box>
                                  </Link>
                                ) : (
                                  <Typography
                                    variant='body2'
                                    sx={{ fontWeight: 600, color: 'inherit', fontSize: '0.8125rem' }}
                                  >
                                    {reply.user_name || '未知用户'}
                                  </Typography>
                                )}

                                {/* AI标签 - 已整合到用户名区域 */}
                                {reply.bot && (
                                  <Chip
                                    label='AI'
                                    sx={{
                                      width: 28,
                                      height: 24,
                                      background: 'rgba(0,99,151,0.06)',
                                      color: 'primary.main',
                                      borderRadius: '4px',
                                      border: '1px solid rgba(0,99,151,0.1)',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      '& .MuiChip-label': {
                                        px: 0.5,
                                      },
                                    }}
                                  />
                                )}
                              </Stack>

                              {/* 时间显示 - 已整合到同一区域 */}
                              {displayReplyCreatedAt && (
                                <Stack direction='row' alignItems='center'>
                                  <Typography variant='body2' sx={{ color: '#9ca3af', fontSize: '0.8125rem' }}>
                                    发布于 <TimeDisplayWithTag timestamp={displayReplyCreatedAt} />
                                  </Typography>
                                  {reply.updated_at && replyCreatedAt && reply.updated_at !== replyCreatedAt && (
                                    <>
                                      <Typography
                                        variant='body2'
                                        sx={{ color: '#9ca3af', ml: 0.5, fontSize: '0.8125rem' }}
                                      >
                                        ,
                                      </Typography>
                                      <Typography
                                        variant='body2'
                                        sx={{ color: '#9ca3af', ml: 0.5, fontSize: '0.8125rem' }}
                                      >
                                        更新于 <TimeDisplayWithTag timestamp={reply.updated_at} />
                                      </Typography>
                                    </>
                                  )}
                                </Stack>
                              )}
                            </Box>
                            <EditorContent
                              content={reply.content}
                              sx={{
                                color: '#374151',
                                fontSize: '0.875rem',
                                lineHeight: 1.6,
                              }}
                            />
                          </Box>
                        )
                      })}
                      <Box sx={{ mt: (answer.replies?.length || 0) > 0 ? 2 : 0 }}>
                        {!showCommentEditors[answer.id!] ? (
                          <OutlinedInput
                            fullWidth
                            size='small'
                            placeholder={isArticlePost ? '添加评论...' : '添加评论...'}
                            onClick={() => handleReplyInputClick(answer.id!)}
                            endAdornment={
                              <InputAdornment position='end'>
                                <ArrowForwardIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                              </InputAdornment>
                            }
                            sx={{
                              bgcolor: '#fafbfc',
                              fontSize: '0.875rem',
                              cursor: 'pointer',
                              '& fieldset': { borderColor: '#e5e7eb' },
                              '&:hover fieldset': { borderColor: '#d1d5db' },
                              '& input': {
                                cursor: 'pointer',
                              },
                            }}
                          />
                        ) : (
                          <>
                            <Box
                              sx={{
                                mb: 3,
                                borderRadius: '6px',
                                overflow: 'hidden',
                                border: '1px solid #000000',
                                px: 1,
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
                              />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                              <Button
                                disableRipple
                                onClick={() => {
                                  setShowCommentEditors((prev) => ({ ...prev, [answer.id!]: false }))
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
                                endIcon={<ArrowForwardIcon />}
                                onClick={() => handleSubmitComment(answer.id!)}
                                sx={{
                                  color: '#ffffff',
                                  textTransform: 'none',
                                  fontWeight: 600,
                                  px: 2,
                                  py: 0.5,
                                  borderRadius: '6px',
                                  fontSize: '0.875rem',
                                  transition: 'all 0.15s ease-in-out',
                                  '&:hover': {
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
        {/* Answers section for questions */}
        {!isReplyEditorVisible && (
          <Paper
            elevation={0}
            sx={{
              position: isArticlePost ? 'unset' : 'sticky',
              bottom: '24px',
              width: '100%',
              maxWidth: { lg: '756px' },
              mx: 'auto',
              mb: { xs: 2, md: 3 },
              mt: isArticlePost ? 0 : 'auto',
              zIndex: 9,
              bgcolor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid rgba(33, 34, 45, 1)',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '-41px',
                left: '-1px',
                right: '-1px',
                height: '40px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFFFFF 100%)',
                pointerEvents: 'none',
                zIndex: -2,
              },
            }}
          >
            <Box sx={{ p: 1 }}>
              {isArticlePost && !showAnswerEditor ? (
                <OutlinedInput
                  fullWidth
                  size='small'
                  placeholder='添加评论...'
                  onClick={() => checkAuth(() => setShowAnswerEditor(true))}
                  endAdornment={
                    <InputAdornment position='end'>
                      <ArrowForwardIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                    </InputAdornment>
                  }
                  sx={{
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    '& fieldset': { border: 'none' },
                    '& input': {
                      cursor: 'pointer',
                    },
                  }}
                />
              ) : (
                <>
                  <Box
                    ref={answerEditorContainerRef}
                    sx={{
                      minHeight: '100px',
                      borderRadius: '6px',
                      px: 1,
                      '& .tiptap:focus': { backgroundColor: 'transparent' },
                      '& .tiptap': { overflow: 'auto' },
                    }}
                    tabIndex={-1}
                  >
                    <EditorWrap
                      key={answerEditorKey}
                      ref={answerEditorRef}
                      value=''
                      placeholder={isArticlePost ? '添加评论...' : '回答问题...'}
                      onChange={handleAnswerEditorChange}
                    />
                  </Box>
                  {hasAnswerContent && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Button
                        disableRipple
                        onClick={() => {
                          setShowAnswerEditor(false)
                          setAnswerEditorKey((prev) => prev + 1)
                          setHasAnswerContent(false)
                          // 重置编辑器内容
                          answerEditorRef.current?.resetContent()
                        }}
                        sx={{
                          textTransform: 'none',
                          color: '#6b7280',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          backgroundColor: 'transparent',
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': { bgcolor: '#f3f4f6', transform: 'scale(1.02)' },
                          '&:active': { transform: 'scale(0.98)' },
                          '&:focus': {
                            backgroundColor: 'transparent',
                          },
                          '&.Mui-focusVisible': {
                            backgroundColor: 'transparent',
                          },
                        }}
                      >
                        取消
                      </Button>
                      <Button
                        disableRipple
                        variant='contained'
                        endIcon={<ArrowForwardIcon />}
                        onClick={handleSubmitAnswer}
                        sx={{
                          color: '#ffffff',
                          textTransform: 'none',
                          fontWeight: 600,
                          px: 2,
                          py: 0.5,
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          transition: 'all 0.15s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                          },
                          '&:active': { transform: 'translateY(0) scale(0.98)' },
                        }}
                      >
                        {isArticlePost ? '提交评论' : '提交回答'}
                      </Button>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Paper>
        )}
      </Box>
    </>
  )
}

export default Content
