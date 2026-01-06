'use client'
import {
  deleteDiscussionDiscId,
  postDiscussionDiscIdAiLearn,
  postDiscussionDiscIdResolveIssue,
  putDiscussionDiscIdClose,
} from '@/api'
import { ModelDiscussionDetail, ModelDiscussionState, ModelDiscussionType, ModelUserRole } from '@/api/types'
import { DiscussionStatusChip, DiscussionTypeChip, Message, TagFilterChip } from '@/components'
import { AuthContext } from '@/components/authProvider'
import CommonAvatar from '@/components/CommonAvatar'
import { CommonContext } from '@/components/commonProvider'
import ConvertToIssueModal from '@/components/ConvertToIssueModal'
import Modal from '@/components/modal'
import { TimeDisplayWithTag } from '@/components/TimeDisplay'
import { useListPageCache } from '@/hooks/useListPageCache'
import dayjs from '@/lib/dayjs'
import { formatNumber, isAdminRole } from '@/lib/utils'
import { useForumStore } from '@/store'
import { PointActionType, showPointNotification } from '@/utils/pointNotification'
import {
  Box,
  Chip,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useBoolean } from 'ahooks'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { useContext, useEffect, useMemo, useCallback } from 'react'

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

interface TitleCardProps {
  data: ModelDiscussionDetail
  menuAnchorEl?: HTMLElement | null
  onMenuClose?: () => void
}

const TitleCard = ({ data, menuAnchorEl, onMenuClose }: TitleCardProps) => {
  const menuOpen = Boolean(menuAnchorEl)
  const menuClose = () => {
    onMenuClose?.()
  }
  const { user } = useContext(AuthContext)
  const { tags } = useContext(CommonContext)
  const [convertToIssueVisible, { setFalse: convertToIssueClose, setTrue: convertToIssueOpen }] = useBoolean(false)
  const { clearCache } = useListPageCache()
  const router = useRouter()
  const pathname = usePathname()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
  const forums = useForumStore((s) => s.forums)
  const { route_name }: { route_name?: string } = (useParams() as any) || {}

  // 刷新页面但不增加浏览次数
  const refreshWithoutView = useCallback(() => {
    const url = new URL(pathname, globalThis.location.origin)
    url.searchParams.set('refresh', 'true')
    router.replace(url.pathname + url.search)
  }, [pathname, router])
  const tagNames = useMemo(() => {
    if (!data.tag_ids || !tags.length) return []
    return tags.filter((tag) => data.tag_ids?.includes(tag.id || 0)).map((tag) => tag.name) as string[]
  }, [data.tag_ids, tags])
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


  const handleDelete = () => {
    menuClose()
    Modal.confirm({
      title: '确定删除话题吗？',
      okButtonProps: { color: 'error' },
      onOk: async () => {
        await deleteDiscussionDiscId({ discId: data.uuid + '' }).then(() => {
          // 显示积分提示：删除文章 -10（如果是文章）或删除问题（不扣积分，因为问题本身不产生积分）
          if (data.type === ModelDiscussionType.DiscussionTypeBlog) {
            showPointNotification(PointActionType.DELETE_ARTICLE)
          }
          clearCache()
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
          refreshWithoutView()
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
          refreshWithoutView()
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
          refreshWithoutView()
        })
      },
    })
  }

  const isArticlePost = data.type === ModelDiscussionType.DiscussionTypeBlog
  const isQAPost = data.type === ModelDiscussionType.DiscussionTypeQA
  const isIssuePost = data.type === ModelDiscussionType.DiscussionTypeIssue

  const isClosed = data.resolved === ModelDiscussionState.DiscussionStateClosed
  const profileHref = data.user_id ? `/profile/${data.user_id}` : undefined

  const handleAddToAiLearning = () => {
    menuClose()
    Modal.confirm({
      title: '确定加入 AI 学习吗？',
      content: '加入 AI 学习后，该文章将在后台被归类到【通用文档】中。',
      onOk: async () => {
        await postDiscussionDiscIdAiLearn({
          discId: data.uuid || '',
        })
        Message.success('加入 AI 学习成功')
        refreshWithoutView()
      },
    })
  }
  // 判断是否显示"转为 Issue 管理"按钮
  const canConvertToIssue = useMemo(() => {
    const isAdminOrOperator = [ModelUserRole.UserRoleAdmin, ModelUserRole.UserRoleOperator].includes(
      user.role || ModelUserRole.UserRoleUnknown,
    )
    const isUnresolvedQA = isQAPost && data.resolved === ModelDiscussionState.DiscussionStateNone
    return isAdminOrOperator && isUnresolvedQA
  }, [user.role, isQAPost, data.resolved])

  // 判断是否有已采纳的回答（仅问题类型）
  const hasAcceptedComment = useMemo(() => {
    if (!isQAPost || isAdminRole(user.role || ModelUserRole.UserRoleUnknown)) return false
    return data.comments?.some((comment) => comment.accepted) || false
  }, [isQAPost, data.comments])

  return (
    <>
      <ConvertToIssueModal
        open={convertToIssueVisible}
        onClose={convertToIssueClose}
        questionData={data}
        forumInfo={forumInfo}
        onSuccess={() => {
          refreshWithoutView()
        }}
      />
      <Menu
        id='basic-menu'
        anchorEl={menuAnchorEl}
        open={menuOpen}
        onClose={menuClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        {isArticlePost && isAdminRole(user?.role || ModelUserRole.UserRoleUnknown) && (
          <MenuItem onClick={handleAddToAiLearning}>加入 AI 学习</MenuItem>
        )}
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
              router.push(`/${route_name}/edit?id=${data.uuid}&type=${data.type}`)
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
        {/* 如果问题类型且有已采纳的回答，则隐藏删除选项 */}
        {!hasAcceptedComment && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            删除
            {data.type === ModelDiscussionType.DiscussionTypeQA
              ? '问题'
              : data.type === ModelDiscussionType.DiscussionTypeIssue
                ? 'Issue'
                : '文章'}
          </MenuItem>
        )}
      </Menu>

      {/* Post header */}
      {/* 第一行：类型标签和标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2, px: 1 }}>
        {/* 类型标签 */}
        <DiscussionTypeChip type={data.type} variant='default' />
        {/* 标题 - 完整展示，去掉行数限制 */}
        <Typography
          sx={{
            fontWeight: 700,
            color: 'RGBA(33, 34, 45, 1)',
            lineHeight: 1.4,
            flex: 1,
            fontSize: { xs: '16px', lg: '18px' },
          }}
        >
          {data.title}
        </Typography>
      </Box>

      {/* 第二行：标签和作者信息 */}
      <Stack
        direction='row'
        flexWrap='wrap'
        sx={{ alignItems: 'center', justifyContent: 'space-between', px: 1 }}
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
        </Stack>
        {/* 作者信息和时间 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            flexShrink: 0,
            fontSize: { xs: '13px', sm: '14px' },
            gap: { xs: 0.5, sm: 0 },
            rowGap: { xs: 0.5, sm: 0 },
          }}
        >
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
              ml: { xs: 0, sm: '-4px' },
              flexShrink: 0,
            }}
          >
            {profileHref ? (
              <Link href={profileHref} style={{ display: 'inline-flex', marginRight: '8px' }} tabIndex={-1}>
                <CommonAvatar src={data.user_avatar} name={data.user_name} />
              </Link>
            ) : (
              <CommonAvatar src={data.user_avatar} name={data.user_name} />
            )}
            <Link
              href={profileHref || 'javascript:void(0)'}
              style={{ color: 'inherit', fontWeight: 500, textDecoration: 'none' }}
              tabIndex={-1}
            >
              {data.user_name || '未知用户'}
            </Link>
          </Box>
          <Typography
            variant='body2'
            sx={{
              color: 'RGBA(33, 34, 45, 1)',
              px: { xs: 0.5, sm: 1 },
              flexShrink: 0,
            }}
          >
            ·
          </Typography>
          <Typography
            variant='body2'
            sx={{
              color: 'rgba(33, 34, 45, 0.50)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            发布于{' '}
            <TimeDisplayWithTag
              timestamp={data.created_at!}
              title={dayjs.unix(data.created_at!).format('YYYY-MM-DD HH:mm:ss')}
            />
          </Typography>
          {data.updated_at && data.updated_at !== 0 && data.updated_at !== data.created_at && !isMobile && (
            <>
              <Typography
                variant='body2'
                sx={{
                  color: 'rgba(33, 34, 45, 0.50)',
                  pr: { xs: 0.5, sm: 1 },
                  flexShrink: 0,
                }}
              >
                ,
              </Typography>
              <Typography
                variant='body2'
                sx={{
                  color: 'rgba(33, 34, 45, 0.50)',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                更新于{' '}
                <TimeDisplayWithTag
                  timestamp={data.updated_at}
                  title={dayjs.unix(data.updated_at).format('YYYY-MM-DD HH:mm:ss')}
                />
              </Typography>
            </>
          )}
          {/* 显示浏览量 */}
          {data.view !== undefined && data.view !== null && (
            <>
              <Typography
                variant='body2'
                sx={{
                  color: 'rgba(33, 34, 45, 0.50)',
                  px: { xs: 0.5, sm: 1 },
                  flexShrink: 0,
                }}
              >
                ·
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  flexShrink: 0,
                  color: 'rgba(33, 34, 45, 0.50)',
                }}
              >
                <Typography
                  variant='body2'
                  sx={{
                    color: 'rgba(33, 34, 45, 0.50)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatNumber(data.view || 0)}
                </Typography>
                <Typography
                  variant='body2'
                  sx={{
                    color: 'rgba(33, 34, 45, 0.50)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  次浏览
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </Stack>

      {!!tagNames.length && (
        <Stack direction='row' flexWrap='wrap' sx={{ gap: 1, alignItems: 'center', mt: 1, mb: 2, px: 1 }}>
          {tagNames.map((tag, index) => {
            return <TagFilterChip key={`tag-${tag}-${index}`} id={index} name={tag} selected={false} />
          })}
        </Stack>
      )}
    </>
  )
}

export default TitleCard
