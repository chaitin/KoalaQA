'use client'

// 重新导出 AuthConfigContext 中的 hook，保持向后兼容性
export { 
  useAuthConfig, 
  usePublicAccess, 
  useRegisterEnabled, 
  useAuthTypes,
} from '@/contexts/AuthConfigContext'

// 为了向后兼容，保留一些旧的函数名
export { usePublicAccess as usePublicAccessStatus } from '@/contexts/AuthConfigContext'
