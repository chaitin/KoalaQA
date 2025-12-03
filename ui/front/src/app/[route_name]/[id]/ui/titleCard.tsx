'use client'
import {
  deleteDiscussionDiscId,
  deleteDiscussionDiscIdFollow,
  getDiscussionDiscIdFollow,
  postDiscussionDiscIdComment,
  postDiscussionDiscIdFollow,
  postDiscussionDiscIdLike,
  postDiscussionDiscIdResolveIssue,
  postDiscussionDiscIdRevokeLike,
  putDiscussionDiscIdClose,
} from '@/api'
import {
  ModelDiscussionDetail,
  ModelDiscussionState,
  ModelDiscussionType,
  ModelUserRole
} from '@/api/types'
import { DiscussionStatusChip, DiscussionTypeChip } from '@/components'
import { AuthContext } from '@/components/authProvider'
import CommonAvatar from '@/components/CommonAvatar'
import ConvertToIssueModal from '@/components/ConvertToIssueModal'
import { ReleaseModal } from '@/components/discussion'
import { EditorWrapRef } from '@/components/editor'
import EditorContent from '@/components/EditorContent'
import Modal from '@/components/modal'
import { TimeDisplayWithTag } from '@/components/TimeDisplay'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import dayjs from '@/lib/dayjs'
import { formatNumber } from '@/lib/utils'
import { useForumStore } from '@/store'
import { Ellipsis, Icon } from '@ctzhian/ui'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import { Box, Chip, Divider, IconButton, Menu, MenuItem, Paper, Stack, Typography } from '@mui/material'
import { useBoolean } from 'ahooks'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'

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
  const [convertToIssueVisible, { setFalse: convertToIssueClose, setTrue: convertToIssueOpen }] = useBoolean(false)
  const [followInfo, setFollowInfo] = useState<{ followed?: boolean; follower?: number }>({})
  const [isHoveringFollow, setIsHoveringFollow] = useState(false)
  const router = useRouter()
  const forums = useForumStore((s) => s.forums)
  const { id, route_name }: { id: string; route_name?: string } = (useParams() as any) || { id: '' }

  // 根据 route_name 获取对应的 forumInfo
  const forumInfo = useMemo(() => {
    if (!route_name || !forums || forums.length === 0) return null
    return forums.find((f) => f.route_name === route_name) || null
  }, [route_name, forums])

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

  // 获取关注信息
  useEffect(() => {
    const fetchFollowInfo = async () => {
      try {
        const followData = await getDiscussionDiscIdFollow({ discId: id })
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
    fetchFollowInfo()
  }, [id])
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

  const handleMarkInProgress = () => {
    menuClose()
    Modal.confirm({
      title: '确定标记为进行中吗？',
      content: '',
      onOk: async () => {
        await postDiscussionDiscIdResolveIssue(
          { discId: data.uuid + '' },
          {
            resolve: ModelDiscussionState.DiscussionStateInProgress,
          },
        ).then(() => {
          router.refresh()
        })
      },
    })
  }

  const handleMarkCompleted = () => {
    menuClose()
    Modal.confirm({
      title: '确定标记为已完成吗？',
      content: '',
      onOk: async () => {
        await postDiscussionDiscIdResolveIssue(
          { discId: data.uuid + '' },
          {
            resolve: ModelDiscussionState.DiscussionStateResolved,
          },
        ).then(() => {
          router.refresh()
        })
      },
    })
  }

  const handleCloseQuestion = () => {
    menuClose()
    Modal.confirm({
      title: '确定关闭问题吗？',
      content: '关闭后的问题将不再支持回答、评论等操作',
      okButtonProps: { color: 'warning' },
      onOk: async () => {
        await putDiscussionDiscIdClose({ discId: data.uuid + '' }).then(() => {
          router.refresh()
        })
      },
    })
  }

  const onCommentSubmit = async () => {
    const content = editorRef.current?.getContent() || ''
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

  const handleFollow = async () => {
    return checkAuth(async () => {
      const isFollowed = followInfo.followed
      Modal.confirm({
        title: isFollowed ? '确定要取消关注此帖子吗？' : '确定要关注此帖子吗？',
        content: isFollowed ? '取消关注后将不再收到该帖子的更新通知。' : '关注后将收到该帖子的更新通知。',
        onOk: async () => {
          try {
            if (isFollowed) {
              // 取消关注
              await deleteDiscussionDiscIdFollow({ discId: id })
            } else {
              // 关注
              await postDiscussionDiscIdFollow({ discId: id })
            }
            // 刷新关注信息
            const followData = await getDiscussionDiscIdFollow({ discId: id })
            if (followData) {
              setFollowInfo({
                followed: followData.followed,
                follower: followData.follower,
              })
            }
            router.refresh()
          } catch (error) {
            console.error('关注操作失败:', error)
          }
        },
      })
    })
  }
  const isArticlePost = data.type === ModelDiscussionType.DiscussionTypeBlog
  const isQAPost = data.type === ModelDiscussionType.DiscussionTypeQA
  const isIssuePost = data.type === ModelDiscussionType.DiscussionTypeIssue

  const isClosed = data.resolved === ModelDiscussionState.DiscussionStateClosed
  const profileHref = data.user_id ? `/profile/${data.user_id}` : undefined

  const isCategoryTag = (tag: string) => {
    return data.groups?.some((group) => group.name === tag) || false
  }

  // 判断是否显示"转为 Issue 管理"按钮
  const canConvertToIssue = useMemo(() => {
    const isAdminOrOperator = [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
      user.role || ModelUserRole.UserRoleUnknown,
    )
    const isUnresolvedQA = isQAPost && data.resolved === ModelDiscussionState.DiscussionStateNone
    return isAdminOrOperator && isUnresolvedQA
  }, [user.role, isQAPost, data.resolved])

  return (
    <>
      <ReleaseModal
        status='edit'
        open={releaseVisible}
        data={data}
        id={id}
        onClose={releaseClose}
        selectedTags={[]}
        type={
          data.type === ModelDiscussionType.DiscussionTypeQA
            ? 'qa'
            : data.type === ModelDiscussionType.DiscussionTypeBlog
              ? 'blog'
              : data.type === ModelDiscussionType.DiscussionTypeIssue ||
                  data.type === ModelDiscussionType.DiscussionTypeFeedback
                ? 'issue'
                : 'qa'
        }
        forumInfo={forumInfo}
        onOk={() => {
          releaseClose()
          router.refresh()
        }}
      />
      <ConvertToIssueModal
        open={convertToIssueVisible}
        onClose={convertToIssueClose}
        questionData={data}
        forumInfo={forumInfo}
        onSuccess={() => {
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
        {isIssuePost &&
          [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
            user.role || ModelUserRole.UserRoleUnknown,
          ) && [
            data.resolved === ModelDiscussionState.DiscussionStateNone && (
              <MenuItem key='in-progress' onClick={handleMarkInProgress}>
                标记为进行中
              </MenuItem>
            ),
            data.resolved === ModelDiscussionState.DiscussionStateInProgress && (
              <MenuItem key='completed' onClick={handleMarkCompleted}>
                标记为已完成
              </MenuItem>
            ),
          ]}

        {canConvertToIssue && (
          <MenuItem
            onClick={() => {
              menuClose()
              convertToIssueOpen()
            }}
          >
            转为 Issue 管理
          </MenuItem>
        )}
        {!(data.type === ModelDiscussionType.DiscussionTypeQA && isClosed) && (
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
              : data.type === ModelDiscussionType.DiscussionTypeIssue
                ? 'Issue'
                : '文章'}
          </MenuItem>
        )}
        {data.type === ModelDiscussionType.DiscussionTypeQA &&
          data.resolved === ModelDiscussionState.DiscussionStateNone && (
            <MenuItem onClick={handleCloseQuestion}>关闭问题</MenuItem>
          )}
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          删除
          {data.type === ModelDiscussionType.DiscussionTypeQA
            ? '问题'
            : data.type === ModelDiscussionType.DiscussionTypeIssue
              ? 'Issue'
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
            <DiscussionTypeChip type={data.type} variant='default' />
            {/* 标题 */}
            <Ellipsis
              sx={{
                fontWeight: 700,
                color: 'RGBA(33, 34, 45, 1)',
                lineHeight: 1.3,
                flex: 1,
                fontSize: '1.25rem',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {data.title}
            </Ellipsis>
          </Box>
          {/* 右侧：关注、点赞数和更多选项 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            {/* Issue 类型显示关注按钮 */}
            {isIssuePost && !isClosed && (
              <Box
                onClick={handleFollow}
                onMouseEnter={() => setIsHoveringFollow(true)}
                onMouseLeave={() => setIsHoveringFollow(false)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.5,
                  background: followInfo.followed ? 'rgba(233, 236, 239, 1)' : 'rgba(0,99,151,0.06)',
                  color: followInfo.followed ? 'text.secondary' : 'primary.main',
                  minWidth: '70px',
                  lineHeight: '22px',
                  height: '22px',
                  borderRadius: 0.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: followInfo.followed ? 'rgba(220, 224, 228, 1)' : 'rgba(0,99,151,0.12)',
                  },
                }}
              >
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: followInfo.followed ? 400 : 500,
                    fontSize: '12px',
                    color: 'inherit',
                    transition: 'color 0.2s',
                  }}
                >
                  {followInfo.followed ? (isHoveringFollow ? '取消关注' : '已关注') : '关注 Issue'}
                </Typography>
              </Box>
            )}
            {/* 文章类型和 Issue 类型显示点赞数 - 已关闭帖子不显示 */}
            {(isArticlePost || isIssuePost) && !isClosed && (
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
                  height: '22px',
                  '&:hover': {
                    color: '#000000',
                    background: 'rgba(0,99,151,0.1)',
                  },
                }}
              >
                <Icon type='icon-dianzan1' sx={{ fontSize: 12 }} />
                <Typography variant='caption' sx={{ fontWeight: 600, fontFamily: 'Gilroy', fontSize: '14px',lineHeight: 1 }}>
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
        <Stack
          direction='row'
          flexWrap='wrap'
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          gap={2}
        >
          {/* 左侧：所有标签（分组标签、状态标签、普通标签） */}
          <Stack direction='row' flexWrap='wrap' sx={{ gap: 1, alignItems: 'center' }}>
            {/* 使用通用状态标签组件 */}
            <DiscussionStatusChip item={data} size='medium' />
            {data.groups?.map((item) => {
              return (
                <Chip
                  key={item.id}
                  label={item.name}
                  size='small'
                  sx={{
                    bgcolor: 'rgba(233, 236, 239, 1)',
                    color: 'rgba(33, 34, 45, 1)',
                    height: 22,
                    lineHeight: '22px',
                    fontWeight: 400,
                    fontSize: '12px',
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
                  size='small'
                  sx={{
                    bgcolor: 'rgba(233, 236, 239, 1)',
                    color: 'rgba(33, 34, 45, 1)',
                    height: 22,
                    fontSize: '12px',
                    fontWeight: isCategory ? 600 : 500,
                    borderRadius: '3px',
                    cursor: 'default',
                    pointerEvents: 'none',
                  }}
                />
              )
            })}
          </Stack>
          {/* 作者信息和时间 */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: '14px' }}>
            <Box
              tabIndex={0}
              sx={{
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                borderRadius: 1,
                transition: 'box-shadow 0.2s, border-color 0.2s, background 0.2s',
                color: 'text.primary',
                '&:focus-within, &:hover ': {
                  color: 'primary.main',
                },
                my: '-2px',
                ml: '-4px',
              }}
            >
              {profileHref ? (
                <Link href={profileHref} style={{ display: 'inline-flex', marginRight: '8px' }} tabIndex={-1}>
                  <CommonAvatar src={data.user_avatar} name={data.user_name} />
                </Link>
              ) : (
                <CommonAvatar src={data.user_avatar} name={data.user_name} />
              )}
              {profileHref ? (
                <Link
                  href={profileHref}
                  style={{ color: 'inherit', fontWeight: 500, textDecoration: 'none' }}
                  tabIndex={-1}
                >
                  {data.user_name || '未知用户'}
                </Link>
              ) : (
                <Typography variant='body2' sx={{ color: 'inherit', fontWeight: 500 }}>
                  {data.user_name || '未知用户'}
                </Typography>
              )}
            </Box>
            <Typography variant='body2' sx={{ color: 'RGBA(33, 34, 45, 1)', px: 1 }}>
              ·
            </Typography>
            <Typography variant='body2' sx={{ color: 'rgba(33, 34, 45, 0.50)' }}>
              发布于{' '}
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
            {/* Issue 类型显示关注数 */}
            {isIssuePost && followInfo.follower !== undefined && (
              <>
                <Typography variant='body2' sx={{ color: 'rgba(33, 34, 45, 0.50)', px: 1 }}>
                  ·
                </Typography>
                <Typography variant='body2' sx={{ color: 'rgba(33, 34, 45, 0.50)' }}>
                  {followInfo.follower || 0}关注
                </Typography>
              </>
            )}
            {/* 显示浏览量 */}
            {data.view !== undefined && data.view !== null && (
              <>
                <Typography variant='body2' sx={{ color: 'rgba(33, 34, 45, 0.50)', px: 1 }}>
                  ·
                </Typography>
                <Typography variant='body2' sx={{ color: 'rgba(33, 34, 45, 0.50)' }}>
                  {formatNumber(data.view || 0)} 次浏览
                </Typography>
              </>
            )}
          </Box>
        </Stack>

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
