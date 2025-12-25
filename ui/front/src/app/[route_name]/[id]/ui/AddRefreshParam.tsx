'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'

/**
 * 在第一次请求后，自动在 URL 中添加 refresh=true 参数
 * 这样可以确保后续刷新页面时不会再次增加浏览次数
 */
export default function AddRefreshParam() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const hasProcessedRef = useRef(false)

  useEffect(() => {
    // 只执行一次，避免重复添加参数
    if (hasProcessedRef.current) {
      return
    }

    // 检查 URL 中是否已经有 refresh=true 参数
    const hasRefresh = searchParams?.get('refresh') === 'true'

    // 如果没有 refresh 参数，则添加它
    if (!hasRefresh) {
      hasProcessedRef.current = true
      const params = new URLSearchParams(searchParams?.toString())
      params.set('refresh', 'true')
      const newUrl = `${pathname}?${params.toString()}`
      // 使用 replace 避免在历史记录中留下无 refresh 参数的记录
      router.replace(newUrl)
    } else {
      // 如果已经有 refresh 参数，标记为已处理
      hasProcessedRef.current = true
    }
  }, [searchParams, pathname, router])

  return null
}

