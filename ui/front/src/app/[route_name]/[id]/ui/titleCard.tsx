'use client'
import {
  deleteDiscussionDiscId,
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
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined'
import { Box, Button, Divider, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { useBoolean } from 'ahooks'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useParams, useRouter } from 'next/navigation'
import { useContext, useRef, useState, useEffect } from 'react'

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

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const TitleCard = ({ data }: { data: ModelDiscussionDetail }) => {
  const [menuVisible, { setFalse: menuClose, setTrue: menuOpen }] = useBoolean(false)
  const { user } = useContext(AuthContext)
  const [releaseVisible, { setFalse: releaseClose, setTrue: releaseOpen }] = useBoolean(false)
  const router = useRouter()

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
  const { id }: { id: string } = useParams() || { id: '' }
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

  const checkLoginAndFocusMain = () => {
    return checkAuth(() => setMdEditShow(true))
  }

  const onCommentSubmit = async () => {
    const content = editorRef.current?.getMarkdown() || ''
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

  return (
    <Card
      sx={{
        boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
        cursor: 'auto',
        maxWidth: '100%',
      }}
    >
      <ReleaseModal
        status='edit'
        open={releaseVisible}
        data={data}
        onClose={releaseClose}
        selectedTags={[]}
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
        <MenuItem
          onClick={() => {
            releaseOpen()
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
        <MenuItem onClick={handleDelete}>
          删除
          {data.type === ModelDiscussionType.DiscussionTypeQA
            ? '问题'
            : data.type === ModelDiscussionType.DiscussionTypeFeedback
              ? '反馈'
              : '文章'}
        </MenuItem>
      </Menu>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        gap={2}
        sx={{ mb: { xs: '12px', sm: 0 }, width: '100%' }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
          sx={{ width: { xs: '100%', sm: 'calc(100% - 80px)' } }}
        >
          <Typography
            sx={{
              fontSize: 20,
              fontWeight: 600,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              width: '100%',
            }}
          >
            {data.title}
          </Typography>
        </Stack>
        {[
          ModelDiscussionType.DiscussionTypeFeedback,
          ModelDiscussionType.DiscussionTypeBlog,
        ].includes(data.type as any) && (
          <Stack
            direction='row'
            alignItems='center'
            gap={1}
            sx={{
              background: data.user_like ? 'rgba(32,108,255,0.1)' : '#F2F3F5',
              borderRadius: 0.5,
              px: 1,
              py: '1px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'scale(1)',
              '&:hover': {
                background: data.user_like ? 'rgba(32,108,255,0.2)' : 'rgba(0, 0, 0, 0.12)',
                transform: 'scale(1.05)',
              },
              '&:active': {
                transform: 'scale(0.95)',
                transition: 'transform 0.1s ease-out',
              },
            }}
            onClick={handleLike}
          >
            <ThumbUpAltOutlinedIcon
              sx={{
                color: data.user_like ? 'info.main' : 'rgba(0,0,0,0.5)',
                fontSize: 14,
              }}
            />
            <Typography
              variant='body2'
              sx={{
                fontSize: 14,
                color: data.user_like ? 'info.main' : 'rgba(0,0,0,0.5)',
                lineHeight: '20px',
              }}
            >
              {formatNumber(data.like || 0)}
            </Typography>
          </Stack>
        )}
        {(data.user_id === user.uid ||
          [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
            user.role || ModelUserRole.UserRoleUnknown,
          )) && (
          <IconButton
            size='small'
            ref={anchorElRef}
            onClick={menuOpen}
            sx={{
              display: { xs: 'none', sm: 'flex' },
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
          >
            <MoreVertIcon />
          </IconButton>
        )}
      </Stack>
      <Typography
        sx={{
          display: { sm: 'none', xs: 'block' },
          fontSize: 12,
          color: 'rgba(0,0,0,0.5)',
        }}
      >
        {data.user_name}
        {data.updated_at && data.updated_at !== data.created_at ? (
          <>
            更新于{' '}
            <TimeDisplayWithTag
              timestamp={data.updated_at}
              title={dayjs.unix(data.updated_at).format('YYYY-MM-DD HH:mm:ss')}
            />
          </>
        ) : (
          <>
            发布于{' '}
            <TimeDisplayWithTag
              timestamp={data.created_at!}
              title={dayjs.unix(data.created_at!).format('YYYY-MM-DD HH:mm:ss')}
            />
          </>
        )}
      </Typography>
      <Stack direction='row' alignItems='flex-end' gap={2} justifyContent='space-between' sx={{ my: 1 }}>
        <Stack direction='row' flexWrap='wrap' gap='8px 16px'>
          {data.groups?.map((item) => {
            const label = `${item.name}`
            const color = '#206CFF'
            return (
              <Tag
                key={item.id}
                label={label}
                sx={{
                  backgroundColor: `${color}15`,
                  color: color,
                  fontSize: '12px',
                  height: '24px',
                  fontWeight: 500,
                }}
                size='small'
              />
            )
          })}
          {data.tags?.map((item: string) => {
            return (
              <Tag
                key={item}
                label={item}
                size='small'
                sx={{
                  backgroundColor: 'rgba(0,0,0,0.06)',
                  color: 'rgba(0,0,0,0.6)',
                  fontSize: '12px',
                  height: '24px',
                }}
              />
            )
          })}
        </Stack>
        <Stack
          direction='row'
          justifyContent='flex-end'
          alignItems='center'
          gap={1}
          sx={{ maxWidth: 200, display: { xs: 'none', sm: 'flex' } }}
        >
          <Typography variant='body2' sx={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>
            <time
              dateTime={dayjs.unix(data.created_at!).format()}
              title={dayjs.unix(data.created_at!).format('YYYY-MM-DD HH:mm:ss')}
            >
              {data.user_name}{' '}
              {data.updated_at && data.updated_at !== data.created_at ? (
                <>
                  更新于{' '}
                  <TimeDisplayWithTag
                    timestamp={data.updated_at}
                    title={dayjs.unix(data.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                  />
                </>
              ) : (
                <>
                  发布于{' '}
                  <TimeDisplayWithTag
                    timestamp={data.created_at!}
                    title={dayjs.unix(data.created_at!).format('YYYY-MM-DD HH:mm:ss')}
                  />
                </>
              )}
            </time>
          </Typography>
        </Stack>
      </Stack>
      <Divider sx={{ mt: 2, mb: 1 }} />
      <EditorContent content={data.content} onTocUpdate={() => {}} />

      {/* 回答/回复/评论 按钮 */}
      <Box sx={{ mt: 1, pt: 1 }}>
        {!mdEditShow && (
          <Button
            variant='contained'
            onClick={checkLoginAndFocusMain}
            sx={{
              textTransform: 'none',
              fontSize: 14,
              fontWeight: 500,
              py: 0.75,
              px: 2,
              borderRadius: '6px',
              width: 'fit-content',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              '&:hover': {
                backgroundColor: 'primary.dark',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                transform: 'translateY(-1px)',
              },
              '&:active': {
                transform: 'translateY(0)',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            {user?.uid
              ? data.type === ModelDiscussionType.DiscussionTypeFeedback
                ? '回复'
                : data.type === ModelDiscussionType.DiscussionTypeBlog
                  ? '发表评论'
                  : '回答问题'
              : data.type === ModelDiscussionType.DiscussionTypeFeedback
                ? '登录后回复'
                : data.type === ModelDiscussionType.DiscussionTypeBlog
                  ? '登录后发表评论'
                  : '登录后回答问题'}
          </Button>
        )}
        {mdEditShow && (
          <Box>
            <EditorWrap
              ref={editorRef}
              detail={{
                id: 'main-comment-editor',
                name:
                  data.type === ModelDiscussionType.DiscussionTypeFeedback
                    ? '回复'
                    : data.type === ModelDiscussionType.DiscussionTypeBlog
                      ? '发表评论'
                      : '回答问题',
                content: '',
              }}
              onSave={async () => {
                await onCommentSubmit()
              }}
              // 不传递 onTocUpdate，保持默认 false
              onCancel={() => setMdEditShow(false)}
            />
          </Box>
        )}
      </Box>
    </Card>
  )
}

export default TitleCard
