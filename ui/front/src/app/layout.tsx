import { getForum, getSystemBrand, getUser, getUserLoginMethod } from '@/api'
import '@/asset/styles/common.css'
import '@/asset/styles/markdown.css'
import { AuthProvider, CommonProvider, GuestActivationProvider } from '@/components'
import ClientInit from '@/components/ClientInit'
import ServerErrorBoundary from '@/components/ServerErrorBoundary'
import { AuthConfigProvider } from '@/contexts/AuthConfigContext'
import { GroupDataProvider } from '@/contexts/GroupDataContext'
import { SystemDiscussionProvider } from '@/contexts/SystemDiscussionContext'
import { safeLogError } from '@/lib/error-utils'
import theme from '@/theme'
import '@ctzhian/tiptap/dist/index.css'
// 初始化 dayjs 中文配置
import '@/lib/dayjs'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { execSync } from 'child_process'
import fs from 'fs'
import { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { cookies } from 'next/headers'
import Script from 'next/script'
import path from 'path'
import * as React from 'react'

import PageViewTracker from '@/components/PageViewTracker'
import ScrollReset from '@/components/ScrollReset'
import Header from '../components/header'
import Scroll from './scroll'

export const dynamic = 'force-dynamic'

// 获取 iconfont 文件名（带 commit id），用于防止浏览器缓存
// 文件名包含 commit id，每次下载新图标时文件名会自动更新
function getIconfontFileName(): string {
  try {
    // 读取版本文件获取 commit id
    const versionPath = path.join(process.cwd(), 'public/font/iconfont.version.json')
    if (fs.existsSync(versionPath)) {
      const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'))
      const commitId = versionData.commitId

      // 检查对应的文件是否存在
      const iconPath = path.join(process.cwd(), `public/font/iconfont.${commitId}.js`)
      if (fs.existsSync(iconPath)) {
        // 开发环境下输出文件名，方便调试
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Iconfont] File: iconfont.${commitId}.js`)
        }
        return `iconfont.${commitId}.js`
      }
    }

    // 如果版本文件不存在或文件不存在，尝试获取当前 commit id
    try {
      const commitId = execSync('git rev-parse --short HEAD', {
        cwd: process.cwd(),
        encoding: 'utf-8',
      }).trim()

      const iconPath = path.join(process.cwd(), `public/font/iconfont.${commitId}.js`)
      if (fs.existsSync(iconPath)) {
        return `iconfont.${commitId}.js`
      }
    } catch (error) {
      // 忽略 git 命令错误
    }

    // 如果都失败，回退到默认文件名
    const defaultPath = path.join(process.cwd(), 'public/font/iconfont.js')
    if (fs.existsSync(defaultPath)) {
      return 'iconfont.js'
    }
  } catch (error) {
    safeLogError('Failed to get iconfont file name', error)
  }

  // 最后的降级方案
  return 'iconfont.js'
}

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
    safeLogError('Failed to fetch brand info during build', error)
  }

  return {
    title: {
      default: `${brandName} - 技术讨论社区`,
      template: `%s | ${brandName}`,
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
  const [brandResponse, authConfig, user] = await Promise.all([getSystemBrand(), getAuthConfigData(), getUserData()])

  // 基于认证状态和公共访问配置获取论坛数据
  const forums = await getForumData(authConfig, user)

  const brand = brandResponse || null

  // 获取 iconfont 文件名（带 commit id）
  const iconfontFileName = getIconfontFileName()

  return (
    <html lang='zh-CN'>
      <head>
        <meta httpEquiv='content-language' content='zh-CN' />
        {/* DNS 预解析优化 */}
        <link rel='dns-prefetch' href='//fonts.googleapis.com' />
        <link rel='preconnect' href='//fonts.googleapis.com' crossOrigin='anonymous' />
        <link rel='icon' href={brand?.logo || '/logo.svg'} />
      </head>
      <body
        className={`${monoFont.variable} ${alimamashuheitiFont.variable}`}
      >
        {/* 图标字体预加载 - beforeInteractive 确保在交互前加载 */}
        {/* 文件名包含 commit id，每次下载新图标时文件名会自动更新，防止浏览器缓存 */}
        <Script src={`/font/${iconfontFileName}`} strategy='beforeInteractive' />

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
                      <ThemeProvider theme={theme}>
                        <CssBaseline />
                        <GuestActivationProvider>
                          <PageViewTracker />
                          <ScrollReset />
                          <Header brandConfig={brand} initialForums={forums} />
                          <main
                            id='main-content'
                            style={{ backgroundColor: '#ffffff', height: 'calc(100vh - 64px)', overflow: 'auto' }}
                          >
                            {props.children}
                          </main>
                          <Scroll />
                        </GuestActivationProvider>
                      </ThemeProvider>
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
