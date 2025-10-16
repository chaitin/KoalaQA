'use client'
import { deleteDiscussionDiscId, postDiscussionDiscIdComment } from '@/api'
import { ModelDiscussionDetail, ModelUserRole } from '@/api/types'
import { Card, MarkDown } from '@/components'
import { AuthContext } from '@/components/authProvider'
import { ReleaseModal, Tag } from '@/components/discussion'
import EditorWrap from '@/components/editor/edit/Wrap'
import Modal from '@/components/modal'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { Ellipsis } from '@ctzhian/ui'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Box, Button, Divider, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { useBoolean } from 'ahooks'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useParams, useRouter } from 'next/navigation'
import { useContext, useRef, useState } from 'react'

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

// 注入样式
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = animationStyles
  document.head.appendChild(styleSheet)
}

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const TitleCard = ({ data }: { data: ModelDiscussionDetail }) => {
  const [menuVisible, { setFalse: menuClose, setTrue: menuOpen }] = useBoolean(false)
  const { user } = useContext(AuthContext)
  const [releaseVisible, { setFalse: releaseClose, setTrue: releaseOpen }] = useBoolean(false)
  const router = useRouter()
  const { id }: { id: string } = useParams() || { id: '' }
  const { checkAuth } = useAuthCheck()
  const anchorElRef = useRef(null)
  const [comment, setComment] = useState('')
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
    await postDiscussionDiscIdComment(
      { discId: id },
      {
        content: comment,
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
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0)',
        '&:hover': {
          boxShadow: 'rgba(0, 28, 85, 0.12) 0px 8px 25px 0px',
          transform: 'translateY(-2px)',
        },
        '&:active': {
          transform: 'translateY(0)',
          transition: 'transform 0.1s ease-out',
        },
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
          编辑话题
        </MenuItem>
        <MenuItem onClick={handleDelete}>删除话题</MenuItem>
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
          <Ellipsis
            sx={{
              fontSize: 20,
              display: { xs: '-webkit-box', sm: 'block' },
              WebkitLineClamp: { sm: 1, xs: 2 },
              WebkitBoxOrient: 'vertical',
              textOverflow: { sm: 'ellipsis' },
              whiteSpace: { sm: 'nowrap', xs: 'normal' },
              overflow: 'hidden',
              fontWeight: 600,
              maxWidth: { xs: '100%', sm: 'calc(100% - 90px)' },
            }}
          >
            {data.title}
          </Ellipsis>
        </Stack>
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
        <time
          dateTime={dayjs.unix(data.created_at!).format()}
          title={dayjs.unix(data.created_at!).format('YYYY-MM-DD HH:mm:ss')}
        >
          {data.user_name} 发布于 {dayjs.unix(data.created_at!).fromNow()}
        </time>
      </Typography>
      <Stack direction='row' alignItems='flex-end' gap={2} justifyContent='space-between' sx={{ my: 1 }}>
        <Stack direction='row' flexWrap='wrap' gap='8px 16px'>
          {data.groups?.map((item, index) => {
            const label = `# ${item.name}`
            return (
              <Tag
                key={item.id}
                label={label}
                sx={{
                  backgroundColor: 'rgba(32, 108, 255, 0.1)',
                  transition: 'all 0.2s ease-in-out',
                  transform: 'scale(1)',
                  '&:hover': {
                    backgroundColor: 'rgba(32, 108, 255, 0.2)',
                    transform: 'scale(1.05)',
                    boxShadow: '0 2px 8px rgba(32, 108, 255, 0.2)',
                  },
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                }}
                size='small'
                // onClick={() => {
                //   window.open(`/discussion?topic=${item.id}`, "_blank");
                // }}
              />
            )
          })}
          {data.tags?.map((item: string, index) => {
            const label = (
              <Stack direction='row' alignItems='center' sx={{ lineHeight: 1 }} gap={0.5}>
                {item}
              </Stack>
            )
            return (
              <Tag
                key={item}
                label={label}
                size='small'
                sx={{
                  transition: 'all 0.2s ease-in-out',
                  transform: 'scale(1)',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    transform: 'scale(1.05)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  },
                  animation: `fadeInUp 0.5s ease-out ${(data.groups?.length || 0 + index) * 0.1}s both`,
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
              {data.user_name} 发布于 {dayjs.unix(data.created_at!).fromNow()}
            </time>
          </Typography>
        </Stack>
      </Stack>
      <Divider sx={{ mt: 2, mb: 1 }} />
      <MarkDown content={data.content} />

      {/* 回答问题按钮 */}
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
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: 'translateY(0)',
              boxShadow: '0 2px 8px rgba(32, 108, 255, 0.2)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 16px rgba(32, 108, 255, 0.3)',
                backgroundColor: 'primary.dark',
              },
              '&:active': {
                transform: 'translateY(0)',
                transition: 'transform 0.1s ease-out',
              },
              animation: 'pulse 2s infinite',
            }}
          >
            {user?.uid ? '回答问题' : '登录后回答问题'}
          </Button>
        )}
        {mdEditShow && (
          <Box>
            <EditorWrap
              detail={{
                id: 'main-comment-editor',
                name: '回答问题',
                content: comment,
              }}
              onSave={async () => {
                await onCommentSubmit()
              }}
              onCancel={() => setMdEditShow(false)}
              onContentChange={setComment}
            />
          </Box>
        )}
      </Box>
    </Card>
  )
}

export default TitleCard
