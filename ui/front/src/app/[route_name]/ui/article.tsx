'use client'
import { getDiscussion } from '@/api'
import {
  GetDiscussionParams,
  ModelDiscussionListItem,
  ModelDiscussionType,
  ModelForumInfo,
  ModelListRes,
  ModelUserRole,
} from '@/api/types'
import AnnouncementCard from '@/components/AnnouncementCard'
import AnnouncementCarousel from '@/components/AnnouncementCarousel'
import { AuthContext } from '@/components/authProvider'
import BrandAttribution from '@/components/BrandAttribution'
import ContributorsRank from '@/components/ContributorsRank'
import SearchResultModal from '@/components/SearchResultModal'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { useListPageCache } from '@/hooks/useListPageCache'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { isAdminRole } from '@/lib/utils'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import FilterListIcon from '@mui/icons-material/FilterList'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
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
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import DiscussCard from './discussCard'

export type Status = 'hot' | 'new' | 'publish'

const Article = ({
  data,
  tps,
  type,
  tags,
  forumInfo,
  announcements,
}: {
  data: ModelListRes & {
    items?: ModelDiscussionListItem[]
  }
  tps: string
  type?: ModelDiscussionType
  tags?: string
  forumInfo?: ModelForumInfo | null
  announcements: ModelDiscussionListItem[]
}) => {
  const searchParams = useSearchParams()
  const params = useParams()
  const routeName = params?.route_name as string
  const router = useRouterWithRouteName()
  const nextRouter = useRouter()
  const { checkAuth } = useAuthCheck()
  const { user } = useContext(AuthContext)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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
  const onlyMine = searchParams?.get('only_mine') === 'true'
  const resolved = searchParams?.get('resolved')

  // 发布类型下拉菜单相关状态
  const [publishAnchorEl, setPublishAnchorEl] = useState<null | HTMLElement>(null)
  const publishMenuOpen = Boolean(publishAnchorEl)

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

    getDiscussion(params)
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
  }, [articleData.total, page, status, search, topics, type, loadingMore, onlyMine, resolved, forumInfo?.id])

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
      if (cached.scrollPosition > 0) restoreScrollPosition(cached.scrollPosition)
    } else {
      setArticleData(data)
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
  const handlePublishSearch = (type: ModelDiscussionType) => (query: string) => {
    handlePublish(type, query)
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
    setFilterAnchorEl(event.currentTarget)
  }

  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null)
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

  return (
    <>
      {/* 中间和右侧内容容器 - 在lg及以上时居中 */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: { xs: 'block', lg: 'flex' },
          gap: { xs: 0, lg: 3 },
          justifyContent: { lg: 'center' },
          alignItems: { lg: 'flex-start' },
        }}
      >
        {/* 主内容区域 */}
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            maxWidth: { lg: 798 },
            width: { xs: '100%', lg: 'auto' },
            pt: 0,
            px: { xs: 0, sm: 3 },
          }}
        >
          {/* 搜索和发帖按钮 */}
          <Box id='article-search-box' sx={{ display: 'flex', gap: 3, mb: 2, alignItems: 'center' }}>
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
              }}
            />
            <Box>
              <Button
                variant='contained'
                onClick={handlePublishMenuOpen}
                endIcon={<ArrowDropDownIcon sx={{ fontSize: 20 }} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 0.75,
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  whiteSpace: 'nowrap',
                  height: '40px',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
                  },
                }}
              >
                👉 发布内容
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
                <MenuItem
                  onClick={() => handlePublishTypeSelect(ModelDiscussionType.DiscussionTypeQA)}
                  sx={{
                    fontSize: '14px',
                    py: 1,
                    '&:hover': {
                      bgcolor: 'rgba(0,99,151,0.06)',
                    },
                  }}
                >
                  问题
                </MenuItem>
                <MenuItem
                  onClick={() => handlePublishTypeSelect(ModelDiscussionType.DiscussionTypeBlog)}
                  sx={{
                    fontSize: '14px',
                    py: 1,
                    '&:hover': {
                      bgcolor: 'rgba(0,99,151,0.06)',
                    },
                  }}
                >
                  文章
                </MenuItem>
                {isAdminRole(user?.role || ModelUserRole.UserRoleUnknown) && (
                  <MenuItem
                    onClick={() => handlePublishTypeSelect(ModelDiscussionType.DiscussionTypeIssue)}
                    sx={{
                      fontSize: '14px',
                      py: 1,
                      '&:hover': {
                        bgcolor: 'rgba(0,99,151,0.06)',
                      },
                    }}
                  >
                    Issue
                  </MenuItem>
                )}
              </Menu>
            </Box>
          </Box>

          {/* 手机端公告轮播 */}
          {announcements.length > 0 && (
            <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 2 }}>
              <AnnouncementCarousel announcements={announcements} routeName={routeName} />
            </Box>
          )}

          {/* 排序选项 */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
                '& .MuiToggleButtonGroup-grouped': {
                  border: 0,
                  borderRadius: '6px !important',
                  mr: 1,
                  my: 0.5,
                },
              }}
            >
              {currentSortOptions.map((option) => (
                <ToggleButton
                  key={option.value}
                  value={option.value}
                  sx={{
                    height: 30,
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#21222D',
                    border: '1px solid transparent',
                    '&.Mui-selected': {
                      bgcolor: 'rgba(0,99,151,0.06)',
                      border: '1px solid rgba(0,99,151,0.1)',
                      color: 'primary.main',
                      '&.Mui-focusVisible': {
                        bgcolor: '#000000',
                        color: '#ffffff',
                        outline: '2px solid #000000',
                        outlineOffset: '2px',
                      },
                    },
                    '&:hover': { bgcolor: '#f3f4f6', color: '#000000' },
                  }}
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
              {/* 下拉筛选按钮 */}
              {isMobile ? (
                <IconButton onClick={handleFilterMenuOpen}>
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </IconButton>
              ) : (
                <Button
                  onClick={handleFilterMenuOpen}
                  startIcon={<FilterListIcon sx={{ fontSize: 18 }} />}
                  sx={{
                    height: 30,
                    px: 1.5,
                    borderRadius: '6px',
                    bgcolor: onlyMine || resolved !== null ? 'rgba(0,99,151,0.06)' : 'transparent',
                    color: onlyMine || resolved !== null ? 'primary.main' : '#21222D',
                    fontSize: '14px',
                    fontWeight: 500,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: '#f3f4f6',
                      borderColor: '#d1d5db',
                    },
                  }}
                >
                  筛选
                </Button>
              )}

              {/* 下拉筛选菜单 */}
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
                <MenuItem
                  onClick={() => handleFilterChange('only_mine', !onlyMine)}
                  selected={onlyMine}
                  sx={{
                    fontSize: '14px',
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(0,99,151,0.06)',
                      '&:hover': {
                        bgcolor: 'rgba(0,99,151,0.1)',
                      },
                    },
                  }}
                >
                  我参与的
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleFilterChange('resolved', resolved === '0' ? null : 0)
                  }}
                  selected={resolved === '0'}
                  sx={{
                    fontSize: '14px',
                    py: 1,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(0,99,151,0.06)',
                      '&:hover': {
                        bgcolor: 'rgba(0,99,151,0.1)',
                      },
                    },
                  }}
                >
                  未解决的
                </MenuItem>
              </Menu>
            </Box>
          </Box>
          <Divider />
          {/* 帖子列表 */}
          <Box sx={{ bgcolor: '#ffffff', borderRadius: '6px', overflow: 'hidden' }}>
            {articleData.items?.map((it, index) => (
              <DiscussCard
                key={it.uuid}
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
          <Box sx={{ width: '100%', textAlign: 'center', mt: 3 }}>
            {page * 10 < (articleData.total || 0) ? (
              <>
                {loadingMore && (
                  <Stack direction='row' alignItems='center' justifyContent='center' gap={1} sx={{ py: 1.5 }}>
                    <CircularProgress size={16} sx={{ color: '#206CFF' }} />
                    <Typography>加载中...</Typography>
                  </Stack>
                )}
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
        <Box
          ref={sidebarRef}
          sx={{
            width: 300,
            flexShrink: 0,
            display: { xs: 'none', lg: 'block' },
            pt: 0,
            pb: 3,
            pr: 3,
            scrollbarGutter: 'stable',
            position: 'sticky',
            top: 25,
            maxHeight: 'calc(100vh - 90px)',
            overflowY: 'auto',
            // 隐藏滚动条
            '&::-webkit-scrollbar': { display: 'none' },
            '-ms-overflow-style': 'none',
            'scrollbar-width': 'none',
          }}
        >
          {/* 公告 */}
          {announcements.map((announcement) => (
            <AnnouncementCard key={announcement.uuid} announcement={announcement} routeName={routeName} />
          ))}

          {/* 贡献达人 */}
          <ContributorsRank />

          {/* 品牌声明 */}
          <BrandAttribution inSidebar={true} sidebarRef={sidebarRef as React.RefObject<HTMLElement>} />
        </Box>
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
