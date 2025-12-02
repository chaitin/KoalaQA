'use client'
import { getDiscussion } from '@/api'
import {
  GetDiscussionParams,
  ModelDiscussionListItem,
  ModelForumInfo,
  ModelGroupItemInfo,
  ModelGroupWithItem,
  ModelListRes,
  ModelUserRole,
} from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import BrandAttribution from '@/components/BrandAttribution'
import ContributorsRank from '@/components/ContributorsRank'
import { CommonContext } from '@/components/commonProvider'
import { ReleaseModal } from '@/components/discussion'
import SearchResultModal from '@/components/SearchResultModal'
import { useGroupData } from '@/contexts/GroupDataContext'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { useForumId } from '@/hooks/useForumId'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { Ellipsis } from '@ctzhian/ui'
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
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DiscussCard from './discussCard'
import { isAdminRole } from '@/lib/utils'

export type Status = 'hot' | 'new' | 'publish'

const TYPE_LIST = [
  { label: '问题', value: 'qa' },
  // { label: '反馈', value: 'feedback' },
  { label: '文章', value: 'blog' },
]
const Article = ({
  data,
  topics,
  groups: groupsData,
  type,
  forumId,
  forumInfo,
}: {
  data: ModelListRes & {
    items?: ModelDiscussionListItem[]
  }
  topics: number[]
  groups?: ModelListRes & {
    items?: (ModelGroupWithItem & {
      items?: ModelGroupItemInfo[]
    })[]
  }
  type?: string
  forumId?: string
  forumInfo?: ModelForumInfo | null
}) => {
  const searchParams = useSearchParams()
  const params = useParams()
  const routeName = params?.route_name as string
  const router = useRouterWithRouteName()
  const nextRouter = useRouter()
  const { checkAuth } = useAuthCheck()
  const { user } = useContext(AuthContext)
  const { getFilteredGroups } = useGroupData()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  // 根据设备类型动态设置搜索placeholder
  const searchPlaceholder = isMobile ? '使用 AI 搜索' : '输入任意内容，使用 AI 搜索'

  // 根据当前类型从 forumInfo.groups 中筛选对应的分类
  // 当type为undefined时，不传type参数，显示所有类型的分类
  const currentType = type ? (type as 'qa' | 'blog') : undefined

  // 使用 useMemo 缓存过滤后的分组数据
  const groups = useMemo(() => {
    return getFilteredGroups(groupsData, forumInfo, currentType)
  }, [groupsData, forumInfo, currentType, getFilteredGroups])

  const [releaseModalVisible, { setTrue: releaseModalOpen, setFalse: releaseModalClose }] = useBoolean(false)
  const status = searchParams?.get('sort') || 'publish'
  const [search, setSearch] = useState(searchParams?.get('search') || '')
  const searchRef = useRef(search)
  const [articleData, setArticleData] = useState(data)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [announcements, setAnnouncements] = useState<ModelDiscussionListItem[]>([])
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
  const [selectedModalType, setSelectedModalType] = useState<'qa' | 'blog' | 'issue'>('qa')
  const [lastPathname, setLastPathname] = useState('')

  const hookForumId = useForumId()

  const announcementBlogIdsKey = (forumInfo?.blog_ids ?? []).join(',')

  // 获取公告列表
  const fetchAnnouncements = useCallback(async () => {
    if (!forumInfo?.blog_ids || forumInfo.blog_ids.length === 0) {
      setAnnouncements([])
      return
    }

    try {
      const params: GetDiscussionParams = {
        discussion_ids: forumInfo.blog_ids,
        page: 1,
        size: 10,
        type: 'blog',
        forum_id: parseInt(forumId || '0', 10),
      }
      const response = await getDiscussion(params)
      if (response?.items) {
        setAnnouncements(response.items)
      } else {
        setAnnouncements([])
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
      setAnnouncements([])
    } 
  }, [announcementBlogIdsKey, forumInfo?.id, forumId])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const fetchMoreList = useCallback(() => {
    // 防止重复请求
    if (page * 10 >= (articleData.total || 0) || loadingMore) {
      return
    }

    setLoadingMore(true)
    const new_page = page + 1
    setPage(new_page)
    const params: GetDiscussionParams & { forum_id?: number } = {
      page: new_page,
      size: 10,
      // 只有当type存在时才传递type参数，否则不传，让后端返回所有类型
      ...(type ? { type: type as 'qa' | 'blog' } : {}),
      forum_id: parseInt(forumId || '0', 10),
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
        }
      })
      .catch((error) => {
        console.error('Failed to fetch more discussions:', error)
        // 回退页码
        setPage(page)
      })
      .finally(() => {
        setLoadingMore(false)
      })
  }, [page, articleData.total, status, search, topics, type, loadingMore, onlyMine, resolved])

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set(name, value)
    return params.toString()
  }

  const fetchList = useCallback(
    (st: Status, se: string, tps: number[], onlyMineParam?: boolean, resolvedParam?: number | null) => {
      setPage(1)
      const params: GetDiscussionParams & { forum_id?: number } = {
        page: 1,
        size: 10,
        // 只有当type存在时才传递type参数，否则不传，让后端返回所有类型
        ...(type ? { type: type as 'qa' | 'blog' } : {}),
      }

      // 设置 filter
      params.filter = st as 'hot' | 'new' | 'publish'

      // 如果有搜索关键词，添加到参数中
      if (se && se.trim()) {
        params.keyword = se.trim()
      }

      // 如果有选中的主题，添加到参数中
      if (tps && tps.length > 0) {
        params.group_ids = tps
      }

      // 添加筛选参数
      if (onlyMineParam !== undefined) {
        params.only_mine = onlyMineParam
      }
      if (resolvedParam !== null && resolvedParam !== undefined) {
        params.resolved = resolvedParam as 0 | 1 | 2
      }

      return getDiscussion(params)
        .then((res) => {
          if (res) {
            setArticleData(res)
          }
        })
        .catch((error) => {
          console.error('Failed to fetch discussions:', error)
          // 保持当前数据，不重置为空
        })
    },
    [type],
  )

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
    setArticleData(data)
  }, [data])

  useEffect(() => {
    if (!isLoadMoreInView || loadingMore || page * 10 >= (articleData.total || 0)) {
      return
    }

    fetchMoreList()
  }, [isLoadMoreInView, loadingMore, fetchMoreList, page, articleData.total])

  // 当URL参数变化时重置页码
  useEffect(() => {
    setPage(1)
  }, [status, type, topics])

  // 更新搜索引用
  useEffect(() => {
    searchRef.current = search
  }, [search])

  // 监听路由变化，检测是否从详情页返回
  useEffect(() => {
    const currentPath = window.location.pathname
    const currentOnlyMine = searchParams?.get('only_mine') === 'true'
    const currentResolved = searchParams?.get('resolved')
    const resolvedValue =
      currentResolved === null || currentResolved === undefined
        ? null
        : /^(0|1|2)$/.test(currentResolved)
          ? parseInt(currentResolved, 10)
          : null

    // 如果当前路径是列表页，且之前记录的不是列表页，说明可能是从详情页返回的
    if (lastPathname && lastPathname !== currentPath && currentPath === `/${routeName}`) {
      fetchList(status as Status, search, topics, currentOnlyMine, resolvedValue)
    }

    // 更新记录的路径
    setLastPathname(currentPath)
  }, [routeName, lastPathname, status, search, topics, searchParams, fetchList])

  const handleTopicClick = useCallback(
    (t: number) => {
      let newTopics: number[]
      if (topics.includes(t)) {
        // 已选中则取消
        newTopics = topics.filter((item) => item !== t)
      } else {
        // 未选中则添加
        newTopics = [...topics, t]
      }

      // 只有在主题真正变化时才更新 URL
      if (JSON.stringify(newTopics) !== JSON.stringify(topics)) {
        const params = new URLSearchParams(searchParams?.toString())
        if (newTopics.length > 0) {
          params.set('tps', newTopics.join(','))
        } else {
          params.delete('tps')
        }
        router.replace(`/${routeName}?${params.toString()}`)
      }
    },
    [topics, searchParams, router],
  )

  const handleAsk = () => {
    setSelectedModalType('qa')
    checkAuth(() => releaseModalOpen())
  }


  const handleArticle = () => {
    setSelectedModalType('blog')
    checkAuth(() => {
      const routeName = (params?.route_name as string) || ''
      nextRouter.push(`/${routeName}/edit`)
    })
  }

  const handleIssue = () => {
    setSelectedModalType('issue')
    checkAuth(() => releaseModalOpen())
  }

  // 处理发布类型菜单打开
  const handlePublishMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    if(type) {
      handlePublishTypeSelect(type as 'qa' | 'blog')
    }else{
      setPublishAnchorEl(event.currentTarget)
    }
  }

  // 处理发布类型菜单关闭
  const handlePublishMenuClose = () => {
    setPublishAnchorEl(null)
  }

  // 处理选择发布类型
  const handlePublishTypeSelect = (publishType: 'qa' | 'blog' | 'issue') => {
    handlePublishMenuClose()
    if (publishType === 'qa') {
      handleAsk()
    } else if (publishType === 'blog') {
      handleArticle()
    } else if (publishType === 'issue') {
      handleIssue()
    }
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

  // 监听筛选参数变化，重新获取数据
  useEffect(() => {
    const currentOnlyMine = searchParams?.get('only_mine') === 'true'
    const currentResolved = searchParams?.get('resolved')
    const resolvedValue =
      currentResolved === null || currentResolved === undefined
        ? null
        : /^(0|1|2)$/.test(currentResolved)
          ? parseInt(currentResolved, 10)
          : null

    // 只有当参数真正变化时才重新获取数据
    if (currentOnlyMine !== onlyMine || currentResolved !== resolved) {
      fetchList(status as Status, search, topics, currentOnlyMine, resolvedValue)
    }
  }, [status, onlyMine, resolved, searchParams, search, topics, fetchList])

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
                  onClick={() => handlePublishTypeSelect('qa')}
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
                  onClick={() => handlePublishTypeSelect('blog')}
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
                {isAdminRole(
                  user?.role || ModelUserRole.UserRoleUnknown,
                ) && (
                  <MenuItem
                    onClick={() => handlePublishTypeSelect('issue')}
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
                keywords={searchRef.current}
                onNavigate={releaseModalClose}
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
          }}
        >
          {/* 公告 */}
          {announcements.map((announcement) => (
            <Link
              key={announcement.uuid}
              href={`/${routeName}/${announcement.uuid}`}
              style={{ textDecoration: 'none' }}
            >
              <Paper
                elevation={0}
                sx={{
                  bgcolor: 'rgba(0,99,151,0.03)',
                  borderRadius: '6px',
                  border: '1px solid #D9DEE2',
                  p: 2,
                  mb: 2,
                  // 为公告 Paper 增加焦点识别样式
                  transition: 'box-shadow 0.2s, border-color 0.2s, background-color 0.2s',
                  outline: 'none',
                  '&:focus-within, &:hover': {
                    boxShadow: 'inset 0 0 3px 1px rgba(32,108,255,0.1)',
                    backgroundColor: 'rgba(32,108,255,0.04)',
                  },
                  cursor: 'pointer',
                  tabIndex: 0,
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Ellipsis
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#111827',
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {announcement.title}
                  </Ellipsis>
                  {announcement.summary && (
                    <Box
                      sx={{
                        fontSize: '12px!important',
                        color: 'rgba(33, 34, 45, 0.50)',
                        bgcolor: 'transparent',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {announcement.summary}
                    </Box>
                  )}
                </Box>
              </Paper>
            </Link>
          ))}

          {/* 贡献达人 */}
          <ContributorsRank />

          {/* 品牌声明 */}
          <BrandAttribution inSidebar={true} sidebarRef={sidebarRef as React.RefObject<HTMLElement>} />
        </Box>
      </Box>

      <ReleaseModal
        open={releaseModalVisible}
        onClose={releaseModalClose}
        onOk={() => {
          const currentOnlyMine = searchParams?.get('only_mine') === 'true'
          const currentResolved = searchParams?.get('resolved')
          const resolvedValue =
            currentResolved === null || currentResolved === undefined
              ? null
              : /^(0|1|2)$/.test(currentResolved)
                ? parseInt(currentResolved, 10)
                : null
          fetchList(status as Status, search, topics, currentOnlyMine, resolvedValue)
          router.refresh()
          releaseModalClose()
        }}
        selectedTags={[]}
        initialTitle={searchParams?.get('search') || ''}
        type={selectedModalType}
        forumInfo={forumInfo}
      />

      {/* 搜索结果弹窗 */}
      <SearchResultModal
        open={searchModalOpen}
        onClose={() => {
          closeSearchModal()
          setSearch('')
        }}
        initialQuery={search}
        onAsk={handleAsk}
        onIssue={handleIssue}
        onArticle={handleArticle}
      />
    </>
  )
}

export default Article
