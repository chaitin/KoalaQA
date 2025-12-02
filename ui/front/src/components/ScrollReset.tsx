'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 滚动重置组件
 * 在路由变化时重置主容器的滚动位置，避免 Next.js 保留上一个页面的滚动状态
 */
export default function ScrollReset() {
  const pathname = usePathname()

  useEffect(() => {
    // 使用 requestAnimationFrame 确保在 DOM 更新后再重置滚动位置
    const resetScroll = () => {
      const mainContent = document.getElementById('main-content')
      
      if (mainContent) {
        // 重置滚动位置到顶部
        mainContent.scrollTop = 0
      }
    }

    // 立即执行一次，确保快速重置
    resetScroll()

    // 使用 requestAnimationFrame 确保在浏览器重绘后执行
    requestAnimationFrame(() => {
      resetScroll()
    })

    // 使用 setTimeout 作为备用方案，处理异步内容加载的情况
    const timeoutId = setTimeout(() => {
      resetScroll()
    }, 0)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [pathname])

  return null
}

