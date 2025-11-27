import { create } from 'zustand'
import { ModelForumInfo } from '@/api/types'
import { useAuthConfigStore } from './authConfigStore'

interface ForumState {
  selectedForumId: number | null
  forums: ModelForumInfo[]
  loading: boolean
  error: Error | null
  routeName: string | null

  setSelectedForumId: (id: number | null) => void
  setForums: (forums: ModelForumInfo[]) => void
  setRouteName: (name: string | null) => void
  clearCache: () => void
  refreshForums: (retryCount?: number) => Promise<ModelForumInfo[] | null>
}

const MAX_RETRIES = 3
const getRetryDelay = (retryCount: number) => 1000 * Math.pow(2, retryCount) // 指数退避：1s, 2s, 4s

export const useForumStore = create<ForumState>((set, get) => {
  // 监听 auth:cleared 事件
  if (typeof window !== 'undefined') {
    window.addEventListener('auth:cleared', () => {
      const authConfig = useAuthConfigStore.getState().authConfig
      const publicAccess = authConfig?.public_access ?? false
      if (!publicAccess) {
        // 如果不允许公共访问，登出时清空论坛缓存
        set({ forums: [], loading: false, error: null })
      }
      // 如果允许公共访问，保留缓存
    })
  }

  return {
    selectedForumId: null,
    forums: [],
    loading: false,
    error: null,
    routeName: null,

    setSelectedForumId: (id) => set({ selectedForumId: id }),

    setForums: (forums) => {
      set({ forums })
      // 如果已经有 routeName，则尝试根据 routeName 设置 selectedForumId
      const { routeName } = get()
      if (routeName && forums.length > 0) {
        const forum = forums.find((f) => f.route_name === routeName)
        set({ selectedForumId: forum?.id || null })
      }
    },

    setRouteName: (name) => {
      set({ routeName: name })
      // 通过 route_name 查找对应的 forum_id
      if (!name) return

      const forums = get().forums
      if (forums.length > 0) {
        const forum = forums.find((f) => f.route_name === name)
        set({ selectedForumId: forum?.id || null })
        return
      }

      // 如果当前没有 forums，主动刷新一次并根据 routeName 设置 selectedForumId
      ;(async () => {
        try {
          const refreshed = await get().refreshForums()
          if (refreshed && refreshed.length > 0) {
            const forum = refreshed.find((f) => f.route_name === name)
            set({ selectedForumId: forum?.id || null })
          }
        } catch (e) {
          // 忽略错误，refreshForums 内部已处理重试和错误日志
        }
      })()
    },

    clearCache: () => set({ forums: [], loading: false, error: null }),

    refreshForums: async (retryCount = 0) => {
      const { forums } = get()

      set({ loading: true, error: null })

      try {
        // 动态导入以避免服务端渲染问题
        const { getForum } = await import('@/api')
        const forumData = (await getForum()) || []
        set({ forums: forumData, loading: false })

        // 如果有 routeName，更新 selectedForumId
        const { routeName } = get()
        if (routeName && forumData.length > 0) {
          const forum = forumData.find((f) => f.route_name === routeName)
          set({ selectedForumId: forum?.id || null })
        }

        return forumData
      } catch (err) {
        console.error(`[ForumStore] Failed to fetch forums (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, err)

        if (retryCount < MAX_RETRIES) {
          // 重试
          const delay = getRetryDelay(retryCount)
          console.log(`[ForumStore] Retrying in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
          return get().refreshForums(retryCount + 1)
        } else {
          // 所有重试都失败了
          set({ error: err as Error, loading: false })
          console.error('[ForumStore] All retry attempts failed, giving up')
          return null
        }
      }
    },
  }
})
