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
  ModelDiscussionState,
  ModelDiscussionType,
  ModelUserRole,
} from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import CommonAvatar from '@/components/CommonAvatar'
import EditorWrap, { EditorWrapRef } from '@/components/editor'
import { TimeDisplayWithTag } from '@/components/TimeDisplay'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { clearCache, generateCacheKey } from '@/lib/api-cache'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  OutlinedInput,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import EditCommentModal from './editCommentModal'
import DuplicateAnswerModal from './DuplicateAnswerModal'

import RoleChip from '@/app/profile/ui/RoleChip'
import EditorContent from '@/components/EditorContent'
import Modal from '@/components/modal'
import { formatNumber, isAdminRole } from '@/lib/utils'
import { useQuickReplyStore } from '@/store'
import { Icon } from '@ctzhian/ui'
import { showPointNotification, PointActionType } from '@/utils/pointNotification'

const Content = (props: { data: ModelDiscussionDetail }) => {
  const { data } = props
  const { id }: { id: string } = useParams() || { id: '' }
  const router = useRouter()
  const { user } = useContext(AuthContext)
  const { checkAuth } = useAuthCheck()
  const [commentIndex, setCommentIndex] = useState<ModelDiscussionComment | ModelDiscussionReply | null>(null)
  const [editCommentModalVisible, setEditCommentModalVisible] = useState(false)
  const [duplicateAnswerModalVisible, setDuplicateAnswerModalVisible] = useState(false)
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
  const { quickReplies } = useQuickReplyStore()
  // Check if this is a closed post (applies to all types)
  const isQAPost = data.type === ModelDiscussionType.DiscussionTypeQA
  const isClosed = data.resolved === ModelDiscussionState.DiscussionStateClosed
  const isClosedQAPost = isQAPost && isClosed
  const isClosedPost = isClosed // All post types should be read-only when closed

  const handleAnswerEditorChange = useCallback((content: string) => {
    const normalized = content
      .replace(/<p><br><\/p>/gi, '')
      .replace(/<br\s*\/?>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .trim()
    setHasAnswerContent(normalized.length > 0)
  }, [])

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
        // 显示积分提示：删除回答 -1
        showPointNotification(PointActionType.DELETE_ANSWER)
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

  // 检查用户是否已回答过（仅问答类型）
  const userHasAnswered = useMemo(() => {
    if (!isQAPost || !user?.uid) return false
    return data.comments?.some((comment) => comment.user_id === user.uid) || false
  }, [isQAPost, user?.uid, data.comments])

  // 获取用户的历史回答
  const getUserAnswer = useCallback(() => {
    if (!user?.uid) return null
    return data.comments?.find((comment) => comment.user_id === user.uid) || null
  }, [user?.uid, data.comments])

  // 处理点击回答框
  const handleAnswerInputClick = useCallback(() => {
    checkAuth(() => {
      // 如果是问答类型，检查用户是否已回答过
      if (isQAPost && userHasAnswered) {
        // 只要用户已回答过，就显示弹窗引导编辑原有回答
        setDuplicateAnswerModalVisible(true)
        return
      }
      // 如果用户未回答过，正常显示编辑器
      setShowAnswerEditor(true)
    })
  }, [checkAuth, isQAPost, userHasAnswered])

  // 处理编辑原有回答
  const handleEditExistingAnswer = useCallback(() => {
    const userAnswer = getUserAnswer()
    if (userAnswer) {
      setCommentIndex(userAnswer)
      setEditCommentModalVisible(true)
      setDuplicateAnswerModalVisible(false)

      // 滚动到用户回答的位置
      setTimeout(() => {
        const answerElement = document.querySelector(`[data-answer-id="${userAnswer.id}"]`)
        if (answerElement) {
          answerElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // 高亮显示
          answerElement.classList.add('highlight-answer')
          setTimeout(() => {
            answerElement.classList.remove('highlight-answer')
          }, 2000)
        }
      }, 100)
    }
  }, [getUserAnswer])

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
        // 显示积分提示：采纳回答 +2（提问者），回答被采纳 +10（回答者）
        // 注意：这里只显示提问者的积分提示，回答者的积分提示应该在后端返回或通过其他方式通知
        showPointNotification(PointActionType.ACCEPT_ANSWER)
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
        // 显示积分提示：取消采纳 -2（提问者）
        showPointNotification(PointActionType.REVOKE_ACCEPT, -2)
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
  const isAdmin = isAdminRole(user?.role || ModelUserRole.UserRoleUnknown)
  const canAcceptAnswer = isAuthor || isAdmin

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
      // 显示积分提示：回答问题 +1
      showPointNotification(PointActionType.ANSWER_QUESTION)
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
    // 显示积分提示：采纳回答 +2（提问者）
    showPointNotification(PointActionType.ACCEPT_ANSWER)
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
    [checkAuth, isClosedQAPost],
  )

  const handleVote = async (answerId: number, type: 'up' | 'down') => {
    return checkAuth(async () => {
      const comment = data.comments?.find((c) => c.id === answerId)
      if (!comment) return

      if (type === 'up') {
        if (comment.user_like_state === ModelCommentLikeState.CommentLikeStateLike) {
          // 取消点赞
          await postDiscussionDiscIdCommentCommentIdRevokeLike({ discId: id, commentId: answerId })
          // 显示积分提示：取消点赞 -5（被点赞者）
          showPointNotification(PointActionType.REVOKE_LIKE)
        } else {
          // 点赞
          await postDiscussionDiscIdCommentCommentIdLike({ discId: id, commentId: answerId })
          // 注意：点赞别人的回答不给自己加积分，只给被点赞者加积分
          // 如果当前用户是回答者，会收到通知，这里不显示积分提示
        }
      } else {
        if (comment.user_like_state === ModelCommentLikeState.CommentLikeStateDislike) {
          // 取消点踩
          await postDiscussionDiscIdCommentCommentIdRevokeLike({ discId: id, commentId: answerId })
          // 显示积分提示：取消点踩 +5（被点踩者）或 +2（点踩者）
          // 这里假设是点踩者取消点踩，所以是 +2
          showPointNotification(PointActionType.REVOKE_DISLIKE, 2)
        } else {
          // 点踩
          await postDiscussionDiscIdCommentCommentIdDislike({ discId: id, commentId: answerId })
          // 显示积分提示：点踩别人的回答 -2（点踩者）
          showPointNotification(PointActionType.DISLIKE_ANSWER)
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
        {isQAPost &&
          canAcceptAnswer &&
          commentIndex &&
          'replies' in commentIndex && // 只有主评论才有replies字段
          !commentIndex.accepted &&
          hasAcceptedComment &&
          !isClosedPost && <MenuItem onClick={handleAcceptComment}>采纳</MenuItem>}
        {!isArticlePost &&
          data.type === ModelDiscussionType.DiscussionTypeQA &&
          canAcceptAnswer &&
          commentIndex &&
          'replies' in commentIndex && // 只有主评论才有replies字段
          commentIndex.accepted && <MenuItem onClick={handleUnacceptComment}>取消采纳</MenuItem>}

        {(commentIndex?.user_id == (user?.uid || 0) ||
          [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
            user?.role || ModelUserRole.UserRoleUnknown,
          )) && <MenuItem onClick={handleEditComment}>编辑</MenuItem>}

        {/* 已采纳的回答不允许普通用户删除，但管理者和运营者可以删除 */}
        {(isAdminRole(user?.role || ModelUserRole.UserRoleUnknown) ||
          (commentIndex?.user_id == (user?.uid || 0) && !commentIndex?.accepted)) && (
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
        isQAPost={isQAPost}
        userRole={user?.role}
      />
      <DuplicateAnswerModal
        open={duplicateAnswerModalVisible}
        onCancel={() => setDuplicateAnswerModalVisible(false)}
        onEditExisting={handleEditExistingAnswer}
      />
      <Stack
        sx={{
          flex: !isQAPost ? 'unset' : 1,
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
        <Box
          sx={{
            flex: 1,
            // 移动端为固定定位的编辑器预留底部空间，避免内容被遮挡
            // 注意：占位元素会在内容区域后面添加，这里只需要少量 padding 作为缓冲
            ...(isQAPost && {
              '@media (max-width: 600px)': {
                paddingBottom: 2,
              },
            }),
          }}
        >
          <Typography
            variant='h6'
            sx={{
              fontWeight: 700,
              color: 'rgba(33, 34, 45, 0.50)',
              fontSize: '1.25rem',
              mb: 2,
            }}
          >
            共<span style={{ color: 'rgba(33, 34, 45, 1)', margin: '0 4px' }}>{sortedComments.length}</span>条
            {isQAPost ? '回答' : '评论'}
          </Typography>

          {sortedComments.map((answer) => {
            const isLiked = answer.user_like_state === ModelCommentLikeState.CommentLikeStateLike
            const isDisliked = answer.user_like_state === ModelCommentLikeState.CommentLikeStateDislike
            const answerProfileHref = answer.user_id ? `/profile/${answer.user_id}` : undefined
            const answerCreatedAt = (answer as ModelDiscussionComment & { created_at?: number }).created_at
            return (
              <Paper
                key={answer.id}
                data-answer-id={answer.id}
                elevation={0}
                sx={{
                  bgcolor: answer.accepted ? '#ffffff' : '#ffffff',
                  p: '20px',
                  mb: 2,
                  border: answer.accepted
                    ? '2px solid rgba(25, 135, 84, 1) !important'
                    : '1px solid rgba(217, 222, 226, 1)!important',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  '&.highlight-answer': {
                    border: '2px solid rgba(0, 99, 151, 1) !important',
                    boxShadow: '0 0 0 4px rgba(0, 99, 151, 0.1)',
                  },
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
                <Stack
                  direction={'row'}
                  flexWrap='wrap'
                  justifyContent='space-between'
                  sx={{ alignItems: 'center', mb: 1.5, gap: 1.5 }}
                >
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
                          height: 22,
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
                    <RoleChip role={answer.user_role} />
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

                  <Stack
                    direction='row'
                    sx={{ alignItems: 'center', gap: 1, ml: 'auto', flex: { xs: 1, sm: 'unset' } }}
                  >
                    {/* 采纳按钮 - 只有问答类型且问题作者或管理员且问题未被采纳时才显示 */}
                    {!isArticlePost &&
                      data.type === ModelDiscussionType.DiscussionTypeQA &&
                      canAcceptAnswer &&
                      !hasAcceptedComment &&
                      !answer.accepted &&
                      !isClosedPost && (
                        <Box
                          onClick={() => handleAcceptAnswer(answer.id!)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 0.5,
                            background: 'rgba(0,99,151,0.06)',
                            color: 'primary.main',
                            px: 1.5,
                            lineHeight: '22px',
                            height: '22px',
                            borderRadius: 0.5,
                            cursor: 'pointer',
                            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: 'scale(1)',
                            border: '1px solid rgba(0,99,151,0.1)',
                            '&:hover': {
                              background: 'rgba(0,99,151,0.12)',
                            },
                            '&:active': {
                              transform: 'scale(0.95)',
                              transition: 'transform 0.1s ease-out',
                            },
                          }}
                        >
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: 500,
                              fontSize: '12px',
                              color: 'inherit',
                              transition: 'color 0.2s',
                            }}
                          >
                            采纳
                          </Typography>
                        </Box>
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
                          fontSize: '12px',
                          border: '1px solid rgba(25, 135, 84, 0.3)',
                          fontFamily:
                            'Glibory, "PingFang SC", "Hiragino Sans GB", "STHeiti", "Microsoft YaHei", sans-serif',
                        }}
                      />
                    )}
                    {/* 问答类型显示点赞/点踩按钮 - 已关闭帖子不显示 */}
                    {!isArticlePost && !isClosedQAPost && (
                      <>
                        <Stack
                          component={Button}
                          direction='row'
                          alignItems='center'
                          gap={1}
                          sx={{
                            background: isLiked ? 'rgba(32,108,255,0.1)' : '#F2F3F5',
                            borderRadius: 0.5,
                            px: '0px!important',
                            minWidth: '50px',
                            py: '1px',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: 'scale(1)',
                            '&:hover': {
                              background: isLiked ? 'rgba(32,108,255,0.2)' : 'rgba(0, 0, 0, 0.12)',
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
                          component={Button}
                          direction='row'
                          alignItems='center'
                          gap={1}
                          sx={{
                            background: isDisliked ? 'rgba(32,108,255,0.1)' : '#F2F3F5',
                            borderRadius: 0.5,
                            px: '0px!important',
                            minWidth: '50px',
                            py: '1px',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: 'scale(1)',
                            '&:hover': {
                              background: isDisliked ? 'rgba(32,108,255,0.2)' : 'rgba(0, 0, 0, 0.12)',
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
                        disabled={isClosedQAPost}
                        disableRipple
                        size='small'
                        onClick={(e) => handleClick(e, answer.content || '', answer)}
                        sx={{
                          color: '#6b7280',
                          ml: { xs: 'auto', sm: 0.5 },
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
                  </Stack>
                </Stack>

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
                    {answer.replies?.length || 0} 条{isQAPost ? '评论' : '回复'}
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
                            <Stack direction='row' flexWrap='wrap' sx={{ alignItems: 'center', mb: 1.5, gap: 1.5 }}>
                              <Stack direction={'row'} spacing={1} alignItems='center'>
                                {/* 用户名区域 */}
                                {replyProfileHref ? (
                                  <Link href={replyProfileHref} style={{ display: 'inline-flex' }} tabIndex={-1}>
                                    <CommonAvatar src={reply.user_avatar} name={reply.user_name} />
                                  </Link>
                                ) : (
                                  <CommonAvatar src={reply.user_avatar} name={reply.user_name} />
                                )}
                                <Link
                                  href={replyProfileHref || 'javascript:void(0)'}
                                  style={{
                                    fontWeight: 500,
                                    color: 'inherit',
                                    fontSize: '14px',
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
                                <RoleChip role={reply.user_role} />
                              </Stack>

                              {/* 时间显示 - 已整合到同一区域 */}
                              {displayReplyCreatedAt && (
                                <Stack direction='row' alignItems='center' sx={{ fontSize: '14px', color: '#9ca3af' }}>
                                  <Typography variant='body2'>
                                    发布于 <TimeDisplayWithTag timestamp={displayReplyCreatedAt} />
                                  </Typography>
                                  {reply.updated_at && replyCreatedAt && reply.updated_at !== replyCreatedAt && (
                                    <>
                                      <Typography variant='body2'>,</Typography>
                                      <Typography variant='body2'>
                                        更新于 <TimeDisplayWithTag timestamp={reply.updated_at} />
                                      </Typography>
                                    </>
                                  )}
                                </Stack>
                              )}

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                                {/* 回复的更多操作按钮 - 作者或管理员可见 */}
                                {(reply.user_id === (user?.uid || 0) ||
                                  [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
                                    user?.role || ModelUserRole.UserRoleUnknown,
                                  )) && (
                                  <IconButton
                                    disableRipple
                                    disabled={isClosedQAPost}
                                    size='small'
                                    onClick={(e) => handleClick(e, reply.content || '', reply)}
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
                            </Stack>
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
                      {!isClosedPost && (
                        <Box sx={{ mt: (answer.replies?.length || 0) > 0 ? 2 : 0 }}>
                          {!showCommentEditors[answer.id!] ? (
                            <OutlinedInput
                              fullWidth
                              size='small'
                              placeholder={isQAPost ? '添加评论...' : '回复评论...'}
                              onClick={() => handleReplyInputClick(answer.id!)}
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
                              endAdornment={
                                <InputAdornment position='end'>
                                  <ArrowForwardIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                                </InputAdornment>
                              }
                            />
                          ) : (
                            <>
                              <Box
                                sx={{
                                  mb: 3,
                                  borderRadius: 1,
                                  overflow: 'hidden',
                                  border: '1px solid #000000',
                                  px: 1,
                                  minHeight: '120px',
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
                              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
                                {/* 快捷回复选择器（管理员/运营可见） */}
                                {isAdmin && !isArticlePost && (
                                  <Box sx={{ mr: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {quickReplies.map((qr) => (
                                      <Button
                                        variant='outlined'
                                        key={qr.id}
                                        size='small'
                                        sx={{ color: 'text.primary', borderColor: 'text.disabled' }}
                                        onClick={() => {
                                          const ref = commentEditorRefs.current[answer.id!]
                                          if (ref && typeof ref.setContent === 'function') {
                                            ref.setContent(qr.content || '')
                                          }
                                        }}
                                      >
                                        {'# ' + qr.name}
                                      </Button>
                                    ))}
                                  </Box>
                                )}
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
                                  }}
                                >
                                  取消
                                </Button>
                                <Button
                                  disableRipple
                                  variant='contained'
                                  onClick={() => handleSubmitComment(answer.id!)}
                                  sx={{
                                    color: '#ffffff',
                                    textTransform: 'none',
                                    fontWeight: 600,
                                    px: 2,
                                    py: 0.5,
                                    borderRadius: 1,
                                    fontSize: '0.875rem',
                                    transition: 'all 0.15s ease-in-out',
                                    '&:active': { transform: 'translateY(0) scale(0.98)' },
                                  }}
                                >
                                  {isQAPost ? '提交评论' : '提交回复'}
                                </Button>
                              </Box>
                            </>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              </Paper>
            )
          })}
        </Box>
        {/* 移动端固定定位编辑器的占位元素，避免内容被遮挡 */}
        {!isReplyEditorVisible && !isClosedPost && isQAPost && (
          <Box
            sx={{
              display: { xs: 'block', sm: 'none' },
              height: 'calc(250px + env(safe-area-inset-bottom, 44px))',
              flexShrink: 0,
            }}
          />
        )}
        {/* Answers section for questions - 已关闭帖子不显示编辑器 */}
        {!isReplyEditorVisible && !isClosedPost && (
          <Paper
            elevation={0}
            sx={{
              position: !isQAPost ? 'unset' : { xs: 'fixed', sm: 'sticky' },
              bottom: !isQAPost ? 'unset' : { xs: 0, sm: 0 },
              left: !isQAPost ? 'unset' : { xs: 0, sm: 'unset' },
              right: !isQAPost ? 'unset' : { xs: 0, sm: 'unset' },
              pb: !isQAPost ? 3 : { xs: 'calc(24px + env(safe-area-inset-bottom, 0))', sm: 3 },
              width: '100%',
              maxWidth: { lg: '750px' },
              mx: { xs: 0, sm: 'auto' },
              mt: !isQAPost ? 0 : 'auto',
              zIndex: 9,
              borderRadius: 0,
              bgcolor: '#ffffff',
              // 移动端添加底部安全区域支持，避免被 Safari 工具栏遮挡
              ...(isQAPost && {
                '@media (max-width: 600px)': {
                  // Safari 工具栏高度约 44px，加上安全区域和内容 padding
                  paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0))',
                  // 添加左侧和右侧的安全区域支持
                  paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
                  paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
                  // 移除 maxWidth 限制，让 Paper 在移动端占据全宽
                  maxWidth: '100%',
                },
              }),
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '-38px',
                left: '-1px',
                right: '-1px',
                height: '40px',
                background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFFFFF 100%)',
                pointerEvents: 'none',
                zIndex: -2,
                // 移动端隐藏渐变，因为使用 fixed 定位
                '@media (max-width: 600px)': {
                  display: 'none',
                },
              },
            }}
          >
            <Box sx={{ p: 1, border: '1px solid rgba(33, 34, 45, 1)', borderRadius: 1 }}>
              {!isQAPost && !showAnswerEditor ? (
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
                      borderRadius: 1,
                      px: 1,
                      '& .tiptap:focus': { backgroundColor: 'transparent' },
                      '& .tiptap': { overflow: 'auto', maxHeight: '40vh' },
                    }}
                    tabIndex={-1}
                    onClick={handleAnswerInputClick}
                  >
                    <EditorWrap
                      key={answerEditorKey}
                      ref={answerEditorRef}
                      readonly={isClosedPost || userHasAnswered}
                      value=''
                      placeholder={isQAPost ? '回答问题...' : '添加评论...'}
                      onChange={handleAnswerEditorChange}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, alignItems: 'center' }}>
                    {/* 快捷回复选择器（管理员/运营可见） */}
                    {isAdmin && isQAPost && !userHasAnswered && (
                      <Box sx={{ mr: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {quickReplies.map((qr) => (
                          <Button
                            variant='outlined'
                            key={qr.id}
                            size='small'
                            sx={{ color: 'text.primary', borderColor: 'text.disabled' }}
                            onClick={() => {
                              if (answerEditorRef.current && typeof answerEditorRef.current.setContent === 'function') {
                                answerEditorRef.current.setContent(qr.content || '')
                              }
                            }}
                          >
                            {'# ' + qr.name}
                          </Button>
                        ))}
                      </Box>
                    )}
                    {hasAnswerContent && (
                      <>
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
                            transition: 'all 0.15s ease-in-out',
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
                          onClick={handleSubmitAnswer}
                          disabled={isClosedPost}
                          sx={{
                            color: '#ffffff',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 2,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.875rem',
                            transition: 'all 0.15s ease-in-out',
                            '&:active': { transform: 'translateY(0) scale(0.98)' },
                          }}
                        >
                          {isQAPost ? '提交回答' : '提交评论'}
                        </Button>
                      </>
                    )}
                  </Box>
                </>
              )}
            </Box>
          </Paper>
        )}
      </Stack>
    </>
  )
}

export default Content
