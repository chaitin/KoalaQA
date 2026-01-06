'use client'

import { ModelGroupItemInfo, ModelGroupWithItem, ModelForumInfo, ModelDiscussionTag } from '@/api'
import FilterPanelClient from './FilterPanelClient'
import { FilterPanelActions } from './FilterPanelActions'
import {
  Box,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  Stack,
  Typography,
  Link as MuiLink,
} from '@mui/material'
import { Icon } from '@ctzhian/ui'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Image from 'next/image'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { useMemo, useCallback, useEffect, useState } from 'react'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'

interface FilterPanelProps {
  readonly groups: {
    origin: (ModelGroupWithItem & { items?: ModelGroupItemInfo[] })[]
    flat: ModelGroupItemInfo[]
  }
  readonly forumId: number | null
  readonly forumInfo: ModelForumInfo | null
  readonly tags?: ModelDiscussionTag[]
  readonly initialRouteName: string
  readonly initialPathname: string
  readonly initialSearchParams: {
    type?: string | null
    tps?: string | null
    tags?: string | null
  }
}

const postTypes = [
  { id: 'all', name: '全部', icon: <Icon type='icon-quanbu' /> },
  { id: 'qa', name: '问题', icon: <Icon type='icon-wenti' /> },
  { id: 'issue', name: 'Issue', icon: <Icon type='icon-issue' /> },
  { id: 'blog', name: '文章', icon: <Icon type='icon-wenzhang' /> },
]

export default function FilterPanel({
  groups,
  forumId,
  forumInfo,
  tags = [],
  initialRouteName,
  initialPathname,
  initialSearchParams,
}: FilterPanelProps) {
  // 获取客户端值
  const params = useParams()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 跟踪是否已经 mounted（客户端）
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 完全依赖服务端传入的值，确保首次渲染和刷新后的一致性
  const routeName = initialRouteName
  const currentPathname = initialPathname

  // 解析 URL 参数 - 首次渲染使用服务端值，之后响应客户端 URL 变化
  // 这确保了服务端和客户端的一致性，避免 hydration 不匹配
  const { urlType, urlTopics, urlTags, isDetailPage, typeForUrl, typeForFilter } = useMemo(() => {
    // 首次渲染（未 mounted）使用服务端传入的 initialSearchParams
    // mounted 后使用客户端 searchParams（响应 URL 变化）
    const searchParamsObj = isMounted
      ? {
          type: searchParams?.get('type') ?? null,
          tps: searchParams?.get('tps') ?? null,
          tags: searchParams?.get('tags') ?? null,
        }
      : {
          type: initialSearchParams.type ?? null,
          tps: initialSearchParams.tps ?? null,
          tags: initialSearchParams.tags ?? null,
        }

    // 判断是否在详情页（路径包含 /[id]，但不是 /edit）
    const isDetail = (() => {
      if (!currentPathname || !routeName) return false
      const detailPattern = new RegExp(`^/${routeName}/[^/]+$`)
      return detailPattern.test(currentPathname) && !currentPathname.endsWith('/edit')
    })()

    // 从 URL 参数读取选中的分类和类型
    const type = searchParamsObj.type || null
    const topics = searchParamsObj.tps
      ? searchParamsObj.tps
          .split(',')
          .map(Number)
          .filter((id: number) => !Number.isNaN(id))
      : []
    const tagIds = searchParamsObj.tags
      ? searchParamsObj.tags
          .split(',')
          .map(Number)
          .filter((id: number) => !Number.isNaN(id))
      : []

    // URL 展示/写回用：未传 type 表示"全部"；type=all 也表示"全部"
    const typeForUrlValue = isDetail ? null : type

    // 分类/标签过滤、请求后端用：未传 type / type=all 时都不按类型过滤（也不把 all 传给后端）
    const typeForFilterValue = isDetail ? null : type === 'all' || type === null ? null : type

    return {
      urlType: type,
      urlTopics: topics,
      urlTags: tagIds,
      isDetailPage: isDetail,
      typeForUrl: typeForUrlValue,
      typeForFilter: typeForFilterValue,
    }
  }, [initialSearchParams, searchParams, currentPathname, routeName, isMounted])

  // 根据论坛配置 + 当前 type 过滤分类组（只展示该类型允许的分类）
  // 使用 useMemo 确保过滤逻辑是同步的，立即渲染分类
  const filteredGroups = useMemo(() => {
    // 如果没有论坛信息，直接返回原始数据
    if (!forumInfo) return groups

    // 获取论坛配置的所有类型的 group_ids
    let forumGroupIds: number[] = []
    if (forumInfo.groups) {
      const groupsArray = Array.isArray(forumInfo.groups) ? forumInfo.groups : Object.values(forumInfo.groups)

      if (typeForFilter) {
        // 有类型时，只获取该类型的 group_ids
        const matchedGroup = groupsArray.find((g: any) => g?.type === typeForFilter)
        forumGroupIds = matchedGroup?.group_ids || []
      } else {
        // "全部"类型时，获取所有类型的 group_ids 的并集
        const allGroupIds = new Set<number>()
        groupsArray.forEach((g: any) => {
          if (g?.group_ids && Array.isArray(g.group_ids)) {
            g.group_ids.forEach((id: number) => allGroupIds.add(id))
          }
        })
        forumGroupIds = Array.from(allGroupIds)
      }
    } else {
      return {
        origin: [],
        flat: [],
      } as {
        origin: (ModelGroupWithItem & {
          items?: ModelGroupItemInfo[]
        })[]
        flat: ModelGroupItemInfo[]
      }
    }

    // 如果论坛没有配置 group_ids，返回原始数据（后端已经按 forum_id 过滤了）
    if (forumGroupIds.length === 0) {
      return groups
    }

    // 根据 group_ids 过滤分类组
    const filteredOrigin = groups.origin.filter((group) => {
      return forumGroupIds.includes(group.id || -1)
    })

    // 根据筛选后的 origin 重新计算 flat
    const filteredFlat = filteredOrigin.reduce((acc, group) => {
      if (group.items && group.items.length > 0) {
        acc.push(...group.items)
      }
      return acc
    }, [] as ModelGroupItemInfo[])

    return {
      origin: filteredOrigin,
      flat: filteredFlat,
    }
  }, [groups, forumInfo, typeForFilter])

  // 将真实的 groups 数据转换为 categoryGroups 格式
  // 使用 useMemo 确保转换是同步的，立即渲染分类
  const categoryGroups = useMemo(() => {
    return filteredGroups.origin.map((group) => ({
      id: String(group.id || ''),
      name: group.name || '',
      options: (group.items || []).map((item) => ({
        id: String(item.id || ''),
        name: item.name || '',
        count: 0,
      })),
    }))
  }, [filteredGroups])

  // 获取每个分类组中选中的选项
  // 使用 useMemo 确保选中状态计算是同步的
  const selectedCategories = useMemo(() => {
    const result: Record<string, string[]> = {}
    categoryGroups.forEach((group) => {
      // 提取选项 ID 集合以减少嵌套
      const optionIds = new Set(group.options.map((opt) => Number(opt.id)))
      const selected = urlTopics.filter((topicId: number) => optionIds.has(topicId)).map(String)
      if (selected.length > 0) {
        result[group.id] = selected
      }
    })
    return result
  }, [categoryGroups, urlTopics])

  // 过滤标签 - 使用 useMemo 确保过滤是同步的
  const popularTags = useMemo(() => {
    return (tags || []).filter((tag): tag is { id: number; name?: string } => typeof tag?.id === 'number')
  }, [tags])

  // 计算类型选中状态 - 使用 useMemo 缓存函数
  const getTypeSelected = useMemo(() => {
    return (typeId: string) => {
      if (isDetailPage) return false
      if (typeId === 'all') {
        return urlType === 'all' || urlType === null
      }
      return urlType !== null && urlType !== 'all' && urlType === typeId
    }
  }, [isDetailPage, urlType])

  // URL 同步回调 - 用于清理无效的分类/标签
  const router = useRouterWithRouteName()
  const handleUrlSync = useCallback(() => {
    if (isDetailPage) return

    // 基于当前的 initialSearchParams 构建 URL 参数
    const urlParams = new URLSearchParams()

    // 清理无效的分类 - 提取到辅助函数以减少嵌套
    const validTopicIds = new Set(filteredGroups.flat.map((g) => g.id))
    const currentTopics = urlTopics.filter((id) => validTopicIds.has(id))

    if (currentTopics.length > 0) {
      urlParams.set('tps', currentTopics.join(','))
    }

    // 保持其他参数
    if (typeForUrl) {
      urlParams.set('type', typeForUrl)
    }

    if (urlTags.length > 0) {
      urlParams.set('tags', urlTags.join(','))
    }

    const queryString = urlParams.toString()
    const newPath = `/${routeName}${queryString ? `?${queryString}` : ''}`

    // 使用 replace 避免在历史记录中留下无效的 URL
    router.replace(newPath)
  }, [isDetailPage, routeName, urlTopics, urlTags, typeForUrl, filteredGroups.flat, router])

  return (
    <>
      <FilterPanelClient
        routeName={routeName}
        forumId={forumId}
        typeForFilter={typeForFilter}
        isDetailPage={isDetailPage}
        urlTopics={urlTopics}
        filteredGroups={filteredGroups}
        onUrlSync={handleUrlSync}
      />
      <Stack
        sx={{
          width: 240,
          flexShrink: 0,
          display: { xs: 'none', lg: 'block' },
          position: 'sticky',
          top: 25,
          alignSelf: 'flex-start',
          height: {
            xs: 'auto',
            md: 'fit-content',
            lg: 'fit-content',
          },
          maxHeight: {
            xs: 'auto',
            md: 'calc(100vh - 64px)',
            lg: 'calc(100vh - 64px)',
          },
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#e5e7eb',
            borderRadius: '3px',
            '&:hover': {
              background: '#d1d5db',
            },
          },
          scrollbarGutter: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#e5e7eb transparent',
        }}
      >
        {/* 类型筛选 */}
        <Box sx={{ mb: 2 }}>
          <List disablePadding>
            {postTypes.map((type) => {
              const isSelected = getTypeSelected(type.id)
              return (
                <ListItem key={type.id} disablePadding>
                  <FilterPanelActions.TypeButton
                    typeId={type.id}
                    isSelected={isSelected}
                    icon={type.icon}
                    name={type.name}
                    routeName={routeName}
                    pathname={pathname}
                    urlType={urlType}
                    urlTopics={urlTopics}
                    urlTags={urlTags}
                    typeForUrl={typeForUrl}
                  />
                </ListItem>
              )
            })}
          </List>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* 分类选择 */}
        <Box sx={{ mb: 2 }}>
          {categoryGroups.map((group) => {
            const selectedValues = selectedCategories[group.id] || []
            return (
              <FormControl key={group.id} fullWidth sx={{ mb: 1.5 }}>
                <InputLabel
                  sx={{
                    fontSize: '12px',
                    color: '#111827',
                    lineHeight: '19px',
                    '&.Mui-focused': {
                      color: 'primary.main',
                    },
                  }}
                >
                  {group.name}
                </InputLabel>
                <FilterPanelActions.CategorySelect
                  group={group}
                  selectedValues={selectedValues}
                  selectedCategories={selectedCategories}
                  typeForUrl={typeForUrl}
                  urlTags={urlTags}
                />
              </FormControl>
            )
          })}
        </Box>

        {forumInfo?.tag_enabled && (
          <>
            <Divider sx={{ mb: 3 }} />

            {/* 标签 */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <FilterPanelActions.Tags
                popularTags={popularTags}
                urlTags={urlTags}
                typeForFilter={typeForFilter}
                urlTopics={urlTopics}
                typeForUrl={typeForUrl}
                forumId={forumId}
                isDetailPage={isDetailPage}
              />
            </Box>
          </>
        )}

        {forumInfo?.links?.enabled && forumInfo?.links?.links && forumInfo.links.links.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />

            {/* 常用链接 */}
            <List disablePadding>
              {forumInfo.links.links.map((link, linkIndex) => (
                <ListItem key={`link-${linkIndex}-${link.name || linkIndex}`} disablePadding sx={{ mb: 1 }}>
                  <MuiLink
                    href={link.address || '#'}
                    target='_blank'
                    rel='noopener noreferrer'
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      color: 'text.primary',
                      textDecoration: 'none',
                      fontSize: '14px',
                      width: '100%',
                      '&:hover': {
                        color: 'primary.main',
                      },
                    }}
                  >
                    <OpenInNewIcon
                      sx={{
                        fontSize: 16,
                        color: 'text.secondary',
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant='body2' sx={{ fontSize: '14px' }}>
                      {link.name}
                    </Typography>
                  </MuiLink>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Stack>
    </>
  )
}
