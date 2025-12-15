'use client'

import { getDiscussion, ModelDiscussionType } from '@/api'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import {
  Box,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Typography,
} from '@mui/material'
import Image from 'next/image'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { useContext, useEffect, useMemo, useState } from 'react'
import { CommonContext } from './commonProvider'
import { Icon } from '@ctzhian/ui'
import TagFilterChip from './TagFilterChip'
import { useForumId } from '@/hooks/useForumId'
import { useForumStore } from '@/store'
import { useGroupDataStore } from '@/store/groupDataStore'

type TagWithId = {
  id: number
  name?: string
  count?: number
}

const postTypes = [
  { id: 'all', name: '全部', icon: <Icon type='icon-quanbu' sx={{ fontSize: 20 }} /> },
  { id: 'qa', name: '问题', icon: <Image width={20} height={20} src='/qa.svg' alt='问题' /> },
  { id: 'issue', name: 'Issue', icon: <Icon type='icon-issue' sx={{ fontSize: 20 }} /> },
  { id: 'blog', name: '文章', icon: <Image width={20} height={20} src='/blog.svg' alt='文章' /> },
]

export default function FilterPanel() {
  const { groups, tags } = useContext(CommonContext)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouterWithRouteName()
  const routeName = params?.route_name as string
  const forumId = useForumId()
  const forums = useForumStore((s) => s.forums)
  const filterGroupsByForumAndType = useGroupDataStore((s) => s.filterGroupsByForumAndType)
  const [selectedTags, setSelectedTags] = useState<number[]>([])

  const popularTags = useMemo(() => (tags || []).filter((tag): tag is TagWithId => typeof tag?.id === 'number'), [tags])

  // 判断是否在详情页（路径包含 /[id]，但不是 /edit）
  const isDetailPage = useMemo(() => {
    if (!pathname || !routeName) return false
    // 详情页路径格式: /[route_name]/[id]，排除编辑页 /[route_name]/edit
    const detailPattern = new RegExp(`^/${routeName}/[^/]+$`)
    return detailPattern.test(pathname) && !pathname.endsWith('/edit')
  }, [pathname, routeName])

  // 从 URL 参数读取选中的分类和类型
  // 在详情页时，不使用 URL 参数，也不高亮类型
  // 默认不选中任何类型，只有主动选中时才传递type参数
  const urlType = useMemo(() => {
    const urlTypeParam = searchParams?.get('type')
    return urlTypeParam || null // 没有参数时返回null，表示不选中任何类型
  }, [searchParams])
  const urlTopics = useMemo(() => {
    const tps = searchParams?.get('tps')
    if (!tps) return []
    return tps
      .split(',')
      .map(Number)
      .filter((id) => !isNaN(id))
  }, [searchParams])
  const urlTags = useMemo(() => {
    const tags = searchParams?.get('tags')
    if (!tags) return []
    return tags
      .split(',')
      .map(Number)
      .filter((id) => !isNaN(id))
  }, [searchParams])

  // 列表页默认选择“问题(qa)”
  useEffect(() => {
    if (isDetailPage) return
    if (!routeName) return
    if (urlType !== null) return
    // 默认 type=qa，并保留已有的 tps/tags
    const params = new URLSearchParams(searchParams?.toString())
    params.set('type', ModelDiscussionType.DiscussionTypeQA)
    const queryString = params.toString()
    router.replace(`/${routeName}${queryString ? `?${queryString}` : ''}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailPage, routeName, urlType])

  // URL 展示/写回用：未传 type 默认 qa；type=all 表示“全部”
  const typeForUrl = useMemo(() => {
    if (isDetailPage) return null
    return (urlType || ModelDiscussionType.DiscussionTypeQA) as string
  }, [isDetailPage, urlType])

  // 分类/标签过滤、请求后端用：type=all 时不按类型过滤（也不把 all 传给后端）
  const typeForFilter = useMemo(() => {
    if (isDetailPage) return null
    if (urlType === 'all') return null
    return (urlType || ModelDiscussionType.DiscussionTypeQA) as string
  }, [isDetailPage, urlType])

  const forumInfo = useMemo(() => {
    if (!forumId) return null
    return forums.find((f) => f.id === forumId) || null
  }, [forums, forumId])

  // 根据论坛配置 + 当前 type 过滤分类组（只展示该类型允许的分类）
  const filteredGroups = useMemo(() => {
    if (!typeForFilter) return groups
    // groupDataStore 的入参类型比较窄，这里用 any 兼容 issue/feedback 等类型
    return filterGroupsByForumAndType(groups, forumInfo as any, typeForFilter as any)
  }, [groups, forumInfo, typeForFilter, filterGroupsByForumAndType])

  // 根据当前 type（可选：叠加当前分类筛选）聚合出“正在使用”的标签 id，用于过滤标签列表展示
  const [usedTagIdSet, setUsedTagIdSet] = useState<Set<number> | null>(null)
  // 记录 usedTagIdSet 对应的 key，用于避免切换 type 时短暂展示“其他 type 的标签”
  const [usedTagReadyKey, setUsedTagReadyKey] = useState<string | null>(null)
  const [usedTagLoading, setUsedTagLoading] = useState(false)
  const usedTagCacheRef = useState(() => new Map<string, Set<number>>())[0]

  const usedTagTargetKey = useMemo(() => {
    if (isDetailPage) return null
    if (!forumId) return null
    // typeForFilter 为 null 代表“全部”，不做 used-tag 聚合
    if (!typeForFilter) return null
    const topicKey = (urlTopics || []).slice().sort((a, b) => a - b).join(',')
    return `forum:${forumId}|type:${typeForFilter}|topics:${topicKey}`
  }, [forumId, isDetailPage, typeForFilter, urlTopics])

  useEffect(() => {
    if (isDetailPage) return
    if (!forumId) return
    // typeForFilter 为 null 时代表“全部”，不做聚合，直接展示全量 popularTags
    if (!typeForFilter) {
      setUsedTagLoading(false)
      setUsedTagIdSet(null)
      setUsedTagReadyKey(null)
      return
    }
    if (!usedTagTargetKey) return

    let cancelled = false
    setUsedTagLoading(true)

    // 命中缓存：直接使用，避免闪烁
    const cached = usedTagCacheRef.get(usedTagTargetKey)
    if (cached) {
      setUsedTagIdSet(cached)
      setUsedTagReadyKey(usedTagTargetKey)
      setUsedTagLoading(false)
      return
    }

    const params: any = {
      forum_id: forumId,
      page: 1,
      size: 200,
      filter: 'publish',
    }
    if (typeForFilter) {
      params.type = typeForFilter
    }

    // 如果已经选择了分类（tps），则只统计当前分类下的标签，更贴近“当前问题帖”
    if (urlTopics.length > 0) {
      params.group_ids = urlTopics
    }

    getDiscussion(params)
      .then((res) => {
        if (cancelled) return
        const ids = new Set<number>()
        ;(res?.items || []).forEach((it: any) => {
          ;(it?.tag_ids || []).forEach((id: any) => {
            const n = Number(id)
            if (!Number.isNaN(n)) ids.add(n)
          })
        })
        usedTagCacheRef.set(usedTagTargetKey, ids)
        setUsedTagIdSet(ids)
        setUsedTagReadyKey(usedTagTargetKey)
      })
      .catch((e) => {
        console.error('Failed to fetch used tags:', e)
        if (!cancelled) {
          const empty = new Set<number>()
          usedTagCacheRef.set(usedTagTargetKey, empty)
          setUsedTagIdSet(empty)
          setUsedTagReadyKey(usedTagTargetKey)
        }
      })
      .finally(() => {
        if (!cancelled) setUsedTagLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [forumId, typeForFilter, isDetailPage, usedTagTargetKey, urlTopics, usedTagCacheRef])

  const visibleTags = useMemo(() => {
    // “全部”：展示全量标签
    if (!typeForFilter) return popularTags
    // 切换 type/分类筛选时：若当前 usedTagIdSet 还没 ready（key 不匹配），先不展示，避免闪其他值
    if (!usedTagTargetKey || usedTagReadyKey !== usedTagTargetKey) return []
    if (!usedTagIdSet || usedTagIdSet.size === 0) return []
    return popularTags.filter((t) => usedTagIdSet.has(t.id))
  }, [popularTags, typeForFilter, usedTagIdSet, usedTagReadyKey, usedTagTargetKey])

  // 从 URL 初始化标签选择
  useEffect(() => {
    // 避免在切换 type 的 loading 阶段把已选标签清空，等 ready 后再同步
    if (typeForFilter && usedTagTargetKey && usedTagReadyKey !== usedTagTargetKey) return
    setSelectedTags(urlTags.filter((id) => visibleTags.some((tag) => tag.id === id)))
  }, [urlTags, visibleTags, typeForFilter, usedTagReadyKey, usedTagTargetKey])

  // 将真实的 groups 数据转换为 categoryGroups 格式，始终显示全部分类
  const categoryGroups = useMemo(() => {
    return filteredGroups.origin.map((group) => ({
      id: String(group.id || ''),
      name: group.name || '',
      options: (group.items || []).map((item) => ({
        id: String(item.id || ''),
        name: item.name || '',
        count: 0, // 暂时设为0，后续可以添加统计逻辑
      })),
    }))
  }, [filteredGroups.origin])

  // 清理 URL 中不属于当前 type 的分类/标签（避免“URL 有值但 UI 不展示”）
  useEffect(() => {
    if (isDetailPage) return
    if (!routeName) return
    if (!typeForUrl) return

    const normalize = (arr: number[]) => arr.slice().sort((a, b) => a - b).join(',')

    const allowedTopicIds = urlTopics.filter((id) => filteredGroups.flat.some((g) => g.id === id))
    const nextTopicsKey = normalize(allowedTopicIds)
    const curTopicsKey = normalize(urlTopics)

    // 标签清理：只在 usedTagIdSet ready 时执行，避免切换 type 的 loading 阶段用“旧集合”误删
    const canCleanTags = !!typeForFilter && usedTagTargetKey && usedTagReadyKey === usedTagTargetKey
    const allowedTagIds =
      canCleanTags && usedTagIdSet ? urlTags.filter((id) => usedTagIdSet.has(id)) : urlTags
    const nextTagsKey = normalize(allowedTagIds)
    const curTagsKey = normalize(urlTags)

    if (nextTopicsKey === curTopicsKey && nextTagsKey === curTagsKey) return

    const params = new URLSearchParams(searchParams?.toString())
    params.set('type', typeForUrl)
    if (allowedTopicIds.length > 0) params.set('tps', allowedTopicIds.join(','))
    else params.delete('tps')
    if (allowedTagIds.length > 0) params.set('tags', allowedTagIds.join(','))
    else params.delete('tags')

    const queryString = params.toString()
    router.replace(`/${routeName}${queryString ? `?${queryString}` : ''}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailPage, routeName, typeForUrl, filteredGroups.flat, usedTagIdSet])
  // 获取每个分类组中选中的选项
  const selectedCategories = useMemo(() => {
    const result: Record<string, string[]> = {}
    categoryGroups.forEach((group) => {
      const selected = urlTopics
        .filter((topicId) => {
          // 检查这个 topicId 是否属于这个 group
          return group.options.some((opt) => Number(opt.id) === topicId)
        })
        .map(String)
      if (selected.length > 0) {
        result[group.id] = selected
      }
    })
    return result
  }, [categoryGroups, urlTopics])

  // 更新 URL 参数的函数
  const updateUrlParams = (newTopics: number[], newType?: string | null, newTags?: number[]) => {
    const params = new URLSearchParams(searchParams?.toString())

    // 更新类型参数
    // 约定：type=all 表示“全部”（后端查询时需要映射为不传 type）
    // 如果newType为null或undefined，删除type参数（兼容旧链接）
    if (newType === null || newType === undefined) {
      params.delete('type')
    } else if (newType === 'all') {
      params.set('type', 'all')
    } else {
      params.set('type', newType)
    }

    // 更新分类参数
    if (newTopics.length > 0) {
      params.set('tps', newTopics.join(','))
    } else {
      params.delete('tps')
    }

    // 更新标签参数
    if (newTags !== undefined) {
      if (newTags.length > 0) {
        params.set('tags', newTags.join(','))
      } else {
        params.delete('tags')
      }
    }

    const queryString = params.toString()
    const newPath = `/${routeName}${queryString ? `?${queryString}` : ''}`

    if (isDetailPage) {
      // 详情页：跳转到列表页并更新参数
      router.push(newPath)
    } else {
      // 列表页：更新 URL 参数，触发刷新
      router.replace(newPath)
    }
  }

  // 处理分类多选变化
  const handleCategoryChange = (groupId: string, selectedValues: string[]) => {
    // 获取其他组中已选中的选项
    const otherSelected: number[] = []
    Object.keys(selectedCategories).forEach((key) => {
      if (key !== groupId) {
        selectedCategories[key].forEach((val) => {
          const numVal = Number(val)
          if (!isNaN(numVal)) {
            otherSelected.push(numVal)
          }
        })
      }
    })

    // 添加当前组选中的选项
    const newSelected = selectedValues.map(Number).filter((id) => !isNaN(id))
    const allSelected = [...otherSelected, ...newSelected]

    updateUrlParams(allSelected, typeForUrl, selectedTags)
  }

  // 处理类型点击
  const handlePostTypeClick = (typeId: string) => {
    // “全部”：清空 type 参数
    if (typeId === 'all') {
      updateUrlParams(urlTopics, 'all', selectedTags)
      return
    }
    // 已经选中时不再“切回全部”，保持当前选中（需要全部请点“全部”）
    if (urlType === typeId) return
    updateUrlParams(urlTopics, typeId, selectedTags)
  }

  return (
    <Box
      sx={{
        bgcolor: 'rgba(0,99,151,0.03)',
        borderRadius: '8px',
        border: '1px solid rgba(0,99,151,0.1)',
        pt: 3,
        pb: 3,
        px: 2,
        width: {
          xs: '100%', // 移动端使用全宽
          md: '240px', // 平板和桌面端使用 240px
          lg: '240px', // PC 端使用 240px
        },
        height: {
          xs: 'auto', // 移动端使用自动高度
          md: 'calc(100vh - 110px)', // 平板使用较小的偏移
          lg: 'calc(100vh - 110px)', // 桌面端使用原始值
        },
        // maxHeight: {
        //   xs: 'none',
        //   md: 'calc(100vh - 110px)',
        //   lg: 'calc(100vh - 116px)',
        // },
        overflowY: 'auto',
        scrollbarGutter: 'stable',
        position: {
          xs: 'relative', // 移动端使用相对定位
          md: 'fixed', // 平板和桌面端使用粘性定位
        },
        top: {
          xs: 'auto',
          md: 88,
          lg: 88,
        },
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
        scrollbarWidth: 'thin',
        scrollbarColor: '#e5e7eb transparent',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <List disablePadding>
          {postTypes.map((type) => {
            // 在详情页时不高亮任何类型
            // 在列表页时，只有当urlType存在且等于type.id时才选中
            const isSelected = isDetailPage
              ? false
              : type.id === 'all'
                ? urlType === 'all' || urlType === null
                : urlType !== null && urlType !== 'all' && urlType === type.id
            return (
              <ListItem key={type.id} disablePadding>
                <ListItemButton
                  disableRipple
                  selected={isSelected}
                  onClick={() => handlePostTypeClick(type.id)}
                  sx={{
                    py: 0.75,
                    px: 1.5,
                    border: '1px solid transparent',
                    mb: 0.5,
                    borderRadius: '8px',
                    '&.Mui-selected': {
                      background: 'rgba(0,99,151,0.06)',
                      color: 'primary.main',
                      borderColor: 'rgba(0,99,151,0.1)',
                    },
                    '&:hover': { bgcolor: '#f3f4f6', color: '#000000' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 28, color: isSelected ? '#111827' : '#6b7280' }}>
                    {type.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        sx={{
                          fontSize: '0.8125rem',
                          fontWeight: isSelected ? 600 : 500,
                        }}
                      >
                        {type.name}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ mb: 2 }}>
        {categoryGroups.map((group) => {
          const selectedValues = selectedCategories[group.id] || []
          return (
            <FormControl key={group.id} fullWidth sx={{ mb: 1.5 }}>
              <InputLabel
                // variant='standard'
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
              <Select
                multiple
                value={selectedValues}
                onChange={(e) => {
                  const value = e.target.value
                  handleCategoryChange(group.id, typeof value === 'string' ? value.split(',') : value)
                }}
                onClose={() => {
                  // 关闭菜单时移除焦点，移除边框高亮
                  setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement
                    if (activeElement && activeElement.blur) {
                      activeElement.blur()
                    }
                  }, 0)
                }}
                input={<OutlinedInput label={group.name} />}
                renderValue={(selected) => {
                  const selectedIds = selected as string[]
                  const selectedCount = selectedIds.length
                  if (selectedCount === 0) {
                    return <Typography sx={{ color: 'rgba(0,0,0,0.3)', fontSize: '0.8125rem' }}>全部</Typography>
                  }
                  const firstId = selectedIds[0]
                  const firstOption = group.options.find((option) => option.id === firstId)
                  const firstLabel = firstOption?.name ?? ''

                  if (selectedCount === 1) {
                    return <Chip size='small' label={firstLabel} sx={{ maxWidth: '100%', fontSize: '0.75rem' }} />
                  }

                  return (
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip size='small' label={firstLabel} sx={{ fontSize: '0.75rem' }} />
                      <Chip size='small' label={`+${selectedCount - 1}`} sx={{ fontSize: '0.75rem' }} />
                    </Box>
                  )
                }}
                sx={{
                  bgcolor: 'common.white',
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'common.white',
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e5e7eb',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#d1d5db',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0,99,151,0.5)',
                    borderWidth: '1px',
                  },
                  '& .MuiSelect-select': {
                    pr: '32px !important',
                    py: 1.7,
                    minHeight: 'unset!important',
                  },
                  '& .MuiSelect-icon': {
                    color: '#6b7280',
                    right: 8,
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      mt: 0.5,
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                      border: '1px solid #e5e7eb',
                      '& .MuiMenuItem-root': {
                        fontSize: '0.8125rem',
                        py: 1,
                        px: 1.5,
                        transition: 'all 0.15s ease-in-out',
                        '&:hover': {
                          bgcolor: '#f3f4f6',
                        },
                        '&.Mui-selected': {
                          bgcolor: '#eff6ff',
                          color: 'primary.main',
                          fontWeight: 600,
                          '&:hover': {
                            bgcolor: '#dbeafe',
                          },
                        },
                      },
                    },
                  },
                }}
              >
                {group.options.map((option) => {
                  const isSelected = selectedValues.includes(option.id)
                  return (
                    <MenuItem key={option.id} value={option.id}>
                      <Checkbox checked={isSelected} sx={{ p: 0, mr: 1.5 }} />
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                      >
                        <span>{option.name}</span>
                      </Box>
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
          )
        })}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {visibleTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.id)
            return (
              <TagFilterChip
                key={tag.id}
                id={tag.id}
                name={tag.name}
                selected={isSelected}
                onClick={() => {
                  const newSelectedTags = isSelected ? selectedTags.filter((t) => t !== tag.id) : [...selectedTags, tag.id]
                  setSelectedTags(newSelectedTags)
                  updateUrlParams(urlTopics, typeForUrl, newSelectedTags)
                }}
              />
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}
