'use client'

import { getUserLoginThird } from '@/api'
import { Card } from '@/components'
import { AuthType } from '@/types/auth'
import { Box, Button, Stack, Typography } from '@mui/material'
import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Account from './account'
import { useAuthConfig } from '@/hooks/useAuthConfig'

const LoginType = () => {
  // 使用新的 useAuthConfig hook
  const { authConfig, loading } = useAuthConfig()
  const searchParams = useSearchParams()
  const redirect = searchParams?.get('redirect') || undefined

  // 检测是否在企业微信 app 内打开
  // 使用多种方法组合检测，提高准确性：
  // 1. 检查 window.wxwork 对象（企业微信 JS-SDK 注入）
  // 2. 检查 User-Agent（包含 wxwork 或 wecom）
  const isInWeComApp = (): boolean => {
    if (typeof window === 'undefined') return false

    // 方法1: 检查企业微信 JS-SDK 注入的全局对象（最可靠）
    // 企业微信会在 window 上注入 wxwork 对象
    // 注意：需要引入企业微信 JS-SDK 后才会存在，如果未引入则使用 User-Agent 判断
    if ((window as any).wxwork) {
      return true
    }

    // 方法2: 检查 User-Agent（辅助判断）
    const ua = navigator.userAgent.toLowerCase()
    // 企业微信的 User-Agent 通常包含 wxwork
    // 注意：某些浏览器可能伪装 User-Agent，所以仅作为辅助判断
    if (ua.includes('wxwork')) {
      return true
    }

    // 方法3: 检查是否包含 wecom（部分版本可能使用）
    if (ua.includes('wecom')) {
      return true
    }

    return false
  }

  const handleOAuthLogin = async (type: number) => {
    try {
      // app 字段专为企业微信设计：如果 type 是企业微信并且是在企业微信 app 内打开，则为 true
      const app = type === AuthType.WECOM && isInWeComApp()

      // 调用getUserLoginThird接口获取跳转URL
      const response = await getUserLoginThird({ type, redirect, app })
      // 使用类型断言处理API响应
      const apiResponse = response as { data?: string } | string
      let oauthUrl = ''

      if (typeof apiResponse === 'object' && apiResponse.data) {
        oauthUrl = apiResponse.data
      } else if (typeof apiResponse === 'string') {
        oauthUrl = apiResponse
      } else {
        console.error('Failed to get third party login URL')
        return
      }

      // 自动跳转到第三方登录页面
      window.location.href = oauthUrl
    } catch (error) {
      console.error('Error getting third party login URL:', error)
    }
  }

  // 判断是否支持不同的登录方式
  const hasPasswordLogin = authConfig?.auth_types?.some((auth) => auth.type === AuthType.PASSWORD) || false
  const hasOAuthLogin = authConfig?.auth_types?.some((auth) => auth.type === AuthType.OAUTH) || false
  const hasWeComLogin = authConfig?.auth_types?.some((auth) => auth.type === AuthType.WECOM) || false
  const hasThirdPartyLogin = hasOAuthLogin || hasWeComLogin

  const passwordConfig = authConfig?.auth_types?.find((auth) => auth.type === AuthType.PASSWORD)
  const oauthConfig = authConfig?.auth_types?.find((auth) => auth.type === AuthType.OAUTH)
  const wecomConfig = authConfig?.auth_types?.find((auth) => auth.type === AuthType.WECOM)

  if (loading) {
    return
  }

  // 根据配置决定显示哪种登录界面
  if (!hasPasswordLogin && hasThirdPartyLogin) {
    // 情况1：只有第三方登录，显示左侧样式（简单登录）
    return (
      <Suspense>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            px: 2,
            border: '1px solid #D9DEE2',
          }}
        >
          <Card
            sx={{
              width: 400,
              p: 4,
              border: '1px solid #e0e0e0',
              minHeight: 300,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <Stack spacing={4} alignItems='center'>
              <Typography
                variant='h1'
                sx={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: '#666',
                  textAlign: 'center',
                }}
              >
                {'登录'}
              </Typography>

              {/* 第三方登录按钮 */}
              <Stack spacing={2} sx={{ width: '100%' }}>
                {oauthConfig && (
                  <Button
                    variant='outlined'
                    fullWidth
                    sx={{
                      height: 48,
                      color: '#40E0D0',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                    }}
                    onClick={() => handleOAuthLogin(oauthConfig.type!)}
                  >
                    {oauthConfig.button_desc || 'OAuth 登录'}
                  </Button>
                )}
                {wecomConfig && (
                  <Button
                    variant='outlined'
                    fullWidth
                    sx={{
                      height: 48,
                      color: '#40E0D0',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                    }}
                    onClick={() => handleOAuthLogin(wecomConfig.type!)}
                  >
                    {wecomConfig.button_desc || '企业微信登录'}
                  </Button>
                )}
              </Stack>

              {/* 注册链接 */}
              {authConfig?.enable_register && (
                <Box
                  sx={{
                    textAlign: 'center',
                    color: 'rgba(0,0,0,0.4)',
                    fontSize: 14,
                  }}
                >
                  还没有注册？
                  <Link href='/register' style={{ textDecoration: 'none' }}>
                    <Box sx={{ color: '#40E0D0', ml: 0.5, textDecoration: 'none' }}>立即注册</Box>
                  </Link>
                </Box>
              )}
            </Stack>
          </Card>
        </Box>
      </Suspense>
    )
  }

  // 情况2：有账号密码登录（可能同时有第三方登录），显示右侧样式（完整登录表单）
  return (
    <Suspense>
      <Stack alignItems='center' justifyContent='center' sx={{ height: '100%' }}>
        <Card
          sx={{
            width: 400,
            p: 3,
            borderRadius: 2,
            mx: 'auto',
            border: '1px solid #D9DEE2',
          }}
        >
          <Stack spacing={2}>
            <Typography
              variant='h1'
              sx={{
                fontSize: '20px',
                fontWeight: 600,
                textAlign: 'center',
                color: '#333',
              }}
            >
              登录
            </Typography>

            {/* 账号密码登录 */}
            <Account isChecked={true} passwordConfig={passwordConfig} />

            {/* 注册链接 */}
            {authConfig?.enable_register && (
              <Box
                sx={{
                  textAlign: 'center',
                  color: 'rgba(0,0,0,0.4)',
                  fontSize: 14,
                }}
              >
                还没有注册？
                <Link href='/register' style={{ textDecoration: 'none' }}>
                  <Box
                    sx={{
                      display: 'inline-block',
                      fontWeight: 500,
                      color: 'primary.main',
                      ml: 0.5,
                      textDecoration: 'none',
                    }}
                  >
                    立即注册
                  </Box>
                </Link>
              </Box>
            )}

            {/* 如果有第三方登录，显示分割线和第三方登录按钮 */}
            {hasThirdPartyLogin && (
              <>
                <Box
                  sx={{
                    textAlign: 'center',
                    color: 'rgba(0,0,0,0.4)',
                    fontSize: 14,
                  }}
                >
                  使用其他登录方式
                </Box>

                <Stack spacing={1}>
                  {oauthConfig && (
                    <Button
                      variant='outlined'
                      fullWidth
                      sx={{
                        backgroundColor: 'transparent',
                        fontSize: '14px',
                      }}
                      onClick={() => handleOAuthLogin(oauthConfig.type!)}
                    >
                      {oauthConfig.button_desc || 'OAuth 登录'}
                    </Button>
                  )}
                  {wecomConfig && (
                    <Button
                      variant='outlined'
                      fullWidth
                      sx={{
                        backgroundColor: 'transparent',
                        fontSize: '14px',
                      }}
                      onClick={() => handleOAuthLogin(wecomConfig.type!)}
                    >
                      {wecomConfig.button_desc || '企业微信登录'}
                    </Button>
                  )}
                </Stack>
              </>
            )}
          </Stack>
        </Card>
      </Stack>
    </Suspense>
  )
}

export default LoginType
