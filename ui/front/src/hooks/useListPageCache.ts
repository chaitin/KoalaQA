'use client'

import { ModelDiscussionListItem, ModelListRes } from '@/api/types'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'

interface CachedListState {
  scrollPosition: number
  data: ModelListRes & { items?: ModelDiscussionListItem[] }
  timestamp: number
  searchParams: string
  page?: number // 保存当前页码
}

const CACHE_KEY_PREFIX = 'list_page_cache_'
const CACHE_EXPIRY = 5 * 60 * 1000 // 5分钟过期

/**
 * 列表页状态缓存 Hook
 * 用于实现类似 Vue keep-alive 的功能，保存列表页的滚动位置和数据
 */
export const useListPageCache = (routeName: string) => {
  const pathname = usePathname()
  const cacheKey = `${CACHE_KEY_PREFIX}${routeName}`
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const isRestoringRef = useRef(false)

  // 保存列表页状态
  const saveState = (
    data: ModelListRes & { items?: ModelDiscussionListItem[] },
    searchParams: string,
    page?: number,
  ) => {
    if (typeof window === 'undefined') return

    // 获取 main-content 元素的滚动位置
    const mainContent = document.getElementById('main-content')
    const scrollPosition = mainContent ? mainContent.scrollTop : window.scrollY || document.documentElement.scrollTop
    const state: CachedListState = {
      scrollPosition,
      data,
      timestamp: Date.now(),
      searchParams,
      page,
    }

    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save list page state:', error)
    }
  }

  // 恢复列表页状态
  const restoreState = (): CachedListState | null => {
    if (typeof window === 'undefined') return null

    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (!cached) return null

      const state: CachedListState = JSON.parse(cached)

      // 检查是否过期
      if (Date.now() - state.timestamp > CACHE_EXPIRY) {
        sessionStorage.removeItem(cacheKey)
        return null
      }

      return state
    } catch (error) {
      console.warn('Failed to restore list page state:', error)
      return null
    }
  }

  // 清除缓存
  const clearCache = () => {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.removeItem(cacheKey)
    } catch (error) {
      console.warn('Failed to clear list page cache:', error)
    }
  }

  // 恢复滚动位置
  const restoreScrollPosition = (position: number) => {
    if (isRestoringRef.current) return
    isRestoringRef.current = true

    // 使用 requestAnimationFrame 确保 DOM 已更新
    requestAnimationFrame(() => {
      // 延迟重置标志，确保滚动完成
      // 优先使用 main-content 元素进行滚动
      const mainContent = document.getElementById('main-content')
      if (mainContent) {
        mainContent.scrollTop = position
      } else if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = position
      } else {
        // 降级到 window 滚动
        window.scrollTo({
          top: position,
          behavior: 'instant', // 立即滚动，不使用动画
        })
      }
      isRestoringRef.current = false
    })
    clearCache()
  }

  // 检查当前路径是否是列表页
  const isListPage = pathname === `/${routeName}`

  return {
    saveState,
    restoreState,
    clearCache,
    restoreScrollPosition,
    isListPage,
    scrollContainerRef,
  }
}
