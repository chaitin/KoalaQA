'use client'

import { getUserLoginThird } from '@/api'
import { Card } from '@/components'
import { AuthType } from '@/types/auth'
import { Box, Button, Stack, Typography } from '@mui/material'
import Link from 'next/link'
import { Suspense } from 'react'
import Account from './account'
import { useAuthConfig } from '@/hooks/useAuthConfig'

const LoginType = () => {
  // 使用新的 useAuthConfig hook
  const { authConfig, loading } = useAuthConfig()
  const handleOAuthLogin = async (type: number) => {
    try {
      // 调用getUserLoginThird接口获取跳转URL
      const response = await getUserLoginThird({ type })

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
      window.location.href = decodeURIComponent(oauthUrl)
    } catch (error) {
      console.error('Error getting third party login URL:', error)
    }
  }

  // 判断是否支持不同的登录方式
  const hasPasswordLogin = authConfig?.auth_types?.some((auth) => auth.type === AuthType.PASSWORD) || false
  const hasOAuthLogin = authConfig?.auth_types?.some((auth) => auth.type === AuthType.OAUTH) || false
  const passwordConfig = authConfig?.auth_types?.find((auth) => auth.type === AuthType.PASSWORD)
  const oauthConfig = authConfig?.auth_types?.find((auth) => auth.type === AuthType.OAUTH)

  if (loading) {
    return
  }

  // 根据配置决定显示哪种登录界面
  if (!hasPasswordLogin && hasOAuthLogin) {
    // 情况1：只有第三方登录，显示左侧样式（简单登录）
    return (
      <Suspense>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            px: 2,
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
                  {oauthConfig.button_desc || 'Auth 登录'}
                </Button>
              )}

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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          px: 2,
        }}
      >
        <Card
          sx={{
            width: 400,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Stack spacing={3}>
            <Typography
              variant='h1'
              sx={{
                fontSize: '24px',
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
            {hasOAuthLogin && oauthConfig && (
              <>
                <Box
                  sx={{
                    textAlign: 'center',
                    color: 'rgba(0,0,0,0.4)',
                    fontSize: 14,
                    mt: 2,
                  }}
                >
                  使用其他登录方式
                </Box>

                <Button
                  variant='outlined'
                  fullWidth
                  sx={{
                    backgroundColor: 'transparent',
                    fontSize: '14px',
                  }}
                  onClick={() => handleOAuthLogin(oauthConfig?.type!)}
                >
                  {oauthConfig?.button_desc || 'Auth 登录'}
                </Button>
              </>
            )}
          </Stack>
        </Card>
      </Box>
    </Suspense>
  )
}

export default LoginType
