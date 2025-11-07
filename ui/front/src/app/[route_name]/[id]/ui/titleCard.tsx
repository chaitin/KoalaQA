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
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import CommonAvatar from '@/components/CommonAvatar'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import { useBoolean } from 'ahooks'
import dayjs from '@/lib/dayjs'
import { useParams, useRouter } from 'next/navigation'
import { useContext, useRef, useState, useEffect, useMemo } from 'react'
import { CheckCircleIcon } from '@/utils/mui-imports'
import Link from 'next/link'

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
    return forums.find(f => f.route_name === route_name) || null
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
  const [mdEditShow, setMdEditShow] = useState(false)

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

  const checkLoginAndFocusMain = () => {
    return checkAuth(() => setMdEditShow(true))
  }

  const onCommentSubmit = async () => {
    const content = editorRef.current?.getHTML() || ''
    await postDiscussionDiscIdComment(
      { discId: id },
      {
        content,
      },
    )
    setMdEditShow(false)
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
          border: '1px solid #e5e7eb',
          p: 3,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: '#111827',
              lineHeight: 1.3,
              flex: 1,
              mr: 2,
            }}
          >
            {data.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {profileHref ? (
              <Link href={profileHref} style={{ display: 'inline-flex' }}>
                <CommonAvatar src={data.user_avatar} name={data.user_name} />
              </Link>
            ) : (
              <CommonAvatar src={data.user_avatar} name={data.user_name} />
            )}
            {profileHref ? (
              <Link
                href={profileHref}
                style={{ color: '#6b7280', fontWeight: 500, fontSize: '0.75rem', textDecoration: 'none' }}
              >
                {data.user_name || '未知用户'}
              </Link>
            ) : (
              <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500, fontSize: '0.75rem' }}>
                {data.user_name || '未知用户'}
              </Typography>
            )}
            {(data.user_id === user.uid ||
              [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
                user.role || ModelUserRole.UserRoleUnknown,
              )) && (
              <IconButton
                disableRipple
                size="small"
                ref={anchorElRef}
                onClick={menuOpen}
                sx={{
                  color: '#6b7280',
                  ml: 1,
                  transition: 'all 0.15s ease-in-out',
                  '&:hover': { color: '#000000', bgcolor: '#f3f4f6', transform: 'rotate(90deg)' },
                  '&:active': { transform: 'rotate(90deg) scale(0.9)' },
                }}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
                size="small"
                sx={{
                  bgcolor: getStatusColor('answered'),
                  color: '#fff !important',
                  height: 22,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  border: `1px solid ${getStatusColor('answered')}30`,
                }}
              />
            )}
            {/* {status === 'open' && !isArticlePost && (
              <Chip
                label={getStatusLabel(status)}
                size="small"
                sx={{
                  bgcolor: getStatusColor(status),
                  color: '#fff !important',
                  height: 22,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  border: `1px solid ${getStatusColor(status)}30`,
                }}
              />
            )} */}
            {data.groups?.map((item) => {
              const isCategory = true
              return (
                <Chip
                  key={item.id}
                  label={item.name}
                  size="small"
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
            {data.tags?.map((tag: string) => {
              const isCategory = isCategoryTag(tag)
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
              发布于{' '}
              <TimeDisplayWithTag
                timestamp={data.created_at!}
                title={dayjs.unix(data.created_at!).format('YYYY-MM-DD HH:mm:ss')}
              />
            </Typography>
            {data.updated_at && data.updated_at !== 0 && data.updated_at !== data.created_at && (
              <>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                  •
                </Typography>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.75rem' }}>
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

        <Divider sx={{ my: 2 }} />

        <EditorContent content={data.content} onTocUpdate={() => {}} />

        {/* 文章点赞按钮 */}
        {isArticlePost && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3, pt: 2, borderTop: '1px solid #f3f4f6' }}>
            <Button
              disableRipple
              size='small'
              variant='outlined'
              startIcon={
                data.user_like ? (
                  <ThumbUpAltOutlinedIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                ) : (
                  <ThumbUpAltOutlinedIcon sx={{ fontSize: 16 }} />
                )
              }
              onClick={handleLike}
              sx={{
                textTransform: 'none',
                color: data.user_like ? '#3b82f6' : '#6b7280',
                borderColor: data.user_like ? '#3b82f6' : '#d1d5db',
                bgcolor: data.user_like ? '#eff6ff' : '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                px: 2,
                py: 0.75,
                borderRadius: '6px',
                transition: 'all 0.15s ease-in-out',
                '&:hover': {
                  bgcolor: data.user_like ? '#dbeafe' : '#f9fafb',
                  borderColor: data.user_like ? '#3b82f6' : '#9ca3af',
                  color: data.user_like ? '#3b82f6' : '#111827',
                  transform: 'translateY(-1px)',
                },
                '&:active': { transform: 'translateY(0) scale(0.98)' },
              }}
            >
              {formatNumber(data.like || 0)}
            </Button>
          </Box>
        )}
      </Paper>
    </>
  )
}

export default TitleCard
