import { NextRequest, NextResponse } from 'next/server'
import { getSystemBrand } from '@/api'

/**
 * 动态 favicon 路由处理器
 * 当用户访问 /favicon.ico 时，返回后台设置的 brand.logo
 * 如果未设置，则返回默认的 logo.svg
 *
 * 注意：Next.js 会优先使用路由处理器而不是静态文件
 */
export async function GET(request: NextRequest) {
  try {
    // 获取品牌配置
    const brand = await getSystemBrand()
    
    // 如果设置了 logo，重定向到该 URL
    if (brand?.logo) {
      let logoUrl: string
      const logo = brand.logo.trim()
      
      // 如果是完整 URL，直接使用
      if (logo.startsWith('http://') || logo.startsWith('https://')) {
        logoUrl = logo
      } else if (logo.startsWith('/')) {
        // 如果是相对路径，构建绝对 URL
        // 优先使用 TARGET 环境变量（后端 API 地址）
        const baseUrl = process.env.TARGET || request.nextUrl.origin
        logoUrl = `${baseUrl}${logo}`
      } else {
        // 其他情况，添加 / 前缀并构建完整 URL
        const baseUrl = process.env.TARGET || request.nextUrl.origin
        logoUrl = `${baseUrl}/${logo}`
      }
      
      // 设置适当的缓存头，但不要太长，以便更新 logo 后能及时看到
      const response = NextResponse.redirect(logoUrl, 302)
      response.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate')
      return response
    }
    // 如果没有设置 logo，重定向到默认的 logo.svg
    const defaultLogo = new URL('/logo.svg', request.nextUrl.origin)
    const response = NextResponse.redirect(defaultLogo, 302)
    response.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate')
    return response
  } catch (error) {
    // 如果获取失败，返回默认的 logo.svg
    console.error('Failed to fetch brand logo for favicon:', error)
    const defaultLogo = new URL('/logo.svg', request.nextUrl.origin)
    const response = NextResponse.redirect(defaultLogo, 302)
    response.headers.set('Cache-Control', 'public, max-age=3600, must-revalidate')
    return response
  }
}

// 设置缓存策略
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1小时重新验证一次
