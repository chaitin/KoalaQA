'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { postStat } from '@/api/Stat'

/**
 * 页面访问统计组件
 * 监听路由变化，每次访问新页面时发送统计请求
 * 注意：只统计路径变化，查询参数变化不触发统计
 */
export default function PageViewTracker() {
  const pathname = usePathname()
  const previousPathRef = useRef<string | null>(null)

  useEffect(() => {
    // 如果路径没有变化，不发送统计
    if (pathname === previousPathRef.current) {
      return
    }

    // 更新之前的路径
    previousPathRef.current = pathname

    // 发送统计请求
    // 使用 setTimeout 确保在页面渲染完成后发送，避免阻塞页面加载
    const timer = setTimeout(() => {
      postStat().catch((error) => {
        // 静默处理错误，避免影响用户体验
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to send page view stat:', error)
        }
      })
    }, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [pathname])

  // 这个组件不渲染任何内容
  return null
}

