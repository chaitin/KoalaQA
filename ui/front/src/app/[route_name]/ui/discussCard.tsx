"use client"

import { ModelDiscussionListItem, ModelDiscussionType } from '@/api/types'
import { CommonContext } from '@/components/commonProvider'
import { Avatar } from '@/components/discussion'
import { TimeDisplay } from '@/components/TimeDisplay'
import { formatNumber } from '@/lib/utils'
import {
  Box,
  Chip,
  SxProps,
  Typography,
  Avatar as MuiAvatar,
} from '@mui/material'
import {
  QuestionAnswer as QuestionAnswerIcon,
  ThumbUp as ThumbUpIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  HowToVote as HowToVoteIcon,
} from '@mui/icons-material'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import relativeTime from 'dayjs/plugin/relativeTime'
import { LazyImage } from '@/components/optimized'
import { useContext, useMemo, useCallback, memo } from 'react'
import { MarkDown } from '@/components'
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

// 状态相关辅助函数
const getStatusColor = (status: string) => {
  if (status === 'answered' || status === 'closed') return '#10b981'
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

const shouldShowStatus = (data: ModelDiscussionListItem) => {
  return data.resolved || false
}

const isCategoryTag = (tag: string, groups: Array<{ name?: string }>) => {
  return groups.some((group) => group.name === tag)
}

// 获取帖子状态
const getPostStatus = (data: ModelDiscussionListItem): string => {
  if (data.resolved) {
    return data.type === ModelDiscussionType.DiscussionTypeFeedback ? 'closed' : 'answered'
  }
  return 'open'
}

// 获取帖子类型
const getPostType = (type?: ModelDiscussionType): 'question' | 'feedback' | 'article' => {
  if (type === ModelDiscussionType.DiscussionTypeQA) return 'question'
  if (type === ModelDiscussionType.DiscussionTypeFeedback) return 'feedback'
  if (type === ModelDiscussionType.DiscussionTypeBlog) return 'article'
  return 'question'
}

// 获取头像首字母
const getAvatarLetter = (name?: string): string => {
  if (!name) return '?'
  return name.charAt(0).toUpperCase()
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

  // 准备数据
  const postStatus = getPostStatus(it)
  const postType = getPostType(it.type)
  const allTags = [...groupNames, ...(it.tags || [])]

  return (
    <Box
      key={it.id}
      sx={{
        borderBottom: "1px solid #f3f4f6",
        transition: "all 0.2s",
        cursor: "pointer",
        "&:hover": {
          bgcolor: "#fafbfc",
        },
        ...sx,
      }}
      onClick={handleCardClick}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#111827",
              fontSize: "1rem",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
              "&:hover": { color: "#000000" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {showType && getTypeLabel(it.type) && `【${getTypeLabel(it.type)}】`}
            {it.title}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            {it.user_avatar ? (
              <LazyImage
                src={it.user_avatar}
                width={20}
                height={20}
                alt='头像'
                style={{ borderRadius: '50%', flexShrink: 0 }}
              />
            ) : (
              <MuiAvatar
                sx={{
                  bgcolor: "#000000",
                  width: 20,
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                }}
              >
                {getAvatarLetter(it.user_name)}
              </MuiAvatar>
            )}
            <Typography
              variant="caption"
              sx={{ color: "#6b7280", fontWeight: 500, fontSize: "0.7rem", whiteSpace: "nowrap" }}
            >
              {it.user_name || ''} · <TimeDisplay timestamp={it.updated_at!} />
            </Typography>
          </Box>
        </Box>

        <MarkDown
          content={
            it.type === ModelDiscussionType.DiscussionTypeBlog ? (it.summary || '') : (it.content || '')
          }
          truncateLength={100}
          sx={{
            color: "#6b7280",
            mb: 1.25,
            lineHeight: 1.5,
            fontSize: "0.8125rem",
            '& *': {
              fontSize: "0.8125rem !important",
              color: "#6b7280 !important",
            },
          }}
        />

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            {shouldShowStatus(it) && (
              <Chip
                icon={
                  postStatus === "answered" || postStatus === "closed" ? (
                    <CheckCircleOutlineIcon
                      sx={{
                        width: 15,
                        height: 15,
                        color: "#10b981 !important",
                      }}
                    />
                  ) : undefined
                }
                label={getStatusLabel(postStatus)}
                size="small"
                sx={{
                  bgcolor: `${getStatusColor(postStatus)}15`,
                  color: getStatusColor(postStatus),
                  height: 22,
                  fontWeight: 600,
                  fontSize: "0.7rem",
                  borderRadius: "3px",
                  border: `1px solid ${getStatusColor(postStatus)}30`,
                }}
              />
            )}
            {allTags.map((tag) => {
              const isCategory = isCategoryTag(tag, groups.flat)
              return (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    bgcolor: isCategory ? "#eff6ff" : "#f9fafb",
                    color: isCategory ? "#3b82f6" : "#6b7280",
                    height: 22,
                    fontSize: "0.7rem",
                    fontWeight: isCategory ? 600 : 500,
                    borderRadius: "3px",
                    border: isCategory ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
                    cursor: "default",
                    pointerEvents: "none",
                  }}
                />
              )
            })}
          </Box>

          <Box sx={{ display: "flex", gap: 2.5, alignItems: "center" }}>
            {postType === "question" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": { color: "#000000" },
                }}
              >
                <QuestionAnswerIcon sx={{ fontSize: 14, color: "#9ca3af" }} />
                <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, fontSize: "0.7rem" }}>
                  {it.comment || 0}
                </Typography>
              </Box>
            )}
            {postType === "feedback" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": { color: "#000000" },
                }}
              >
                <HowToVoteIcon sx={{ fontSize: 14, color: "#9ca3af" }} />
                <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, fontSize: "0.7rem" }}>
                  {(it.like || 0) - (it.dislike || 0)}
                </Typography>
              </Box>
            )}
            {postType === "article" && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  "&:hover": { color: "#000000" },
                }}
              >
                <ThumbUpIcon sx={{ fontSize: 14, color: "#9ca3af" }} />
                <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 600, fontSize: "0.7rem" }}>
                  {(it.like || 0) - (it.dislike || 0)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
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
