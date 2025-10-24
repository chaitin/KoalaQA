/**
 * 服务端认证配置工具
 * 用于在服务端环境中获取认证配置，避免重复请求
 */

import { SvcAuthFrontendGetRes } from '@/api/types'

// 服务端缓存
let serverAuthConfigCache: SvcAuthFrontendGetRes | null = null
let serverAuthConfigPromise: Promise<SvcAuthFrontendGetRes | null> | null = null
let serverAuthConfigTimestamp: number = 0

// 缓存时间：5分钟
const CACHE_DURATION = 5 * 60 * 1000

/**
 * 在服务端获取认证配置
 * @param baseURL 基础URL，用于构建API请求
 * @param request 可选的NextRequest对象，用于middleware环境
 * @returns Promise<SvcAuthFrontendGetRes | null> 认证配置
 */
export const getServerAuthConfig = async (
  baseURL: string = '',
  request?: any
): Promise<SvcAuthFrontendGetRes | null> => {
  const now = Date.now()
  
  // 如果有缓存且未过期，直接返回缓存
  if (serverAuthConfigCache && (now - serverAuthConfigTimestamp) < CACHE_DURATION) {
    return serverAuthConfigCache
  }

  // 如果正在获取配置，等待现有请求
  if (serverAuthConfigPromise) {
    return serverAuthConfigPromise
  }

  // 创建新的获取配置的Promise
  serverAuthConfigPromise = new Promise(async (resolve) => {
    try {
      let authConfig: SvcAuthFrontendGetRes | null = null
      
      if (request) {
        // Middleware环境：使用fetch
        const apiUrl = `${baseURL}/api/user/login_method`
        const fullUrl = new URL(apiUrl, request.url)
        const response = await fetch(fullUrl.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          console.warn('Failed to fetch auth config:', response.status)
          authConfig = null
        } else {
          const data = await response.json()
          authConfig = data?.data || null
        }
      } else {
        // 服务端环境：直接调用API函数
        try {
          const { getUserLoginMethod } = await import('@/api')
          authConfig = await getUserLoginMethod()
        } catch (error) {
          console.error('Failed to fetch auth config in server:', error)
          authConfig = null
        }
      }

      serverAuthConfigCache = authConfig
      serverAuthConfigTimestamp = now
      resolve(authConfig)
    } catch (error) {
      console.error('Failed to fetch server auth config:', error)
      // 默认返回null
      serverAuthConfigCache = null
      resolve(null)
    } finally {
      // 清除Promise缓存，允许重试
      serverAuthConfigPromise = null
    }
  })

  return serverAuthConfigPromise
}

/**
 * 清除服务端认证配置缓存的函数
 */
export const clearServerAuthConfigCache = () => {
  serverAuthConfigCache = null
  serverAuthConfigPromise = null
  serverAuthConfigTimestamp = 0
}

/**
 * 获取公共访问状态的便捷函数
 * @param baseURL 基础URL
 * @param request 可选的NextRequest对象
 * @returns Promise<boolean> public_access状态
 */
export const getServerPublicAccessStatus = async (
  baseURL: string = '',
  request?: any
): Promise<boolean> => {
  const authConfig = await getServerAuthConfig(baseURL, request)
  return authConfig?.public_access ?? false
}
