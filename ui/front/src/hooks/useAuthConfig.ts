'use client'

import { getUserLoginMethod } from '@/api'
import { SvcAuthFrontendGetRes } from '@/api/types'
import { useState, useEffect, useCallback } from 'react'

// 全局缓存，避免多个组件重复请求
let globalAuthConfig: SvcAuthFrontendGetRes | null = null
let globalAuthConfigPromise: Promise<SvcAuthFrontendGetRes> | null = null
let globalAuthConfigTimestamp: number = 0

// 缓存时间：5分钟
const CACHE_DURATION = 5 * 60 * 1000

/**
 * 获取认证配置的 Hook
 * 提供缓存和请求去重功能，避免重复请求
 */
export const useAuthConfig = () => {
  const [authConfig, setAuthConfig] = useState<SvcAuthFrontendGetRes | null>(globalAuthConfig)
  const [loading, setLoading] = useState(!globalAuthConfig)
  const [error, setError] = useState<Error | null>(null)

  const fetchAuthConfig = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    
    // 如果有缓存且未过期，直接返回缓存
    if (!forceRefresh && globalAuthConfig && (now - globalAuthConfigTimestamp) < CACHE_DURATION) {
      setAuthConfig(globalAuthConfig)
      setLoading(false)
      setError(null)
      return globalAuthConfig
    }

    // 如果有正在进行的请求，等待现有请求
    if (globalAuthConfigPromise) {
      try {
        const result = await globalAuthConfigPromise
        setAuthConfig(result)
        setLoading(false)
        setError(null)
        return result
      } catch (err) {
        setError(err as Error)
        setLoading(false)
        throw err
      }
    }

    // 创建新的请求
    setLoading(true)
    setError(null)
    
    globalAuthConfigPromise = getUserLoginMethod()
      .then((response) => {
        globalAuthConfig = response
        globalAuthConfigTimestamp = now
        setAuthConfig(response)
        setLoading(false)
        setError(null)
        return response
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
        throw err
      })
      .finally(() => {
        globalAuthConfigPromise = null
      })

    return globalAuthConfigPromise
  }, [])

  useEffect(() => {
    fetchAuthConfig()
  }, [fetchAuthConfig])

  // 清除缓存的函数
  const clearCache = useCallback(() => {
    globalAuthConfig = null
    globalAuthConfigPromise = null
    globalAuthConfigTimestamp = 0
    setAuthConfig(null)
    setLoading(true)
    setError(null)
  }, [])

  // 强制刷新的函数
  const refresh = useCallback(() => {
    return fetchAuthConfig(true)
  }, [fetchAuthConfig])

  return {
    authConfig,
    loading,
    error,
    refresh,
    clearCache,
  }
}

/**
 * 获取认证配置的同步函数（用于不需要响应式更新的场景）
 */
export const getAuthConfigSync = (): SvcAuthFrontendGetRes | null => {
  return globalAuthConfig
}

/**
 * 清除认证配置缓存的函数（用于登出等场景）
 */
export const clearAuthConfigCache = () => {
  globalAuthConfig = null
  globalAuthConfigPromise = null
  globalAuthConfigTimestamp = 0
}
