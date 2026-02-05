import { create } from 'zustand'
import { SvcAuthFrontendGetRes } from '@/api/types'
import { setPublicAccessAllowed } from '@/api/httpClient'

interface AuthConfigState {
  authConfig: SvcAuthFrontendGetRes | null
  loading: boolean
  error: Error | null
  refresh: () => Promise<SvcAuthFrontendGetRes | null>
  clearCache: () => void
  setAuthConfig: (config: SvcAuthFrontendGetRes | null) => void
  initialize: (initialConfig: SvcAuthFrontendGetRes | null) => void
}

export const useAuthConfigStore = create<AuthConfigState>((set) => {
  // 监听 auth:cleared 事件（来自外部登出事件）
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:cleared', () => {
      set({ loading: false, error: null })
      // 不清空 authConfig，保持登录方法信息
    })
  }

  return {
    authConfig: null,
    loading: false,
    error: null,

    setAuthConfig: (config) => {
      setPublicAccessAllowed(config?.public_access ?? false)
      set({ authConfig: config })
    },

    initialize: (initialConfig) => {
      setPublicAccessAllowed(initialConfig?.public_access ?? false)
      set({ authConfig: initialConfig })
    },

    clearCache: () => {
      set({ authConfig: null, loading: false, error: null })
    },

    refresh: async () => {
      set({ loading: true, error: null })

      try {
        // 动态导入以避免服务端渲染问题
        const { getUserLoginMethod } = await import('@/api')
        const response = await getUserLoginMethod()
        setPublicAccessAllowed(response?.public_access ?? false)
        set({ authConfig: response, loading: false })
        return response
      } catch (err) {
        set({ error: err as Error, loading: false })
        return null
      }
    },
  }
})

// 便捷 hook：检查是否允许公共访问
export const usePublicAccess = () => {
  const authConfig = useAuthConfigStore((state) => state.authConfig)
  return authConfig?.public_access ?? false
}

// 便捷 hook：检查是否启用注册
export const useRegisterEnabled = () => {
  const authConfig = useAuthConfigStore((state) => state.authConfig)
  return authConfig?.auth_types?.some(auth => auth.enable_register) ?? false
}

// 便捷 hook：获取认证类型
export const useAuthTypes = () => {
  const authConfig = useAuthConfigStore((state) => state.authConfig)
  return authConfig?.auth_types ?? []
}
