'use client'

import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import {
  alpha,
  Box,
  Checkbox,
  Chip,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Typography,
} from '@mui/material'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import TagFilterChip from './TagFilterChip'
import { useEffect, useMemo, useState } from 'react'
import { getDiscussion } from '@/api'

// 类型按钮组件
export function TypeButton({
  typeId,
  isSelected,
  icon,
  name,
  routeName,
  pathname,
  urlType,
  urlTopics,
  urlTags,
  typeForUrl,
}: {
  typeId: string
  isSelected: boolean
  icon: React.ReactNode
  name: string
  routeName: string
  pathname: string
  urlType: string | null
  urlTopics: number[]
  urlTags: number[]
  typeForUrl: string | null
}) {
  const router = useRouterWithRouteName()
  const searchParams = useSearchParams()

  const handleClick = () => {
    const params = new URLSearchParams(searchParams?.toString())
    if (typeId === 'all') {
      params.delete('type')
    } else {
      params.set('type', typeId)
    }

    if (urlTopics.length > 0) {
      params.set('tps', urlTopics.join(','))
    } else {
      params.delete('tps')
    }

    if (urlTags.length > 0) {
      params.set('tags', urlTags.join(','))
    } else {
      params.delete('tags')
    }

    const queryString = params.toString()
    const newPath = `/${routeName}${queryString ? `?${queryString}` : ''}`

    const isDetailPage = pathname && new RegExp(`^/${routeName}/[^/]+$`).test(pathname) && !pathname.endsWith('/edit')
    if (isDetailPage) {
      router.push(newPath)
    } else {
      router.replace(newPath)
    }
  }

  return (
    <ListItemButton
      disableRipple
      selected={isSelected}
      onClick={handleClick}
      sx={(theme) => ({
        py: 0.75,
        px: 1.5,
        border: '1px solid transparent',
        mb: 0.5,
        borderRadius: '8px',
        '&.Mui-selected': {
          background: theme.palette.primaryAlpha?.[6] || 'rgba(0,99,151,0.06)',
          color: 'primary.main',
          borderColor: theme.palette.primaryAlpha?.[10] || 'rgba(0,99,151,0.1)',
        },
        '&:hover': { bgcolor: '#f3f4f6' },
      })}
    >
      <ListItemIcon sx={{ minWidth: 28, color: (theme) => (isSelected ? 'primary.main' : alpha('#21222D', 0.5)) }}>
        {icon}
      </ListItemIcon>
      <ListItemText
        primary={
          <Typography
            sx={{
              fontSize: '0.8125rem',
              fontWeight: isSelected ? 600 : 500,
              color: isSelected ? 'primary.main' : '#21222D',
            }}
          >
            {name}
          </Typography>
        }
      />
    </ListItemButton>
  )
}

// 分类选择组件
export function CategorySelect({
  group,
  selectedValues,
  selectedCategories,
  typeForUrl,
  urlTags,
}: {
  group: { id: string; name: string; options: Array<{ id: string; name: string; count: number }> }
  selectedValues: string[]
  selectedCategories: Record<string, string[]>
  typeForUrl: string | null
  urlTags: number[]
}) {
  const router = useRouterWithRouteName()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const params = useParams()
  const routeName = params?.route_name as string

  const handleChange = (newSelectedValues: string[]) => {
    const otherSelected: number[] = []
    Object.keys(selectedCategories).forEach((key) => {
      if (key !== group.id) {
        selectedCategories[key].forEach((val) => {
          const numVal = Number(val)
          if (!Number.isNaN(numVal)) {
            otherSelected.push(numVal)
          }
        })
      }
    })

    const newSelected = newSelectedValues.map(Number).filter((id) => !Number.isNaN(id))
    const allSelected = [...otherSelected, ...newSelected]

    const urlParams = new URLSearchParams(searchParams?.toString())
    if (typeForUrl) {
      urlParams.set('type', typeForUrl)
    } else {
      urlParams.delete('type')
    }

    if (allSelected.length > 0) {
      urlParams.set('tps', allSelected.join(','))
    } else {
      urlParams.delete('tps')
    }

    if (urlTags.length > 0) {
      urlParams.set('tags', urlTags.join(','))
    } else {
      urlParams.delete('tags')
    }

    const queryString = urlParams.toString()
    const newPath = `/${routeName}${queryString ? `?${queryString}` : ''}`

    const isDetailPage = pathname && new RegExp(`^/${routeName}/[^/]+$`).test(pathname) && !pathname.endsWith('/edit')
    if (isDetailPage) {
      router.push(newPath)
    } else {
      router.replace(newPath)
    }
  }

  return (
    <Select
      multiple
      value={selectedValues}
      onChange={(e) => {
        const value = e.target.value
        handleChange(typeof value === 'string' ? value.split(',') : value)
      }}
      onClose={() => {
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
          return (
            <Chip size='small' label={firstLabel} sx={{ maxWidth: '100%', fontSize: '0.75rem', borderRadius: 1 }} />
          )
        }

        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip size='small' label={firstLabel} sx={{ fontSize: '0.75rem', borderRadius: 1 }} />
            <Chip size='small' label={`+${selectedCount - 1}`} sx={{ fontSize: '0.75rem', borderRadius: 1 }} />
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
          borderColor: (theme) => theme.palette.primaryAlpha?.[50] || 'rgba(0,99,151,0.5)',
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
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span>{option.name}</span>
            </Box>
          </MenuItem>
        )
      })}
    </Select>
  )
}

// 标签组件
export function Tags({
  popularTags,
  urlTags,
  typeForFilter,
  urlTopics,
  typeForUrl,
  forumId,
  isDetailPage,
}: {
  popularTags: Array<{ id: number; name?: string }>
  urlTags: number[]
  typeForFilter: string | null
  urlTopics: number[]
  typeForUrl: string | null
  forumId: number | null
  isDetailPage: boolean
}) {
  const router = useRouterWithRouteName()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const params = useParams()
  const routeName = params?.route_name as string
  const [selectedTags, setSelectedTags] = useState<number[]>(urlTags)
  const [usedTagIdSet, setUsedTagIdSet] = useState<Set<number> | null>(null)
  const [usedTagReadyKey, setUsedTagReadyKey] = useState<string | null>(null)
  const usedTagCacheRef = useState(() => new Map<string, Set<number>>())[0]

  const usedTagTargetKey = useMemo(() => {
    if (isDetailPage) return null
    if (!forumId) return null
    if (!typeForFilter) return null
    const topicKey = (urlTopics || [])
      .slice()
      .sort((a, b) => a - b)
      .join(',')
    return `forum:${forumId}|type:${typeForFilter}|topics:${topicKey}`
  }, [forumId, isDetailPage, typeForFilter, urlTopics])

  useEffect(() => {
    if (isDetailPage) return
    if (!forumId) return
    if (!typeForFilter) {
      setUsedTagIdSet(null)
      setUsedTagReadyKey(null)
      return
    }
    if (!usedTagTargetKey) return

    let cancelled = false

    const cached = usedTagCacheRef.get(usedTagTargetKey)
    if (cached) {
      setUsedTagIdSet(cached)
      setUsedTagReadyKey(usedTagTargetKey)
      return
    }

    const params: any = {
      forum_id: forumId,
      page: 1,
      size: 200,
      filter: 'publish',
      type: typeForFilter,
    }

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

    return () => {
      cancelled = true
    }
  }, [forumId, typeForFilter, isDetailPage, usedTagTargetKey, urlTopics, usedTagCacheRef])

  const visibleTags = useMemo(() => {
    if (!typeForFilter) return popularTags
    if (!usedTagTargetKey || usedTagReadyKey !== usedTagTargetKey) return []
    if (!usedTagIdSet || usedTagIdSet.size === 0) return []
    return popularTags.filter((t) => usedTagIdSet.has(t.id))
  }, [popularTags, typeForFilter, usedTagIdSet, usedTagReadyKey, usedTagTargetKey])

  useEffect(() => {
    if (typeForFilter && usedTagTargetKey && usedTagReadyKey !== usedTagTargetKey) return
    setSelectedTags(urlTags.filter((id) => visibleTags.some((tag) => tag.id === id)))
  }, [urlTags, visibleTags, typeForFilter, usedTagReadyKey, usedTagTargetKey])

  const handleTagClick = (tagId: number) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter((t) => t !== tagId)
      : [...selectedTags, tagId]
    setSelectedTags(newSelectedTags)

    const urlParams = new URLSearchParams(searchParams?.toString())
    if (typeForUrl) {
      urlParams.set('type', typeForUrl)
    } else {
      urlParams.delete('type')
    }

    const tps = searchParams?.get('tps')
    if (tps) {
      urlParams.set('tps', tps)
    } else {
      urlParams.delete('tps')
    }

    if (newSelectedTags.length > 0) {
      urlParams.set('tags', newSelectedTags.join(','))
    } else {
      urlParams.delete('tags')
    }

    const queryString = urlParams.toString()
    const newPath = `/${routeName}${queryString ? `?${queryString}` : ''}`

    const isDetail = pathname && new RegExp(`^/${routeName}/[^/]+$`).test(pathname) && !pathname.endsWith('/edit')
    if (isDetail) {
      router.push(newPath)
    } else {
      router.replace(newPath)
    }
  }

  return (
    <>
      {visibleTags.map((tag) => {
        const isSelected = selectedTags.includes(tag.id)
        return (
          <TagFilterChip
            key={tag.id}
            id={tag.id}
            name={tag.name}
            selected={isSelected}
            onClick={() => handleTagClick(tag.id)}
          />
        )
      })}
    </>
  )
}

// 导出命名空间
export const FilterPanelActions = {
  TypeButton,
  CategorySelect,
  Tags,
}
