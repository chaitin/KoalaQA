'use client'

import React, { createContext, useContext, ReactNode, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { ModelForum } from '@/api/types'
import { usePublicAccess } from './AuthConfigContext'

interface ForumContextType {
  selectedForumId: number | null
  forums: ModelForum[]
  loading: boolean
  error: Error | null
  refreshForums: () => Promise<ModelForum[] | null>
  clearCache: () => void
}

const ForumContext = createContext<ForumContextType | undefined>(undefined)

interface ForumProviderProps {
  children: ReactNode
  initialForums?: ModelForum[]
}

export const ForumProvider = ({ children, initialForums = [] }: ForumProviderProps) => {
  const params = useParams()
  const forumIdParam = params?.forum_id as string
  const selectedForumId = forumIdParam ? parseInt(forumIdParam, 10) : null
  const publicAccess = usePublicAccess()
  
  const [forums, setForums] = useState<ModelForum[]>(initialForums)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 清除缓存函数
  const clearCache = useCallback(() => {
    setForums([])
    setLoading(false)
    setError(null)
  }, [])

  // 刷新论坛数据函数，带重试机制
  const refreshForums = useCallback(async (retryCount = 0): Promise<ModelForum[] | null> => {
    const maxRetries = 3
    const retryDelay = 1000 * Math.pow(2, retryCount) // 指数退避：1s, 2s, 4s
    
    setLoading(true)
    setError(null)
    
    try {
      // 动态导入以避免服务端渲染问题
      const { getForum } = await import('@/api')
      const response = await getForum()
      const forumData = response || []
      setForums(forumData)
      setLoading(false)
      return forumData
    } catch (err) {
      console.error(`[ForumProvider] Failed to fetch forums (attempt ${retryCount + 1}/${maxRetries + 1}):`, err)
      
      if (retryCount < maxRetries) {
        // 重试
        console.log(`[ForumProvider] Retrying in ${retryDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return refreshForums(retryCount + 1)
      } else {
        // 所有重试都失败了
        const error = err as Error
        setError(error)
        setLoading(false)
        console.error('[ForumProvider] All retry attempts failed, giving up')
        return null
      }
    }
  }, [])

  // 监听认证清除事件，根据公共访问配置决定是否清除论坛缓存
  React.useEffect(() => {
    const handleAuthCleared = () => {
      if (!publicAccess) {
        // 如果不允许公共访问，登出时清空论坛缓存
        clearCache();
      }
      // 如果允许公共访问，登出时保留论坛缓存，不做任何操作
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:cleared', handleAuthCleared);
      return () => {
        window.removeEventListener('auth:cleared', handleAuthCleared);
      };
    }
  }, [clearCache, publicAccess])
  
  return (
    <ForumContext.Provider
      value={{
        selectedForumId,
        forums,
        loading,
        error,
        refreshForums,
        clearCache,
      }}
    >
      {children}
    </ForumContext.Provider>
  )
}

export const useForum = () => {
  const context = useContext(ForumContext)
  if (context === undefined) {
    throw new Error('useForum must be used within a ForumProvider')
  }
  return context
}
