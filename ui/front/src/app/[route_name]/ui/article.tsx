'use client'
import {
  GetDiscussionParams,
  ModelDiscussionListItem,
  ModelDiscussionType,
  ModelForumInfo,
  ModelListRes,
  ModelUserRole,
  SvcRankContributeItem,
} from '@/api/types'
import AnnouncementCard from '@/components/AnnouncementCard'
import AnnouncementCarousel from '@/components/AnnouncementCarousel'
import { AuthContext } from '@/components/authProvider'
import BrandAttribution from '@/components/BrandAttribution'
import ContributorsRank from '@/components/ContributorsRank'
import SearchResultModal from '@/components/SearchResultModal'
import { getSortedGroupsInDiscussionList } from '@/constant'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { useListPageCache } from '@/hooks/useListPageCache'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { isAdminRole } from '@/lib/utils'
import FilterListIcon from '@mui/icons-material/FilterList'
import SearchIcon from '@mui/icons-material/Search'
import TuneIcon from '@mui/icons-material/Tune'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useBoolean, useInViewport } from 'ahooks'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CommonContext } from '@/components/commonProvider'
import Image from 'next/image'
import { Icon } from '@ctzhian/ui'
import DiscussCard from './discussCard'
export type Status = 'hot' | 'new' | 'publish'

const Article = ({
  data,
  tps,
  type,
  tags,
  forumInfo,
  announcements,
  contributors,
}: {
  data: ModelListRes & {
    items?: ModelDiscussionListItem[]
  }
  tps: string
  type?: ModelDiscussionType
  tags?: string
  forumInfo?: ModelForumInfo | null
  announcements: ModelDiscussionListItem[]
  contributors: {
    lastWeek: SvcRankContributeItem[]
    total: SvcRankContributeItem[]
  }
}) => {
  const searchParams = useSearchParams()
  const params = useParams()
  const routeName = params?.route_name as string
  const router = useRouterWithRouteName()
  const nextRouter = useRouter()
  const { checkAuth } = useAuthCheck()
  const { user } = useContext(AuthContext)
  const { groups, tags: availableTags } = useContext(CommonContext)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'))
  const { saveState, restoreState, restoreScrollPosition, clearCache } = useListPageCache()
  const cached = restoreState()
  const topics = useMemo(() => {
    return tps ? tps.split(',').map(Number) : []
  }, [tps])
  const tagIds = useMemo(() => {
    return tags ? tags.split(',').map(Number) : []
  }, [tags])
  // 根据设备类型动态设置搜索placeholder
  const searchPlaceholder = isMobile ? '使用 AI 搜索' : '输入任意内容，使用 AI 搜索'

  // 根据当前类型从 forumInfo.groups 中筛选对应的分类
  // 当type为undefined时，不传type参数，显示所有类型的分类
  const currentType = type ? (type as ModelDiscussionType) : undefined

  const status = searchParams?.get('sort') || 'publish'

  const [search, setSearch] = useState(searchParams?.get('search') || '')
  const [articleData, setArticleData] = useState(cached?.data || data)
  const [page, setPage] = useState(cached?.page || 1)
  const [loadingMore, setLoadingMore] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null)
  const [isLoadMoreInView] = useInViewport(loadMoreTriggerRef, {
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
  })
  // 下拉筛选相关状态
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null)
  const filterMenuOpen = Boolean(filterAnchorEl)
  const [filterDialogOpen, setFilterDialogOpen] = useState(false)
  const onlyMine = searchParams?.get('only_mine') === 'true'
  const resolved = searchParams?.get('resolved')

  // 临时筛选状态（用于弹窗中的选择，点击应用后才真正应用）
  const [tempOnlyMine, setTempOnlyMine] = useState(onlyMine)
  const [tempResolved, setTempResolved] = useState(resolved === '1')
  const [tempTopics, setTempTopics] = useState<number[]>(topics)
  const [tempTagIds, setTempTagIds] = useState<number[]>(tagIds)

  // 当弹窗打开时，初始化临时状态
  useEffect(() => {
    if (filterDialogOpen) {
      setTempOnlyMine(onlyMine)
      setTempResolved(resolved === '1')
      setTempTopics(topics)
      setTempTagIds(tagIds)
    }
  }, [filterDialogOpen, onlyMine, resolved, topics, tagIds])

  // 排序下拉菜单相关状态
  const [sortAnchorEl, setSortAnchorEl] = useState<null | HTMLElement>(null)
  const sortMenuOpen = Boolean(sortAnchorEl)

  // 发布类型下拉菜单相关状态
  const [publishAnchorEl, setPublishAnchorEl] = useState<null | HTMLElement>(null)
  const publishMenuOpen = Boolean(publishAnchorEl)

  // 帖子类型相关状态
  const urlType = searchParams?.get('type')
  const currentPostType = urlType || 'all'

  // 搜索弹窗相关状态
  const [searchModalOpen, { setTrue: openSearchModal, setFalse: closeSearchModal }] = useBoolean(false)
  const [lastPathname, setLastPathname] = useState('')
  const restoreStateProcessedRef = useRef<string>('')
  const isFirstMountRef = useRef(true)

  const fetchMoreList = useCallback(() => {
    // 防止重复请求
    if (page * 10 >= (articleData.total || 0) || loadingMore || !forumInfo?.id) {
      return
    }

    setLoadingMore(true)
    const new_page = page + 1
    const params: GetDiscussionParams & { forum_id?: number } = {
      page: new_page,
      size: 10,
      // 只有当type存在时才传递type参数，否则不传，让后端返回所有类型
      ...(type ? { type: type as any } : {}),
      forum_id: forumInfo?.id,
    }

    // 设置 filter
    params.filter = status as 'hot' | 'new' | 'publish'

    // 如果有搜索关键词，添加到参数中
    if (search && search.trim()) {
      params.keyword = search.trim()
    }

    // 如果有选中的主题，添加到参数中
    if (topics && topics.length > 0) {
      params.group_ids = topics
    }

    // 如果有选中的标签，添加到参数中
    if (tagIds && tagIds.length > 0) {
      params.tag_ids = tagIds
    }

    // 添加筛选参数
    if (onlyMine) {
      params.only_mine = true
    }
    if (resolved !== null && resolved !== undefined) {
      const resolvedNum = /^(0|1|2)$/.test(resolved) ? parseInt(resolved, 10) : null
      if (resolvedNum !== null) {
        params.resolved = resolvedNum as 0 | 1 | 2
      }
    }

    getSortedGroupsInDiscussionList(params)
      .then((res) => {
        if (res) {
          setArticleData((pre) => ({
            total: res.total,
            items: [...(pre.items || []), ...(res.items || [])],
          }))
          setPage(new_page)
        }
      })
      .catch((error) => {
        console.error('Failed to fetch more discussions:', error)
      })
      .finally(() => {
        // 延迟设置 loadingMore 为 false，等待 DOM 更新完成
        // 这样可以避免在 DOM 更新前 isLoadMoreInView 仍然是 true 导致的连续加载
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setLoadingMore(false)
          })
        })
      })
  }, [articleData.total, page, status, search, topics, tagIds, type, loadingMore, onlyMine, resolved, forumInfo?.id])

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set(name, value)
    return params.toString()
  }
  const onNavigate = useCallback(() => {
    const currentSearchParams = window.location.search
    saveState(articleData, currentSearchParams, page)
  }, [articleData.items?.length, page, saveState, cached])

  const handleSearch = useCallback(() => {
    const trimmedSearch = search && search.trim() ? search.trim() : ''

    if (trimmedSearch) {
      // 打开搜索弹窗，SearchResultModal 会自动执行搜索
      openSearchModal()
    }
  }, [search, openSearchModal])

  const onInputSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent).isComposing) {
      handleSearch()
    }
  }

  useEffect(() => {
    // // 首次挂载时不请求，使用初始数据
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false
      return
    }
    if (!isLoadMoreInView || loadingMore) {
      return
    }
    fetchMoreList()
  }, [isLoadMoreInView, loadingMore, fetchMoreList])

  // 在加载时保持右侧边栏的位置，避免跳回顶部
  const sidebarPositionRef = useRef<number | null>(null)

  useEffect(() => {
    if (!sidebarRef.current) {
      return
    }

    const sidebar = sidebarRef.current

    if (loadingMore) {
      // 加载开始时，保存当前右侧边栏相对于视口的位置
      const rect = sidebar.getBoundingClientRect()
      sidebarPositionRef.current = rect.top
    } else if (sidebarPositionRef.current !== null) {
      // 加载完成时，恢复位置
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const currentRect = sidebar.getBoundingClientRect()
          const savedTop = sidebarPositionRef.current

          // 如果位置发生了变化（跳到了顶部），恢复到之前的位置
          if (savedTop !== null && currentRect.top < savedTop - 10) {
            // 计算需要滚动的距离
            const scrollOffset = savedTop - currentRect.top
            const mainContent = document.getElementById('main-content')
            if (mainContent) {
              mainContent.scrollTop += scrollOffset
            }
          }

          sidebarPositionRef.current = null
        })
      })
    }
  }, [loadingMore])

  // 监听路由变化，检测是否从详情页返回
  useEffect(() => {
    const currentPath = window.location.pathname
    const currentSearchParams = window.location.search
    const cacheKey = `${currentPath}${currentSearchParams}`

    // 如果路径变化了，重置处理标记（允许从详情页返回时恢复状态）
    if (lastPathname && lastPathname !== currentPath) {
      restoreStateProcessedRef.current = ''
    }

    // 避免重复处理相同的路径和参数组合
    if (restoreStateProcessedRef.current === cacheKey) {
      // 更新记录的路径
      if (lastPathname !== currentPath) {
        setLastPathname(currentPath)
      }
      return
    }

    // 检查是否有缓存，如果有缓存且参数匹配，则恢复缓存数据
    if (cached && cached.searchParams === currentSearchParams) {
      restoreScrollPosition(cached.scrollPosition)
    } else {
      // 筛选条件改变时，重置分页状态和数据
      setArticleData(data)
      setPage(1) // 重置页码为 1
      const mainContent = document.getElementById('main-content')
      if (mainContent) mainContent.scrollTop = 0
    }
    clearCache()
    restoreStateProcessedRef.current = cacheKey
    // 更新记录的路径
    if (lastPathname !== currentPath) {
      setLastPathname(currentPath)
    }
  }, [data])

  const handlePublish = (type: ModelDiscussionType, query?: string) => {
    console.log('handlePublish', type, query)
    checkAuth(() => {
      const routeName = (params?.route_name as string) || ''
      const titleParam = query ? `title=${encodeURIComponent(query)}` : ''
      nextRouter.push(`/${routeName}/edit?${titleParam}&type=${type}`)
    })
  }

  // 处理发布类型菜单打开
  const handlePublishMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (type && (type !== 'issue' || isAdminRole(user?.role || ModelUserRole.UserRoleUnknown))) {
      handlePublishTypeSelect(type as ModelDiscussionType)
    } else {
      setPublishAnchorEl(event.currentTarget)
    }
  }

  // 处理发布类型菜单关闭
  const handlePublishMenuClose = () => {
    setPublishAnchorEl(null)
  }

  // 处理选择发布类型
  const handlePublishTypeSelect = (publishType: ModelDiscussionType) => {
    handlePublishMenuClose()
    handlePublish(publishType)
  }
  // 根据类型获取排序选项
  const getSortOptions = (postType?: string) => {
    if (isMobile)
      return [
        { value: 'publish', label: '最新' },
        { value: 'new', label: '活跃' },
        { value: 'hot', label: '热门' },
      ]
    if (postType === 'blog') {
      return [
        { value: 'publish', label: '最新发布' },
        { value: 'new', label: '最近活跃' },
        { value: 'hot', label: '热门内容' },
      ]
    }
    // Default for qa/feedback or all types
    return [
      { value: 'publish', label: '最新发布' },
      { value: 'new', label: '最近活跃' },
      { value: 'hot', label: '热门内容' },
    ]
  }

  const currentSortOptions = getSortOptions(currentType)

  // 处理下拉筛选菜单
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if (isMobile) {
      setFilterDialogOpen(true)
    } else {
      setFilterAnchorEl(event.currentTarget)
    }
  }

  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null)
  }

  const handleFilterDialogClose = () => {
    setFilterDialogOpen(false)
  }

  // 应用筛选（移动端弹窗）
  const handleApplyFilter = () => {
    const params = new URLSearchParams(searchParams?.toString())

    // 应用"我参与的"
    if (tempOnlyMine) {
      params.set('only_mine', 'true')
    } else {
      params.delete('only_mine')
    }

    // 应用"未解决的"
    if (tempResolved) {
      params.set('resolved', '1')
    } else {
      params.delete('resolved')
    }

    // 应用分类
    if (tempTopics.length > 0) {
      params.set('tps', tempTopics.join(','))
    } else {
      params.delete('tps')
    }

    // 应用标签
    if (tempTagIds.length > 0) {
      params.set('tags', tempTagIds.join(','))
    } else {
      params.delete('tags')
    }

    router.replace(`/${routeName}?${params.toString()}`)
    setFilterDialogOpen(false)
  }

  // 清除筛选（移动端弹窗）
  const handleClearFilter = () => {
    setTempOnlyMine(false)
    setTempResolved(false)
    setTempTopics([])
    setTempTagIds([])
  }

  // 监听openReleaseModal事件
  useEffect(() => {
    const handleOpenReleaseModal = (event: CustomEvent<{ type?: ModelDiscussionType }>) => {
      handlePublishMenuOpen(event as any)
    }
    window.addEventListener('openReleaseModal', handleOpenReleaseModal as EventListener)
    return () => {
      window.removeEventListener('openReleaseModal', handleOpenReleaseModal as EventListener)
    }
  }, [])

  // 处理帖子类型切换
  const handlePostTypeChange = (newType: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    if (newType === 'all') {
      params.delete('type')
    } else {
      params.set('type', newType)
    }
    router.replace(`/${routeName}?${params.toString()}`)
  }

  // 处理排序菜单
  const handleSortMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSortAnchorEl(event.currentTarget)
  }

  const handleSortMenuClose = () => {
    setSortAnchorEl(null)
  }

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set('sort', newSort)
    router.replace(`/${routeName}?${params.toString()}`)
    handleSortMenuClose()
  }

  const handleFilterChange = (filterType: 'only_mine' | 'resolved', value: boolean | number | null) => {
    const params = new URLSearchParams(searchParams?.toString())

    if (filterType === 'only_mine') {
      if (value) {
        params.set('only_mine', 'true')
      } else {
        params.delete('only_mine')
      }
    } else if (filterType === 'resolved') {
      if (typeof value === 'number' && value >= 0 && value <= 2) {
        params.set('resolved', value.toString())
      } else {
        params.delete('resolved')
      }
    }

    router.replace(`/${routeName}?${params.toString()}`)
    handleFilterMenuClose()
  }

  // 帖子类型配置
  const postTypes = [
    { id: 'all', name: '全部', icon: <Icon type='icon-quanbu' sx={{ fontSize: 20, color: 'primary.main' }} /> },
    { id: 'qa', name: '问题', icon: <Image width={20} height={20} src='/qa.svg' alt='问题' /> },
    { id: 'issue', name: 'Issue', icon: <Icon type='icon-issue' sx={{ fontSize: 20 }} /> },
    { id: 'blog', name: '文章', icon: <Image width={20} height={20} src='/blog.svg' alt='文章' /> },
  ]

  // 获取当前类型对应的分类
  const filteredGroups = useMemo(() => {
    if (!forumInfo) return groups
    const typeForFilter = currentPostType === 'all' ? null : currentPostType
    if (!typeForFilter) return groups

    let forumGroupIds: number[] = []
    if (forumInfo.groups) {
      const groupsArray = Array.isArray(forumInfo.groups) ? forumInfo.groups : Object.values(forumInfo.groups)
      const matchedGroup = groupsArray.find((g: any) => g?.type === typeForFilter)
      forumGroupIds = matchedGroup?.group_ids || []
    }

    if (forumGroupIds.length === 0) return groups

    const filteredOrigin = groups.origin.filter((group) => {
      return forumGroupIds.includes(group.id || -1)
    })

    const filteredFlat = filteredOrigin.reduce((acc, group) => {
      if (group.items && group.items.length > 0) {
        acc.push(...group.items)
      }
      return acc
    }, [] as any[])

    return {
      origin: filteredOrigin,
      flat: filteredFlat,
    }
  }, [groups, forumInfo, currentPostType])

  return (
    <>
      {/* 中间和右侧内容容器 - 在lg及以上时居中 */}
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          mx: 'auto',
          pb: { xs: 2, lg: 3 },
        }}
      >
        {/* 主内容区域 */}
        <Box
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            width: { xs: '100%', lg: '780px' },
            p: 2,
            border: {
              xs: 'none',
              lg: `1px solid ${theme.palette.mode === 'light' ? '#EAECF0' : '#393939'}`,
            },
            borderRadius: 1,
            bgcolor: 'background.paper',
          })}
        >
          {/* 搜索和发帖按钮 - 移动端隐藏，桌面端显示 */}
          <Box
            id='article-search-box'
            sx={{
              display: { xs: 'none', lg: 'flex' },
              gap: 3,
              mb: { xs: 2, lg: 3 },
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onInputSearch}
              size='small'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon sx={{ color: '#000000', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  height: '40px',
                },
                '& fieldset': {
                  borderColor: 'text.primary',
                },
              }}
            />
            <Button
              variant='contained'
              onClick={handlePublishMenuOpen}
              // endIcon={<ArrowDropDownIcon sx={{ fontSize: 20 }} />}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 0.75,
                borderRadius: '6px',
                fontSize: '0.875rem',
                whiteSpace: 'nowrap',
                height: '40px',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                },
              }}
            >
              发布内容
            </Button>
            <Menu
              anchorEl={publishAnchorEl}
              open={publishMenuOpen}
              onClose={handlePublishMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 0.5,
                    minWidth: 150,
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  },
                },
              }}
            >
              {[
                {
                  type: ModelDiscussionType.DiscussionTypeQA,
                  label: '问题',
                  visible: true,
                },
                {
                  type: ModelDiscussionType.DiscussionTypeBlog,
                  label: '文章',
                  visible: true,
                },
                {
                  type: ModelDiscussionType.DiscussionTypeIssue,
                  label: 'Issue',
                  visible: isAdminRole(user?.role || ModelUserRole.UserRoleUnknown),
                },
              ]
                .filter((item) => item.visible)
                .map((item) => (
                  <MenuItem
                    key={item.type}
                    onClick={() => handlePublishTypeSelect(item.type)}
                    sx={{
                      fontSize: '14px',
                      py: 1,
                      '&:hover': {
                        bgcolor: (theme) => theme.palette.primaryAlpha?.[6],
                      },
                    }}
                  >
                    {item.label}
                  </MenuItem>
                ))}
            </Menu>
          </Box>

          {/* 手机端公告轮播 */}
          {announcements.length > 0 && (
            <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 2 }}>
              <AnnouncementCarousel announcements={announcements} routeName={routeName} />
            </Box>
          )}

          {/* 移动端：帖子类型选择 */}
          <Box
            sx={{
              mb: 2,
              display: { xs: 'flex', lg: 'none' },
              alignItems: 'center',
              gap: 1,
            }}
          >
            <ToggleButtonGroup
              value={currentPostType}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null) {
                  handlePostTypeChange(newValue)
                }
              }}
              sx={{
                flex: 1,
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                px: 0.5,
                gap: 0.5,
                '& .MuiToggleButtonGroup-grouped': {
                  borderRadius: '6px !important',
                  my: 0.5,
                  mx: 0,
                  flex: 1,
                },
              }}
            >
              {postTypes.map((postType) => (
                <ToggleButton
                  key={postType.id}
                  value={postType.id}
                  sx={(theme) => ({
                    height: 36,
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#21222D',
                    border: '1px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: theme.palette.primary.contrastText,
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark,
                        color: theme.palette.primary.contrastText,
                      },
                    },
                    '&:hover': { bgcolor: '#f3f4f6', color: '#000000' },
                  })}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>{postType.icon}</Box>
                    {postType.name}
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {/* 筛选和排序图标 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              <IconButton
                size='small'
                onClick={handleFilterMenuOpen}
                sx={{
                  color:
                    onlyMine || resolved !== null || topics.length > 0 || tagIds.length > 0
                      ? 'primary.main'
                      : 'text.secondary',
                }}
              >
                <TuneIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <IconButton size='small' onClick={handleSortMenuOpen} sx={{ color: 'text.secondary' }}>
                <SwapVertIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Box>
          </Box>

          {/* 桌面端：排序选项 */}
          <Box
            sx={{
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: { xs: 2, lg: 3 },
            }}
          >
            <ToggleButtonGroup
              value={status}
              exclusive
              onChange={(e, newValue) => {
                if (newValue !== null && newValue !== status) {
                  const query = createQueryString('sort', newValue)
                  router.replace(`/${routeName}?${query}`)
                }
              }}
              sx={{
                borderRadius: 1,
                px: 0.5,
                gap: 0.5,
                bgcolor: 'background.default',
                '& .MuiToggleButtonGroup-grouped': {
                  borderRadius: '6px !important',
                  my: 0.5,
                  mx: 0,
                },
              }}
            >
              {currentSortOptions.map((option) => (
                <ToggleButton
                  key={option.value}
                  value={option.value}
                  sx={(theme) => ({
                    height: 30,
                    fontWeight: 400,
                    fontSize: '14px',
                    color: '#21222D',
                    border: '1px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: '#fff',
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: '#fff',
                        color: theme.palette.primary.main,
                      },
                    },
                    '&:hover': { bgcolor: '#f3f4f6', color: '#000000' },
                  })}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component='span'
                sx={{
                  fontSize: '14px',
                  color: '#9ca3af',
                  fontWeight: 500,
                }}
              >
                共{' '}
                <Box component='span' sx={{ display: 'inline-block', color: '#000000', fontWeight: 500 }}>
                  {articleData.total || 0}
                </Box>{' '}
                个帖子
              </Box>
              <Button
                onClick={handleFilterMenuOpen}
                startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
                sx={{
                  height: 30,
                  px: 1.5,
                  borderRadius: '6px',
                  bgcolor: onlyMine || resolved !== null ? (theme) => theme.palette.primaryAlpha?.[6] : 'transparent',
                  color: onlyMine || resolved !== null ? 'primary.main' : '#21222D',
                  fontSize: '14px',
                  fontWeight: 500,
                  textTransform: 'none',
                }}
              >
                筛选
              </Button>
            </Box>
          </Box>

          {/* 移动端排序下拉菜单 */}
          {isMobile && (
            <Menu
              anchorEl={sortAnchorEl}
              open={sortMenuOpen}
              onClose={handleSortMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 0.5,
                    minWidth: 150,
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  },
                },
              }}
            >
              {currentSortOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  onClick={() => handleSortChange(option.value)}
                  selected={status === option.value}
                  sx={(theme) => ({
                    fontSize: '14px',
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: theme.palette.primaryAlpha?.[6],
                      '&:hover': {
                        bgcolor: theme.palette.primaryAlpha?.[10],
                      },
                    },
                  })}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Menu>
          )}

          {/* 桌面端筛选菜单 */}
          {!isMobile && (
            <Menu
              anchorEl={filterAnchorEl}
              open={filterMenuOpen}
              onClose={handleFilterMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 0.5,
                    minWidth: 150,
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  },
                },
              }}
            >
              {/* 我参与的 */}
              <MenuItem
                onClick={() => handleFilterChange('only_mine', !onlyMine)}
                selected={onlyMine}
                sx={(theme) => ({
                  fontSize: '14px',
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: theme.palette.primaryAlpha?.[6],
                    '&:hover': {
                      bgcolor: theme.palette.primaryAlpha?.[10],
                    },
                  },
                })}
              >
                <Checkbox checked={onlyMine} size='small' sx={{ p: 0, mr: 1.5 }} />
                我参与的
              </MenuItem>
              {/* 是否解决 */}
              <MenuItem
                onClick={() => {
                  handleFilterChange('resolved', resolved === '1' ? null : 1)
                }}
                selected={resolved === '1'}
                sx={(theme) => ({
                  fontSize: '14px',
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: theme.palette.primaryAlpha?.[6],
                    '&:hover': {
                      bgcolor: theme.palette.primaryAlpha?.[10],
                    },
                  },
                })}
              >
                <Checkbox checked={resolved === '1'} size='small' sx={{ p: 0, mr: 1.5 }} />
                未解决的
              </MenuItem>
            </Menu>
          )}

          {/* 移动端筛选抽屉 */}
          <Drawer
            anchor='bottom'
            open={filterDialogOpen}
            onClose={handleFilterDialogClose}
            PaperProps={{
              sx: {
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
              },
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '85vh' }}>
              {/* 标题栏 */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  pb: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                  position: 'sticky',
                  top: 0,
                  bgcolor: 'background.paper',
                  zIndex: 1,
                }}
              >
                <Typography variant='h6' sx={{ fontSize: '18px', fontWeight: 600 }}>
                  筛选
                </Typography>
                <IconButton
                  size='small'
                  onClick={handleFilterDialogClose}
                  sx={{
                    color: 'text.secondary',
                  }}
                >
                  <Icon type='icon-guanbi-fill' />
                </IconButton>
              </Box>

              {/* 内容区域 */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  p: 2,
                  minHeight: 0,
                }}
              >
                <Stack spacing={3}>
                  {/* 只看 */}
                  <Box>
                    <Typography
                      variant='subtitle2'
                      sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary', mb: 1.5 }}
                    >
                      只看
                    </Typography>
                    <Stack spacing={1}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          py: 0.5,
                        }}
                        onClick={() => setTempOnlyMine(!tempOnlyMine)}
                      >
                        <Checkbox checked={tempOnlyMine} size='small' sx={{ p: 0, mr: 1.5 }} />
                        <Typography sx={{ fontSize: '14px' }}>我参与的</Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          py: 0.5,
                        }}
                        onClick={() => setTempResolved(!tempResolved)}
                      >
                        <Checkbox checked={tempResolved} size='small' sx={{ p: 0, mr: 1.5 }} />
                        <Typography sx={{ fontSize: '14px' }}>未解决的</Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* 分类 */}
                  {filteredGroups.origin.length > 0 && (
                    <>
                      {filteredGroups.origin.map((group) => {
                        const selectedItems = tempTopics.filter((topicId) =>
                          group.items?.some((item) => item.id === topicId),
                        )
                        return (
                          <Box key={group.id}>
                            <Typography
                              variant='subtitle2'
                              sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary', mb: 1.5 }}
                            >
                              {group.name}
                            </Typography>
                            <Stack spacing={1}>
                              {group.items?.map((item) => {
                                const isSelected = selectedItems.includes(item.id || -1)
                                return (
                                  <Box
                                    key={item.id}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      py: 0.5,
                                    }}
                                    onClick={() => {
                                      if (isSelected) {
                                        setTempTopics(tempTopics.filter((id) => id !== item.id))
                                      } else {
                                        setTempTopics([...tempTopics, item.id || -1])
                                      }
                                    }}
                                  >
                                    <Checkbox checked={isSelected} size='small' sx={{ p: 0, mr: 1.5 }} />
                                    <Typography sx={{ fontSize: '14px' }}>{item.name}</Typography>
                                  </Box>
                                )
                              })}
                            </Stack>
                          </Box>
                        )
                      })}
                    </>
                  )}

                  {/* 标签 */}
                  {availableTags && availableTags.length > 0 && (
                    <Box>
                      <Typography
                        variant='subtitle2'
                        sx={{ fontSize: '14px', fontWeight: 600, color: 'text.primary', mb: 1.5 }}
                      >
                        标签
                      </Typography>
                      <Stack spacing={1}>
                        {availableTags.map((tag: any) => {
                          const isSelected = tempTagIds.includes(tag.id || -1)
                          return (
                            <Box
                              key={tag.id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                py: 0.5,
                              }}
                              onClick={() => {
                                if (isSelected) {
                                  setTempTagIds(tempTagIds.filter((id) => id !== tag.id))
                                } else {
                                  setTempTagIds([...tempTagIds, tag.id || -1])
                                }
                              }}
                            >
                              <Checkbox checked={isSelected} size='small' sx={{ p: 0, mr: 1.5 }} />
                              <Typography sx={{ fontSize: '14px' }}>{tag.name}</Typography>
                            </Box>
                          )
                        })}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </Box>

              {/* 底部按钮 */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  flexShrink: 0,
                  position: 'sticky',
                  bottom: 0,
                  bgcolor: 'background.paper',
                  zIndex: 1,
                }}
              >
                <Button
                  variant='text'
                  onClick={handleClearFilter}
                  sx={{
                    flexShrink: 0,
                  }}
                >
                  清除筛选
                </Button>
                <Button
                  variant='contained'
                  fullWidth
                  onClick={handleApplyFilter}
                  sx={{
                    borderRadius: '6px',
                    textTransform: 'none',
                  }}
                >
                  应用筛选
                </Button>
              </Box>
            </Box>
          </Drawer>
          <Divider />
          {/* 帖子列表 */}
          <Box sx={{ bgcolor: '#ffffff', overflow: 'hidden' }}>
            {articleData.items?.map((it, index) => (
              <DiscussCard
                key={`discussion-${it.uuid}`}
                data={it}
                keywords={search}
                onNavigate={onNavigate}
                filter={status as 'hot' | 'new' | 'publish'}
                sx={{
                  borderBottom: index < (articleData.items?.length || 0) - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              />
            ))}
          </Box>

          {/* 加载更多 */}
          <Box sx={{ width: '100%', textAlign: 'center', mt: 3, minHeight: '60px' }}>
            {page * 10 < (articleData.total || 0) ? (
              <>
                <Box sx={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {loadingMore && (
                    <Stack direction='row' alignItems='center' justifyContent='center' gap={1} sx={{ py: 1.5 }}>
                      <CircularProgress size={16} sx={{ color: '#206CFF' }} />
                      <Typography>加载中...</Typography>
                    </Stack>
                  )}
                </Box>
                <Box ref={loadMoreTriggerRef} sx={{ width: '100%', height: '1px' }} />
              </>
            ) : (
              <Divider>
                <Typography variant='body2' sx={{ color: '#666' }}>
                  到底啦
                </Typography>
              </Divider>
            )}
          </Box>
        </Box>

        {/* 右侧边栏 */}
        <Stack
          ref={sidebarRef}
          spacing={3}
          sx={{
            width: 276,
            flexShrink: 0,
            display: { xs: 'none', lg: 'block' },
            pt: 0,
            pb: 0,
            scrollbarGutter: 'stable',
            // 保持在视口内滚动时固定（避免使用 fixed）
            position: 'sticky',
            top: 24,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto',
            // 优化性能，避免加载时重新布局
            willChange: 'transform',
            // 隐藏滚动条
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          {announcements.length > 0 && (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 1,
                p: 2,
                border: (theme) => `1px solid ${theme.palette.mode === 'light' ? '#EAECF0' : '#393939'}`,
              }}
            >
              <Typography variant='subtitle2' sx={{ fontSize: '14px', fontWeight: 700, color: '#111827', mb: 1 }}>
                公告
              </Typography>
              <Divider sx={{ mt: 2 }} />
              {announcements.length > 0 &&
                announcements.map((announcement, index) => (
                  <Fragment key={`announcement-${announcement.uuid}`}>
                    <AnnouncementCard announcement={announcement} routeName={routeName} />
                    {announcements.length - 1 !== index && <Divider />}
                  </Fragment>
                ))}
            </Paper>
          )}
          {/* 贡献达人 */}
          <ContributorsRank contributors={contributors} />

          {/* 品牌声明 */}
          <BrandAttribution inSidebar={true} sidebarRef={sidebarRef as React.RefObject<HTMLElement>} />
        </Stack>
      </Box>
      {/* 搜索结果弹窗 */}
      <SearchResultModal
        open={searchModalOpen}
        onClose={() => {
          closeSearchModal()
          setSearch('')
        }}
        initialQuery={search}
        onPublish={handlePublish}
      />
    </>
  )
}

export default Article
