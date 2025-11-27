import { create } from 'zustand'
import { getAdminForum } from '@/api/Forum'
import { ModelForumGroups, SvcForumRes } from '@/api/types'

export type ForumItem = SvcForumRes & {
  groups?: ModelForumGroups[]
}

interface ForumState {
  forums: ForumItem[]
  loading: boolean
  error: string | null

  fetchForums: () => Promise<void>
  refreshForums: () => Promise<void>
  clearForums: () => void
}

export const useForumStore = create<ForumState>((set, get) => ({
  forums: [],
  loading: false,
  error: null,

  fetchForums: async () => {
    const { forums, loading } = get()
    
    // 如果已有数据或正在加载中，跳过请求
    if (loading || forums.length > 0) {
      return
    }

    set({ loading: true, error: null })

    try {
      const response = await getAdminForum()
      set({ forums: Array.isArray(response) ? response : [], loading: false })
    } catch (err) {
      set({ error: (err as Error).message || '获取板块列表失败', loading: false })
    }
  },

  refreshForums: async () => {
    set({ loading: true, error: null })

    try {
      const response = await getAdminForum()
      set({ forums: Array.isArray(response) ? response : [], loading: false })
    } catch (err) {
      set({ error: (err as Error).message || '获取板块列表失败', loading: false })
    }
  },

  clearForums: () => set({ forums: [] }),
}))
