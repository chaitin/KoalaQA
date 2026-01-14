'use client'

import { ModelSystemBrand, getSystemWebPlugin } from '@/api'
import { ModelDiscussionType, ModelForumInfo as ModelForum, ModelForumLink, ModelUserRole } from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import { useForumId } from '@/hooks/useForumId'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { isAdminRole } from '@/lib/utils'
import { useForumStore, useQuickReplyStore } from '@/store'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import AddIcon from '@mui/icons-material/Add'
import HeadsetMicIcon from '@mui/icons-material/HeadsetMic'
import MenuIcon from '@mui/icons-material/Menu'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SearchIcon from '@mui/icons-material/Search'
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  Link as MuiLink,
  List,
  ListItem,
  Menu,
  MenuItem,
  OutlinedInput,
  Stack,
  Toolbar,
  Typography,
  Divider,
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
  const [publishAnchorEl, setPublishAnchorEl] = useState<null | HTMLElement>(null)
  const publishMenuOpen = Boolean(publishAnchorEl)
  const { fetchQuickReplies } = useQuickReplyStore()
  const [showCustomerService, setShowCustomerService] = useState(false)

  useEffect(() => {
    if (isAdminRole(user.role || ModelUserRole.UserRoleGuest)) fetchQuickReplies()
  }, [user.role])

  // 获取 web plugin 配置，决定是否显示客服智能对话入口
  useEffect(() => {
    const fetchWebPluginConfig = async () => {
      try {
        const config = await getSystemWebPlugin()
        // 只有当 enabled 和 display 都为 true 时才显示
        setShowCustomerService(config?.display === true)
      } catch (error) {
        console.error('获取 web plugin 配置失败:', error)
        // 出错时默认不显示
        setShowCustomerService(false)
      }
    }
    fetchWebPluginConfig()
  }, [])
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
      const firstForum = forums[0]
      const routePath = firstForum.route_name ? `/${firstForum.route_name}` : `/${firstForum.id}`
      router.push(routePath)
    } else if (forums && forums.length > 0) {
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
      plainRouter.push('/')
    } else {
      plainRouter.push('/login')
    }
  }

  // 处理搜索 - 当输入内容后按回车时
  const handleSearch = useCallback(() => {
    const trimmedSearch = searchInputValue && searchInputValue.trim() ? searchInputValue.trim() : ''
    if (trimmedSearch) {
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
      handleCloseSearchModal()
      router.push(`/${route_name}/edit?type=${type}&${query ? `title=${encodeURIComponent(query)}` : ''}`)
    },
    [handleCloseSearchModal, route_name, forums, router],
  )

  // 处理发布菜单
  const handlePublishMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setPublishAnchorEl(event.currentTarget)
  }

  const handlePublishMenuClose = () => {
    setPublishAnchorEl(null)
  }

  const handlePublishTypeSelect = (publishType: ModelDiscussionType) => {
    handlePublishMenuClose()
    const routeName = (route_name as string) || ''
    router.push(`/${routeName}/edit?type=${publishType}`)
  }

  // 新增: 移动端未登录时也展示发帖按钮，点击跳转至登录页
  const handleMobilePostClick = () => {
    if (user?.uid) {
      // 已登录，和原来一样弹出菜单
      handlePublishMenuOpen({} as React.MouseEvent<HTMLElement>)
    } else {
      // 未登录跳转登录页
      plainRouter.push('/login')
    }
  }

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
          display: { xs: 'none', lg: 'block' },
          boxShadow: `0px 1px 0px 0px ${theme.palette.divider}`,
        })}
      >
        <Toolbar sx={{ py: '0!important', px: '20px!important', color: 'text.primary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
            <Stack
              direction='row'
              alignItems='center'
              gap={1.5}
              sx={{ cursor: 'pointer', color: 'text.primary', minWidth: '192px' }}
              onClick={handleLogoClick}
            >
              <Box
                sx={{
                  height: { xs: 32, sm: 36, md: 40 },
                  maxWidth: { xs: 160, sm: 200, md: 240 },
                  display: 'flex',
                  alignItems: 'center',
                  '& img': {
                    height: '100%',
                    width: 'auto',
                    maxWidth: '100%',
                    objectFit: 'contain',
                  },
                }}
              >
                <Image
                  src={brandConfig.logo || '/logo.png'}
                  alt='Logo'
                  width={0}
                  height={0}
                  sizes='(max-width: 600px) 160px, 240px'
                  style={{
                    width: 'auto',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                  unoptimized={true}
                />
              </Box>
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
                {brandConfig.text || 'Koala QA'}
              </Typography>
            </Stack>
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

            {!!user?.uid ? (
              <>
                {/* 客服智能对话入口 - 仅登录用户显示 */}
                {showCustomerService && (
                  <IconButton
                    size='small'
                    onClick={() => plainRouter.push('/customer-service')}
                    sx={{
                      color: 'text.primary',
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                    }}
                  >
                    <HeadsetMicIcon sx={{ fontSize: '20px', color: 'primary.main' }} />
                  </IconButton>
                )}
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
          display: { xs: 'block', lg: 'none' },
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar sx={{ py: 1, px: 1, color: 'text.primary' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
            {/* Menu button - 只在有多个板块时显示 */}
            {forums && !!forums.length && (
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
            )}

            {/* Logo */}
            <Box
              sx={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexGrow: 1,
                minWidth: 0,
                height: 32,
                maxWidth: 160,
                '& img': {
                  height: '100%',
                  width: 'auto',
                  maxWidth: '100%',
                  objectFit: 'contain',
                },
              }}
              onClick={handleLogoClick}
            >
              <Image
                src={brandConfig.logo || '/logo.png'}
                alt='Logo'
                width={0}
                height={0}
                sizes='160px'
                style={{
                  width: 'auto',
                  height: '100%',
                  objectFit: 'contain',
                }}
                unoptimized={true}
              />
            </Box>
          </Box>

          {/* Right side actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Search button */}
            <IconButton
              size='small'
              onClick={() => {
                // Open search modal directly
                if (searchInputValue.trim()) {
                  openSearchModal()
                } else {
                  setSearchInputValue('')
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

            {/* 客服智能对话入口 */}
            {!!user?.uid && showCustomerService && (
              <IconButton
                size='small'
                onClick={() => plainRouter.push('/customer-service')}
                sx={{
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                }}
              >
                <HeadsetMicIcon sx={{ fontSize: 20, color: 'primary.main' }} />
              </IconButton>
            )}

            {/* 修改发帖按钮逻辑：移动端未登录也展示，未登录点击跳转到登录页 */}
            {isPostListPage && (
              <>
                <IconButton
                  size='small'
                  onClick={handleMobilePostClick}
                  sx={{
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                >
                  <AddIcon sx={{ fontSize: 24, color: 'primary.main' }} />
                </IconButton>
                {/* 只有已登录时才弹出选择菜单 */}
                {!!user?.uid && (
                  <Menu
                    anchorEl={publishAnchorEl}
                    open={publishMenuOpen}
                    onClose={handlePublishMenuClose}
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
                )}
              </>
            )}

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
                <AccountCircleIcon sx={{ fontSize: 24, color: 'primary.main' }} />
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

          {/* 常用链接 */}
          {currentForumInfo?.links?.enabled &&
            currentForumInfo?.links?.links &&
            currentForumInfo.links.links.length > 0 && (
              <Box>
                <Divider sx={{ my: 2 }} />
                <List disablePadding>
                  {currentForumInfo.links.links.map((link: ModelForumLink, linkIndex: number) => (
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
                          py: 0.5,
                          px: 1,
                          borderRadius: '4px',
                          '&:hover': {
                            color: 'primary.main',
                            bgcolor: 'action.hover',
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
              </Box>
            )}
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
