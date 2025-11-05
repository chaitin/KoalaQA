'use client'

import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { Article as ArticleIcon, QuestionAnswer as QuestionAnswerIcon } from '@mui/icons-material'
import {
  Box,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Typography,
} from '@mui/material'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
import { useContext, useMemo, useState } from 'react'
import { CommonContext } from './commonProvider'

const postTypes = [
  { id: 'qa', name: '问答', icon: <QuestionAnswerIcon /> },
  { id: 'blog', name: '文章', icon: <ArticleIcon /> },
]

const popularTags = [
  { id: 1, name: '配置', count: 145 },
  { id: 2, name: 'API', count: 132 },
  { id: 3, name: '性能优化', count: 98 },
  { id: 4, name: 'UI/UX', count: 87 },
  { id: 5, name: '多语言', count: 76 },
  { id: 6, name: '数据导出', count: 65 },
  { id: 7, name: '安全', count: 58 },
  { id: 8, name: '集成', count: 52 },
  { id: 9, name: '文档', count: 47 },
  { id: 10, name: '部署', count: 43 },
]

export default function FilterPanel() {
  const { groups } = useContext(CommonContext)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams()
  const router = useRouterWithRouteName()
  const routeName = params?.route_name as string

  // 判断是否在详情页（路径包含 /[id]，但不是 /edit）
  const isDetailPage = useMemo(() => {
    if (!pathname || !routeName) return false
    // 详情页路径格式: /[route_name]/[id]，排除编辑页 /[route_name]/edit
    const detailPattern = new RegExp(`^/${routeName}/[^/]+$`)
    return detailPattern.test(pathname) && !pathname.endsWith('/edit')
  }, [pathname, routeName])

  // 从 URL 参数读取选中的分类和类型
  // 在详情页时，不使用 URL 参数，也不高亮类型；默认问答
  const urlType = useMemo(() => {
    const urlTypeParam = searchParams?.get('type')
    if (urlTypeParam) {
      return urlTypeParam
    }
    // 默认问答
    return 'qa'
  }, [searchParams])
  const urlTopics = useMemo(() => {
    const tps = searchParams?.get('tps')
    if (!tps) return []
    return tps
      .split(',')
      .map(Number)
      .filter((id) => !isNaN(id))
  }, [searchParams])

  // 将真实的 groups 数据转换为 categoryGroups 格式
  const categoryGroups = useMemo(() => {
    return groups.origin.map((group) => ({
      id: String(group.id || ''),
      name: group.name || '',
      options: (group.items || []).map((item) => ({
        id: String(item.id || ''),
        name: item.name || '',
        count: 0, // 暂时设为0，后续可以添加统计逻辑
      })),
    }))
  }, [groups.origin])

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
  const updateUrlParams = (newTopics: number[], newType?: string) => {
    const params = new URLSearchParams(searchParams?.toString())

    // 更新类型参数
    const typeToSet = newType || urlType
    if (typeToSet === 'qa') {
      params.delete('type') // 默认是 qa，删除参数
    } else {
      params.set('type', typeToSet)
    }

    // 更新分类参数
    if (newTopics.length > 0) {
      params.set('tps', newTopics.join(','))
    } else {
      params.delete('tps')
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

    updateUrlParams(allSelected)
  }

  // 处理类型点击
  const handlePostTypeClick = (typeId: string) => {
    const newType = urlType === typeId ? 'qa' : typeId // 如果点击已选中的类型，则取消选择（回到默认的 qa）
    updateUrlParams(urlTopics, newType)
  }

  const [selectedTags, setSelectedTags] = useState<number[]>([])

  return (
    <Box
      sx={{
        bgcolor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        pt: 3,
        pb: 3,
        px: 2,
        height: 'calc(100vh - 136px)',
        borderRadius: '6px',
        overflowY: 'auto',
        scrollbarGutter: 'stable',
        position: 'sticky',
        top: 100,
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
            const isSelected = isDetailPage ? false : urlType === type.id
            return (
              <ListItem key={type.id} disablePadding>
                <ListItemButton
                  disableRipple
                  selected={isSelected}
                  onClick={() => handlePostTypeClick(type.id)}
                  sx={{
                    py: 0.75,
                    px: 1.5,
                    borderRadius: '4px',
                    mb: 0.5,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&.Mui-selected': {
                      bgcolor: '#f9fafb',
                      color: '#111827',
                      borderLeft: '3px solid #000000',
                      '& .MuiListItemIcon-root': { color: '#111827' },
                      '&:hover': { bgcolor: '#f3f4f6' },
                      '&:focus': {
                        bgcolor: '#f9fafb',
                        color: '#111827',
                      },
                      '&.Mui-focusVisible': {
                        bgcolor: '#f9fafb',
                        color: '#111827',
                        outline: '2px solid #000000',
                        outlineOffset: '2px',
                      },
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
              <Typography
                variant='body2'
                sx={{
                  fontWeight: 600,
                  color: '#111827',
                  fontSize: '0.875rem',
                  mb: 0.75,
                  px: 0.5,
                }}
              >
                {group.name}
              </Typography>
              <Select
                multiple
                value={selectedValues}
                onChange={(e) => {
                  const value = e.target.value
                  handleCategoryChange(group.id, typeof value === 'string' ? value.split(',') : value)
                }}
                displayEmpty
                disableUnderline
                variant='standard'
                renderValue={(selected) => {
                  if ((selected as string[]).length === 0) {
                    return <Typography sx={{ color: '#9ca3af', fontSize: '0.8125rem' }}>全部</Typography>
                  }
                  const selectedNames = (selected as string[])
                    .map((id) => {
                      const option = group.options.find((opt) => opt.id === id)
                      return option?.name || ''
                    })
                    .filter(Boolean)
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selectedNames.map((name, idx) => (
                        <Chip
                          key={idx}
                          label={name}
                          size='small'
                          sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: '#000000',
                            color: '#ffffff',
                            '& .MuiChip-label': {
                              px: 1,
                            },
                          }}
                        />
                      ))}
                    </Box>
                  )
                }}
                sx={{
                  bgcolor: '#f9fafb',
                  borderRadius: '6px',
                  px: 1.5,
                  py: 0.75,
                  fontSize: '0.8125rem',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.15s ease-in-out',
                  minHeight: '40px',
                  '&:hover': {
                    bgcolor: '#f3f4f6',
                    borderColor: '#d1d5db',
                  },
                  '&.Mui-focused': {
                    bgcolor: '#ffffff',
                    borderColor: '#3b82f6',
                  },
                  '& .MuiSelect-select': {
                    py: 0,
                    pr: '32px !important',
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
                          color: '#3b82f6',
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

      {/* <Divider sx={{ mb: 2 }} />

      <Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {popularTags.map((tag) => (
            <Chip
              key={tag.id}
              label={`${tag.name} (${tag.count})`}
              size="small"
              onClick={() => {
                setSelectedTags((prev) =>
                  prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id],
                )
              }}
              sx={{
                bgcolor: selectedTags.includes(tag.id) ? "#000000" : "#f9fafb",
                color: selectedTags.includes(tag.id) ? "#ffffff" : "#6b7280",
                fontSize: "0.75rem",
                fontWeight: 600,
                height: 26,
                borderRadius: "3px",
                border: selectedTags.includes(tag.id) ? "none" : "1px solid #e5e7eb",
                transition: "all 0.15s ease-in-out",
                "&:hover": {
                  bgcolor: selectedTags.includes(tag.id) ? "#111827" : "#f3f4f6",
                  color: selectedTags.includes(tag.id) ? "#ffffff" : "#000000",
                  borderColor: selectedTags.includes(tag.id) ? "transparent" : "#d1d5db",
                  transform: "translateY(-1px)",
                },
                "&:active": { transform: "scale(0.95)" },
              }}
            />
          ))}
        </Box>
      </Box> */}
    </Box>
  )
}
