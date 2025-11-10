'use client'
import {
  deleteDiscussionDiscId,
  postDiscussionDiscIdResolve,
  postDiscussionDiscIdComment,
  postDiscussionDiscIdLike,
  postDiscussionDiscIdRevokeLike,
} from '@/api'
import { ModelDiscussionDetail, ModelDiscussionType, ModelUserRole } from '@/api/types'
import { Card } from '@/components'
import { AuthContext } from '@/components/authProvider'
import { ReleaseModal, Tag } from '@/components/discussion'
import { TimeDisplayWithTag } from '@/components/TimeDisplay'
import EditorWrap, { EditorWrapRef } from '@/components/editor/edit/Wrap'
import EditorContent from '@/components/EditorContent'
import Modal from '@/components/modal'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { formatNumber } from '@/lib/utils'
// import { generateCacheKey, clearCache } from '@/lib/api-cache'
import { useForum } from '@/contexts/ForumContext'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import { Box, Button, Chip, Divider, IconButton, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material'
import CommonAvatar from '@/components/CommonAvatar'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useBoolean } from 'ahooks'
import dayjs from '@/lib/dayjs'
import { useParams, useRouter } from 'next/navigation'
import { useContext, useRef, useState, useEffect, useMemo } from 'react'
import { CheckCircleIcon } from '@/utils/mui-imports'
import Link from 'next/link'
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
  
  @keyframes pulse {
    0% {
      box-shadow: 0 2px 8px rgba(32, 108, 255, 0.2);
    }
    50% {
      box-shadow: 0 2px 8px rgba(32, 108, 255, 0.4);
    }
    100% {
      box-shadow: 0 2px 8px rgba(32, 108, 255, 0.2);
    }
  }
`

// 样式注入逻辑将在组件内部通过useEffect处理

const TitleCard = ({ data }: { data: ModelDiscussionDetail }) => {
  const [menuVisible, { setFalse: menuClose, setTrue: menuOpen }] = useBoolean(false)
  const { user } = useContext(AuthContext)
  const [releaseVisible, { setFalse: releaseClose, setTrue: releaseOpen }] = useBoolean(false)
  const router = useRouter()
  const { forums } = useForum()
  const { id, route_name }: { id: string; route_name?: string } = (useParams() as any) || { id: '' }

  // 根据 route_name 获取对应的 forumInfo
  const forumInfo = useMemo(() => {
    if (!route_name || !forums || forums.length === 0) return null
    return forums.find((f) => f.route_name === route_name) || null
  }, [route_name, forums])

  // 根据 data.type 转换为 ReleaseModal 需要的 type
  const modalType = useMemo(() => {
    if (data.type === ModelDiscussionType.DiscussionTypeQA) return 'qa'
    if (data.type === ModelDiscussionType.DiscussionTypeFeedback) return 'feedback'
    return 'blog'
  }, [data.type])

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
  const { checkAuth } = useAuthCheck()
  const anchorElRef = useRef(null)
  const editorRef = useRef<EditorWrapRef>(null)

  const handleDelete = () => {
    menuClose()
    Modal.confirm({
      title: '确定删除话题吗？',
      okButtonProps: { color: 'error' },
      onOk: async () => {
        await deleteDiscussionDiscId({ discId: data.uuid + '' }).then(() => {
          router.push('/')
        })
      },
    })
  }

  const handleToggleFeedback = () => {
    menuClose()
    Modal.confirm({
      title: `确定${data.resolved ? '开启' : '关闭'}反馈吗？`,
      content: '',
      onOk: async () => {
        await postDiscussionDiscIdResolve(
          { discId: data.uuid + '' },
          {
            resolve: !data.resolved,
          },
        ).then(() => {
          router.refresh()
        })
      },
    })
  }

  const onCommentSubmit = async () => {
    const content = editorRef.current?.getHTML() || ''
    await postDiscussionDiscIdComment(
      { discId: id },
      {
        content,
      },
    )
    router.refresh()
  }

  const handleLike = async () => {
    return checkAuth(async () => {
      try {
        if (data.user_like) {
          // 已点赞，取消点赞
          await postDiscussionDiscIdRevokeLike({ discId: id })
        } else {
          // 未点赞，点赞
          await postDiscussionDiscIdLike({ discId: id })
        }
        router.refresh()
      } catch (error) {
        console.error('点赞操作失败:', error)
      }
    })
  }
  const getStatusColor = (status: string) => {
    if (status === 'answered' || status === 'closed') return 'rgba(25, 135, 84, 1)'
    if (status === 'in-progress') return '#3b82f6'
    if (status === 'planned') return '#f59e0b'
    return '#6b7280'
  }

  const getStatusLabel = (status: string) => {
    if (status === 'answered') return '已解决'
    if (status === 'in-progress') return '进行中'
    if (status === 'planned') return '已计划'
    if (status === 'open') return '待解决'
    if (status === 'closed') return '已关闭'
    if (status === 'published') return '已发布'
    return ''
  }

  const isArticlePost = data.type === ModelDiscussionType.DiscussionTypeBlog
  const isFeedbackPost = data.type === ModelDiscussionType.DiscussionTypeFeedback
  const status = data.resolved ? 'closed' : 'open'
  const profileHref = data.user_id ? `/profile/${data.user_id}` : undefined

  const isCategoryTag = (tag: string) => {
    return data.groups?.some((group) => group.name === tag) || false
  }

  return (
    <>
      <ReleaseModal
        status='edit'
        open={releaseVisible}
        data={data}
        id={id}
        onClose={releaseClose}
        selectedTags={[]}
        type={modalType}
        forumInfo={forumInfo}
        onOk={() => {
          releaseClose()
          router.refresh()
        }}
      />
      <Menu
        id='basic-menu'
        anchorEl={anchorElRef.current}
        open={menuVisible}
        onClose={menuClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        {data.type === ModelDiscussionType.DiscussionTypeFeedback &&
          [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
            user.role || ModelUserRole.UserRoleUnknown,
          ) && <MenuItem onClick={handleToggleFeedback}>{data.resolved ? '开启反馈' : '关闭反馈'}</MenuItem>}
        <MenuItem
          onClick={() => {
            if (data.type === ModelDiscussionType.DiscussionTypeBlog) {
              const rn = route_name || ''
              router.push(`/${rn}/edit?id=${data.uuid}`)
            } else {
              releaseOpen()
            }
            menuClose()
          }}
        >
          编辑
          {data.type === ModelDiscussionType.DiscussionTypeQA
            ? '问题'
            : data.type === ModelDiscussionType.DiscussionTypeFeedback
              ? '反馈'
              : '文章'}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          删除
          {data.type === ModelDiscussionType.DiscussionTypeQA
            ? '问题'
            : data.type === ModelDiscussionType.DiscussionTypeFeedback
              ? '反馈'
              : '文章'}
        </MenuItem>
      </Menu>

      {/* Post header */}
      <Paper
        elevation={0}
        sx={{
          bgcolor: '#ffffff',
          borderRadius: '6px',
        }}
      >
        {/* 第一行：类型标签、标题、点赞数和更多选项 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
            {/* 类型标签 */}
            <Chip
              label={isArticlePost ? '文章' : isFeedbackPost ? '反馈' : '问题'}
              size='small'
              sx={{
                bgcolor: isArticlePost ? 'rgba(255,119,68,0.1)' : isFeedbackPost ? '#eff6ff' : 'rgba(26,160,134,0.1)',
                color: isArticlePost ? '#FF7744' : isFeedbackPost ? '#3b82f6' : '#1AA086',
                height: 24,
                fontWeight: 400,
                fontSize: '14px',
                borderRadius: '4px',
                border: `1px solid ${
                  isArticlePost ? '#FF7744' : isFeedbackPost ? '#bfdbfe' : 'rgba(26, 160, 134, 0.10)'
                }`,
                flexShrink: 0,
              }}
            />
            {/* 标题 */}
            <Typography
              variant='h5'
              sx={{
                fontWeight: 700,
                color: 'RGBA(33, 34, 45, 1)',
                lineHeight: 1.3,
                flex: 1,
                fontSize: '1.25rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {data.title}
            </Typography>
          </Box>
          {/* 右侧：点赞数和更多选项 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {/* 文章类型显示点赞数 */}
            {isArticlePost && (
              <Box
                onClick={handleLike}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  background: 'rgba(0,99,151,0.06)',
                  color: 'primary.main',
                  px: 1,
                  borderRadius: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    color: '#000000',
                    background: 'rgba(0,99,151,0.1)',
                  },
                }}
              >
                <Icon type='icon-wenzhangdianzan' sx={{ fontSize: 12 }} />
                <Typography variant='caption' sx={{ fontWeight: 600, fontFamily: 'Gilroy', fontSize: '14px' }}>
                  {formatNumber((data.like || 0) - (data.dislike || 0))}
                </Typography>
              </Box>
            )}
            {(data.user_id === user.uid ||
              [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
                user.role || ModelUserRole.UserRoleUnknown,
              )) && (
              <IconButton
                disableRipple
                size='small'
                ref={anchorElRef}
                onClick={menuOpen}
                sx={{
                  color: '#6b7280',
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': { color: '#000000', bgcolor: '#f3f4f6' },
                }}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* 第二行：标签和作者信息 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          {/* 左侧：所有标签（分组标签、状态标签、普通标签） */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            {data.groups?.map((item) => {
              const isCategory = true
              return (
                <Chip
                  key={item.id}
                  label={item.name}
                  size='small'
                  sx={{
                    bgcolor: 'rgba(233, 236, 239, 1)',
                    color: 'rgba(33, 34, 45, 1)',
                    height: 22,
                    fontWeight: 400,
                    fontSize: '14px',
                    borderRadius: '3px',
                    cursor: 'default',
                    pointerEvents: 'none',
                  }}
                />
              )
            })}
            {status === 'closed' && !isArticlePost && (
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
                label={getStatusLabel('answered')}
                size='small'
                sx={{
                  bgcolor: getStatusColor('answered'),
                  color: '#fff !important',
                  height: 22,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  border: `1px solid ${getStatusColor('answered')}30`,
                  fontFamily: 'Glibory, "PingFang SC", "Hiragino Sans GB", "STHeiti", "Microsoft YaHei", sans-serif',
                }}
              />
            )}
            {data.tags?.map((tag: string) => {
              const isCategory = isCategoryTag(tag)
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size='small'
                  sx={{
                    bgcolor: 'rgba(233, 236, 239, 1)',
                    color: 'rgba(33, 34, 45, 1)',
                    height: 22,
                    fontSize: '0.7rem',
                    fontWeight: isCategory ? 600 : 500,
                    borderRadius: '3px',
                    cursor: 'default',
                    pointerEvents: 'none',
                  }}
                />
              )
            })}
          </Box>
          {/* 右侧：作者信息和时间 */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: '14px' }}>
            {profileHref ? (
              <Link href={profileHref} style={{ display: 'inline-flex', marginRight: '8px' }}>
                <CommonAvatar src={data.user_avatar} name={data.user_name} />
              </Link>
            ) : (
              <CommonAvatar src={data.user_avatar} name={data.user_name} />
            )}
            {profileHref ? (
              <Link
                href={profileHref}
                style={{ color: 'RGBA(33, 34, 45, 1)', fontWeight: 500, textDecoration: 'none' }}
              >
                {data.user_name || '未知用户'}
              </Link>
            ) : (
              <Typography variant='body2' sx={{ color: 'RGBA(33, 34, 45, 1)', fontWeight: 500 }}>
                {data.user_name || '未知用户'}
              </Typography>
            )}
            <Typography variant='body2' sx={{ color: 'RGBA(33, 34, 45, 1)', px: 1 }}>
              ·
            </Typography>
            <Typography variant='body2' sx={{ color: 'rgba(33, 34, 45, 0.50)' }}>
              发布于
              <TimeDisplayWithTag
                timestamp={data.created_at!}
                title={dayjs.unix(data.created_at!).format('YYYY-MM-DD HH:mm:ss')}
              />
            </Typography>
            {data.updated_at && data.updated_at !== 0 && data.updated_at !== data.created_at && (
              <>
                <Typography variant='body2' sx={{ color: 'rgba(33, 34, 45, 0.50)', pr: 1 }}>
                  ,
                </Typography>
                <Typography variant='body2' sx={{ color: 'rgba(33, 34, 45, 0.50)' }}>
                  更新于{' '}
                  <TimeDisplayWithTag
                    timestamp={data.updated_at}
                    title={dayjs.unix(data.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                  />
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {data.content && String(data.content).trim() && (
          <>
            <Divider sx={{ my: 2 }} />
            <EditorContent content={data.content} onTocUpdate={() => {}} />
            <Divider sx={{ my: 2 }} />
          </>
        )}
      </Paper>
    </>
  )
}

export default TitleCard
