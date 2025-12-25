import { getForum, getSystemBrand, getSystemSeo, getUser, getUserLoginMethod } from '@/api'
import { getThemeColor } from '@/api/Theme'
import '@/asset/styles/common.css'
import '@/asset/styles/markdown.css'
// import 'react-photo-view/dist/react-photo-view.css';
import { AuthProvider, CommonProvider, GuestActivationProvider } from '@/components'
import ThemeProviderWrapper from '@/components/ThemeProviderWrapper'
import ClientInit from '@/components/ClientInit'
import ServerErrorBoundary from '@/components/ServerErrorBoundary'
import { AuthConfigProvider } from '@/contexts/AuthConfigContext'
import { GroupDataProvider } from '@/contexts/GroupDataContext'
import { SystemDiscussionProvider } from '@/contexts/SystemDiscussionContext'
import { safeLogError } from '@/lib/error-utils'
import '@ctzhian/tiptap/dist/index.css'
// 初始化 dayjs 中文配置
import '@/lib/dayjs'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import CssBaseline from '@mui/material/CssBaseline'
import { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { cookies } from 'next/headers'
import Script from 'next/script'
import * as React from 'react'

import PageViewTracker from '@/components/PageViewTracker'
import Header from '../components/header'
import Scroll from './scroll'
import { Box } from '@mui/material'

export const dynamic = 'force-dynamic'

// 用构建版本号做 URL 版本化，避免浏览器/代理强缓存导致图标无法更新
const ICONFONT_VERSION = process.env.NEXT_PUBLIC_GIT_SHA || 'dev'

// 字体优化 - 添加 display swap 提升首屏性能
const monoFont = localFont({
  src: '../asset/font/Mono.ttf',
  variable: '--font-mono',
  display: 'swap',
  preload: true,
})

const alimamashuheitiFont = localFont({
  src: '../asset/font/AlimamaShuHeiTi-Bold.ttf',
  variable: '--font-alimamashuheiti',
  display: 'swap',
  preload: true,
})

// 动态生成 metadata
export async function generateMetadata(): Promise<Metadata> {
  let brandName = 'Koala QA'
  let description = '一个专业的技术讨论和知识分享社区'
  let keywords = ['技术讨论', '问答', '知识分享', '开发者社区']
  try {
    const [brand] = await Promise.all([getSystemBrand()])
    brandName = brand?.text || 'Koala QA'
  } catch (error) {
    // 构建时如果无法获取品牌信息，使用默认值
    safeLogError('Failed to fetch brand info during build', error)
  }

  return {
    title: {
      default: `${brandName} - 技术讨论社区`,
      template: `%s | ${brandName}`,
    },
    description: description,
    keywords: keywords,
    authors: [{ name: `${brandName} Team` }],
    creator: brandName,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      siteName: brandName,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

// 用户数据获取 - 使用服务端优化
async function getUserData() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return null
    }

    // 使用服务端优化的数据获取
    const userData = await getUser()
    return userData
  } catch (error) {
    // 使用安全的错误处理
    safeLogError('Failed to fetch user data', error)
    return null
  }
}

// Forum数据获取 - 智能访问控制
async function getForumData(authConfig: any, user: any) {
  try {
    // 检查是否允许公共访问或用户已登录
    const canAccess = authConfig?.public_access || user?.uid

    if (!canAccess) {
      // 如果不允许公共访问且用户未登录，返回空数组
      return []
    }

    const forumData = await getForum()
    return forumData || []
  } catch (error) {
    // 使用安全的错误处理
    safeLogError('Failed to fetch forum data', error)
    return []
  }
}

// 认证配置数据获取 - 使用服务端优化
async function getAuthConfigData() {
  try {
    const authConfigData = await getUserLoginMethod()
    return authConfigData
  } catch (error) {
    // 使用安全的错误处理
    safeLogError('Failed to fetch auth config data', error)
    return null
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  // 首先获取认证配置和用户数据，因为论坛数据依赖这些信息
  const [brandResponse, seoResponse, authConfig, user, themeColorResponse] = await Promise.all([
    getSystemBrand(),
    getSystemSeo(),
    getAuthConfigData(),
    getUserData(),
    getThemeColor().catch(() => ({ primaryColor: '#EA4C89' })), // 如果获取失败，使用回退主题色
  ])

  // 基于认证状态和公共访问配置获取论坛数据
  const forums = await getForumData(authConfig, user)
  
  // 获取主题色，如果未获取到则使用回退主题色
  const primaryColor = themeColorResponse?.primaryColor || '#EA4C89'

  const brand = brandResponse || null
  const description = seoResponse?.desc || '一个专业的技术讨论和知识分享社区'
  const keywords = seoResponse?.keywords || ['技术讨论', '问答', '知识分享', '开发者社区']

  return (
    <html lang='zh-CN'>
      <head>
        <meta httpEquiv='content-language' content='zh-CN' />
        <meta name='description' content={description} />
        <meta name='keywords' content={Array.isArray(keywords) ? keywords.join(',') : keywords} />
        {/* DNS 预解析优化 */}
        <link rel='dns-prefetch' href='//fonts.googleapis.com' />
        <link rel='preconnect' href='//fonts.googleapis.com' crossOrigin='anonymous' />
        <link rel='icon' href={brand?.logo || '/logo.svg'} />
      </head>
      <body className={`${monoFont.variable} ${alimamashuheitiFont.variable}`}>
        <Script src={`/font/iconfont.js?v=${ICONFONT_VERSION}`} strategy='beforeInteractive' />

        {/* 埋点图片 - 用于采集用户使用记录 */}
        <img
          src='https://release.baizhi.cloud/koala-qa/icon.png'
          alt=''
          style={{ display: 'none', position: 'absolute', width: 0, height: 0 }}
          aria-hidden='true'
        />

        <ServerErrorBoundary>
          <AuthConfigProvider initialAuthConfig={authConfig}>
            <AuthProvider initialUser={user}>
              <CommonProvider>
                <ClientInit initialForums={forums} />
                <GroupDataProvider>
                  <SystemDiscussionProvider>
                    <AppRouterCacheProvider>
                      <ThemeProviderWrapper primaryColor={primaryColor}>
                        <CssBaseline />
                        <GuestActivationProvider>
                          <PageViewTracker />
                          <Header brandConfig={brand} initialForums={forums} />
                          <Box component='main' id='main-content' sx={{ backgroundColor: 'background.default', flex: 1, overflow: 'auto' }}>
                            {props.children}
                          </Box>
                          <Scroll />
                        </GuestActivationProvider>
                      </ThemeProviderWrapper>
                    </AppRouterCacheProvider>
                  </SystemDiscussionProvider>
                </GroupDataProvider>
              </CommonProvider>
            </AuthProvider>
          </AuthConfigProvider>
        </ServerErrorBoundary>
      </body>
    </html>
  )
}
