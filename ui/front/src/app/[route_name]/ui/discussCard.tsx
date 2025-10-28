import { ModelDiscussionListItem, ModelDiscussionType } from '@/api/types'
import { Card, MatchedString, Title } from '@/app/(banner)/s/ui/common'
import { Icon } from '@/components'
import { CommonContext } from '@/components/commonProvider'
import { Avatar, Tag } from '@/components/discussion'
import { TimeDisplay, TimeDisplayWithTag } from '@/components/TimeDisplay'
import { formatNumber } from '@/lib/utils'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Box, Chip, Stack, SxProps, Typography } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { LazyImage } from '@/components/optimized'
import { useContext, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import EditorContent from '@/components/EditorContent'
import { useParams } from 'next/navigation'

// 帖子类型映射函数
const getTypeLabel = (type?: ModelDiscussionType): string => {
  switch (type) {
    case ModelDiscussionType.DiscussionTypeFeedback:
      return '反馈'
    case ModelDiscussionType.DiscussionTypeQA:
      return '问答'
    case ModelDiscussionType.DiscussionTypeBlog:
      return '文章'
    default:
      return ''
  }
}

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 将样式对象移到组件外部，避免每次渲染都重新创建
const TITLE_SX = {
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.4,
  color: '#000',
  textDecoration: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
  '&:hover': {
    color: 'primary.main',
  },
}

const EDITOR_SX = {
  lineHeight: 1.4,
  mb: 1.5, // 减少描述和标签间距
  fontSize: '12px!important',
  color: 'rgba(31, 35, 41, 0.50)',
  '& *': {
    fontSize: '12px!important',
  },
  '& .tiptap.ProseMirror': {
    color: 'rgba(31, 35, 41, 0.50)',
  },
}

// 将常用的样式对象移到组件外部，避免重复创建
const RESOLVED_STATUS_SX = {
  backgroundColor: '#E8F5E8',
  color: '#2E7D32',
  px: 1,
  py: 0.5,
  flexShrink: 0,
  borderRadius: 1,
  fontSize: 12,
  fontWeight: 500,
  ml: 1,
}

const USER_INFO_SX = {
  color: '#666',
  flexShrink: 0,
  ml: 2,
  minWidth: 0,
}

const USER_NAME_SX = {
  fontSize: 12,
  color: 'rgba(0,0,0,0.6)',
  whiteSpace: 'nowrap',
  maxWidth: '120px',
}

const TIME_SX = {
  fontSize: 12,
  color: 'rgba(0,0,0,0.5)',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

const GROUP_CHIP_SX = {
  backgroundColor: '#206CFF15',
  color: '#206CFF',
  borderRadius: '4px',
  fontSize: '12px',
  height: '24px',
  fontWeight: 500,
  '& .MuiChip-label': {
    px: 1,
  },
}

const TAG_SX = {
  backgroundColor: 'rgba(0,0,0,0.06)',
  color: 'rgba(0,0,0,0.6)',
  fontSize: '12px',
  height: '24px',
}

const VOTE_SX = {
  backgroundColor: '#206CFF15',
  color: '#206CFF',
  borderRadius: '4px',
  px: 1,
  py: 0.5,
}

const COMMENT_SX = {
  backgroundColor: '#FFF3E0',
  color: '#FF8500',
  borderRadius: '4px',
  px: 1,
  py: 0.5,
}

// 将Markdown中的图片替换为[图片]文本
const replaceImagesWithText = (content: string): string => {
  if (!content) return content

  // 替换Markdown图片语法: ![alt](url)
  let processedContent = content.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '[图片]')

  // 替换HTML img标签
  processedContent = processedContent.replace(/<img[^>]*>/gi, '[图片]')

  return processedContent
}

const DiscussCard = ({
  data,
  keywords: _keywords,
  showType = false,
  sx,
}: {
  data: ModelDiscussionListItem
  keywords?: string
  showType?: boolean
  sx?: SxProps
}) => {
  const it = data
  const { groups } = useContext(CommonContext)
  const params = useParams()

  // 使用 useMemo 优化分组名称计算，避免重复查找
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return []

    // 创建group映射表，避免重复查找
    const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))

    return it.group_ids
      .slice(0, 2)
      .map((groupId) => groupMap.get(groupId))
      .filter(Boolean) as string[]
  }, [it.group_ids, groups.flat])

  // 使用 useCallback 优化点击处理函数
  const handleCardClick = useCallback(() => {
    // 从路径参数中获取route_name
    const routeName = params?.route_name as string
    if (typeof window !== 'undefined' && routeName) {
      window.open(`/${routeName}/${it.uuid}`, '_blank')
    }
  }, [params?.route_name, it.uuid])

  // 使用 useMemo 优化样式对象
  const cardSx = useMemo(
    () => ({
      boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
      cursor: 'pointer',
      display: { xs: 'none', sm: 'block' },
      borderRadius: 1,
      p: 2,
      mb: 0.5,
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: 'rgba(0, 28, 85, 0.06) 0px 6px 15px 0px',
        transform: 'translateY(-1px)',
      },
      maxWidth: '100%',
      ...sx,
    }),
    [sx],
  )

  // 使用外部定义的样式常量，避免每次渲染都重新创建

  return (
    <Card key={it.id} onClick={handleCardClick} sx={cardSx}>
      {/* 标题和状态 */}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ mb: 1.5 }}>
        <Stack
          direction='row'
          alignItems='center'
          gap={1}
          sx={{
            flex: 1,
            maxWidth: '70%',
            '&:hover': {
              '.title': {
                color: 'primary.main',
              },
            },
          }}
        >
          <Title className='title' sx={TITLE_SX}>
            {showType && getTypeLabel(it.type) && `【${getTypeLabel(it.type)}】`}
            {it.title}
          </Title>
          {data?.resolved && (
            <Stack direction='row' alignItems='center' gap={0.5} sx={RESOLVED_STATUS_SX}>
              <CheckCircleIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 500 }}>已解决</Typography>
            </Stack>
          )}
        </Stack>

        {/* 用户信息和时间 */}
        <Stack direction='row' alignItems='center' gap={1} sx={USER_INFO_SX}>
          {it.user_avatar ? (
            <LazyImage
              src={it.user_avatar}
              width={20}
              height={20}
              alt='头像'
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
          ) : (
            <Box sx={{ flexShrink: 0 }}>
              <Avatar size={20} />
            </Box>
          )}
          <Typography variant='body2' sx={USER_NAME_SX}>
            {it.user_name}
          </Typography>
          <Typography variant='body2' sx={TIME_SX}>
            <TimeDisplay timestamp={it.updated_at!} />
          </Typography>
        </Stack>
      </Stack>
      <EditorContent
        content={replaceImagesWithText(it.content || '')}
        truncateLength={100} // 设置截断长度为100个字符，根据需要调整
        sx={EDITOR_SX}
      />
      {/* 底部标签和评论数 */}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ minHeight: 0 }}>
        <Stack direction='row' gap={1} flexWrap='wrap' alignItems='center' sx={{ flex: 1, minWidth: 0 }}>
          {/* 分组标签 */}
          {groupNames.map((groupName, _index) => (
            <Chip key={groupName} label={groupName} size='small' sx={GROUP_CHIP_SX} />
          ))}

          {/* 其他标签 */}
          {it?.tags?.map((item) => (
            <Tag key={item} label={item} size='small' sx={TAG_SX} />
          ))}
        </Stack>
        {/* 评论数和投票数 */}
        <Stack
          direction='row'
          alignItems='center'
          gap={1.5}
          sx={{
            fontSize: '12px',
          }}
        >
          {/* 投票数 */}
          {it.type === ModelDiscussionType.DiscussionTypeFeedback && (
            <Stack direction='row' alignItems='center' gap={0.5} sx={VOTE_SX}>
              <Icon type='icon-dianzan' />
              {formatNumber((it.like || 0) - (it.dislike || 0))}
            </Stack>
          )}
          {/* 评论数 */}
          <Stack direction='row' alignItems='center' gap={0.5} sx={COMMENT_SX}>
            <Icon type='icon-xiaoxi' />
            {formatNumber(it.comment || 0)}
          </Stack>
        </Stack>
      </Stack>
    </Card>
  )
}

const DiscussCardMobileComponent = ({
  data,
  keywords,
  showType = false,
  sx,
}: {
  data: ModelDiscussionListItem
  keywords?: string
  showType?: boolean
  sx?: SxProps
}) => {
  const it = data
  const { groups } = useContext(CommonContext)
  const params = useParams()
  const routeName = params?.route_name as string

  // 使用 useMemo 优化分组名称计算，避免重复查找
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return []

    // 创建group映射表，避免重复查找
    const groupMap = new Map(groups.flat.map((g) => [g.id, g.name]))

    return it.group_ids.map((groupId) => groupMap.get(groupId)).filter(Boolean) as string[]
  }, [it.group_ids, groups.flat])

  // 使用 useCallback 优化点击处理函数
  const handleCardClick = useCallback(() => {
    // 从路径参数中获取route_name
    const routeName = params?.route_name as string
    if (typeof window !== 'undefined' && routeName) {
      window.open(`/${routeName}/${it.uuid}`, '_blank')
    }
  }, [params?.route_name, it.uuid])

  // 使用 useMemo 优化样式对象
  const cardSx = useMemo(
    () => ({
      p: 2,
      display: { xs: 'flex', sm: 'none' },
      flexDirection: 'column' as const,
      gap: 1,
      boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
      cursor: 'pointer',
      width: '100%',
      mb: 0.5,
      transition: 'all 0.2s ease',
      '&:hover': {
        boxShadow: 'rgba(0, 28, 85, 0.06) 0px 6px 15px 0px',
        transform: 'translateY(-1px)',
      },
      ...sx,
    }),
    [sx],
  )

  return (
    <Card key={it.id} onClick={handleCardClick} sx={cardSx}>
      <Stack
        direction={'column'}
        alignItems='flex-start'
        gap={1}
        sx={{
          width: '100%',
        }}
      >
        <Link href={`/${routeName}/${it.uuid}`} target='_blank' onClick={(e) => e.stopPropagation()}>
          <Title
            className='title multiline-ellipsis'
            sx={{
              width: '100%',
              whiteSpace: 'normal',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: 1.4,
              maxHeight: '2.8em', // 2行 * 1.4行高
            }}
          >
            {it.title}
          </Title>
        </Link>
      </Stack>
      <Stack direction='row' alignItems='center'  sx={{ color: '#666', flexShrink: 0, minWidth: 0 }}>
        <Typography
          sx={{
            mt: '2px',
            fontSize: 12,
            color: 'rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            mr: 2,
            minWidth: 0,
            '&:hover': {
              cursor: 'pointer',
              color: 'primary.main',
            },
          }}
        >
          {it.user_name}
        </Typography>
        <Typography
          variant='body2'
          sx={{ fontSize: 12, lineHeight: 1, color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <TimeDisplayWithTag
            timestamp={it.updated_at!}
            title={dayjs.unix(it.updated_at!).format('YYYY-MM-DD HH:mm:ss')}
          />
        </Typography>
        <Stack direction='row' alignItems='center' gap={1} sx={{ minWidth: 0, flex: 1 }}>
          {it.user_avatar ? (
            <LazyImage
              src={it.user_avatar}
              width={16}
              height={16}
              alt='头像'
              style={{ borderRadius: '50%', flexShrink: 0 }}
            />
          ) : (
            <Box sx={{ flexShrink: 0 }}>
              <Avatar size={16} />
            </Box>
          )}
        </Stack>
        <Stack
          direction='row'
          alignItems='center'
          gap={1}
          sx={{
            ml: 'auto!important',
            fontSize: '12px',
          }}
        >
          {/* 投票数 - 仅反馈类型显示（与电脑端一致）；QA 不显示 */}
          {it.type === ModelDiscussionType.DiscussionTypeFeedback && (
            <Stack
              direction='row'
              alignItems='center'
              gap={0.5}
              sx={{
                backgroundColor: '#206CFF15',
                color: '#206CFF',
                borderRadius: '4px',
                px: 1,
                py: 0.5,
              }}
            >
              <Icon type='icon-dianzan' />
              {formatNumber((it.like || 0) - (it.dislike || 0))}
            </Stack>
          )}
          {/* 评论数 */}
          <Stack
            direction='row'
            alignItems='center'
            gap={0.5}
            sx={{
              backgroundColor: '#FFF3E0',
              color: '#FF8500',
              borderRadius: '4px',
              px: 1,
              py: 0.5,
            }}
          >
            <Icon type='icon-xiaoxi' />
            {formatNumber(it.comment || 0)}
          </Stack>
        </Stack>
      </Stack>
      <EditorContent
        content={replaceImagesWithText(it.content || '')}
        truncateLength={60} // 设置截断长度为100个字符，根据需要调整
        sx={EDITOR_SX}
      />
      <Stack direction='row' gap='8px 12px' flexWrap='wrap' sx={{ width: '100%', minHeight: 0 }}>
        {/* 分组标签 */}
        {groupNames.map((groupName) => (
          <Chip key={groupName} label={groupName} size='small' sx={GROUP_CHIP_SX} />
        ))}

        {/* 标签 */}
        {it?.tags?.map((item) => (
          <Tag key={item} label={item} size='small' sx={TAG_SX} />
        ))}
      </Stack>
    </Card>
  )
}

// 使用 React.memo 优化组件，避免不必要的重新渲染
export default memo(DiscussCard, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时才重新渲染
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.updated_at === nextProps.data.updated_at &&
    prevProps.data.like === nextProps.data.like &&
    prevProps.data.dislike === nextProps.data.dislike &&
    prevProps.data.comment === nextProps.data.comment &&
    prevProps.data.resolved === nextProps.data.resolved &&
    prevProps.data.group_ids === nextProps.data.group_ids &&
    prevProps.data.tags === nextProps.data.tags &&
    prevProps.showType === nextProps.showType &&
    prevProps.keywords === nextProps.keywords
  )
})
export const DiscussCardMobile = memo(DiscussCardMobileComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时才重新渲染
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.updated_at === nextProps.data.updated_at &&
    prevProps.data.like === nextProps.data.like &&
    prevProps.data.dislike === nextProps.data.dislike &&
    prevProps.data.comment === nextProps.data.comment &&
    prevProps.data.resolved === nextProps.data.resolved &&
    prevProps.data.group_ids === nextProps.data.group_ids &&
    prevProps.data.tags === nextProps.data.tags &&
    prevProps.showType === nextProps.showType &&
    prevProps.keywords === nextProps.keywords
  )
})
