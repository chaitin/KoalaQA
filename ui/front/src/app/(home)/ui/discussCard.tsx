import { ModelDiscussionListItem, ModelDiscussionType } from '@/api/types'
import { Card, MatchedString, Title } from '@/app/(banner)/s/ui/common'
import { Icon, MarkDown } from '@/components'
import { CommonContext } from '@/components/commonProvider'
import { Avatar, Tag } from '@/components/discussion'
import { formatNumber } from '@/lib/utils'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { Box, Chip, Stack, Typography } from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { LazyImage } from '@/components/optimized'
import { useContext, useMemo } from 'react'
import Link from 'next/link'
import EditorContent from '@/components/EditorContent'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

// 将Markdown中的图片替换为[图片]文本
const replaceImagesWithText = (content: string): string => {
  if (!content) return content

  // 替换Markdown图片语法: ![alt](url)
  let processedContent = content.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '[图片]')

  // 替换HTML img标签
  processedContent = processedContent.replace(/<img[^>]*>/gi, '[图片]')

  return processedContent
}

const DiscussCard = ({ data, keywords: _keywords }: { data: ModelDiscussionListItem; keywords?: string }) => {
  const it = data
  const { groups } = useContext(CommonContext)

  // 根据group_ids获取分组名称
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return []

    return it.group_ids
      .map((groupId) => {
        const group = groups.flat.find((g) => g.id === groupId)
        return group?.name
      })
      .filter(Boolean) as string[]
  }, [it.group_ids, groups.flat])

  const handleCardClick = () => {
    window.open(`/discuss/${it.uuid}`, '_blank')
  }

  return (
    <Card
      key={it.id}
      onClick={handleCardClick}
      sx={{
        boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
        cursor: 'pointer',
        display: { xs: 'none', sm: 'block' },
        borderRadius: 2,
        p: 2,
        mb: 0.5,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 'rgba(0, 28, 85, 0.06) 0px 6px 15px 0px',
          transform: 'translateY(-1px)',
        },
      }}
    >
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
          <Title
            className='title'
            sx={{
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
            }}
          >
            {it.title}
          </Title>
          {data?.resolved && (
            <Stack
              direction='row'
              alignItems='center'
              gap={0.5}
              sx={{
                backgroundColor: '#E8F5E8',
                color: '#2E7D32',
                px: 1,
                py: 0.5,
                flexShrink: 0,
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 500,
                ml: 1,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 500 }}>已解决</Typography>
            </Stack>
          )}
        </Stack>

        {/* 用户信息和时间 */}
        <Stack direction='row' alignItems='center' gap={1} sx={{ color: '#666', flexShrink: 0, ml: 2, minWidth: 0 }}>
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
          <Typography
            variant='body2'
            sx={{
              fontSize: 12,
              color: 'rgba(0,0,0,0.6)',
              whiteSpace: 'nowrap',
              maxWidth: '120px', // 限制用户名最大宽度
            }}
          >
            {it.user_name}
          </Typography>
          <Typography
            variant='body2'
            sx={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {dayjs.unix(it.updated_at!).fromNow()}
          </Typography>
        </Stack>
      </Stack>
      <EditorContent
        content={replaceImagesWithText(it.content || '')}
        truncateLength={100} // 设置截断长度为100个字符，根据需要调整
        sx={{
          fontSize: 12,
          color: '#666',
          lineHeight: 1.4,
          mb: 1.5, // 减少描述和标签间距
        }}
      />
      {/* 底部标签和评论数 */}
      <Stack direction='row' justifyContent='space-between' alignItems='flex-start' sx={{ minHeight: 0 }}>
        <Stack direction='row' gap={1} flexWrap='wrap' alignItems='center' sx={{ flex: 1, minWidth: 0 }}>
          {/* 分组标签 */}
          {groupNames.map((groupName, index) => {
            const color = '#206CFF'
            return (
              <Chip
                key={groupName}
                label={groupName}
                size='small'
                sx={{
                  backgroundColor: `${color}15`,
                  color: color,
                  borderRadius: '4px',
                  fontSize: '12px',
                  height: '24px',
                  fontWeight: 500,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            )
          })}

          {/* 其他标签 */}
          {it?.tags?.map((item) => (
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
          {it.type === ModelDiscussionType.DiscussionTypeFeedback && <Stack
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
          </Stack>}
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
    </Card>
  )
}

export const DiscussCardMobile = ({ data, keywords }: { data: ModelDiscussionListItem; keywords?: string }) => {
  const it = data
  const { groups } = useContext(CommonContext)

  // 根据group_ids获取分组名称
  const groupNames = useMemo(() => {
    if (!it.group_ids || !groups.flat.length) return []

    return it.group_ids
      .map((groupId) => {
        const group = groups.flat.find((g) => g.id === groupId)
        return group?.name
      })
      .filter(Boolean) as string[]
  }, [it.group_ids, groups.flat])

  const handleCardClick = () => {
    window.open(`/discuss/${it.uuid}`, '_blank')
  }

  return (
    <Card
      key={it.id}
      onClick={handleCardClick}
      sx={{
        p: 2,
        display: { xs: 'flex', sm: 'none' },
        flexDirection: 'column',
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
      }}
    >
      <Stack
        direction={'column'}
        alignItems='flex-start'
        gap={1}
        sx={{
          width: '100%',
        }}
      >
        <Link href={`/discuss/${it.uuid}`} target='_blank' onClick={(e) => e.stopPropagation()}>
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
            <MatchedString keywords={keywords} str={it.title || ''}></MatchedString>
          </Title>
        </Link>
      </Stack>
      <Stack direction='row' alignItems='center' gap={2} sx={{ color: '#666', flexShrink: 0, minWidth: 0 }}>
        <Typography
          variant='body2'
          sx={{ fontSize: 12, lineHeight: 1, color: 'rgba(0,0,0,0.5)', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          <time
            dateTime={dayjs.unix(it.updated_at!).format()}
            title={dayjs.unix(it.updated_at!).format('YYYY-MM-DD HH:mm:ss')}
          >
            更新于 {dayjs.unix(it.updated_at!).fromNow()}
          </time>
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

          <Typography
            sx={{
              mt: '2px',
              fontSize: 12,
              color: 'rgba(0,0,0,0.5)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100px', // 移动版限制更小的宽度
              '&:hover': {
                cursor: 'pointer',
                color: 'primary.main',
              },
            }}
          >
            {it.user_name}
          </Typography>
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
          {/* 投票数 */}
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
            {formatNumber((it.like || 0))}
          </Stack>
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
        sx={{
          fontSize: 12,
          color: '#666',
          lineHeight: 1.4,
          mb: 1.5, // 减少描述和标签间距
        }}
      />
      <Stack direction='row' gap='8px 12px' flexWrap='wrap' sx={{ width: '100%', minHeight: 0 }}>
        {/* 分组标签 */}
        {groupNames.map((groupName) => (
          <Chip
            key={groupName}
            label={groupName}
            size='small'
            sx={{
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              color: '#4CAF50',
              borderRadius: '4px',
              fontSize: '12px',
              height: '24px',
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        ))}

        {/* 标签 */}
        {it?.tags?.map((item) => (
          <Tag
            key={item}
            label={item}
            size='small'
            sx={{
              backgroundColor: 'rgba(32, 108, 255, 0.1)',
              fontSize: '12px',
              height: '24px',
            }}
          />
        ))}
      </Stack>
    </Card>
  )
}

export default DiscussCard
