'use client'

import { useForumStore } from '@/store'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * 根页面fallback组件
 * 当服务端无法获取forum数据时，在客户端进行重定向
 */
export default function RootPageFallback() {
  const forums = useForumStore((s) => s.forums)
  const loading = useForumStore((s) => s.loading)
  const error = useForumStore((s) => s.error)
  const refreshForums = useForumStore((s) => s.refreshForums)
  const router = useRouter()
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    const handleRedirect = async () => {
      if (hasRedirected) return

      // 如果正在加载，等待加载完成
      if (loading) return

      // 如果有论坛数据，重定向到第一个论坛
      if (forums && forums.length > 0) {
        setHasRedirected(true)
        const firstForum = forums[0]
        const routePath = firstForum.route_name ? `/${firstForum.route_name}` : `/${firstForum.id}`
        router.replace(routePath)
        return
      }

      // 如果没有论坛数据且有错误，尝试刷新
      if (error && !loading) {
        console.log('[RootPageFallback] Forum fetch failed, attempting to refresh...')
        const refreshedForums = await refreshForums()
        if (refreshedForums && refreshedForums.length > 0) {
          setHasRedirected(true)
          const firstForum = refreshedForums[0]
          const routePath = firstForum.route_name ? `/${firstForum.route_name}` : `/${firstForum.id}`
          router.replace(routePath)
          return
        }
      }

      // 如果所有尝试都失败了，重定向到登录页面
      if (!loading && (!forums || forums.length === 0)) {
        console.log('[RootPageFallback] No forums available, redirecting to login')
        setHasRedirected(true)
        router.replace('/login')
      }
    }

    handleRedirect()
  }, [forums, loading, error, refreshForums, router, hasRedirected])

  // 显示加载状态
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '16px'
    }}>
      <div>你的账号没有任何板块权限，请联系管理员添加权限</div>
      {error && (
        <div style={{ color: '#666', fontSize: '14px' }}>
          正在尝试重新获取数据...
        </div>
      )}
    </div>
  )
}
