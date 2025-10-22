'use client'

import { ModelUserRole } from '@/api'
import { AppBar, Button, Stack, Typography } from '@mui/material'
import { useRouterWithForum } from '@/hooks/useRouterWithForum'
import { useEffect, useState } from 'react'
import LoggedInView from './loggedInView'
import Link from 'next/link'
import Cookies from 'js-cookie'
import { useLocalStorageState } from 'ahooks'
import Image from 'next/image'
import SettingsIcon from '@mui/icons-material/Settings'
import { useAuthConfig } from '@/hooks/useAuthConfig'
import { getSystemBrand } from '@/api/Brand'
import { ModelSystemBrand } from '@/api/types'
import ForumSelector from '../ForumSelector'
import { useForum } from '@/contexts/ForumContext'

interface HeaderProps {
  initialUser?: any | null
}

const Header = ({ initialUser = null }: HeaderProps) => {
  const [token] = useLocalStorageState<string>('auth_token')
  const [user, setUser] = useState(initialUser)
  const router = useRouterWithForum()
  const [backHref, setBackHref] = useState('/admin/ai')
  const [brandConfig, setBrandConfig] = useState<ModelSystemBrand | null>(null)
  const [isLoadingBrand, setIsLoadingBrand] = useState(true)

  // 使用新的 useAuthConfig hook
  const { authConfig } = useAuthConfig()
  
  // 使用板块选择器
  const { selectedForumId } = useForum()

  // 从 authConfig 中获取配置
  const registrationEnabled = authConfig?.enable_register ?? true

  useEffect(() => {
    if (token) {
      Cookies.set('auth_token', token, {
        path: '/',
        expires: 7, // 7 天
        secure: true, // 如果你是 https
        sameSite: 'Lax',
      })
    }
  }, [token])

  // 如果初始用户为空但有token，可能需要重新获取用户信息
  useEffect(() => {
    if (!initialUser && token) {
      // 这里可以添加客户端获取用户信息的逻辑
      // 或者触发页面刷新以重新获取服务端数据
    }
    setUser(initialUser)
  }, [initialUser, token])
  // 使用状态来避免 hydration 不匹配

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setBackHref(`${window.location.protocol}//${window.location.hostname}:3400/admin/ai`)
    }
  }, [])

  // 获取品牌配置
  useEffect(() => {
    const fetchBrandConfig = async () => {
      try {
        setIsLoadingBrand(true)
        const response = await getSystemBrand()
        setBrandConfig(response)
      } catch (error) {
        console.error('获取品牌配置失败:', error)
      } finally {
        setIsLoadingBrand(false)
      }
    }

    fetchBrandConfig()
  }, [])
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
          {!isLoadingBrand &&
            (brandConfig?.logo ? (
              <Stack
                direction='row'
                alignItems='center'
                gap={1}
              sx={{ cursor: 'pointer' }}
              onClick={() => router.push(selectedForumId ? `/${selectedForumId}` : '/')}
              >
                <Image
                  src={brandConfig.logo}
                  alt='Logo'
                  width={24}
                  height={24}
                  unoptimized={brandConfig.logo.startsWith('data:')}
                  style={{
                    objectFit: 'contain',
                    borderRadius: '4px',
                  }}
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
              onClick={() => router.push(selectedForumId ? `/${selectedForumId}` : '/')}
              />
            ))}
          
          {/* 板块选择器 */}
          <ForumSelector
            selectedForumId={selectedForumId || undefined}
          />
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
                    router.push('/register')
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
                  router.push('/login')
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
