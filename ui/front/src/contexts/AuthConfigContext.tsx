'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { SvcAuthFrontendGetRes } from '@/api/types'

interface AuthConfigContextType {
  authConfig: SvcAuthFrontendGetRes | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<SvcAuthFrontendGetRes | null>
  clearCache: () => void
}

const AuthConfigContext = createContext<AuthConfigContextType | undefined>(undefined)

interface AuthConfigProviderProps {
  children: ReactNode
  initialAuthConfig?: SvcAuthFrontendGetRes | null
}

export const AuthConfigProvider = ({ 
  children, 
  initialAuthConfig = null 
}: AuthConfigProviderProps) => {
  const [authConfig, setAuthConfig] = React.useState<SvcAuthFrontendGetRes | null>(initialAuthConfig)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  // 清除缓存函数
  const clearCache = React.useCallback(() => {
    setAuthConfig(null)
    setLoading(false)
    setError(null)
  }, [])

  // 监听认证清除事件
  React.useEffect(() => {
    const handleAuthCleared = () => {
      console.log('[AuthConfigProvider] Auth cleared event received, clearing cache');
      clearCache();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:cleared', handleAuthCleared);
      return () => {
        window.removeEventListener('auth:cleared', handleAuthCleared);
      };
    }
  }, [clearCache])

  // 刷新函数 - 客户端可以调用此函数重新获取配置
  // 注意：这个函数主要用于特殊情况下需要刷新配置的场景
  // 正常情况下，所有页面都应该使用 initialAuthConfig 中的数据
  const refresh = React.useCallback(async (): Promise<SvcAuthFrontendGetRes | null> => {
    setLoading(true)
    setError(null)
    
    try {
      // 动态导入以避免服务端渲染问题
      const { getUserLoginMethod } = await import('@/api')
      const response = await getUserLoginMethod()
      setAuthConfig(response)
      setLoading(false)
      return response
    } catch (err) {
      setError(err as Error)
      setLoading(false)
      return null
    }
  }, [])

  return (
    <AuthConfigContext.Provider
      value={{
        authConfig,
        loading,
        error,
        refresh,
        clearCache,
      }}
    >
      {children}
    </AuthConfigContext.Provider>
  )
}

export const useAuthConfig = () => {
  const context = useContext(AuthConfigContext)
  if (context === undefined) {
    throw new Error('useAuthConfig must be used within an AuthConfigProvider')
  }
  return context
}

// 便捷函数：检查是否允许公共访问
export const usePublicAccess = () => {
  const { authConfig } = useAuthConfig()
  return authConfig?.public_access ?? false
}

// 便捷函数：检查是否启用注册
export const useRegisterEnabled = () => {
  const { authConfig } = useAuthConfig()
  return authConfig?.enable_register ?? false
}

// 便捷函数：获取认证类型
export const useAuthTypes = () => {
  const { authConfig } = useAuthConfig()
  return authConfig?.auth_types ?? []
}
