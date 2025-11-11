'use client'

import { ModelSystemBrand } from '@/api'
import { ModelForumInfo as ModelForum, ModelUserRole } from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import { useForum } from '@/contexts/ForumContext'
import { useAuthConfig } from '@/hooks/useAuthConfig'
import { useForumId } from '@/hooks/useForumId'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import SearchIcon from '@mui/icons-material/Search'
import { AppBar, Box, Button, InputAdornment, Link, OutlinedInput, Stack, Toolbar, Typography } from '@mui/material'
import { useBoolean } from 'ahooks'
import Image from 'next/image'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useCallback, useContext, useEffect, useState } from 'react'
import ForumSelector from '../ForumSelector'
import SearchResultModal from '../SearchResultModal'
import LoggedInView from './loggedInView'

interface HeaderProps {
  brandConfig: ModelSystemBrand
  initialForums?: ModelForum[]
}

const Header = ({ brandConfig, initialForums = [] }: HeaderProps) => {
  const { user } = useContext(AuthContext)
  const router = useRouterWithRouteName()
  const plainRouter = useRouter()
  const pathname = usePathname()
  const [backHref, setBackHref] = useState('/admin/ai')
  const [searchModalOpen, { setTrue: openSearchModal, setFalse: closeSearchModal }] = useBoolean(false)
  const [searchInputValue, setSearchInputValue] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  // 关闭搜索弹窗时清空输入框
  const handleCloseSearchModal = useCallback(() => {
    closeSearchModal()
    setSearchInputValue('')
  }, [closeSearchModal])
  const [showSearchInAppBar, setShowSearchInAppBar] = useState(false)

  // 使用新的 useAuthConfig hook
  const { authConfig } = useAuthConfig()

  // 使用ForumProvider中的动态数据
  const { forums } = useForum()

  // 使用板块选择器 - 只在非登录/注册页面使用
  const isAuthPage = ['/login', '/register'].includes(pathname)
  const { forum_id, route_name, id } = useParams()

  // 检测是否在 route_name 页面（即帖子列表页面）
  const isPostListPage = Boolean(route_name) && !id && !pathname.includes('/edit')
  // 检测是否在帖子详情页面
  const isPostDetailPage = Boolean(route_name) && Boolean(id) && !pathname.includes('/edit')
  // 检测是否在编辑页面
  const isEditPage = Boolean(route_name) && pathname.includes('/edit')

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

  // 在列表页使用滚动逻辑显示搜索框
  useEffect(() => {
    // 确保只在客户端 mounted 后才执行，避免 hydration 不匹配
    if (!isMounted) return

    // 只在帖子列表页面时监听滚动（详情页直接显示搜索框）
    if (!isPostListPage || typeof window === 'undefined') {
      setShowSearchInAppBar(false)
      return
    }

    const handleScroll = () => {
      setShowSearchInAppBar(window.scrollY > 100)
    }

    // 使用 requestAnimationFrame 延迟初始检查，确保在 hydration 完成后再检查
    // 这样可以避免 hydration 不匹配
    const rafId = requestAnimationFrame(() => {
      handleScroll()
    })

    window.addEventListener('scroll', handleScroll)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', handleScroll)
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
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // 处理提问、反馈、文章操作
  const handleAsk = useCallback(() => {
    handleCloseSearchModal()
    if (route_name) {
      router.push(`/${route_name}?type=qa`)
    } else if (forums.length > 0) {
      const firstForum = forums[0]
      const routePath = firstForum.route_name ? `/${firstForum.route_name}?type=qa` : `/${firstForum.id}?type=qa`
      router.push(routePath)
    }
  }, [handleCloseSearchModal, route_name, forums, router])

  const handleFeedback = useCallback(() => {
    handleCloseSearchModal()
    if (route_name) {
      router.push(`/${route_name}?type=feedback`)
    } else if (forums.length > 0) {
      const firstForum = forums[0]
      const routePath = firstForum.route_name
        ? `/${firstForum.route_name}?type=feedback`
        : `/${firstForum.id}?type=feedback`
      router.push(routePath)
    }
  }, [handleCloseSearchModal, route_name, forums, router])

  const handleArticle = useCallback(() => {
    handleCloseSearchModal()
    if (route_name) {
      router.push(`/${route_name}/edit`)
    } else if (forums.length > 0) {
      const firstForum = forums[0]
      const routePath = firstForum.route_name ? `/${firstForum.route_name}/edit` : `/${firstForum.id}/edit`
      router.push(routePath)
    }
  }, [handleCloseSearchModal, route_name, forums, router])

  return (
    <AppBar
      position='sticky'
      elevation={0}
      sx={{
        bgcolor: 'primary.main',
        color: 'common.white',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}
    >
      <Toolbar sx={{ py: 0, display: { xs: 'none', sm: 'flex' }, color: 'common.white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexGrow: 1 }}>
          {brandConfig?.logo && brandConfig?.text ? (
            <Stack
              direction='row'
              alignItems='center'
              gap={1.5}
              sx={{ cursor: 'pointer', color: 'common.white' }}
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
                  color: 'common.white',
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
                    color: 'common.white',
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
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'common.white',
                cursor: 'pointer',
              }}
              onClick={handleLogoClick}
            >
              <Image src='/logo-text.png' alt='Koala QA Logo' width={24} height={24} style={{ objectFit: 'contain' }} />
            </Box>
          )}
          {/* Forum切换tab */}
          {forums && forums.length > 1 && <ForumSelector forums={forums} selectedForumId={currentForumId} />}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* 搜索框 - 列表页根据滚动显示，详情页和编辑页直接显示 */}
          {/* 使用 isMounted 确保服务器端和客户端首次渲染一致 */}
          {((isPostListPage && isMounted && showSearchInAppBar) || isPostDetailPage || isEditPage) && (
            <OutlinedInput
              size='small'
              placeholder='输入任意内容，使用 AI 搜索'
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              onKeyDown={onInputSearch}
              sx={{
                width: 300,
                color: 'common.white',
                '& fieldset': { borderColor: 'rgba(255, 255, 255,0.3)!important' },
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  height: '36px',
                  color: 'common.white',
                  '&.Mui-focused fieldset': { borderColor: '#fff', borderWidth: 2 },
                  '& input': {
                    color: 'common.white',
                    fontSize: '0.875rem',
                  },
                },
                '& input::placeholder': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  opacity: 1,
                  fontSize: '13px!important',
                },
              }}
              startAdornment={
                <InputAdornment position='start'>
                  <SearchIcon sx={{ color: 'common.white', fontSize: 18 }} />
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
                  bgcolor: '#fff',
                  color: 'primary.main',
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

      {/* 搜索结果弹窗 */}
      <SearchResultModal
        open={searchModalOpen}
        onClose={handleCloseSearchModal}
        forumId={currentForumId}
        initialQuery={searchInputValue}
        onAsk={handleAsk}
        onFeedback={handleFeedback}
        onArticle={handleArticle}
      />
    </AppBar>
  )
}

export default Header
