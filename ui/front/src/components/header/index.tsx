'use client'

import { ModelUserRole, ModelSystemBrand } from '@/api'
import { ModelForumInfo as ModelForum } from '@/api/types'
import { AuthContext } from '@/components/authProvider'
import { useAuthConfig } from '@/hooks/useAuthConfig'
import { useRouterWithRouteName } from '@/hooks/useRouterWithForum'
import { useForum } from '@/contexts/ForumContext'
import SettingsIcon from '@mui/icons-material/Settings'
import { AppBar, Button, Stack, Typography } from '@mui/material'
import Image from 'next/image'
import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useContext, useEffect, useState } from 'react'
import ForumSelector from '../ForumSelector'
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

  // 使用新的 useAuthConfig hook
  const { authConfig } = useAuthConfig()

  // 使用ForumProvider中的动态数据
  const { forums } = useForum()

  // 使用板块选择器 - 只在非登录/注册页面使用
  const isAuthPage = ['/login', '/register'].includes(pathname)
  const { forum_id, route_name } = useParams()

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
          {(forums?.length || 0) >= 1 && Boolean(publicAccess || user?.uid) && (
            <ForumSelector selectedForumId={selectedForumId} forums={forums} />
          )}
        </Stack>

        <Stack
          direction='row'
          alignItems={'center'}
          gap={3}
          sx={{ position: 'absolute', top: 0, bottom: 0, right: 40 }}
        >
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
    </AppBar>
  )
}

export default Header
