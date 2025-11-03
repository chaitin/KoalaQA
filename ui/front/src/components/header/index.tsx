'use client'

import { ModelUserRole, ModelSystemBrand } from '@/api'
import { ModelForumInfo as ModelForum } from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import { useAuthConfig } from '@/hooks/useAuthConfig'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { useForum } from '@/contexts/ForumContext'
import { useForumId } from '@/hooks/useForumId'
import SettingsIcon from '@mui/icons-material/Settings'
import SearchIcon from '@mui/icons-material/Search'
import { AppBar, Button, InputAdornment, OutlinedInput, Stack, Typography } from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useCallback, useContext, useEffect, useState } from 'react'
import { useBoolean } from 'ahooks'
import ForumSelector from '../ForumSelector'
import LoggedInView from './loggedInView'
import SearchResultModal from '../SearchResultModal'

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

  // 关闭搜索弹窗时清空输入框
  const handleCloseSearchModal = useCallback(() => {
    closeSearchModal()
    setSearchInputValue('')
  }, [closeSearchModal])
  const [showHeaderSearch, setShowHeaderSearch] = useState(false)

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
  // 是否应该显示搜索框（只在帖子列表和详情页显示）
  const shouldShowSearch = isPostListPage || isPostDetailPage

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

  // 根据当前路由参数获取选中的版块ID
  const getSelectedForumId = () => {
    if (forum_id) {
      return parseInt(forum_id as string)
    }
    if (route_name && forums.length > 0) {
      const forum = forums.find((f) => f.route_name === route_name)
      return forum?.id
    }
    return undefined
  }

  const selectedForumId = getSelectedForumId()

  // 从 authConfig 中获取配置
  const registrationEnabled = authConfig?.enable_register ?? true
  const publicAccess = authConfig?.public_access ?? false
  // 使用状态来避免 hydration 不匹配

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      setBackHref(`${window.location.protocol}//${window.location.hostname}:3400/admin/ai`)
    }
  }, [])

  // 监听 article 组件中的搜索框可见性
  useEffect(() => {
    // 只在帖子列表页面时监听（详情页直接显示搜索框）
    if (!isPostListPage || typeof window === 'undefined') {
      setShowHeaderSearch(false)
      return
    }

    let observer: IntersectionObserver | null = null
    let timer: NodeJS.Timeout | null = null

    const setupObserver = () => {
      const articleSearchBox = document.getElementById('article-search-box')
      if (!articleSearchBox) {
        return false
      }

      observer = new IntersectionObserver(
        ([entry]) => {
          try {
            // 使用 requestAnimationFrame 延迟状态更新，避免在编辑器操作时冲突
            requestAnimationFrame(() => {
              try {
                // 当搜索框不可见时，显示 header 中的搜索框
                setShowHeaderSearch(!entry.isIntersecting)
              } catch (error) {
                console.warn('搜索框显示状态更新失败:', error)
              }
            })
          } catch (error) {
            console.warn('IntersectionObserver 回调错误:', error)
          }
        },
        {
          threshold: 0,
          rootMargin: '-64px 0px 0px 0px', // 考虑 header 的高度
        }
      )

      observer.observe(articleSearchBox)

      // 初始检查 - 添加错误处理
      try {
        const rect = articleSearchBox.getBoundingClientRect()
        const isVisible = rect.top >= 64 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        requestAnimationFrame(() => {
          try {
            setShowHeaderSearch(!isVisible)
          } catch (error) {
            console.warn('初始搜索框状态设置失败:', error)
          }
        })
      } catch (error) {
        console.warn('获取搜索框位置失败:', error)
      }

      return true
    }

    // 立即尝试一次，如果失败则延迟重试
    if (!setupObserver()) {
      timer = setTimeout(() => {
        setupObserver()
      }, 100)
    }

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
      if (observer) {
        observer.disconnect()
      }
    }
  }, [isPostListPage, pathname, route_name])

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

  // 处理搜索框点击 - 打开搜索模态框
  const handleSearchClick = () => {
    openSearchModal()
    setSearchInputValue('')
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
      position='fixed'
      sx={{
        backgroundColor: 'background.default',
        transition: 'background-color 0.2s',
        zIndex: 100,
        boxShadow: '0px 2px 6px 0px rgba(0,0,0,0.1), 0px 2px 6px 0px rgba(218,220,224,0.5)',
      }}
    >
      <Stack
        direction='row'
        sx={{
          height: 64,
          position: 'relative',
          display: { xs: 'none', sm: 'flex' },
          pl: { xs: 0, sm: 3 },
        }}
        alignItems='center'
        justifyContent='space-between'
      >
        <Stack direction='row' alignItems='center' gap={3}>
          {brandConfig?.logo && brandConfig?.text ? (
            <Stack direction='row' alignItems='center' gap={1} sx={{ cursor: 'pointer' }} onClick={handleLogoClick}>
              <Image
                src={brandConfig.logo}
                alt='Logo'
                width={24}
                height={24}
                style={{
                  objectFit: 'contain',
                  borderRadius: '4px',
                }}
                unoptimized={true}
              />
              {brandConfig.text && (
                <Typography
                  variant='h6'
                  sx={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#000',
                  }}
                >
                  {brandConfig.text}
                </Typography>
              )}
            </Stack>
          ) : (
            <Image
              src='/logo-text.png'
              alt='Koala QA Logo'
              width={120}
              height={20}
              style={{ cursor: 'pointer' }}
              onClick={handleLogoClick}
            />
          )}
          {(forums?.length || 0) > 1 && Boolean(publicAccess || user?.uid) && (
            <ForumSelector selectedForumId={selectedForumId} forums={forums} />
          )}
        </Stack>
        <Stack direction='row' alignItems={'center'} gap={3} sx={{ pr: 2 }}>
          {/* 搜索框 - 只在帖子列表和详情页显示，在列表页下，只有当 article 搜索框不可见时才显示 */}
          {shouldShowSearch && (
          <OutlinedInput
            sx={{
              width: 300,
              height: 40,
              backgroundColor: '#fff',
              borderRadius: 1,
              fontSize: 14,
              opacity: isPostDetailPage || showHeaderSearch ? 1 : 0,
              transform: isPostDetailPage || showHeaderSearch 
                ? 'translateY(0) scale(1)' 
                : 'translateY(-10px) scale(0.95)',
              pointerEvents: isPostDetailPage || showHeaderSearch ? 'auto' : 'none',
              transition: 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              willChange: 'opacity, transform',
              cursor: 'pointer',
              '.MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0,0,0,0.1)',
                transition: 'border-color 0.3s ease',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0,0,0,0.2)',
              },
              '&.Mui-focused': {
                transform: isPostDetailPage || showHeaderSearch
                  ? 'translateY(0) scale(1.02)' 
                  : 'translateY(-10px) scale(0.95)',
                transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#206CFF',
                  borderWidth: 2,
                },
              },
            }}
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            onKeyDown={onInputSearch}
            placeholder='输入任意内容，使用 AI 搜索'
            startAdornment={
              <InputAdornment position='start'>
                <SearchIcon sx={{ color: 'rgba(0,0,0,0.4)', fontSize: 20 }} />
              </InputAdornment>
            }
          />
          )}

          {user?.role == ModelUserRole.UserRoleAdmin && (
            <Link href={backHref}>
              <Button
                variant='outlined'
                sx={{
                  borderRadius: 1,
                  height: 44,
                  width: 122,
                  fontSize: 14,
                  boxShadow: 'none !important',
                }}
                startIcon={<SettingsIcon />}
              >
                后台管理
              </Button>
            </Link>
          )}
          {user?.uid ? (
            <LoggedInView user={user} />
          ) : (
            <>
              {/* 在公共访问模式下，仍然显示登录和注册按钮，但用户可以选择不登录直接使用 */}
              {registrationEnabled && (
                <Button
                  variant='outlined'
                  sx={{ borderRadius: 1, height: 44, width: 122, fontSize: 14 }}
                  onClick={() => {
                    plainRouter.push('/register')
                  }}
                >
                  立即注册
                </Button>
              )}
              <Button
                variant='contained'
                sx={{
                  borderRadius: 1,
                  height: 44,
                  width: 122,
                  fontSize: 14,
                  boxShadow: 'none !important',
                }}
                onClick={() => {
                  plainRouter.push('/login')
                }}
              >
                登录
              </Button>
            </>
          )}
        </Stack>
      </Stack>

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
