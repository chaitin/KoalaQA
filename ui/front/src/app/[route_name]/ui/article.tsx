'use client'
import { getDiscussion, getRankContribute } from '@/api'
import {
  GetDiscussionParams,
  ModelDiscussionListItem,
  ModelForumInfo,
  ModelGroupItemInfo,
  ModelGroupWithItem,
  ModelListRes,
  SvcRankContributeItem,
} from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import { CommonContext } from '@/components/commonProvider'
import { ReleaseModal } from '@/components/discussion'
import SearchResultModal from '@/components/SearchResultModal'
import BrandAttribution from '@/components/BrandAttribution'
import CommonAvatar from '@/components/CommonAvatar'
import Icon from '@/components/icon'
import { useGroupData } from '@/contexts/GroupDataContext'
import { useAuthCheck } from '@/hooks/useAuthCheck'
import { useForumId } from '@/hooks/useForumId'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { Person as PersonIcon, Schedule as ScheduleIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import Image from 'next/image'
import Link from 'next/link'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  MenuItem,
} from '@mui/material'
import { useBoolean } from 'ahooks'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import DiscussCard from './discussCard'

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
  const { user } = useContext(AuthContext)
  const { checkAuth } = useAuthCheck()
  const { groupsLoading } = useContext(CommonContext)
  const { getFilteredGroups } = useGroupData()

  // 根据当前类型从 forumInfo.groups 中筛选对应的分类
  const currentType = (type || 'qa') as 'qa' | 'feedback' | 'blog'

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
  const [contributors, setContributors] = useState<SvcRankContributeItem[]>([])
  const [contributorsLoading, setContributorsLoading] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // 下拉筛选相关状态
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null)
  const filterMenuOpen = Boolean(filterAnchorEl)
  const onlyMine = searchParams?.get('only_mine') === 'true'
  const resolved = searchParams?.get('resolved')

  // 搜索弹窗相关状态
  const [searchModalOpen, { setTrue: openSearchModal, setFalse: closeSearchModal }] = useBoolean(false)
  const [selectedModalType, setSelectedModalType] = useState<'qa' | 'feedback' | 'blog'>('qa')
  const [lastPathname, setLastPathname] = useState('')

  const hookForumId = useForumId()
  const getCurrentForumId = (): number | undefined => {
    const id = forumId || hookForumId
    if (!id) return undefined
    return typeof id === 'string' ? parseInt(id, 10) : id
  }
  const currentForumId = getCurrentForumId()

  const fetchContributors = useCallback(async () => {
    try {
      setContributorsLoading(true)
      const response = await getRankContribute()
      setContributors(response?.items || [])
    } catch (error) {
      console.error('Failed to fetch contributors:', error)
    } finally {
      setContributorsLoading(false)
    }
  }, [])

  // 获取贡献达人榜单
  useEffect(() => {
    fetchContributors()
  }, [fetchContributors])

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
      type: type as 'qa' | 'feedback' | 'blog',
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

    // 添加当前选中的板块ID
    if (currentForumId) {
      params.forum_id = currentForumId
    }

    // 添加筛选参数
    if (onlyMine) {
      params.only_mine = true
    }
    if (resolved !== null && resolved !== undefined) {
      params.resolved = resolved === 'true'
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
  }, [page, articleData.total, status, search, topics, type, currentForumId, loadingMore, onlyMine, resolved])

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString())
    params.set(name, value)
    return params.toString()
  }

  const fetchList = useCallback(
    (st: Status, se: string, tps: number[], onlyMineParam?: boolean, resolvedParam?: boolean | null) => {
      setPage(1)
      const params: GetDiscussionParams & { forum_id?: number } = {
        page: 1,
        size: 10,
        type: type as 'qa' | 'feedback' | 'blog',
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

      // 添加当前选中的板块ID
      if (currentForumId) {
        params.forum_id = currentForumId
      }

      // 添加筛选参数
      if (onlyMineParam !== undefined) {
        params.only_mine = onlyMineParam
      }
      if (resolvedParam !== null && resolvedParam !== undefined) {
        params.resolved = resolvedParam
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
    [currentForumId, type],
  )

  const handleSearch = useCallback(() => {
    const trimmedSearch = search && search.trim() ? search.trim() : ''

    if (trimmedSearch) {
      // 打开搜索弹窗，SearchResultModal 会自动执行搜索
      openSearchModal()
    }
  }, [search, openSearchModal])

  const onInputSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  useEffect(() => {
    setArticleData(data)
  }, [data])

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
    const resolvedBool = currentResolved === null || currentResolved === undefined ? null : currentResolved === 'true'

    // 如果当前路径是列表页，且之前记录的不是列表页，说明可能是从详情页返回的
    if (lastPathname && lastPathname !== currentPath && currentPath === `/${routeName}`) {
      fetchList(status as Status, search, topics, currentOnlyMine, resolvedBool)
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

  const handleFeedback = () => {
    setSelectedModalType('feedback')
    checkAuth(() => releaseModalOpen())
  }

  const handleArticle = () => {
    setSelectedModalType('blog')
    checkAuth(() => {
      const routeName = (params?.route_name as string) || ''
      nextRouter.push(`/${routeName}/edit`)
    })
  }

  // 根据类型获取排序选项
  const getSortOptions = (postType: string) => {
    if (postType === 'blog') {
      return [
        { value: 'publish', label: '最新发布' },
        { value: 'new', label: '最近活跃' },
        { value: 'hot', label: '热门内容' },
      ]
    }
    // Default for qa/feedback
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

  const handleFilterChange = (filterType: 'only_mine' | 'resolved', value: boolean | null) => {
    const params = new URLSearchParams(searchParams?.toString())

    if (filterType === 'only_mine') {
      if (value) {
        params.set('only_mine', 'true')
      } else {
        params.delete('only_mine')
      }
    } else if (filterType === 'resolved') {
      if (value === false) {
        params.set('resolved', 'false')
      } else if (value === true) {
        params.set('resolved', 'true')
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
    const resolvedBool = currentResolved === null || currentResolved === undefined ? null : currentResolved === 'true'

    // 只有当参数真正变化时才重新获取数据
    if (currentOnlyMine !== onlyMine || currentResolved !== resolved) {
      fetchList(status as Status, search, topics, currentOnlyMine, resolvedBool)
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
            px: 3,
          }}
        >
          {/* 搜索和发帖按钮 */}
          <Box id='article-search-box' sx={{ display: 'flex', gap: 3, mb: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder='输入任意内容，使用 AI 搜索'
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
                  bgcolor: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  height: '40px',
                  '& fieldset': {
                    borderColor: '#21222D',
                  },
                  '&:hover fieldset': {
                    borderColor: '#d1d5db',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#000000',
                    borderWidth: 2,
                  },
                },
              }}
            />
            <Button
              variant='contained'
              onClick={type === 'feedback' ? handleFeedback : type === 'blog' ? handleArticle : handleAsk}
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
                  background: '#111827',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.3)',
                },
              }}
            >
              👉 {type === 'blog' ? '发布文章' : '发布内容'}
            </Button>
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
                PaperProps={{
                  sx: {
                    mt: 0.5,
                    minWidth: 150,
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
                    const newResolved = resolved === 'false' ? null : false
                    handleFilterChange('resolved', newResolved)
                  }}
                  selected={resolved === 'false'}
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
                  未解决
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
                sx={{
                  borderBottom: index < (articleData.items?.length || 0) - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              />
            ))}
          </Box>

          {/* 加载更多 */}
          <Box sx={{ width: '100%', textAlign: 'center', mt: 3 }}>
            {page * 10 < (articleData.total || 0) ? (
              <Button
                onClick={fetchMoreList}
                disabled={loadingMore}
                variant='outlined'
                sx={{
                  background: '#fff !important',
                  borderColor: '#fff !important',
                  boxShadow: 'rgba(0, 28, 85, 0.04) 0px 4px 10px 0px',
                  fontWeight: 400,
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    fontWeight: 500,
                    border: '1px solid #206CFF !important',
                    transform: 'translateY(-2px)',
                    boxShadow: 'rgba(32, 108, 255, 0.15) 0px 8px 20px 0px',
                  },
                  '&:active': {
                    transform: 'translateY(0) scale(0.98)',
                  },
                  '&:disabled': {
                    opacity: 0.6,
                    cursor: 'not-allowed',
                    transform: 'none',
                  },
                }}
                fullWidth
              >
                {loadingMore ? (
                  <Stack direction='row' alignItems='center' gap={1}>
                    <CircularProgress size={16} sx={{ color: '#206CFF' }} />
                    <Typography>加载中...</Typography>
                  </Stack>
                ) : (
                  '查看更多'
                )}
              </Button>
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
            top: 84,
            maxHeight: 'calc(100vh - 96px)',
            overflowY: 'auto',
          }}
        >
          {/* 公告 */}
          {/* <Paper
            elevation={0}
            sx={{
              bgcolor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              p: 2,
              mb: 2,
            }}
          >
            <Typography variant='subtitle2' sx={{ fontWeight: 700, color: '#111827', fontSize: '0.9375rem', mb: 2 }}>
              公告
            </Typography>
            {articleData.items?.find((item) => item.type === 'blog') ? (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '6px',
                  bgcolor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: '#f3f4f6',
                    borderColor: '#d1d5db',
                  },
                }}
                onClick={() => {
                  const article = articleData.items?.find((item) => item.type === 'blog')
                  if (article?.uuid) {
                    router.push(`/${routeName}/${article.uuid}`)
                  }
                }}
              >
                <Typography
                  variant='body2'
                  sx={{ fontWeight: 600, color: '#111827', fontSize: '0.8125rem', mb: 0.75, lineHeight: 1.4 }}
                >
                  {articleData.items?.find((item) => item.type === 'blog')?.title || '暂无公告'}
                </Typography>
                <Typography
                  variant='caption'
                  sx={{
                    color: '#6b7280',
                    fontSize: '0.7rem',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {articleData.items?.find((item) => item.type === 'blog')?.summary || '暂无公告内容'}
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '6px',
                  bgcolor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Typography
                  variant='caption'
                  sx={{
                    color: '#6b7280',
                    fontSize: '0.7rem',
                    lineHeight: 1.5,
                  }}
                >
                  暂无公告
                </Typography>
              </Box>
            )}
          </Paper> */}

          {/* 贡献达人 */}
          <Paper
            elevation={0}
            sx={{
              bgcolor: '#ffffff',
              borderRadius: 1,

              border: '1px solid #D9DEE2',
              p: 2,
              mb: 2,
            }}
          >
            <Stack direction='row' alignItems='center' justifyContent={'space-between'} sx={{ mb: 2 }}>
              <Stack direction='row' alignItems='center' gap={1}>
                <Image alt='crown' width={20} height={20} src='/crown.svg' />
                <Typography variant='subtitle2' sx={{ fontSize: '14px', fontWeight: 700, color: '#111827' }}>
                  贡献达人
                </Typography>
              </Stack>
              <Stack direction='row' alignItems='center' gap={1}>
                <IconButton
                  size='small'
                  aria-label='刷新贡献达人列表'
                  onClick={() => {
                    // 支持二次点击立即重新获取贡献达人
                    if (typeof fetchContributors === 'function') {
                      fetchContributors()
                    }
                  }}
                  sx={{
                    p: 0.5,
                  }}
                >
                  <Icon type='icon-shuaxin' sx={{ fontSize: 18, color: '#6b7280' }} />
                </IconButton>
                <Typography variant='body2' sx={{ fontSize: '14px', color: 'rgba(33, 34, 45, 0.50)' }}>
                  近 7 天
                </Typography>
              </Stack>
            </Stack>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {contributorsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={16} />
                </Box>
              ) : contributors.length === 0 ? (
                <Typography
                  variant='caption'
                  sx={{
                    color: '#6b7280',
                    fontSize: '0.7rem',
                    lineHeight: 1.5,
                  }}
                >
                  暂无数据
                </Typography>
              ) : (
                contributors.map((contributor, index) => {
                  const contributorProfileHref = contributor.id ? `/profile/${contributor.id}` : undefined
                  return (
                    <Box
                      key={contributor.id || index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.75,
                        pl: 0,
                        borderRadius: '4px',
                        bgcolor: 'transparent',
                        border: 'none',
                      }}
                    >
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '3px',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          flexShrink: 0,
                          fontFamily: 'Gilroy',
                          fontStyle: 'italic',
                          letterSpacing: '-0.02em',
                          textRendering: 'optimizeLegibility',
                          WebkitFontSmoothing: 'antialiased',
                          background:
                            index === 0
                              ? 'linear-gradient(to bottom, #F64E54, #FB868D)'
                              : index === 1
                                ? 'linear-gradient(to bottom, #FC8664, #FBAD86)'
                                : index === 2
                                  ? 'linear-gradient(to bottom, #FBC437, #FFE0A9)'
                                  : 'linear-gradient(to bottom, #BCBCBC, #E1E1E1)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        {index + 1}
                      </Box>
                      {contributorProfileHref ? (
                        <Link href={contributorProfileHref} style={{ display: 'inline-flex' }}>
                          <CommonAvatar src={contributor.avatar} name={contributor.name} />
                        </Link>
                      ) : (
                        <CommonAvatar src={contributor.avatar} name={contributor.name} />
                      )}
                      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                        {contributorProfileHref ? (
                          <Link
                            href={contributorProfileHref}
                            style={{
                              fontWeight: 600,
                              color: '#111827',
                              fontSize: '0.875rem',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              textDecoration: 'none',
                              display: 'block',
                            }}
                          >
                            {contributor.name || '未知用户'}
                          </Link>
                        ) : (
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: 600,
                              color: '#111827',
                              fontSize: '0.875rem',
                              lineHeight: 1.3,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {contributor.name || '未知用户'}
                          </Typography>
                        )}
                      </Box>
                      {contributor.score !== undefined && (
                        <Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
                          <Typography
                            variant='caption'
                            sx={{
                              fontFamily: 'Gilroy, Gilroy',
                              fontWeight: 500,
                              fontSize: '14px',
                              color: 'rgba(33, 34, 45, 1)',
                              lineHeight: '24px',
                              textAlign: 'right',
                              fontStyle: 'normal',
                            }}
                          >
                            {Math.round(contributor.score)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )
                })
              )}
            </Box>
          </Paper>

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
          const resolvedBool =
            currentResolved === null || currentResolved === undefined ? null : currentResolved === 'true'
          fetchList(status as Status, search, topics, currentOnlyMine, resolvedBool)
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
        forumId={currentForumId}
        initialQuery={search}
        onAsk={handleAsk}
        onFeedback={handleFeedback}
        onArticle={handleArticle}
      />
    </>
  )
}

export default Article
