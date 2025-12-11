import { create } from 'zustand'
import { getAdminForum, getAdminForumForumIdTags } from '@/api/Forum'
import { ModelForumGroups, SvcForumRes } from '@/api/types'

export type ForumItem = SvcForumRes & {
  groups?: ModelForumGroups[]
}

// 标签选项接口
export interface TagOption {
  id?: number
  name?: string
  count?: number
}

interface ForumState {
  forums: ForumItem[]
  tags: Record<number, TagOption[]> // forumId -> tags map
  loading: boolean
  error: string | null

  fetchForums: () => Promise<void>
  refreshForums: () => Promise<void>
  clearForums: () => void
  fetchTagsForForums: (forumIds: number[]) => Promise<void>
}

export const useForumStore = create<ForumState>((set, get) => ({
  forums: [],
  tags: {},
  loading: false,
  error: null,

  // 批量获取多个板块的标签
  fetchTagsForForums: async (forumIds: number[]) => {
    if (forumIds.length === 0) return

    const { tags } = get()
    const tagsToFetch = forumIds.filter(id => id > 0 && !tags[id])

    if (tagsToFetch.length === 0) return

    try {
      // 并行请求所有标签
      const tagPromises = tagsToFetch.map(async (forumId) => {
        try {
          const data = await getAdminForumForumIdTags({ forumId })
          let items: TagOption[] = []

          if (Array.isArray(data)) {
            if (data.length > 0 && data[0]?.items) {
              items = data[0].items
            }
          }

          return { forumId, tags: items }
        } catch (err) {
          console.error(`获取板块 ${forumId} 的标签失败:`, err)
          return { forumId, tags: [] }
        }
      })

      const results = await Promise.all(tagPromises)
      const newTags: Record<number, TagOption[]> = { ...tags }
      
      results.forEach(({ forumId, tags: forumTags }) => {
        newTags[forumId] = forumTags
      })

      set({ tags: newTags })
    } catch (err) {
      console.error('批量获取标签失败:', err)
    }
  },

  fetchForums: async () => {
    const { forums, loading } = get()
    
    // 如果已有数据或正在加载中，跳过请求
    if (loading || forums.length > 0) {
      return
    }

    set({ loading: true, error: null })

    try {
      const response = await getAdminForum()
      const forumsList = Array.isArray(response) ? response : []
      set({ forums: forumsList, loading: false })

      // 批量获取所有板块的标签
      const forumIds = forumsList
        .map(f => f.id)
        .filter((id): id is number => id !== undefined && id > 0)
      
      if (forumIds.length > 0) {
        await get().fetchTagsForForums(forumIds)
      }
    } catch (err) {
      set({ error: (err as Error).message || '获取板块列表失败', loading: false })
    }
  },

  refreshForums: async () => {
    set({ loading: true, error: null })

    try {
      const response = await getAdminForum()
      const forumsList = Array.isArray(response) ? response : []
      const { tags } = get()
      
      // 获取新的论坛 ID 列表
      const newForumIds = forumsList
        .map(f => f.id)
        .filter((id): id is number => id !== undefined && id > 0)
      
      // 清理已删除的论坛的 tags
      const existingForumIds = new Set(newForumIds)
      const cleanedTags: Record<number, TagOption[]> = {}
      Object.keys(tags).forEach(key => {
        const forumId = Number(key)
        if (existingForumIds.has(forumId)) {
          cleanedTags[forumId] = tags[forumId]
        }
      })

      set({ forums: forumsList, tags: cleanedTags, loading: false })

      // 批量获取新板块的标签（只获取还没有 tags 的论坛）
      const tagsToFetch = newForumIds.filter(id => !cleanedTags[id])
      
      if (tagsToFetch.length > 0) {
        await get().fetchTagsForForums(tagsToFetch)
      }
    } catch (err) {
      set({ error: (err as Error).message || '获取板块列表失败', loading: false })
    }
  },

  clearForums: () => set({ forums: [], tags: {} }),
}))
