'use client'

import { ModelSystemBrand } from '@/api'
import { ModelDiscussionType, ModelForumInfo as ModelForum, ModelUserRole } from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import { useForumId } from '@/hooks/useForumId'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { isAdminRole } from '@/lib/utils'
import { useForumStore, useQuickReplyStore } from '@/store'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import MenuIcon from '@mui/icons-material/Menu'
import SearchIcon from '@mui/icons-material/Search'
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import { useBoolean } from 'ahooks'
import Image from 'next/image'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useCallback, useContext, useEffect, useState } from 'react'
import FilterPanel from '../FilterPanel'
import ForumSelector from '../ForumSelector'
import SearchResultModal from '../SearchResultModal'
import LoggedInView from './loggedInView'

interface HeaderProps {
  brandConfig: ModelSystemBrand
  initialForums?: ModelForum[]
}

// 自定义事件类型定义
interface OpenReleaseModalEventDetail {
  type: ModelDiscussionType
  title?: string
}

declare global {
  interface WindowEventMap {
    openReleaseModal: CustomEvent<OpenReleaseModalEventDetail>
  }
}

const Header = ({ brandConfig, initialForums = [] }: HeaderProps) => {
  const { user } = useContext(AuthContext)
  const router = useRouterWithRouteName()
  const plainRouter = useRouter()
  const pathname = usePathname()
  const [backHref, setBackHref] = useState('/admin/ai')
  const [searchModalOpen, { setTrue: openSearchModal, setFalse: closeSearchModal }] = useBoolean(false)
  const [mobileMenuOpen, { setTrue: openMobileMenu, setFalse: closeMobileMenu }] = useBoolean(false)
  const [searchInputValue, setSearchInputValue] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const { fetchQuickReplies } = useQuickReplyStore()

  // 将服务端传下来的 initialForums 同步到 zustand store（如果已经迁移到 useForumStore）
  // 这样使用新 store 的组件可以立即拿到 forum 数据
  // 动态导入 store 以避免非客户端执行的问题
  useEffect(() => {
    if (!initialForums || initialForums.length === 0) return
    // 延迟导入以确保在客户端环境
    import('@/store')
      .then((mod) => {
        try {
          const m: any = mod
          // 优先使用 hook 方式获取 setter，保证与 zustand 用法一致
          if (typeof m.useForumStore === 'function') {
            const setter = m.useForumStore((s: any) => s.setForums)
            if (typeof setter === 'function') setter(initialForums)
          }
        } catch (e) {
          // 忽略同步失败，不影响 header 渲染
          // 在调试时可以查看控制台
          console.warn('Failed to sync initialForums to useForumStore', e)
        }
      })
      .catch(() => {})
  }, [initialForums])
  useEffect(() => {
    if (isAdminRole(user.role || ModelUserRole.UserRoleGuest)) fetchQuickReplies()
  }, [user.role])
  // 关闭搜索弹窗时清空输入框
  const handleCloseSearchModal = useCallback(() => {
    closeSearchModal()
    setSearchInputValue('')
  }, [closeSearchModal])

  const [showSearchInAppBar, setShowSearchInAppBar] = useState(false)

  // 使用 zustand store 中的数据，保证迁移后组件直接读取同一数据源
  const forums = useForumStore((s) => s.forums)
  // console.log(forums)
  // 使用板块选择器 - 只在非登录/注册页面使用
  const isAuthPage = ['/login', '/register'].includes(pathname)
  const { forum_id, route_name, id } = useParams()

  // 检测是否在 route_name 页面（即帖子列表页面）
  const isPostListPage = Boolean(route_name) && !id && !pathname.includes('/edit')

  // 获取当前论坛ID
  const hookForumId = useForumId()
  const getCurrentForumId = (): number | undefined => {
    if (forum_id) {
      const id = Array.isArray(forum_id) ? forum_id[0] : forum_id
      return typeof id === 'string' ? parseInt(id) : id
    }
    if (hookForumId) {
      return typeof hookForumId === 'string' ? parseInt(hookForumId) : hookForumId
    }
    return undefined
  }
  const currentForumId = getCurrentForumId()

  // 获取当前论坛信息
  const currentForumInfo = currentForumId
    ? forums.find((f) => f.id === currentForumId) || forums[0] || null
    : forums[0] || null
  // 确保只在客户端 mounted 后才执行可能影响渲染的逻辑
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      setBackHref(`${window.location.protocol}//${window.location.hostname}:3400/admin/ai`)
    }
  }, [isMounted])

  // 在列表页使用 IntersectionObserver 检测搜索框可见性
  useEffect(() => {
    // 确保只在客户端 mounted 后才执行，避免 hydration 不匹配
    if (!isMounted || typeof window === 'undefined') return

    // 非帖子列表页面，直接显示搜索框
    if (!isPostListPage) {
      // 仅在帖子详情页（存在 id）时显示 header 搜索框，编辑页面不显示
      const isPostDetailPage = Boolean(id)
      const isEditPage = typeof pathname === 'string' && pathname.includes('/edit')
      if (isPostDetailPage && !isEditPage) {
        setShowSearchInAppBar(true)
      } else {
        setShowSearchInAppBar(false)
      }
      return
    }

    // 如果是帖子列表页面，检测页面中的搜索框是否可见
    if (isPostListPage) {
      const searchBoxElement = document.querySelector('#article-search-box')
      if (!searchBoxElement) {
        // 如果找不到搜索框元素，默认显示header中的搜索框
        setShowSearchInAppBar(true)
        return
      }

      // 使用 IntersectionObserver 检测搜索框是否在视口中可见
      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries
          // 当搜索框不可见时，显示header中的搜索框
          // 当搜索框可见时，隐藏header中的搜索框
          setShowSearchInAppBar(!entry.isIntersecting)
        },
        {
          // 设置根元素为视口
          root: null,
          // 当搜索框完全离开视口时才认为不可见
          rootMargin: '0px',
          // 当搜索框有任何部分可见时，threshold 为 0 表示只要有一点可见就认为可见
          threshold: 0,
        },
      )

      // 使用 requestAnimationFrame 延迟观察，确保在 hydration 完成后再观察
      const rafId = requestAnimationFrame(() => {
        observer.observe(searchBoxElement)
      })

      return () => {
        cancelAnimationFrame(rafId)
        observer.disconnect()
      }
    }
  }, [isMounted, isPostListPage, pathname, route_name])

  // 统一的 logo 点击处理函数
  const handleLogoClick = () => {
    if (isAuthPage && forums.length > 0) {
      // 如果在登录/注册页面，跳转到第一个论坛
      const firstForum = forums[0]
      const routePath = firstForum.route_name ? `/${firstForum.route_name}` : `/${firstForum.id}`
      router.push(routePath)
    } else if (forums && forums.length > 0) {
      // 如果有论坛数据，跳转到当前论坛或第一个论坛
      if (forum_id) {
        const forumId = Array.isArray(forum_id) ? forum_id[0] : forum_id
        const currentForum = forums.find((f) => f.id === parseInt(forumId))
        if (currentForum) {
          const routePath = currentForum.route_name ? `/${currentForum.route_name}` : `/${currentForum.id}`
          router.push(routePath)
        } else {
          const firstForum = forums[0]
          const routePath = firstForum.route_name ? `/${firstForum.route_name}` : `/${firstForum.id}`
          router.push(routePath)
        }
      } else {
        const firstForum = forums[0]
        const routePath = firstForum.route_name ? `/${firstForum.route_name}` : `/${firstForum.id}`
        router.push(routePath)
      }
    } else if (user?.uid) {
      // 如果用户已登录但没有论坛数据，跳转到首页让fallback组件处理
      plainRouter.push('/')
    } else {
      // 如果用户未登录且没有论坛数据，跳转到登录页面
      plainRouter.push('/login')
    }
  }

  // 处理搜索 - 当输入内容后按回车时
  const handleSearch = useCallback(() => {
    const trimmedSearch = searchInputValue && searchInputValue.trim() ? searchInputValue.trim() : ''
    if (trimmedSearch) {
      // 打开搜索弹窗，SearchResultModal 会自动执行搜索
      openSearchModal()
    }
  }, [searchInputValue, openSearchModal])

  // 处理键盘事件 - 回车时触发搜索
  const onInputSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent).isComposing) {
      handleSearch()
    }
  }

  const handlePublish = useCallback(
    (type: string, query?: string) => {
      console.log(query)
      handleCloseSearchModal()
      router.push(`/${route_name}/edit?type=${type}&${query ? `title=${encodeURIComponent(query)}` : ''}`)
    },
    [handleCloseSearchModal, route_name, forums, router],
  )

  return (
    <>
      {/* Desktop Header */}
      <AppBar
        position='fixed'
        elevation={0}
        sx={(theme) => ({
          bgcolor: 'background.paper',
          color: 'text.primary',
          backdropFilter: 'blur(12px)',
          display: { xs: 'none', sm: 'block' },
          boxShadow: `0px 1px 0px 0px ${theme.palette.divider}`,
        })}
      >
        <Toolbar sx={{ py: '0!important', px: '20px!important', color: 'text.primary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            {brandConfig?.logo && brandConfig?.text ? (
              <Stack
                direction='row'
                alignItems='center'
                gap={1.5}
                sx={{ cursor: 'pointer', color: 'text.primary', minWidth: '192px' }}
                onClick={handleLogoClick}
              >
                <Box
                  sx={{
                    width: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    color: 'text.primary',
                  }}
                >
                  <Image
                    src={brandConfig.logo}
                    alt='Logo'
                    width={24}
                    height={24}
                    style={{
                      objectFit: 'contain',
                    }}
                    unoptimized={true}
                  />
                </Box>
                {brandConfig.text && (
                  <Typography
                    variant='h6'
                    component='div'
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      fontSize: { xs: '1rem', md: '1.25rem' },
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {brandConfig.text}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Box
                sx={{
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.25rem',
                  color: 'text.primary',
                  cursor: 'pointer',
                  minWidth: '192px',
                }}
                onClick={handleLogoClick}
              >
                <Image
                  src='/inverse_logo-text.png'
                  alt='Koala QA Logo'
                  width={100}
                  height={24}
                  style={{ objectFit: 'contain' }}
                />
              </Box>
            )}
            {/* Forum切换tab */}
            {forums && forums.length > 1 && <ForumSelector forums={forums} selectedForumId={currentForumId} />}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 搜索框 - 非登录/注册页面显示 */}
            {showSearchInAppBar && (
              <OutlinedInput
                size='small'
                placeholder='输入任意内容，使用 AI 搜索'
                value={searchInputValue}
                onChange={(e) => setSearchInputValue(e.target.value)}
                onKeyDown={onInputSearch}
                sx={{
                  width: 300,
                  color: 'text.primary',
                  transition: 'box-shadow 0.2s, background 0.2s',
                  boxShadow: 'none',
                  '& fieldset': { borderColor: 'text.secondary', transition: 'border-width 0.2s' },
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    height: '36px',
                    color: 'text.primary',
                    transition: 'background 0.2s, box-shadow 0.2s',
                    '&': {
                      bgcolor: 'rgba(255, 255, 255, 0.22)',
                      boxShadow: '0 0 0 2px #fff',
                    },
                    '& input': {
                      color: 'text.primary',
                      fontSize: '0.875rem',
                    },
                  },
                }}
                startAdornment={
                  <InputAdornment position='start'>
                    <SearchIcon sx={{ color: 'text.primary', fontSize: 18, sition: 'font-size 0.2s' }} />
                  </InputAdornment>
                }
              />
            )}

            {user?.uid ? (
              <>
                <LoggedInView user={user} adminHref={backHref} />
              </>
            ) : (
              <>
                <Button
                  variant='contained'
                  sx={{
                    borderRadius: 1,
                    height: 36,
                    px: 2,
                    fontSize: 14,
                    textTransform: 'none',
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: 'none',
                    },
                  }}
                  startIcon={<AccountCircleIcon sx={{ fontSize: 24 }} />}
                  onClick={() => {
                    plainRouter.push('/login')
                  }}
                >
                  登录
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Header */}
      <AppBar
        position='fixed'
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          backdropFilter: 'blur(12px)',
          display: { xs: 'block', sm: 'none' },
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar sx={{ py: 1, px: 1, color: 'text.primary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            {/* Menu button */}
            <IconButton
              size='small'
              onClick={openMobileMenu}
              sx={{
                color: 'text.primary',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <MenuIcon />
            </IconButton>

            {/* Logo */}
            <Box
              sx={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexGrow: 1,
                minWidth: 0,
              }}
              onClick={handleLogoClick}
            >
              {brandConfig?.logo ? (
                <Image
                  src={brandConfig.logo}
                  alt='Logo'
                  width={24}
                  height={24}
                  style={{ objectFit: 'contain' }}
                  unoptimized={true}
                />
              ) : (
                <Image
                  src='/inverse_logo-text.png'
                  alt='Koala QA Logo'
                  width={80}
                  height={20}
                  style={{ objectFit: 'contain' }}
                />
              )}
            </Box>
          </Box>

          {/* Right side actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {/* Search button */}
            <IconButton
              size='small'
              onClick={() => {
                // Open search modal directly
                if (searchInputValue.trim()) {
                  openSearchModal()
                } else {
                  // If no search input, just focus to allow typing
                  setSearchInputValue('')
                  // Trigger search modal with empty input to show search interface
                  setTimeout(() => openSearchModal(), 0)
                }
              }}
              sx={{
                color: 'primary.main',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <SearchIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            </IconButton>

            {user?.uid ? (
              <LoggedInView user={user} adminHref={backHref} />
            ) : (
              <IconButton
                size='small'
                onClick={() => plainRouter.push('/login')}
                sx={{
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <AccountCircleIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Mobile Menu Drawer */}
      <Drawer
        anchor='left'
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            bgcolor: 'background.paper',
          },
        }}
      >
        <Stack sx={{ p: 2 }} spacing={2}>
          {forums && forums.length > 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {forums.map((forum) => {
                const isSelected = currentForumId === forum.id
                return (
                  <Button
                    key={forum.id}
                    onClick={() => {
                      const routePath = forum.route_name ? `/${forum.route_name}` : `/${forum.id}`
                      router.push(routePath)
                      closeMobileMenu()
                    }}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      borderRadius: '8px',
                      py: 1.5,
                      px: 2,
                      justifyContent: 'flex-start',
                      bgcolor: isSelected ? 'primary.main' : 'transparent',
                      color: isSelected ? 'primary.contrastText' : 'text.primary',
                      '&:hover': {
                        bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                      },
                    }}
                  >
                    {forum.name}
                  </Button>
                )
              })}
            </Box>
          )}
          <FilterPanel />
        </Stack>
      </Drawer>

      {/* Global Search Result Modal */}
      <SearchResultModal
        open={searchModalOpen}
        onClose={handleCloseSearchModal}
        initialQuery={searchInputValue}
        onPublish={handlePublish}
      />
    </>
  )
}

export default Header
