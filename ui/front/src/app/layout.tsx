import { getSystemBrand, getUser, getForum, getUserLoginMethod } from '@/api'
import '@/asset/styles/common.css'
import '@/asset/styles/markdown.css'
import { AuthProvider, CommonProvider } from '@/components'
import { ForumProvider } from '@/contexts/ForumContext'
import { AuthConfigProvider } from '@/contexts/AuthConfigContext'
import ServerErrorBoundary from '@/components/ServerErrorBoundary'
import theme from '@/theme'
import '@ctzhian/tiptap/dist/index.css'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { cookies } from 'next/headers'
import Script from 'next/script'
import * as React from 'react'

import Footer from '@/components/Footer'
import Header from '../components/header'
import Scroll from './scroll'

export const dynamic = 'force-dynamic'
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

  try {
    const brand = await getSystemBrand()
    brandName = brand?.text || 'Koala QA'
  } catch (error) {
    // 构建时如果无法获取品牌信息，使用默认值
    console.warn('Failed to fetch brand info during build:', error)
  }
  
  return {
    title: {
      default: `${brandName} - 技术讨论社区`,
      template: `%s | ${brandName}`
    },
    description: '一个专业的技术讨论和知识分享社区',
    keywords: ['技术讨论', '问答', '知识分享', '开发者社区'],
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
    // 静默失败，不影响页面渲染
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch user data:', error)
    }
    return null
  }
}

// Forum数据获取 - 使用服务端优化
async function getForumData() {
  try {
    const forumData = await getForum()
    return forumData || []
  } catch (error) {
    // 静默失败，不影响页面渲染
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch forum data:', error)
    }
    return []
  }
}

// 认证配置数据获取 - 使用服务端优化
async function getAuthConfigData() {
  try {
    const authConfigData = await getUserLoginMethod()
    return authConfigData
  } catch (error) {
    // 静默失败，不影响页面渲染
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to fetch auth config data:', error)
    }
    return null
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  // 并行获取所有数据，提高页面加载性能
  const [brandResponse, forums, authConfig, user] = await Promise.all([
    getSystemBrand(),
    getForumData(),
    getAuthConfigData(),
    getUserData()
  ])
  const brand = brandResponse || null

  return (
    <html lang='zh-CN'>
      <head>
        <meta httpEquiv='content-language' content='zh-CN' />
        {/* DNS 预解析优化 */}
        <link rel='dns-prefetch' href='//fonts.googleapis.com' />
        <link rel='preconnect' href='//fonts.googleapis.com' crossOrigin='anonymous' />
        <link 
          rel="icon" 
          href={brand?.logo || '/logo.png'} 
        />
      </head>
      <body className={`${monoFont.variable} ${alimamashuheitiFont.variable}`}>
        {/* 图标字体预加载 - beforeInteractive 确保在交互前加载 */}
        <Script src='/font/iconfont.js' strategy='beforeInteractive' />

        <ServerErrorBoundary>
          <CommonProvider>
            <AuthConfigProvider initialAuthConfig={authConfig}>
              <AuthProvider initialUser={user}>
                <ForumProvider initialForums={forums}>
                  <AppRouterCacheProvider>
                    <ThemeProvider theme={theme}>
                      <CssBaseline />
                      <Header initialUser={user} brandConfig={brand} initialForums={forums} />
                      <main id='main-content'>
                        {props.children}
                      </main>
                      <Footer />
                      <Scroll />
                    </ThemeProvider>
                  </AppRouterCacheProvider>
                </ForumProvider>
              </AuthProvider>
            </AuthConfigProvider>
          </CommonProvider>
        </ServerErrorBoundary>
      </body>
    </html>
  )
}
