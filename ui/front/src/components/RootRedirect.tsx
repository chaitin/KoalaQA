'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getForum } from '@/api/Forum'

/**
 * 根路径重定向组件
 * 在客户端处理重定向逻辑，避免 SSR 中的重定向冲突
 */
export default function RootRedirect() {
  const router = useRouter()
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        console.log('Fetching forums for redirect...')
        const forums = await getForum()
        
        if (forums && forums.length > 0) {
          console.log('Redirecting to forum:', forums[0].id)
          router.replace(`/forum/${forums[0].id}`)
        } else {
          console.log('No forums found, redirecting to not-found')
          router.replace('/not-found')
        }
      } catch (error) {
        console.error('Failed to fetch forums:', error)
        // 出错时重定向到默认论坛
        console.log('Error occurred, redirecting to default forum: 1')
        router.replace('/forum/1')
      }
    }

    handleRedirect()
  }, [router])

  // 显示加载状态
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px',
      color: '#666'
    }}>
      {/* 正在跳转... */}
    </div>
  )
}
